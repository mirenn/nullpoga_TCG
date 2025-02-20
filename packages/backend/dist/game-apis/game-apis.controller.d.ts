import { GameApisService } from './game-apis.service';
export declare class GameApisController {
    private readonly gameApisService;
    constructor(gameApisService: GameApisService);
    startGame(): {
        gameId: string;
    };
    getGameState(userId: string): {
        room_id: string;
        gameRoom: import("../core/models/game-room.interface").GameRoom | undefined;
    };
    playerAction(action: any): Promise<void>;
}
