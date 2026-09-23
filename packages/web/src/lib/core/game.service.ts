import { State, Player, Action, ActionType, MonsterCard, SpellCard, DECK_1, DECK_2 } from '@nullpoga/core';
import { redis } from '../redis';
import { v4 as uuidv4 } from 'uuid';

export const GameService = {
    // ユーザーとルームの紐付けを管理 (Redis key: game:user:{userId} -> roomId)
    async getUserRoom(userId: string): Promise<string | null> {
        return await redis.get(`game:user:${userId}`);
    },

    async joinRoom(userId: string, roomId: string): Promise<void> {
        await redis.set(`game:user:${userId}`, roomId);
    },

    // マッチング待ちのプレイヤーを管理 (Redis List: game:waiting)
    async startMatching(userId: string): Promise<{ status: 'waiting' | 'matched', roomId?: string }> {
        // Check if anyone is waiting
        // Use RPOP to get a waiting player
        const opponent = await redis.rpop('game:waiting');
        
        if (opponent) {
            if (opponent === userId) {
                // Same user waiting? Push back
                await redis.lpush('game:waiting', userId);
                return { status: 'waiting' };
            }
            
            // Match found! Create Game Room
            const roomId = await this.createGame([opponent, userId]);
            return { status: 'matched', roomId };
        } else {
            // 一人プレイ（BOT対戦）として即座に対戦ルームを作成
            const botUserId = 'CPU_BOT';
            const roomId = await this.createGame([userId, botUserId]);
            return { status: 'matched', roomId };
        }
    },

    async cancelMatching(userId: string): Promise<void> {
        await redis.lrem('game:waiting', 0, userId);
    },

    async isWaiting(userId: string): Promise<boolean> {
        // This is expensive in Redis List (O(N)), but for small N it's fine.
        // Alternatively use a Set for quick lookup.
        const list = await redis.lrange('game:waiting', 0, -1);
        return list.includes(userId);
    },

    // ゲームインスタンスを作成 (Redis key: game:room:{roomId})
    async createGame(userIds: string[]): Promise<string> {
        const roomId = uuidv4();
        
        // Initialize State with DECK_1 and DECK_2 containing spells
        const player1 = new Player([...DECK_1], userIds[0]);
        const player2 = new Player([...DECK_2], userIds[1]);
        
        const state = new State(player1, player2);
        state.initGame();
        
        // Save to Redis
        const gameData = {
            userIds,
            gameState: state.toJson()
        };
        
        await redis.set(`game:room:${roomId}`, JSON.stringify(gameData));
        
        // Update user mappings
        await Promise.all(userIds.map(uid => this.joinRoom(uid, roomId)));
        
        return roomId;
    },

    async getGameState(userId: string): Promise<{ roomId: string; gameRoom: { userIds: string[], gameState: State } | undefined }> {
        const roomId = await this.getUserRoom(userId);
        if (!roomId) {
            throw new Error('User is not in a room');
        }
        
        const dataStr = await redis.get(`game:room:${roomId}`);
        if (!dataStr) {
           return { roomId, gameRoom: undefined };
        }
        
        const data = JSON.parse(dataStr);
        // Hydrate State
        const state = State.fromDict(data.gameState);
        
        return { 
            roomId, 
            gameRoom: {
                userIds: data.userIds,
                gameState: state
            }
        };
    },

    // BOTプレイヤーの自動アクション生成
    generateBotActions(botPlayer: Player, enemyPlayer: Player): { spellActions: Action[], summonActions: Action[], activityActions: Action[] } {
        const spellActions: Action[] = [];
        const summonActions: Action[] = [];
        const activityActions: Action[] = [];

        let availableMana = botPlayer.mana;

        // スペルカードを使用
        for (const card of botPlayer.handCards) {
            if (card instanceof SpellCard && card.manaCost <= availableMana) {
                availableMana -= card.manaCost;
                const enemyMonsterIdx = enemyPlayer.zone.battleField.findIndex(s => s.card);
                const targetIdx = enemyMonsterIdx !== -1 ? enemyMonsterIdx : 2;
                spellActions.push(new Action(ActionType.CAST_SPELL, {
                    spellCard: card,
                    targetIdx,
                    targetPlayerId: enemyPlayer.userId
                }));
            }
        }

        const availableSlots: number[] = [];
        botPlayer.zone.standbyField.forEach((slot, idx) => {
            if (!slot) availableSlots.push(idx);
        });

        // 召喚可能なモンスターを探す
        for (const card of botPlayer.handCards) {
            if (availableSlots.length === 0) break;
            if (card instanceof MonsterCard && card.manaCost <= availableMana) {
                const targetSlotIdx = availableSlots.shift()!;
                availableMana -= card.manaCost;
                summonActions.push(new Action(ActionType.SUMMON_PHASE_END, {
                    summonStandbyFieldIdx: targetSlotIdx,
                    monsterCard: card
                }));
            }
        }

        // 行動フェイズ：バトルゾーンのモンスターで対面スロットへ攻撃
        botPlayer.zone.battleField.forEach((slot, idx) => {
            if (slot.card) {
                activityActions.push(new Action(ActionType.MONSTER_ATTACK, {
                    attackerIdx: idx,
                    targetIdx: 4 - idx,
                    monsterCard: slot.card
                }));
            }
        });

        return { spellActions, summonActions, activityActions };
    },

    async executeTurnActions(roomId: string, userId: string, actions: {
        spell_phase_actions?: any[];
        summon_phase_actions?: any[];
        activity_phase_actions?: any[];
    }): Promise<State> {
        const dataStr = await redis.get(`game:room:${roomId}`);
        if (!dataStr) {
            throw new Error('Game not found');
        }

        const data = JSON.parse(dataStr);
        const state = State.fromDict(data.gameState);

        if (state.isGameEnd()) {
            console.log('Game is already over. No further actions processed.');
            return state;
        }

        const isPlayer1 = state.player1.userId === userId;
        const userPlayer = isPlayer1 ? state.player1 : state.player2;
        const opponentPlayer = isPlayer1 ? state.player2 : state.player1;

        const userSpellActions = (actions.spell_phase_actions || []).map(a => Action.fromDict(a));
        const userSummonActions = (actions.summon_phase_actions || []).map(a => Action.fromDict(a));
        const userActivityActions = (actions.activity_phase_actions || []).map(a => Action.fromDict(a));

        let opponentSpellActions: Action[] = [];
        let opponentSummonActions: Action[] = [];
        let opponentActivityActions: Action[] = [];

        if (opponentPlayer.userId === 'CPU_BOT') {
            const botActions = this.generateBotActions(opponentPlayer, userPlayer);
            opponentSpellActions = botActions.spellActions;
            opponentSummonActions = botActions.summonActions;
            opponentActivityActions = botActions.activityActions;
        }

        const p1Spell = isPlayer1 ? userSpellActions : opponentSpellActions;
        const p1Summon = isPlayer1 ? userSummonActions : opponentSummonActions;
        const p1Activity = isPlayer1 ? userActivityActions : opponentActivityActions;
        const p2Spell = isPlayer1 ? opponentSpellActions : userSpellActions;
        const p2Summon = isPlayer1 ? opponentSummonActions : userSummonActions;
        const p2Activity = isPlayer1 ? opponentActivityActions : userActivityActions;

        state.executeFullTurn(p1Summon, p1Activity, p2Summon, p2Activity, p1Spell, p2Spell);

        data.gameState = state.toJson();
        await redis.set(`game:room:${roomId}`, JSON.stringify(data));

        return state;
    },

    // ゲームに関する操作を実行
    async executeGameAction(roomId: string, action: any): Promise<void> {
        await this.executeGameActions(roomId, [action]);
    },

    async executeGameActions(roomId: string, actions: any[]): Promise<void> {
        const dataStr = await redis.get(`game:room:${roomId}`);
        if (!dataStr) {
            throw new Error('Game not found');
        }
        
        const data = JSON.parse(dataStr);
        let state = State.fromDict(data.gameState);
        
        // Process actions
        for (const action of actions) {
            state = state.next(action);
        }
        
        // Update data
        data.gameState = state.toJson();
        
        await redis.set(`game:room:${roomId}`, JSON.stringify(data));
    }
};