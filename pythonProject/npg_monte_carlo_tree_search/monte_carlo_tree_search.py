from monte_carlo_tree_search.node import Node
from monte_carlo_tree_search.util.argmax import argmax


class MonteCarloTreeSearch:

    @classmethod
    def train(cls, root_node: Node, simulation: int) -> None:
        root_node.expand()
        for _ in range(simulation):
            root_node.evaluate()

    @classmethod
    def select_action(cls, root_node: Node) -> int:
        legal_actions = root_node.state.legal_actions()
        visit_list = [child.n for child in root_node.children]
        return legal_actions[argmax(visit_list)]
