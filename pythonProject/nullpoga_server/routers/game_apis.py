from fastapi import APIRouter, HTTPException
from nullpoga_server.core.config import room_dict, room_locks, user_to_room
from nullpoga_server.models.schemas import RoomStateResponse, Action
from nullpoga_cui.state import State
from nullpoga_cui.gameutils.nullpoga_system import instance_card

router = APIRouter()


# ヘルパー関数: ルームIDとロックを取得する
async def get_room_and_lock(user_id: str):
    """メモ未実装：認証を必要とする"""
    room_id = user_to_room.get(user_id)
    if not room_id:
        print("User is not in any room.")
        raise HTTPException(status_code=404, detail="User is not in any room.")

    room_lock = room_locks.get(room_id)
    if not room_lock:
        print("Room not found.")
        raise HTTPException(status_code=404, detail="Room not found.")

    return room_id, room_lock


# ヘルパー関数: ゲーム状態を取得する
async def get_game_state_by_room(room_id: str) -> State:
    rm_data = room_dict.get(room_id)
    if not rm_data:
        raise HTTPException(status_code=404, detail="Game not found for the given room ID.")
    return rm_data['game_state']


@router.get("/game_state/{user_id}", response_model=RoomStateResponse)
async def get_game_state(user_id: str):
    """
    ユーザーIDからそのルームのゲーム状態を返すエンドポイント

    メモ未実装：相手のデッキの情報を含んでいるので、相手の情報は加工して返す
    """
    print("nagai game_state")
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = await get_game_state_by_room(room_id)
        return {"room_id": room_id, "state": game_state.to_dict()}


@router.put("/submit_action/{user_id}")
async def submit_action(user_id: str, spell_phase_actions: list[Action], summon_phase_actions: list[Action],
                        activity_phase_actions: list[Action]):
    """
    ユーザーIDからそのルームのゲーム状態を更新するエンドポイント
    """
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = await get_game_state_by_room(room_id)

        if game_state.player_1.user_id == user_id:
            pass
        elif game_state.player_2.user_id == user_id:
            pass

        # ゲーム状態を更新するロジックをここに追加
        # game_state["game_state"].player1.hp = update.player1_hp
        # game_state["game_state"].player2.hp = update.player2_hp
        # その他のゲーム状態の更新処理

        return {"room_id": room_id, "game_state": game_state.to_dict()}


# テスト用のエンドポイント
@router.get("/test_game_state/{user_id}")
async def get_test_bt_zone_game_state(user_id: str):
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = await get_game_state_by_room(room_id)
        game_state.player_1.zone.battle_field[0].card = instance_card(1)  # ネズミ
    return {"room_id": room_id, "game_state": game_state.to_dict()}


# テスト用のエンドポイント
@router.get("/api_test")
async def api_test():
    return {"message": "Welcome to nullpoga server!"}
