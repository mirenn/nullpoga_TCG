import { NextResponse } from 'next/server';
import { GameService } from '@/lib/core/game.service';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { spell_phase_actions, summon_phase_actions, activity_phase_actions, roomId } = body;
        
        if (!roomId) {
            return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
        }

        // Flatten actions
        const actions = [
            ...(spell_phase_actions || []),
            ...(summon_phase_actions || []),
            ...(activity_phase_actions || [])
        ];
        
        if (actions.length > 0) {
            await GameService.executeGameActions(roomId, actions);
        }
        
        // Return updated game state
        const result = await GameService.getGameState(userId);
        if (!result.gameRoom) {
             return NextResponse.json({ success: true, gameState: null }); // Or error
        }
        
        // Frontend "actionSubmit" expects `res` which is console logged.
        // It might expect the new state?
        // gameUtils.ts: const res = await response.json(); return res;
        // It doesn't seem to use the return value for immediate update, likely re-polls or uses it?
        // game-apis.service.ts in backend returned { success: true, gameState: gameRoom }. 
        // Note: gameRoom in backend might be just the State or the Room object?
        // backend: return { success: true, gameState: gameRoom } where gameRoom is map value.
        
        return NextResponse.json({
            success: true,
            gameState: {
                userIds: result.gameRoom.userIds,
                gameState: result.gameRoom.gameState.toJson()
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
