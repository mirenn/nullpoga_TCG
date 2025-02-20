import { Node } from './node';
import { Action } from '../action';
export declare class MonteCarloTreeSearch {
    static train(rootNode: Node, simulation: number): void;
    static selectAction(rootNode: Node): Action;
}
