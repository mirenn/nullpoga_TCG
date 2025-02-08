export declare class GameService {
    private static instance;
    constructor();
    private games;
    createGame(gameId: string): void;
    getGame(gameId: string): any;
    executeGameAction(gameId: string, action: string, data: any): void;
}
