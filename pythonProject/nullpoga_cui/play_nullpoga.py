from state import State
from npg_monte_carlo_tree_search.node import Node
from npg_monte_carlo_tree_search.monte_carlo_tree_search import MonteCarloTreeSearch

GAMES = 100


def first_player_point(ended_state: State) -> float:
    # 1:先手勝利, 0:先手敗北, 0.5:引き分け
    if ended_state.is_lose():
        return 0 if ended_state.is_first_player() else 1
    return 0.5


point = 0

for _ in range(GAMES):
    state = State()
    state.init_game()
    while True:
        if state.is_done():
            if state.is_draw():
                print("引き分け")
            elif state.is_first_player() and state.is_lose():
                print("先手 (o) の負け ")
            else:
                print("後手 (x) の負け ")
            break

        if state.is_first_player():
            root_node: Node = Node(state, expand_base=10)
            MonteCarloTreeSearch.train(root_node=root_node, simulation=100)
            action = MonteCarloTreeSearch.select_action(root_node)
            state = state.next(action)
        else:
            action = state.random_action_mock()
            state = state.next(action)

        print(state)
        print()

    point += first_player_point(state)

print(f"VS Random {point}")
