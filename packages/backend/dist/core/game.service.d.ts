import { GameRoom } from './models/game-room.interface';
export declare class GameService {
    private static instance;
    private games;
    private userToRoom;
    private lock;
    constructor();
    createGame(roomId: string, players: string[]): void;
    getGameState(roomId: string): {
        room_id: string;
        gameRoom: GameRoom | undefined;
    };
    joinRoom(userId: string, roomId: string): void;
    getUserRoom(userId: string): string | undefined;
    executeGameAction(roomId: string, action: any): Promise<void>;
    withLock<T>(roomId: string, operation: () => Promise<T>): Promise<T>;
}
