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
async def test_submit_action_with_random_cpu():
    """
    メモ：作りかけ！！！
    :return:
    """
    user_id = "user_id_1"
    spell_phase_actions = []
    activity_phase_actions = []
    summon_phase_actions = [[
        {
            "action_type": "SUMMON_MONSTER",
            "action_data": {
                "monster_card": {
                    "card_no": 1,
                    "mana_cost": 1,
                    "card_name": "ネズミ",
                    "attack": 1,
                    "life": 1,
                    "image_url": "/static/images/1.png",
                    "card_type": "MONSTER",
                    "uniq_id": "61ccbf8d-bd60-498d-8f97-020103eabb03",
                    "stun_count": 0,
                    "can_act": True,
                    "attack_declaration": False,
                    "done_activity": False
                },
                "summon_standby_field_idx": 2
            }
        }
    ]]
    payload = {
        "spell_phase_actions": spell_phase_actions,
        "activity_phase_actions": activity_phase_actions,
        "summon_phase_actions": summon_phase_actions
    }
    client.post("/submit_action_with_random_cpu/" + user_id, json=payload)
    state = await get_game_state_fn(user_id)
    pass
# def test_play_turn():
#     response = client.post("/play", json={"player_action": "move"})
#     assert response.status_code == 200
#     assert response.json()["result"] == expected_result
