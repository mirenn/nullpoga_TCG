from __future__ import annotations

import copy
from typing import List, Optional
# from npg_monte_carlo_tree_search.istate import IState
from nullpoga_cui.state import State
from nullpoga_cui.npg_monte_carlo_tree_search.util.ucb1 import ucb1
from nullpoga_cui.npg_monte_carlo_tree_search.util.argmax import argmax

# from player import PhaseKind, Action, ActionData, ActionType
# from nullpoga_cui.player import Player, PhaseKind
# from nullpoga_cui.gameutils.zone import FieldStatus
# from nullpoga_cui.gameutils.action import ActionType, ActionData, Action

DEBUG = True


class Node:
    def __init__(self, state: State, expand_base: int = 10) -> None:
        """

        :param state:
        :param expand_base: 十分に self (current Node) がプレイされたら展開(1ノード掘り進める)する
        """
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
        """self (current Node) を展開する.
        メモ:ここはもっとシンプルにできたかもしれない……"""
        if DEBUG:
            print("expand 可能なactionの数だけchildrenを生やす。")
            # print("可能なaction", self.state.legal_actions())

        # self.children = [Node(self.state.next(action), self.expand_base) for action in self.state.legal_actions()]
        self.children = []

        # nagai:legal_actions()がEND_PHASE(次のプレイヤーに回す)時に空になってしまうように作ってしまったので……。
        # メモ:ここはもっとカンタンにできたかもしれない
        # if self.state.player_1.phase == PhaseKind.END_PHASE:
        #     # = copy.deepcopy(self.state)
        #     next_state = self.state.next(
        #         Action(ActionType.ACTIVITY_PHASE_END))  # State(self.state.player_2, self.state.player_1)
        # else:
        #     next_state = self.state
        next_state = copy.deepcopy(self.state)
        # if self.state.player_1.phase == PhaseKind.END_PHASE:
        #     if self.state.player_2.phase == PhaseKind.END_PHASE:
        #         # 実際に処理する必要がある
        #         next_state.execute_endphase(next_state.player_1, next_state.player_2)
        #         next_state.refresh_turn(next_state.player_1, next_state.player_2)
        #     else:
        #         pass
        #     next_state = State(next_state.player_2, next_state.player_1)  # nagai順番を変更する
        # else:
        #     next_state = State(next_state.player_1, next_state.player_2)

        nl = next_state.legal_actions()  # デバッグのため変数に

        for action in nl:
            next_state = next_state.next(action)
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
        # if state.is_both_end_phase():
        #     state.refresh_turn()
        act = state.random_action()  # nagaiデバッグ確認用に一旦変数に入れている
        n_state = state.next(act)
        if state.player_1.is_first_player != n_state.player_1.is_first_player:
            return -Node.playout(n_state)
        else:
            return Node.playout(n_state)
