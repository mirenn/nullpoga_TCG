from __future__ import annotations

import copy
from typing import List, Optional, Union
from enum import Enum

from nullpoga_cui.gameutils.action import ActionType, ActionData, Action
from nullpoga_cui.gameutils.monster_cards import MonsterCard
from nullpoga_cui.gameutils.spell_cards import SpellCard
from nullpoga_cui.gameutils.instance_card import instance_card
from nullpoga_cui.gameutils.zone import Zone
import uuid
from uuid import UUID
import logging

DEBUG = False


class PhaseKind(str, Enum):
    SPELL_PHASE = "SPELL_PHASE"  # スペルフェイズ。未実装
    SUMMON_PHASE = "SUMMON_PHASE"  # 召喚行動フェイズ
    ACTIVITY_PHASE = "ACTIVITY_PHASE"  # 攻撃フェイズ
    END_PHASE = "END_PHASE"  # エンドフェイズ（というかターン終了の宣言）


class Player:
    """プレイヤーオブジェクト？なぜPiece？
    あくまで管理用でこれをAPIで動かすイメージ
    """

    summon_phase_actions: list[Action]
    user_id: str

    def __init__(self, deck_cards: List[int], init_mana=1, user_id=''):
        """
        :param deck_cards:デッキのカードの順番になる。シャッフルしてから渡す
        :param init_mana:
        """
        self.turn_count = 0
        self.user_id = user_id
        self.player_id: UUID = uuid.uuid4()  # 使わないかも
        dk_cards = [instance_card(card_no) for card_no in deck_cards]
        # デッキの状態
        self.deck_cards: List[Union[MonsterCard, SpellCard]] = dk_cards[5:]
        self.plan_deck_cards: List[Union[MonsterCard, SpellCard]] = copy.deepcopy(self.deck_cards)
        # 手札　最初から5枚引いておく
        self.hand_cards: List[Union[MonsterCard, SpellCard]] = dk_cards[:5]
        self.plan_hand_cards: List[Union[MonsterCard, SpellCard]] = copy.deepcopy(self.hand_cards)

        # 場の札 memo:場の札。5レーンのため。
        self.zone = Zone()
        self.plan_zone = Zone()

        # フェイズも管理
        self.phase = PhaseKind.SPELL_PHASE
        # self.phase = PhaseKind.SUMMON_PHASE

        self.base_mana = init_mana  # マナブーストなどはこのマナを変動させておけばターン開始時に反映される
        self.mana = init_mana  # 相手のマナに干渉するカードを考えるためにplanと分けた
        self.plan_mana = copy.copy(self.mana)
        self.life = 15

        self.spell_phase_actions: List[Action] = []
        self.summon_phase_actions: List[Action] = []
        self.activity_phase_actions: List[Action] = []

        self.is_first_player: Optional[bool] = None

        # ------以下デバッグ用-------
        # monster_moveを選ぶフラグ。Falseの場合モンスターを移動させる選択肢を取らない
        # self.select_monster_move = True
        # 可能なら全て召喚する
        self.summon_all = True
        # 全て攻撃する(移動しない):移動のplanなし。攻撃のplanがある限りそれを選ぶ
        self.attack_all = True

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "base_mana": self.base_mana,
            "plan_mana": self.plan_mana,
            "mana": self.mana,
            "life": self.life,
            "phase": str(self.phase.value),
            "hand_cards": [card.to_dict() for card in self.hand_cards],
            "plan_hand_cards": [card.to_dict() for card in self.plan_hand_cards],
            "deck_cards": [card.to_dict() for card in self.deck_cards],
            "plan_deck_cards": [card.to_dict() for card in self.deck_cards],
            "zone": self.zone.to_dict(),
            "plan_zone": self.plan_zone.to_dict(),
            "summon_phase_actions": self.summon_phase_actions,
            "activity_phase_actions": self.activity_phase_actions,
            "spell_phase_actions": self.spell_phase_actions
        }

    def next_turn_refresh(self):
        """
        初回を除く、ターン開始時に行う処理
        :return:
        """
        self.turn_count += 1
        self.plan_mana = self.mana = self.turn_count + self.base_mana
        self.draw_card()
        self.plan_hand_cards = copy.deepcopy(self.hand_cards)
        self.phase = PhaseKind.SPELL_PHASE  # PhaseKind.SUMMON_PHASE
        for bf in self.zone.battle_field:
            if bf.card is not None:
                bf.card.can_act = True
        self.plan_zone = copy.deepcopy(self.zone)

    def legal_actions(self) -> List[Action]:
        """現在のフェイズに応じて、合法的な行動を返す"""
        if DEBUG:
            print("legal_actions 現在のphase:", self.phase, "first_player:", self.is_first_player, "turn count",
                  self.turn_count)
        if self.phase == PhaseKind.SPELL_PHASE:
            return self._legal_spell_actions()
        elif self.phase == PhaseKind.SUMMON_PHASE:
            return self._legal_summon_actions()
        elif self.phase == PhaseKind.ACTIVITY_PHASE:
            return self._legal_activity_actions()

    def _legal_spell_actions(self) -> List[Action]:
        """スペルフェイズにおける合法行動を返す"""
        actions = [Action(action_type=ActionType.CAST_SPELL, action_data=ActionData(spell_card=card))
                   for card in self.plan_hand_cards
                   if isinstance(card, SpellCard) and card.mana_cost <= self.plan_mana]
        actions.append(Action(action_type=ActionType.SPELL_PHASE_END))
        return actions

    def _legal_summon_actions(self) -> List[Action]:
        """召喚フェイズにおける合法行動を返す"""
        possible_monster_cards = [card for card in self.plan_hand_cards
                                  if isinstance(card, MonsterCard) and card.mana_cost <= self.plan_mana]
        empty_field_positions = [i for i, slot in enumerate(self.plan_zone.standby_field) if slot is None]

        actions = [Action(action_type=ActionType.SUMMON_MONSTER,
                          action_data=ActionData(monster_card=card, summon_standby_field_idx=pos))
                   for card in possible_monster_cards for pos in empty_field_positions]
        if self.summon_all is True and len(actions) > 0:
            # summon_allなら召喚できる限り召喚する
            pass
        else:
            actions.append(Action(action_type=ActionType.SUMMON_PHASE_END))
        return actions

    def _legal_activity_actions(self) -> List[Action]:
        """アクティビティフェイズにおける合法行動を返す
        移動、もしくは攻撃"""
        actions = []
        for i, slot in enumerate(self.plan_zone.battle_field):
            if slot.card and slot.card.can_act:
                actions.append(
                    Action(action_type=ActionType.MONSTER_ATTACK,
                           action_data=ActionData(slot.card)))
                if self.attack_all is False and i > 0 and self.zone.battle_field[i - 1].card is None:
                    actions.append(Action(action_type=ActionType.MONSTER_MOVE,
                                          action_data=ActionData(slot.card, move_battle_field_idx=i,
                                                                 move_direction="LEFT")))
                if (self.attack_all is False and i < len(self.zone.battle_field) - 1
                        and self.zone.battle_field[i + 1].card is None):
                    actions.append(Action(action_type=ActionType.MONSTER_MOVE,
                                          action_data=ActionData(slot.card, move_battle_field_idx=i,
                                                                 move_direction="RIGHT")))
        if self.attack_all is True and len(actions) > 0:
            # activity_phase_endは、最後まで返さない
            pass
        else:
            actions.append(Action(action_type=ActionType.ACTIVITY_PHASE_END))
        return actions

    def select_plan_action(self, action: Action):
        """PlanのActionの配列があり、randomの場合次にするActionの
        一つが適当に選ばれる。選ばれたアクションをここに入れて処理する
        """
        player = 'first_player' if self.is_first_player else 'second_player'
        if DEBUG:
            print(' select plan:', player, action.to_dict())
        if action.action_type == ActionType.CAST_SPELL:
            # 未実装
            pass
        elif action.action_type == ActionType.SPELL_PHASE_END:
            self.phase = PhaseKind.SUMMON_PHASE
            # スペル使用未実装
            # 進軍フェイズはスペルフェイズ終了時に処理してしまう
            self.move_forward(self.plan_zone)
        elif action.action_type == ActionType.SUMMON_MONSTER:
            self._plan_do_summon_monster(action)
        elif action.action_type == ActionType.SUMMON_PHASE_END:
            self.phase = PhaseKind.ACTIVITY_PHASE
        elif action.action_type == ActionType.MONSTER_ATTACK:
            self.activity_phase_actions.append(action)
            for i, slt in enumerate(self.plan_zone.battle_field):
                if slt.card and slt.card.uniq_id == action.action_data.monster_card.uniq_id:
                    slt.card.can_act = False
                    break
        elif action.action_type == ActionType.MONSTER_MOVE:
            self.activity_phase_actions.append(action)
            self.monster_move(action, self.plan_zone)
        elif action.action_type == ActionType.ACTIVITY_PHASE_END:
            self.phase = PhaseKind.END_PHASE

    def _plan_do_summon_monster(self, action: Action):
        """モンスター召喚処理"""
        target_card = next(
            (card for card in self.plan_hand_cards if card.uniq_id == action.action_data.monster_card.uniq_id), None)
        if target_card and self.plan_zone.standby_field[action.action_data.summon_standby_field_idx] is None:
            self.plan_zone.set_standby_field_card(action.action_data.summon_standby_field_idx, target_card)
            self.plan_hand_cards.remove(target_card)
            self.plan_mana -= target_card.mana_cost
            self.summon_phase_actions.append(action)

    @staticmethod
    def monster_move(action: Action, zone: Zone) -> None:
        for i, slt in enumerate(zone.battle_field):
            if slt.card and slt.card.uniq_id == action.action_data.monster_card.uniq_id:
                slt.card.can_act = False
                if (action.action_data.move_direction == "RIGHT" and i + 1 < len(zone.battle_field)
                        and zone.battle_field[i + 1].card is None):
                    zone.battle_field[i + 1].card = slt.card
                    slt.card = None
                elif (action.action_data.move_direction == "LEFT" and i - 1 >= 0
                      and zone.battle_field[i - 1].card is None):
                    zone.battle_field[i - 1].card = slt.card
                    slt.card = None
                break

    def monster_attacked(self, action: Action, zone: Zone):
        """
        攻撃を受ける
        - フィールドにモンスターがいればダメージを受ける
        - 何もなければダイレクトダメージ + wildness
        """
        for idx, slot in enumerate(zone.battle_field):
            if (slot.card is not None and slot.card.can_act is True
                    and slot.card.uniq_id == action.action_data.monster_card.uniq_id):
                slot.card.can_act = False  # 攻撃した
                # フィールドに
                if self.zone.battle_field[-idx - 1].card is not None:
                    self.zone.battle_field[-idx - 1].card.life -= slot.card.attack
                else:
                    self.zone.battle_field[-idx - 1].set_wild()
                    self.life -= slot.card.attack

    def do_summon_monster(self, action: Action):
        """モンスターを召喚する
        - プレイヤーの宣言順に処理（意味ない）
        - 召喚先のスタンバイゾーンにモンスターカードがある場合は不発（スペルでそうなった場合など）
        - 手札にモンスターカードがない場合は不発（スペルで除外された場合など）
        - マナが足りない場合は不発
        """
        assert action.action_type == ActionType.SUMMON_MONSTER

        # 手札から召喚対象のカード１枚を見つける
        target_card = next(
            (card for card in self.hand_cards if card.card_no == action.action_data.monster_card.card_no),
            None)
        if target_card is None:
            logging.debug("# 召喚対象のモンスターが手札に存在しないため不発")
            return

        if self.zone.get_standby_field_card(action.action_data.summon_standby_field_idx) is not None:
            logging.debug("# 召喚のスタンバイフィールドにモンスターが存在するため不発")
            return

        if self.mana < target_card.mana_cost:
            logging.debug("# マナが足りないため不発")
            return

        self.zone.standby_field[action.action_data.summon_standby_field_idx] = target_card
        new_hand_cards = [card for card in self.hand_cards if card != target_card]
        self.hand_cards = new_hand_cards
        self.mana -= target_card.mana_cost
        logging.debug("# アクション完了")

    def do_move_monster(self, action: Action):
        """移動処理を行う。
        - プレイヤーの宣言順に処理（スペルも考慮すると意味あり。戦略的に同じ箇所に移動宣言するのもあり）
        - 移動対象のカードが存在しなければ不発
        - 本当に移動できるかは確定していないので、移動できない場合もある
          - 先に破壊される可能や移動先にモンスターが存在する場合など
        - 逆に宣言時に移動先が埋まっていても、移動処理時に空いていれば移動可能
        """
        assert action.action_type == ActionType.MONSTER_MOVE

        idx = action.action_data.move_battle_field_idx
        target_slot = self.zone.get_battle_field_slot(idx)
        if target_slot.card is None:
            logging.debug("# 移動対象の列にモンスターカードが存在しない不発")
            return
        if target_slot.card.done_activity:
            logging.debug("# 移動対象のモンスターカードが行動済みのため不発")
            return

        if action.action_data.move_direction == "LEFT":
            assert idx > 0
            slot = self.zone.get_battle_field_slot(idx - 1)
            if slot.card is not None:
                logging.debug("# 移動先にモンスターカードが存在するため不発")
                return
            target_slot.card.done_activity = True
            self.zone.set_battle_field_card(idx - 1, target_slot.card)

        if action.action_data.move_direction == "RIGHT":
            assert idx < 4
            slot = self.zone.get_battle_field_slot(idx + 1)
            if slot.card is not None:
                logging.debug("# 移動先にモンスターカードが存在するため不発")
                return
            target_slot.card.done_activity = True
            self.zone.set_battle_field_card(idx + 1, target_slot.card)

        self.zone.remove_battle_field_card(idx)

        logging.debug("# アクション完了")

    def do_monster_attack_declaration(self, action: Action):
        """攻撃宣言をする
        - プレイヤーの宣言順に処理（意味ない）
        - この後にモンスターが破壊される可能性もあり、攻撃できるかは確定していない
        - 宣言した場所にモンスターカードがない場合は不発（スペルで除外された場合など）
        """
        # NOTE: そのターンに移動済みのモンスターは攻撃できない？（カードにフラグもたせる？）
        assert action.action_type == ActionType.MONSTER_ATTACK

        idx = action.action_data.attack_declaration_idx
        target_slot = self.zone.get_battle_field_slot(idx)
        if target_slot.card is None:
            logging.debug("# 攻撃宣言箇所にモンスターカードが存在しないため不発")
            return
        if target_slot.card.done_activity:
            logging.debug("# 攻撃宣言対象のモンスターカードが行動済みのため不発")
            return
        target_slot.card.done_activity = True
        target_slot.card.attack_declaration = True
        logging.debug("# アクション完了")

    @staticmethod
    def move_forward(zone: Zone):
        for i, sb in enumerate(zone.standby_field):
            if sb and not zone.battle_field[i].card:
                # sb.can_act = False
                zone.battle_field[i].card = sb
                zone.standby_field[i] = None

    def draw_card(self):
        """デッキから１枚引く"""
        card = self.deck_cards.pop()
        self.hand_cards.append(card)
