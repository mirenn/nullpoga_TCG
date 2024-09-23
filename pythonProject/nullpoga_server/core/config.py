import os
import asyncio
from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from nullpoga_cui.player import Player
from nullpoga_cui.state import State

# FastAPIアプリケーションのインスタンス作成
app = FastAPI()

# テンプレートディレクトリの設定
templates_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates'))
templates = Jinja2Templates(directory=templates_dir)

# プレイヤーとゲームの初期状態を設定
player1_cards = [1, 1, 2, 2, 3, 4, 5, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
player2_cards = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
player1 = Player(player1_cards, 1, 'user_id_1')
player2 = Player(player2_cards, 1)
state = State(player1, player2)
state.init_game()

# ゲームの状態とユーザールームのマッピング
room_dict = {
    "room_id_1": {
        "players": ["user_id_1", "user_id_2_cpu"],
        "game_state": state,
    }
}
user_to_room = {
    "user_id_1": "room_id_1",
    "user_id_2_cpu": "room_id_1",
}

# ルームごとのロックを管理する辞書
room_locks = {
    "room_id_1": asyncio.Lock()
}
