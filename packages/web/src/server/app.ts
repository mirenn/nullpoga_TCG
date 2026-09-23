import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { signToken, verifyToken } from '../lib/auth';
import { GameService } from '../lib/core/game.service';

import { validateDeck } from '@nullpoga/core';

type Variables = {
  userId: string;
};

const app = new Hono<{ Variables: Variables }>().basePath('/api');

// 認証ミドルウェア (createMiddleware により Hono の型推論チェーンを保持)
const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userId', payload.sub as string);
  await next();
});

// 1. 認証エンドポイント (POST /api/auth/login)
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

const startGameSchema = z.object({
  deck: z.array(z.number()).optional(),
}).optional();

const routes = app
  .post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const { username } = c.req.valid('json');
    const token = signToken(username);
    return c.json({ access_token: token });
  })

  // 2. ゲーム開始 / マッチング (POST /api/start-game)
  .post(
    '/start-game',
    authMiddleware,
    zValidator('json', startGameSchema),
    async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');
      const deck = body?.deck;

      if (deck) {
        const validation = validateDeck(deck);
        if (!validation.valid) {
          return c.json({ error: validation.reason }, 400);
        }
      }

      try {
        const result = await GameService.startMatching(userId, deck);
        return c.json(result);
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    }
  )

  // 3. ゲーム状態取得 (GET /api/game-state)
  .get('/game-state', authMiddleware, async (c) => {
    const userId = c.get('userId');
    try {
      const result = await GameService.getGameState(userId);
      if (!result.gameRoom) {
        return c.json({ error: 'Game not found' }, 404);
      }

      const responseData = {
        room_id: result.roomId,
        gameRoom: {
          userIds: result.gameRoom.userIds,
          gameState: result.gameRoom.gameState.toJson(),
        },
      };

      return c.json(responseData);
    } catch (error: any) {
      if (error.message === 'User is not in a room') {
        return c.json({ error: 'Not in room' }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  })

  // 4. アクション提出・ターン実行 (POST /api/player_action)
  .post(
    '/player_action',
    authMiddleware,
    zValidator(
      'json',
      z.object({
        roomId: z.string().min(1, 'Room ID required'),
        spell_phase_actions: z.array(z.any()).optional().default([]),
        summon_phase_actions: z.array(z.any()).optional().default([]),
        activity_phase_actions: z.array(z.any()).optional().default([]),
      })
    ),
    async (c) => {
      const userId = c.get('userId');
      const { roomId, spell_phase_actions, summon_phase_actions, activity_phase_actions } =
        c.req.valid('json');

      try {
        await GameService.executeTurnActions(roomId, userId, {
          spell_phase_actions,
          summon_phase_actions,
          activity_phase_actions,
        });

        const result = await GameService.getGameState(userId);
        if (!result.gameRoom) {
          return c.json({ success: true, gameState: null });
        }

        return c.json({
          success: true,
          gameState: {
            userIds: result.gameRoom.userIds,
            gameState: result.gameRoom.gameState.toJson(),
          },
        });
      } catch (error: any) {
        console.error('Error in POST /api/player_action:', error);
        return c.json({ error: error.message, stack: error.stack }, 500);
      }
    }
  );

export default app;
export type AppType = typeof routes;
