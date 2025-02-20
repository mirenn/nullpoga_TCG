import { GameRoom } from '../core/models/game-room.interface';
import { GameService } from '../core/game.service';
export declare class GameApisService {
    private readonly gameService;
    constructor(gameService: GameService);
    startGame(): {
        gameId: string;
    };
    getGameState(userId: string): {
        room_id: string;
        gameRoom: GameRoom | undefined;
    };
    handlePlayerAction(action: any): Promise<void>;
}
