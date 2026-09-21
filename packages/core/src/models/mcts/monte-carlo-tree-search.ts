import { Node } from './node';
import { State } from '../state';
import { Action } from '../action';
import { argmax } from './utils';

export class MonteCarloTreeSearch {
    static train(rootNode: Node, simulation: number): void {
        rootNode.expand();
        for (let i = 0; i < simulation; i++) {
            rootNode.evaluate();
        }
    }

    static selectAction(rootNode: Node): Action {
        const legalActions = rootNode.state.legalActions();
        const visitList = rootNode.children?.map(child => child.n) || [];
        return legalActions[argmax(visitList)];
    }
}