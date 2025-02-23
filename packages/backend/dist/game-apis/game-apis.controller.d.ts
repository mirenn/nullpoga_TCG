import { GameApisService } from './game-apis.service';
export declare class GameApisController {
    private readonly gameApisService;
    constructor(gameApisService: GameApisService);
    startGame(req: any): Promise<{
        status: "waiting" | "matched";
        roomId?: string;
    }>;
    getGameState(req: any): Promise<{
        roomId: string;
        gameRoom: import("../core/models/game-room.interface").GameRoom | undefined;
    }>;
    playerAction(action: any, req: any): Promise<void>;
    isWaiting(userId: string): boolean;
    cancelMatching(userId: string): void;
}
