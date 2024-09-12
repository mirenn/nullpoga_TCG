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
from player import Player, ActionType, Action, ActionData, FieldStatus
from gameutils.nullpoga_system import instance_card


@pytest.fixture
def few_cds_state():
    player1_cards = [1, 11, 11, 11, 11, 11, 2]
    player2_cards = [1, 11, 11, 11, 11, 11, 3]
    player1 = Player(player1_cards, 1)
    player2 = Player(player2_cards, 1)

    return State(player1, player2)


def test_fcds_legal_actions(few_cds_state):
    """
    ネズミをネズミをそれぞれの場に出す(5) + エンドフェイズ(1)のActionのみ入っていることを確認する
    :param few_cds_state:
    :return:
    """
    ret_action = few_cds_state.legal_actions()
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


def test_fcds_select_plan_action_summon_monster(few_cds_state):
    """player1のactionがsummon monsterのときの確認
    player_1
    - summon_phase_actionsに追加
    - plan系で召喚処理を完了させる
      - plan_mana 減らす
      - plan_zone.standby_field 召喚する
      - plan_hand_cards 召喚したカードを消す"""
    ret_action = few_cds_state.legal_actions()
    copy_player_1 = copy.deepcopy(few_cds_state.player_1)
    few_cds_state.player_1.select_plan_action(ret_action[0])
    assert ret_action[0].action_data.monster_card.mana_cost == 1
    # plan_mana
    assert few_cds_state.player_1.plan_mana == copy_player_1.plan_mana - ret_action[
        0].action_data.monster_card.mana_cost
    # plan_zone
    assert few_cds_state.player_1.plan_zone.standby_field[
               ret_action[0].action_data.summon_standby_field_idx] == ret_action[0].action_data.monster_card
    # plan_hand_cards
    assert len(few_cds_state.player_1.plan_hand_cards) == len(copy_player_1.plan_hand_cards) - 1


def test_monster_attacked(few_cds_state):
    few_cds_state.player_1.zone.battle_field[0].card = instance_card(1)
    few_cds_state.player_2.zone.battle_field[4].card = instance_card(1)
    few_cds_state.player_2.zone.battle_field[0].card = instance_card(1)

    p1_life = copy.deepcopy(few_cds_state.player_1.life)
    few_cds_state.player_1.monster_attacked(Action(ActionType.MONSTER_MOVE, ActionData(
        monster_card=few_cds_state.player_2.zone.battle_field[4].card)),
                                            few_cds_state.player_2.zone)
    # ネズミのライフが0に
    assert few_cds_state.player_1.zone.battle_field[0].card.life == 0
    # 攻撃したモンスター行動不能状態
    assert few_cds_state.player_2.zone.battle_field[4].card.can_act is False

    few_cds_state.player_1.monster_attacked(Action(ActionType.MONSTER_MOVE, ActionData(
        monster_card=few_cds_state.player_2.zone.battle_field[0].card)),
                                            few_cds_state.player_2.zone)
    # ダイレクトアタックでライフが1減る
    assert p1_life - 1 == few_cds_state.player_1.life
    # ダイレクトアタックでwildに
    assert few_cds_state.player_1.zone.battle_field[4].status == FieldStatus.WILDERNESS

    # nagaiついでにdelete_monsterも確認する
    few_cds_state.delete_monster(few_cds_state.player_1, few_cds_state.player_2)
    assert few_cds_state.player_1.zone.battle_field[0].card is None

    few_cds_state.player_1.monster_attacked(Action(ActionType.MONSTER_MOVE, ActionData(
        monster_card=few_cds_state.player_2.zone.battle_field[0].card)),
                                            few_cds_state.player_2.zone)
    # 一度攻撃したものはもう一度攻撃できないためライフに変動がないことを確認
    assert p1_life - 1 == few_cds_state.player_1.life


def test_fcds_execute_move(few_cds_state):
    """
    monster moveテスト
    :return:
    """
    few_cds_state.player_1.zone.battle_field[1].card = instance_card(1)
    monster_move_act = Action(ActionType.MONSTER_MOVE,
                              ActionData(few_cds_state.player_1.zone.battle_field[1].card,
                                         move_direction="RIGHT"))
    few_cds_state.player_1.monster_move(monster_move_act)
    assert few_cds_state.player_1.zone.battle_field[1].card is None
    assert few_cds_state.player_1.zone.battle_field[2].card is not None


def test_fcds_execute_summon(few_cds_state):
    # summonMonsterAct = ActionData()
    # Action(ActionType.SUMMON_MONSTER, )
    pass


def test_fcds_execute_activity():
    """
    activity:移動と

    :return:
    """
    pass


def test_fcds_next(few_cds_state):
    pass
#     few_cds_state.next()
