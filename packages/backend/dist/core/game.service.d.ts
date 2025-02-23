import { GameRoom } from './models/game-room.interface';
export declare class GameService {
    private static instance;
    private games;
    private userToRoom;
    private waitingPlayers;
    private lock;
    constructor();
    private createGame;
    startMatching(userId: string): Promise<{
        status: 'waiting' | 'matched';
        roomId?: string;
    }>;
    getGameState(userId: string): {
        roomId: string;
        gameRoom: GameRoom | undefined;
    };
    private joinRoom;
    getUserRoom(userId: string): string | undefined;
    isWaiting(userId: string): boolean;
    cancelMatching(userId: string): void;
    executeGameAction(roomId: string, action: any): Promise<void>;
    withLock<T>(roomId: string, operation: () => Promise<T>): Promise<T>;
}
