"""
pytest
メモ：モンテカルロの一通りのテストが目的
・node.pyのplayout()のテストを目指す
・playout()に関するテストを書く
　・state.py next(state.random_action())

"""
import copy

import pytest
from state import State
from player import Player, ActionType


@pytest.fixture
def few_cards_instance_state():
    player1_cards = [1, 11, 11, 11, 11, 11, 2]
    player2_cards = [1, 11, 11, 11, 11, 11, 3]
    player1 = Player(player1_cards, 1)
    player2 = Player(player2_cards, 1)

    return State(player1, player2)


def test_fcds_legal_actions(few_cards_instance_state):
    """
    ネズミをネズミをそれぞれの場に出す(5) + エンドフェイズ(1)のActionのみ入っていることを確認する
    :param few_cards_instance_state:
    :return:
    """
    ret_action = few_cards_instance_state.legal_actions()
    # print(ret_action)
    # ネズミをそれぞれの場に出す(5) + エンドフェイズ(1)
    assert len(ret_action) == 6
    # 最初の5つのアクションを確認
    for i in range(5):
        action = ret_action[i]

        # action_type が SUMMON_MONSTER であることを確認
        assert action.action_type == ActionType.SUMMON_MONSTER, f"Action type at index {i} is not SUMMON_MONSTER"

        # summon_standby_field_idx が 0～4 であることを確認
        assert action.action_data.summon_standby_field_idx == i, f"summon_standby_field_idx at index {i} is not {i}"

        # monster_card.card_no が 1 であることを確認
        assert action.action_data.monster_card.card_no == 1, f"monster_card.card_no at index {i} is not 1"
    # フェイズエンドがひとつ
    assert ret_action[5].action_type == ActionType.SUMMON_PHASE_END


def test_fcds_select_plan_action_summon_monster(few_cards_instance_state):
    """player1のactionがsummon monsterのときの確認
    player_1
    - summon_phase_actionsに追加
    - plan系で召喚処理を完了させる
      - plan_mana 減らす
      - plan_zone.standby_field 召喚する
      - plan_hand_cards 召喚したカードを消す"""
    ret_action = few_cards_instance_state.legal_actions()
    copy_player_1 = copy.deepcopy(few_cards_instance_state.player_1)
    few_cards_instance_state.player_1.select_plan_action(ret_action[0])
    assert ret_action[0].action_data.monster_card.mana_cost == 1
    # plan_mana
    assert few_cards_instance_state.player_1.plan_mana == copy_player_1.plan_mana - ret_action[
        0].action_data.monster_card.mana_cost
    # plan_zone
    assert few_cards_instance_state.player_1.plan_zone.standby_field[
               ret_action[0].action_data.summon_standby_field_idx] == ret_action[0].action_data.monster_card
    # plan_hand_cards
    assert len(few_cards_instance_state.player_1.plan_hand_cards) == len(copy_player_1.plan_hand_cards) - 1


def test_fcds_execute_plan_summon():
    pass


def test_fcds_execute_plan_activity():
    pass


def test_fcds_next(few_cards_instance_state):
    pass
#     few_cards_instance_state.next()
