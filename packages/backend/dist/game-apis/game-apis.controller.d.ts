import { GameApisService } from './game-apis.service';
export declare class GameApisController {
    private readonly gameApisService;
    constructor(gameApisService: GameApisService);
    startGame(req: any): {
        gameId: string;
    };
    getGameState(req: any): {
        room_id: string;
        gameRoom: import("../core/models/game-room.interface").GameRoom | undefined;
    };
    playerAction(action: any, req: any): Promise<void>;
}
