import sys
import os
import threading
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
# nullpoga_cui モジュールのパスを追加
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'nullpoga_cui')))

from nullpoga_cui.player import Player
from nullpoga_cui.state import State
from nullpoga_server.models.schemas import State as Ret_State

# FastAPIアプリケーションのインスタンス作成
app = FastAPI()

# テンプレートディレクトリの設定
templates_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
templates = Jinja2Templates(directory=templates_dir)

# プレイヤーとゲームの初期状態を設定
player1_cards = [1, 1, 2, 2, 3, 4, 5, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
player2_cards = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
player1 = Player(player1_cards, 1)
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
    "room_id_1": threading.Lock()
}


# HTMLを返すエンドポイント
@app.get("/", response_class=HTMLResponse)
async def get_game_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# テスト用のエンドポイント
@app.get("/api_test")
async def read_root():
    return {"message": "Welcome to nullpoga server!"}


# テストページを返すエンドポイント
@app.get("/test", response_class=HTMLResponse)
async def test_page(request: Request):
    return templates.TemplateResponse("test.html", {"request": request})


# ゲーム状態を取得するエンドポイント
@app.get("/game_state/{user_id}", response_model=Ret_State)
async def get_game_state(user_id: str):
    """
    ユーザーIDからそのルームのゲーム状態を返すエンドポイント

    メモ：相手のデッキの情報を含んでいるので、相手の情報は加工して返す
    """
    room_id = user_to_room.get(user_id)
    if not room_id:
        raise HTTPException(status_code=404, detail="User is not in any room.")

    # ルームのロックを取得してゲーム状態を操作
    room_lock = room_locks.get(room_id)
    if not room_lock:
        raise HTTPException(status_code=404, detail="Room not found.")

    with room_lock:
        # ルームIDからゲーム状態を取得
        game_state = room_dict.get(room_id)
        if game_state:
            return {"room_id": room_id, "game_state": game_state}  # 返却の仕方を考える
        else:
            raise HTTPException(status_code=404, detail="Game state not found for the given room ID.")


# ゲーム状態を更新するエンドポイント（例）
@app.post("/update_game_state/{user_id}")
async def update_game_state(user_id: str, update_data: dict):
    """
    ユーザーIDからそのルームのゲーム状態を更新するエンドポイント
    """
    room_id = user_to_room.get(user_id)
    if not room_id:
        raise HTTPException(status_code=404, detail="User is not in any room.")

    room_lock = room_locks.get(room_id)
    if not room_lock:
        raise HTTPException(status_code=404, detail="Room not found.")

    # ルームのロックを取得してゲーム状態を更新
    with room_lock:
        game_state = room_dict.get(room_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Game state not found for the given room ID.")

        # ゲーム状態を更新する処理をここに記述
        # 例: game_state["game_state"].update(update_data)
        game_state["game_state"].process_update(update_data)  # 仮の関数例

        return {"message": "Game state updated successfully", "game_state": game_state}
