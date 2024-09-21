"""
pytest
メモ：モンテカルロの一通りのテストが目的
・node.pyのplayout()のテストを目指す
・playout()に関するテストを書く
　・state.py next(state.random_action())

"""
import copy
import pytest
from nullpoga_cui.state import State
from nullpoga_cui.player import Player, PhaseKind
from nullpoga_cui.gameutils.zone import FieldStatus
from nullpoga_cui.gameutils.action import ActionType, ActionData, Action
from nullpoga_cui.gameutils.nullpoga_system import instance_card
from nullpoga_cui.npg_monte_carlo_tree_search.node import Node


@pytest.fixture
def few_cds_state():
    """デッキをセットアップしてStateを返す"""
    player1_cards = [1, 11, 11, 11, 11, 11, 2]
    player2_cards = [1, 11, 11, 11, 11, 11, 3]
    player1 = Player(player1_cards, 1)
    player2 = Player(player2_cards, 1)
    state = State(player1, player2)
    state.init_game()
    return state


def assert_summon_action(action, expected_idx, expected_card_no):
    """アクションが指定の召喚アクションであることを確認"""
    assert action.action_type == ActionType.SUMMON_MONSTER
    assert action.action_data.summon_standby_field_idx == expected_idx
    assert action.action_data.monster_card.card_no == expected_card_no


def test_fcds_legal_summon_actions(few_cds_state):
    """
    SUMMON_PHASE時のlegal_action確認
    ネズミを場に出す(5) + エンドフェイズ(1)のActionのみ入っていることを確認
    """
    few_cds_state.player_1.phase = PhaseKind.SUMMON_PHASE
    few_cds_state.player_1.summon_all = False
    actions = few_cds_state.legal_actions()
    assert len(actions) == 6  # 5つの召喚アクション + 1つのエンドフェイズアクション

    # 各アクションの確認
    for i in range(5):
        assert_summon_action(actions[i], i, 1)

    # エンドフェイズアクションの確認
    assert actions[5].action_type == ActionType.SUMMON_PHASE_END


def test_fcds_select_plan_action_summon_monster(few_cds_state):
    """
    player1が召喚アクションを選択した際の確認
    """
    few_cds_state.player_1.phase = PhaseKind.SUMMON_PHASE
    few_cds_state.player_1.summon_all = False
    ret_action = few_cds_state.legal_actions()[0]
    original_player_1 = copy.deepcopy(few_cds_state.player_1)

    few_cds_state.player_1.select_plan_action(ret_action)
    selected_card = ret_action.action_data.monster_card

    # マナが適切に減少しているか
    assert few_cds_state.player_1.plan_mana == original_player_1.plan_mana - selected_card.mana_cost
    # 選択されたモンスターが正しい位置にセットされているか
    assert few_cds_state.player_1.plan_zone.standby_field[
               ret_action.action_data.summon_standby_field_idx] == selected_card
    # 手札から選択されたモンスターが削除されているか
    assert len(few_cds_state.player_1.plan_hand_cards) == len(original_player_1.plan_hand_cards) - 1


def test_monster_attacked(few_cds_state):
    """
    攻撃とライフ変動、モンスター削除の確認
    """
    state = few_cds_state
    player1 = state.player_1
    player2 = state.player_2

    player1.zone.battle_field[0].card = instance_card(1)  # ネズミ
    player2.zone.battle_field[4].card = instance_card(1)  # ネズミ
    player2.zone.battle_field[0].card = instance_card(1)  # ネズミ

    initial_life_p1 = player1.life
    state.player_1.monster_attacked(Action(ActionType.MONSTER_MOVE, ActionData(player2.zone.battle_field[4].card)),
                                    player2.zone)

    # 攻撃後、ネズミのライフが0に
    assert player1.zone.battle_field[0].card.life == 0
    # 攻撃したモンスターが行動不能になっていることを確認
    assert player2.zone.battle_field[4].card.can_act is False

    # ダイレクトアタックによるライフ変動とフィールドの状態変化
    state.player_1.monster_attacked(Action(ActionType.MONSTER_MOVE, ActionData(
        monster_card=player2.zone.battle_field[0].card)), player2.zone)
    assert player1.life == initial_life_p1 - 1
    assert player1.zone.battle_field[4].status == FieldStatus.WILDERNESS

    # モンスターの削除を確認
    state.delete_monster(player1, player2)
    assert player1.zone.battle_field[0].card is None


def test_fcds_monster_move(few_cds_state):
    """
    モンスター移動テスト
    """
    player1 = few_cds_state.player_1
    player1.zone.battle_field[1].card = instance_card(1)  # ネズミをインデックス1に配置

    monster_move_act = Action(ActionType.MONSTER_MOVE, ActionData(
        monster_card=player1.zone.battle_field[1].card, move_direction="RIGHT"))
    player1.monster_move(monster_move_act, player1.zone)

    # 移動後、元の場所にカードがなく、新しい場所にカードがあることを確認
    assert player1.zone.battle_field[1].card is None
    assert player1.zone.battle_field[2].card is not None


def test_fcds_execute_summon(few_cds_state):
    """
    召喚処理のテスト
    """
    state = few_cds_state
    player1 = state.player_1
    player2 = state.player_2

    player1_action = Action(
        action_type=ActionType.SUMMON_MONSTER,
        action_data=ActionData(summon_standby_field_idx=0, monster_card=player1.hand_cards[0])
    )
    player1_mana_cost = player1.hand_cards[0].mana_cost

    player2_action = Action(
        action_type=ActionType.SUMMON_MONSTER,
        action_data=ActionData(summon_standby_field_idx=1, monster_card=player2.hand_cards[0])
    )
    player2_mana_cost = player2.hand_cards[0].mana_cost

    player1.summon_phase_actions = [player1_action]
    player2.summon_phase_actions = [player2_action]

    initial_hand_player1 = len(player1.hand_cards)
    initial_hand_player2 = len(player2.hand_cards)
    initial_mana_player1 = player1.mana
    initial_mana_player2 = player2.mana

    state.execute_summon(player1, player2)

    # プレイヤー1とプレイヤー2の手札とフィールド、マナが正しく更新されているか確認
    assert len(player1.hand_cards) == initial_hand_player1 - 1
    assert len(player2.hand_cards) == initial_hand_player2 - 1
    assert player1.zone.standby_field[0] is not None
    assert player2.zone.standby_field[1] is not None
    assert player1.mana == initial_mana_player1 - player1_mana_cost
    assert player2.mana == initial_mana_player2 - player2_mana_cost


def test_initial_game_state(few_cds_state):
    """初期ゲーム状態が正しく設定されているかを確認するテスト"""
    state = few_cds_state

    assert state.player_1.life > 0
    assert state.player_2.life > 0
    assert len(state.player_1.deck_cards) > 0
    assert len(state.player_2.deck_cards) > 0


@pytest.fixture
def high_cost_cds_state():
    """デッキをすべてハイコストのカードで構成してStateを返す"""
    player1_cards = [11, 11, 11, 11, 11, 11, 11]
    player2_cards = [12, 12, 12, 12, 12, 12, 12]
    player1 = Player(player1_cards, 3)  # マナを3に設定、11は召喚不可
    player2 = Player(player2_cards, 3)  # 同じくマナを3に設定
    state = State(player1, player2)
    state.init_game()
    return state


def test_next_no_action_switches_turn(high_cost_cds_state):
    """アクションが実行できない場合、手番が交代することを確認する"""
    state = high_cost_cds_state
    initial_first_player = state.is_first_player()  # 現在の先手番プレイヤーを記録

    # プレイヤー1がアクションを実行
    action_end_phase = Action(
        action_type=ActionType.ACTIVITY_PHASE_END,
        action_data=ActionData()
    )
    state = state.next(action_end_phase)  # フェイズ終了のアクションを渡して手番交代

    # プレイヤー1がフェイズを終了し、プレイヤー2に手番が交代することを確認
    assert state.is_first_player() is False  # 手番が交代しているか確認

    # プレイヤー2がアクションを実行
    state = state.next(action_end_phase)  # プレイヤー2もフェイズ終了

    # プレイヤー1に再び手番が戻っていることを確認
    assert state.is_first_player() is True


# 攻撃が成功することを確認する


@pytest.fixture
def player1_will_win_state():
    """プレイヤー1がすぐに勝利できるState"""
    player1_cards = [1, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
    player2_cards = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
    player1 = Player(player1_cards, 1)
    player2 = Player(player2_cards, 0)
    player2.life = 1
    state = State(player1, player2)
    state.init_game()
    return state


def test_playout(player1_will_win_state):
    """playoutのテスト
    player_1が勝利することを確認"""
    root_node = Node(player1_will_win_state, expand_base=10)
    # player_1が勝利(ターン数は返り値にないが2ターン目に勝利する)
    assert root_node.playout(root_node.state) == 1
