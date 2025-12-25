import { NextResponse } from 'next/server';
import { GameService } from '@/lib/core/game.service';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await GameService.getGameState(userId);
        if (!result.gameRoom) {
             return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }
        
        // Transform to response format expected by frontend
        // Frontend expects GameModels.RoomStateResponse
        // which has { room_id, gameRoom: { gameState: ... } }
        // result has { roomId, gameRoom }
        
        const responseData = {
            room_id: result.roomId,
            gameRoom: {
                userIds: result.gameRoom.userIds,
                gameState: result.gameRoom.gameState.toJson() // Ensure it's executed to return dict
            }
        };
        
        return NextResponse.json(responseData);
    } catch (error: any) {
         // User might not be in a room
         if (error.message === 'User is not in a room') {
             return NextResponse.json({ error: 'Not in room' }, { status: 404 });
         }
         return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
