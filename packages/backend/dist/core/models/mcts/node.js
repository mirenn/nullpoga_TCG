"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const utils_1 = require("./utils");
class Node {
    constructor(state, expandBase = 10) {
        this.w = 0;
        this.n = 0;
        this.children = null;
        this.state = state;
        this.expandBase = expandBase;
    }
    evaluate() {
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
        }
        else {
            const v = -this.nextChildBasedUcb().evaluate();
            this.w += v;
            this.n += 1;
            return v;
        }
    }
    expand() {
        this.children = [];
        let nextState = structuredClone(this.state);
        const legalActions = nextState.legalActions();
        for (const action of legalActions) {
            nextState = nextState.next(action);
            const childNode = new Node(nextState, this.expandBase);
            this.children.push(childNode);
        }
    }
    nextChildBasedUcb() {
        if (!this.children) {
            throw new Error('Children not expanded yet');
        }
        for (const child of this.children) {
            if (child.n === 0) {
                return child;
            }
        }
        const sn = this.children.reduce((sum, child) => sum + child.n, 0);
        const ucb1Values = this.children.map(child => (0, utils_1.ucb1)(sn, child.n, child.w));
        return this.children[(0, utils_1.argmax)(ucb1Values)];
    }
    static playout(state) {
        if (state.isGameEnd()) {
            return state.evaluateResult();
        }
        const act = state.randomAction();
        const nextState = state.next(act);
        if (state.player1.isFirstPlayer !== nextState.player1.isFirstPlayer) {
            return -Node.playout(nextState);
        }
        else {
            return Node.playout(nextState);
        }
    }
}
exports.Node = Node;
//# sourceMappingURL=node.js.map