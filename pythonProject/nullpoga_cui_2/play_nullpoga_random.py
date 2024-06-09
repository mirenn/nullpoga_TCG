from state import State
import logging

if __name__ == "__main__":
    # 準備＆初期状態表示
    state = State()
    state.print()

    # ゲーム開始（５枚ドロー）
    # ログレベルをINFOにするとログは何も表示されない
    # logging.basicConfig(level=logging.INFO)
    logging.basicConfig(level=logging.DEBUG)

    # debug=False（もしくは指定しない）場合は終局まで一気に進む
    # state.init_game(debug=False)
    state.init_game(debug=True)
    state.print()

    # 10ターンプレイ
    for _ in range(10):
        # 先手プレイヤーでランダムなアクションの計画を設定
        state.random_action()

        # 後手プレイヤーでランダムなアクションの計画を設定
        state = state.change_player()
        state.random_action()
        state = state.change_player()  # 別に手番は戻さなくてもよいが一応戻す

        # １ターン分の処理を実行
        state = state.next_turn()
        state.print()

        # ゲームが終了していたらbreak
        if state.is_done():
            break
