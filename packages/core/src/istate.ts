export interface IState {
    isGameEnd(): boolean;
    isDone(): boolean;
    isLose(): boolean;
    isDraw(): boolean;
    evaluateResult(): number;
    toJson(): Record<string, any>;
}