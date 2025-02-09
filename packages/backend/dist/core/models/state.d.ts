import { IState } from '../interfaces/istate';
import { Player } from './player';
import { Action } from './action';
export declare const DECK_1: number[];
export declare const DECK_2: number[];
export declare class State implements IState {
    private player1?;
    private player2?;
    private history;
    private turnHistory;
    constructor(player1?: Player, player2?: Player);
    initGame(): void;
    isGameEnd(): boolean;
    isDone(): boolean;
    isLose(): boolean;
    isDraw(): boolean;
    isBothEndPhase(): boolean;
    evaluateResult(): number;
    next(action: Action): State;
    private executeEndphase;
    private moveForward;
    private executeSummon;
    private executeActivity;
    private refreshTurn;
    private clonePlayer;
    toJson(): Record<string, any>;
    private deleteMonster;
}
