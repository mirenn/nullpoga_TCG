import { GameService } from '../core/game.service';
export declare class GameApisService {
    private readonly gameService;
    constructor(gameService: GameService);
    startGame(): {
        gameId: string;
    };
    handlePlayerAction(action: any): void;
}
