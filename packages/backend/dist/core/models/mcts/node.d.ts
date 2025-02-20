import { State } from '../state';
export declare class Node {
    state: State;
    private w;
    n: number;
    private expandBase;
    children: Node[] | null;
    constructor(state: State, expandBase?: number);
    evaluate(): number;
    expand(): void;
    private nextChildBasedUcb;
    static playout(state: State): number;
}
