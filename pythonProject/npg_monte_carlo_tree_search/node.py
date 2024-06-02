from __future__ import annotations
from typing import List, Optional
# from npg_monte_carlo_tree_search.istate import IState
from nullpoga_gui.state import State
from npg_monte_carlo_tree_search.util.ucb1 import ucb1
from npg_monte_carlo_tree_search.util.argmax import argmax


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
        self.children = [Node(self.state.next(action), self.expand_base) for action in self.state.legal_actions()]

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
        if state.is_lose():
            return -1
        if state.is_draw():
            return 0
        n_state = state.next(state.random_action())
        if state.pieces.player_id != n_state.pieces.player_id:
            return -Node.playout(n_state)
        else:
            return Node.playout(n_state)
