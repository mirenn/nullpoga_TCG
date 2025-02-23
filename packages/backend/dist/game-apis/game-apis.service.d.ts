import { GameRoom } from '../core/models/game-room.interface';
import { GameService } from '../core/game.service';
export declare class GameApisService {
    private readonly gameService;
    constructor(gameService: GameService);
    startMatchmaking(userId: string): Promise<{
        status: "waiting" | "matched";
        roomId?: string;
    }>;
    getGameState(userId: string): Promise<{
        roomId: string;
        gameRoom: GameRoom | undefined;
    }>;
    handlePlayerAction(action: any): Promise<void>;
    isWaiting(userId: string): boolean;
    cancelMatching(userId: string): void;
}
