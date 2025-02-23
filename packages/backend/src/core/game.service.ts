import { Injectable } from '@nestjs/common';
import { State } from './models/state';
import { GameRoom } from './models/game-room.interface';
import AsyncLock from 'async-lock';
import { Player } from './models/player';

@Injectable()
export class GameService {
    private static instance: GameService;
    // ゲームの状態を管理
    private games: Map<string, GameRoom> = new Map();
    // ユーザーとルームの紐付けを管理
    private userToRoom: Map<string, string> = new Map();
    // マッチング待ちのプレイヤーを管理
    private waitingPlayers: string[] = ['player2'];
    private lock: AsyncLock;

    constructor() {
        if (!GameService.instance) {
            GameService.instance = this;
            this.lock = new AsyncLock();
        }
        return GameService.instance;
    }

    // ゲームインスタンスを作成
    private createGame(userIds: string[]): string {
        const roomId = Date.now().toString();
        const player1 = new Player([7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2],userIds[0]);
        const player2 = new Player([4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2],userIds[1]);
        const state = new State(player1, player2);
        state.initGame();
        this.games.set(roomId, {
            userIds: userIds,
            gameState: state
        });
        
        // プレイヤーをルームに参加させる
        userIds.forEach(userId => this.joinRoom(userId, roomId));
        
        return roomId;
    }

    // マッチメイキングの開始
    async startMatching(userId: string): Promise<{ status: 'waiting' | 'matched', roomId?: string }> {
        // すでにルームに参加している場合はエラー
        if (this.getUserRoom(userId)) {
            throw new Error('User is already in a room');
        }

        // マッチング待ちのプレイヤーがいる場合、ゲームを作成
        if (this.waitingPlayers.length > 0) {
            const opponent = this.waitingPlayers.shift()!;
            const roomId = this.createGame([userId, opponent]);
            return { status: 'matched', roomId };
        }

        // マッチング待ちのプレイヤーがいない場合、待機リストに追加
        this.waitingPlayers.push(userId);
        return { status: 'waiting' };
    }

    // ゲームの状態を取得
    getGameState(userId: string): { roomId: string; gameRoom: GameRoom | undefined } {
        const roomId = this.getUserRoom(userId);
        if (!roomId) {
            throw new Error('User is not in a room');
        }
        return { roomId, gameRoom: this.games.get(roomId) };
    }

    // ユーザーをルームに参加させる
    private joinRoom(userId: string, roomId: string): void {
        this.userToRoom.set(userId, roomId);
    }

    // ユーザーのルームIDを取得
    getUserRoom(userId: string): string | undefined {
        return this.userToRoom.get(userId);
    }

    // マッチング待機状態を確認
    isWaiting(userId: string): boolean {
        return this.waitingPlayers.includes(userId);
    }

    // マッチング待機をキャンセル
    cancelMatching(userId: string): void {
        const index = this.waitingPlayers.indexOf(userId);
        if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
        }
    }

    // ゲームに関する操作を実行（roomIdごとの排他制御付き）
    async executeGameAction(roomId: string, action: any): Promise<void> {
        await this.withLock(roomId, async () => {
            const gameRoom = this.games.get(roomId);
            if (!gameRoom) {
                throw new Error('Game not found');
            }
            const nextState = gameRoom.gameState.next(action);
            gameRoom.gameState = nextState;
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