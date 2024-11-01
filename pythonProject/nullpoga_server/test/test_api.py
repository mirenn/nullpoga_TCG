from fastapi.testclient import TestClient
from nullpoga_server.main import app
from nullpoga_server.routers.game_apis import get_game_state_fn
import pytest

client = TestClient(app)


def test_read_root():
    response = client.get("/api_test")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to nullpoga server!"}


@pytest.mark.asyncio
async def test_submit_summon_action_with_random_cpu():
    """
    テスト関数: ランダムCPUで召喚アクションを送信する

    このテストは、特定のユーザーIDに対して召喚アクションを送信し、
    その結果としてゲーム状態が正しく更新されることを確認します。
    """
    user_id = "user_id_1"
    spell_phase_actions = []
    activity_phase_actions = []

    # ゲーム状態を取得
    game_state = await get_game_state_fn(user_id)
    hand_card = game_state["state"]["player_1"]["hand_cards"][0]
    hand_card["uniq_id"] = str(hand_card["uniq_id"])
    hand_card["card_type"] = hand_card["card_type"].value

    # 召喚アクションを定義
    summon_phase_actions = [
        {
            "action_type": "SUMMON_MONSTER",
            "action_data": {
                "monster_card": hand_card,
                "summon_standby_field_idx": 2
            }
        }
    ]

    # ペイロードを作成
    payload = {
        "spell_phase_actions": spell_phase_actions,
        "activity_phase_actions": activity_phase_actions,
        "summon_phase_actions": summon_phase_actions
    }

    # アクションを送信
    client.post(f"/submit_action_with_random_cpu/{user_id}", json=payload)

    # ゲーム状態を再取得し、アサーションを行う
    game_state = await get_game_state_fn(user_id)
    assert game_state["state"]["player_1"]["zone"]["standby_field"][2]["card_name"] == "ネズミ"
