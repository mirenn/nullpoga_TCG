import { GameApisService } from './game-apis.service';
export declare class GameApisController {
    private readonly gameApisService;
    constructor(gameApisService: GameApisService);
    startGame(): {
        gameId: string;
    };
    playerAction(action: any): void;
}
