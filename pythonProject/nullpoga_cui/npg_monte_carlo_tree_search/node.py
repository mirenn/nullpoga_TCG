from __future__ import annotations
from typing import List, Optional
# from npg_monte_carlo_tree_search.istate import IState
from nullpoga_cui.state import State
from npg_monte_carlo_tree_search.util.ucb1 import ucb1
from npg_monte_carlo_tree_search.util.argmax import argmax

DEBUG = True


class Node:
    def __init__(self, state: State, expand_base: int = 10) -> None:
        self.state: State = state
        self.w: int = 0  # 報酬
        self.n: int = 0  # 訪問回数
        self.expand_base: int = expand_base
        self.children: Optional[List[Node]] = None

    def evaluate(self) -> float:
        """self (current Node) の評価値を計算して更新する."""
        if self.state.is_done():
            value = -1 if self.state.is_lose() else 0
            self.w += value
            self.n += 1
            return value

        # self (current Node) に子ノードがない場合
        if not self.children:
            # ランダムにプレイする
            v = Node.playout(self.state)
            self.w += v
            self.n += 1
            # 十分に self (current Node) がプレイされたら展開(1ノード掘り進める)する
            if self.n == self.expand_base:
                self.expand()
            return v
        else:
            v = -self.next_child_based_ucb().evaluate()
            self.w += v
            self.n += 1
            return v

    def expand(self) -> None:
        """self (current Node) を展開する."""
        if DEBUG:
            print("expand 可能なactionの数だけchildrenを生やす。")
            # print("可能なaction", self.state.legal_actions())

        # self.children = [Node(self.state.next(action), self.expand_base) for action in self.state.legal_actions()]
        self.children = []
        for action in self.state.legal_actions():
            next_state = self.state.next(action)  # nagai がおかしい。
            child_node = Node(next_state, self.expand_base)
            self.children.append(child_node)

    def next_child_based_ucb(self) -> Node:
        """self (current Node) の子ノードから1ノード選択する."""

        # 試行回数が0のノードを優先的に選ぶ
        for child in self.children:
            if child.n == 0:
                return child

        # UCB1
        sn = sum([child.n for child in self.children])
        ucb1_values = [ucb1(sn, child.n, child.w) for child in self.children]
        return self.children[argmax(ucb1_values)]

    @classmethod
    def playout(cls, state: State) -> float:
        """決着がつくまでランダムにプレイする."""
        if state.is_game_end():
            return state.evaluate_result()
        if state.is_both_end_phase():
            state.refresh_turn()
        act = state.random_action()  # nagaiデバッグ確認用に一旦変数に入れている
        n_state = state.next(act)
        if state.player_1.is_first_player != n_state.player_1.is_first_player:
            return -Node.playout(n_state)
        else:
            return Node.playout(n_state)
