import copy

from fastapi import APIRouter, HTTPException
from nullpoga_server.core.config import room_dict, room_locks, user_to_room
from nullpoga_server.models.schemas import RoomStateResponse, Action
from nullpoga_cui.state import State
from nullpoga_cui.gameutils.instance_card import instance_card
from nullpoga_cui.player import PhaseKind
from nullpoga_cui.gameutils.action import Action as npgAction, ActionType

router = APIRouter()


# ヘルパー関数: ルームIDとロックを取得する
async def get_room_and_lock(user_id: str):
    """メモ未実装：認証を必要とする"""
    room_id = user_to_room.get(user_id)
    if not room_id:
        print(f"User:{room_id} is not in any room.")
        raise HTTPException(status_code=404, detail="User is not in any room.")

    room_lock = room_locks.get(room_id)
    if not room_lock:
        print(f"Room:{room_id} not found.")
        raise HTTPException(status_code=404, detail="Room not found.")

    return room_id, room_lock


# ヘルパー関数: ゲーム状態を取得する
def get_game_state_by_room(room_id: str) -> State:
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
    return await get_game_state_fn(user_id)


async def get_game_state_fn(user_id: str):
    """
    テスト関数では外から呼ぶ
    """
    print("nagai game_state")
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = get_game_state_by_room(room_id)
        return {"room_id": room_id, "state": game_state.to_dict()}


@router.post("/submit_action_with_random_cpu/{user_id}")
async def submit_action_with_random_cpu(user_id: str, spell_phase_actions: list[Action],
                                        summon_phase_actions: list[Action],
                                        activity_phase_actions: list[Action]):
    """
    ユーザーIDからそのルームのゲーム状態を更新するエンドポイント
    ・randomに手を選ぶCPUと戦うときに使用する。
    ・プレイヤーがアクションを提出したときに、CPUの手を計算し始める
    """
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = get_game_state_by_room(room_id)

        # プレイヤーのアクションを設定
        current_player, opponent = get_current_and_opponent(game_state, user_id)
        if not current_player or current_player.phase == PhaseKind.END_PHASE:
            raise HTTPException(status_code=400, detail="Invalid player phase or actions.")

        npg_spell_phase_actions = [action.to_dataclass() for action in spell_phase_actions]
        npg_summon_phase_actions = [action.to_dataclass() for action in summon_phase_actions]
        npg_activity_phase_actions = [action.to_dataclass() for action in activity_phase_actions]

        npg_spell_phase_actions.append(npgAction(action_type=ActionType.SPELL_PHASE_END))
        npg_summon_phase_actions.append(npgAction(action_type=ActionType.SUMMON_PHASE_END))
        npg_activity_phase_actions.append(npgAction(action_type=ActionType.ACTIVITY_PHASE_END))

        set_player_actions(current_player, npg_spell_phase_actions, npg_summon_phase_actions,
                           npg_activity_phase_actions)
        current_player.phase = PhaseKind.END_PHASE

        # プレイヤーの状態をスワップしてCPUの手を進める?
        swap_players(game_state)
        room_dict[room_id]['game_state'] = process_cpu_turn(game_state)  # メモ：returnしたstateでroomのを更新する必要があるかも

        return {"history": game_state.history}


def get_current_and_opponent(game_state: State, user_id: str):
    """現在のプレイヤーと相手プレイヤーを取得するヘルパー関数"""
    if game_state.player_1.user_id == user_id:
        return game_state.player_1, game_state.player_2
    elif game_state.player_2.user_id == user_id:
        return game_state.player_2, game_state.player_1
    return None, None


def set_player_actions(player, spell_phase_actions, summon_phase_actions, activity_phase_actions):
    """プレイヤーのアクションを設定するヘルパー関数"""
    player.spell_phase_actions = spell_phase_actions
    player.summon_phase_actions = summon_phase_actions
    player.activity_phase_actions = activity_phase_actions


def swap_players(game_state: State):
    """プレイヤーの状態をスワップするヘルパー関数"""
    old_game_state = copy.deepcopy(game_state)
    game_state.player_1 = old_game_state.player_2
    game_state.player_2 = old_game_state.player_1


def process_cpu_turn(game_state: State) -> State:
    # pass_activity_phase_f = False
    """CPUのターン処理を進めるヘルパー関数"""
    while True:
        if game_state.player_1.phase == PhaseKind.SPELL_PHASE and game_state.player_2.phase == PhaseKind.SPELL_PHASE:
            # pass_activity_phase_f = True  # ターン終了までの処理が完了している
            return game_state

        action = game_state.random_action()  # ランダムな行動を選択
        game_state = game_state.next(action)  # 選択された行動をもとに次の状態へ進む


@router.get("/test_game_state/{user_id}")
async def get_test_bt_zone_game_state(user_id: str):
    """
    テスト用のエンドポイント。状態取得関数仮
    :param user_id:
    :return:
    """
    room_id, room_lock = await get_room_and_lock(user_id)

    async with room_lock:
        game_state = get_game_state_by_room(room_id)
        game_state.player_1.zone.battle_field[0].card = instance_card(1)  # ネズミ
    return {"room_id": room_id, "game_state": game_state.to_dict()}


# テスト用のエンドポイント
@router.get("/api_test")
async def api_test():
    return {"message": "Welcome to nullpoga server!"}
