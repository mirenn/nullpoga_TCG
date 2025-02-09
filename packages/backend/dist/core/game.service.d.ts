import { State } from './models/state';
export declare class GameService {
    private static instance;
    private games;
    constructor();
    createGame(gameId: string): void;
    getGame(gameId: string): State | undefined;
    executeGameAction(gameId: string, action: any): void;
}
