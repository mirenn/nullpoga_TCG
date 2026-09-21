import { State } from '../state';
import { Action } from '../action';
import { ucb1, argmax } from './utils';

export class Node {
    state: State;
    private w: number = 0;  // reward
    n: number = 0;  // visit count
    private expandBase: number;
    children: Node[] | null = null;

    constructor(state: State, expandBase: number = 10) {
        this.state = state;
        this.expandBase = expandBase;
    }

    evaluate(): number {
        if (this.state.isGameEnd()) {
            const value = this.state.isLose() ? -1 : 0;
            this.w += value;
            this.n += 1;
            return value;
        }

        if (!this.children) {
            const v = Node.playout(this.state);
            this.w += v;
            this.n += 1;
            if (this.n === this.expandBase) {
                this.expand();
            }
            return v;
        } else {
            const v = -this.nextChildBasedUcb().evaluate();
            this.w += v;
            this.n += 1;
            return v;
        }
    }

    expand(): void {
        this.children = [];
        let nextState = structuredClone(this.state);
        const legalActions = nextState.legalActions();

        for (const action of legalActions) {
            nextState = nextState.next(action);
            const childNode = new Node(nextState, this.expandBase);
            this.children.push(childNode);
        }
    }

    private nextChildBasedUcb(): Node {
        if (!this.children) {
            throw new Error('Children not expanded yet');
        }

        // Prioritize unvisited nodes
        for (const child of this.children) {
            if (child.n === 0) {
                return child;
            }
        }

        // UCB1
        const sn = this.children.reduce((sum, child) => sum + child.n, 0);
        const ucb1Values = this.children.map(child => ucb1(sn, child.n, child.w));
        return this.children[argmax(ucb1Values)];
    }

    static playout(state: State): number {
        if (state.isGameEnd()) {
            return state.evaluateResult();
        }

        const act = state.randomAction();
        const nextState = state.next(act);
        
        if (state.player1.isFirstPlayer !== nextState.player1.isFirstPlayer) {
            return -Node.playout(nextState);
        } else {
            return Node.playout(nextState);
        }
    }
}