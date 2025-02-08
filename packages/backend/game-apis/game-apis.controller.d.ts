import { GameApisService } from './game-apis.service';
export declare class GameApisController {
    private readonly gameApisService;
    constructor(gameApisService: GameApisService);
    startGame(): {
        message: string;
    };
    playerAction(action: any): {
        message: string;
        action: any;
    };
}
