import pytest
from state import State
from npg_monte_carlo_tree_search.node import Node
from npg_monte_carlo_tree_search.monte_carlo_tree_search import MonteCarloTreeSearch
from player import Player

GAMES = 1  # 実行するゲームの回数


def first_player_point(ended_state: State) -> float:
    """
    終了したゲームの状態を評価し、先手プレイヤーのポイントを返す。
    - 1: 先手勝利
    - 0: 引き分け
    - -1: 先手敗北
    """
    return ended_state.evaluate_result()


def test_play_monte_carlo():
    """
    モンテカルロ木探索を使ったゲームシミュレーションを行う関数。
    ランダムに行動するプレイヤーとの対戦結果をポイントとして評価し、最終的なポイントを出力する。
    """
    point = 0  # 先手プレイヤーの総ポイント
    for _ in range(GAMES):  # 指定回数のゲームを繰り返す
        # プレイヤーの手札を設定
        player1_cards = [1, 1, 2, 2, 3, 4, 5, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
        player2_cards = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]

        # プレイヤー1とプレイヤー2のインスタンスを作成
        player1 = Player(player1_cards, 1)
        player2 = Player(player2_cards, 1)

        # プレイヤー2の戦略設定
        player2.attack_all = False
        player2.summon_all = False

        # 初期状態を設定し、ゲームを初期化
        state = State(player1, player2)
        state.init_game()

        # ゲームが終了するまでループ
        while True:
            if state.is_done():  # ゲーム終了判定
                if state.is_draw():
                    print("引き分け")
                elif state.is_first_player() and state.is_lose():
                    print("先手 (o) の負け ")
                else:
                    print("後手 (x) の負け ")
                break

            # 先手プレイヤーの行動（モンテカルロ木探索を使用）
            if state.is_first_player():
                # ルートノードを初期化し、探索を行う
                root_node: Node = Node(state, expand_base=2)  # ルートノードを展開、パラメータ5は探索の拡大範囲
                MonteCarloTreeSearch.train(root_node=root_node, simulation=3)  # シミュレーションを5回実行
                action = MonteCarloTreeSearch.select_action(root_node)  # 最適な行動を選択
                state = state.next(action)  # 選択された行動をもとに次の状態へ進む
            else:
                # 後手プレイヤーの行動（ランダムに選択）
                action = state.random_action()  # ランダムな行動を選択
                state = state.next(action)  # 選択された行動をもとに次の状態へ進む

        # ゲーム終了後、先手プレイヤーの結果をポイントに加算
        point += first_player_point(state)

    # 全ゲーム終了後、総ポイントを出力
    print(f"VS Random {point}")
    assert point == GAMES  # メモ：雑にGAMESの数だけ勝利ポイントを得ていると考えて
