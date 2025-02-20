"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonteCarloTreeSearch = void 0;
const utils_1 = require("./utils");
class MonteCarloTreeSearch {
    static train(rootNode, simulation) {
        rootNode.expand();
        for (let i = 0; i < simulation; i++) {
            rootNode.evaluate();
        }
    }
    static selectAction(rootNode) {
        var _a;
        const legalActions = rootNode.state.legalActions();
        const visitList = ((_a = rootNode.children) === null || _a === void 0 ? void 0 : _a.map(child => child.n)) || [];
        return legalActions[(0, utils_1.argmax)(visitList)];
    }
}
exports.MonteCarloTreeSearch = MonteCarloTreeSearch;
//# sourceMappingURL=monte-carlo-tree-search.js.map