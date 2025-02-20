import { Injectable } from '@nestjs/common';
import { State } from './models/state';
import { GameRoom } from './models/game-room.interface';
import AsyncLock from 'async-lock';

@Injectable()
export class GameService {
    private static instance: GameService;
    // ゲームの状態を管理
    private games: Map<string, GameRoom> = new Map();
    // ユーザーとルームの紐付けを管理
    private userToRoom: Map<string, string> = new Map();
    private lock: AsyncLock;

    constructor() {
        if (!GameService.instance) {
            GameService.instance = this;
            this.lock = new AsyncLock();
        }
        return GameService.instance;
    }

    // ゲームインスタンスを作成
    createGame(roomId: string, players: string[]): void {
        const state = new State();
        state.initGame();
        this.games.set(roomId, {
            players: players,
            game_state: state
        });
    }

    // ゲームの状態を取得
    getGameState(roomId: string): { room_id: string; gameRoom: GameRoom | undefined } {
        return { "room_id": roomId, "gameRoom": this.games.get(roomId) };
    }

    // ユーザーをルームに参加させる
    joinRoom(userId: string, roomId: string): void {
        this.userToRoom.set(userId, roomId);
    }

    // ユーザーのルームIDを取得
    getUserRoom(userId: string): string | undefined {
        return this.userToRoom.get(userId);
    }

    // ゲームに関する操作を実行（roomIdごとの排他制御付き）
    async executeGameAction(roomId: string, action: any): Promise<void> {
        await this.withLock(roomId, async () => {
            const gameRoom = this.games.get(roomId);
            if (!gameRoom) {
                throw new Error('Game not found');
            }
            const nextState = gameRoom.game_state.next(action);
            gameRoom.game_state = nextState;
            this.games.set(roomId, gameRoom);
        });
    }

    // 特定のroomに対する任意の排他処理を実行
    async withLock<T>(roomId: string, operation: () => Promise<T>): Promise<T> {
        return await this.lock.acquire(roomId, operation, {
            timeout: 5000,
            skipQueue: false
        });
    }
}