import { State } from './models/state';
import { Player } from './models/player';
import { redis } from '../redis';
import { v4 as uuidv4 } from 'uuid';

export const GameService = {
    // ユーザーとルームの紐付けを管理 (Redis key: game:user:{userId} -> roomId)
    async getUserRoom(userId: string): Promise<string | null> {
        return await redis.get(`game:user:${userId}`);
    },

    async joinRoom(userId: string, roomId: string): Promise<void> {
        await redis.set(`game:user:${userId}`, roomId);
    },

    // マッチング待ちのプレイヤーを管理 (Redis List: game:waiting)
    async startMatching(userId: string): Promise<{ status: 'waiting' | 'matched', roomId?: string }> {
        const currentRoom = await this.getUserRoom(userId);
        if (currentRoom) {
            throw new Error('User is already in a room');
        }

        // Check if anyone is waiting
        // Use RPOP to get a waiting player
        const opponent = await redis.rpop('game:waiting');
        
        if (opponent) {
            if (opponent === userId) {
                // Same user waiting? Push back
                await redis.lpush('game:waiting', userId);
                return { status: 'waiting' };
            }
            // Match found!
            const roomId = await this.createGame([userId, opponent]);
            // Remove opponent from waiting (already popped)
            return { status: 'matched', roomId };
        } else {
            // No one waiting, push self
            await redis.lpush('game:waiting', userId);
            return { status: 'waiting' };
        }
    },

    async cancelMatching(userId: string): Promise<void> {
        await redis.lrem('game:waiting', 0, userId);
    },

    async isWaiting(userId: string): Promise<boolean> {
        // This is expensive in Redis List (O(N)), but for small N it's fine.
        // Alternatively use a Set for quick lookup.
        const list = await redis.lrange('game:waiting', 0, -1);
        return list.includes(userId);
    },

    // ゲームインスタンスを作成 (Redis key: game:room:{roomId})
    async createGame(userIds: string[]): Promise<string> {
        const roomId = uuidv4();
        
        // Initialize State
        // Ensure decks are configured or passed. Using Default currently.
        // We need to fetch User IDs.
        const player1 = new Player([7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2], userIds[0]);
        const player2 = new Player([4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2], userIds[1]);
        
        const state = new State(player1, player2);
        state.initGame();
        
        // Save to Redis
        const gameData = {
            userIds,
            gameState: state.toJson()
        };
        
        await redis.set(`game:room:${roomId}`, JSON.stringify(gameData));
        
        // Update user mappings
        await Promise.all(userIds.map(uid => this.joinRoom(uid, roomId)));
        
        return roomId;
    },

    async getGameState(userId: string): Promise<{ roomId: string; gameRoom: { userIds: string[], gameState: State } | undefined }> {
        const roomId = await this.getUserRoom(userId);
        if (!roomId) {
            throw new Error('User is not in a room');
        }
        
        const dataStr = await redis.get(`game:room:${roomId}`);
        if (!dataStr) {
           return { roomId, gameRoom: undefined };
        }
        
        const data = JSON.parse(dataStr);
        // Hydrate State
        const state = State.fromDict(data.gameState);
        
        return { 
            roomId, 
            gameRoom: {
                userIds: data.userIds,
                gameState: state
            }
        };
    },

    // ゲームに関する操作を実行
    async executeGameAction(roomId: string, action: any): Promise<void> {
        await this.executeGameActions(roomId, [action]);
    },

    async executeGameActions(roomId: string, actions: any[]): Promise<void> {
        const dataStr = await redis.get(`game:room:${roomId}`);
        if (!dataStr) {
            throw new Error('Game not found');
        }
        
        const data = JSON.parse(dataStr);
        let state = State.fromDict(data.gameState);
        
        // Process actions
        for (const action of actions) {
            state = state.next(action);
        }
        
        // Update data
        data.gameState = state.toJson();
        
        await redis.set(`game:room:${roomId}`, JSON.stringify(data));
    }
};