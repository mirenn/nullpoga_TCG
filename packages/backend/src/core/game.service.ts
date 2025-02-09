import { Injectable } from '@nestjs/common';
import { State } from './models/state';

@Injectable()
export class GameService {
    private static instance: GameService;
    // ゲームの状態を管理
    private games: Map<string, State> = new Map();

    constructor() {
        if (!GameService.instance) {
            GameService.instance = this;
        }
        return GameService.instance;
    }

    // ゲームインスタンスを作成
    createGame(gameId: string): void {
        const state = new State();
        state.initGame();
        this.games.set(gameId, state);
    }

    // ゲームの状態を取得
    getGame(gameId: string): State | undefined {
        return this.games.get(gameId);
    }

    // ゲームに関する操作を実行
    //TODO：仮実装であり、本当はこれでは動かない
    executeGameAction(gameId: string, action: any): void {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        const nextState = game.next(action);
        this.games.set(gameId, nextState);
    }
}