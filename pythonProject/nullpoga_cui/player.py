from __future__ import annotations

import copy
from typing import List, Optional, Union, Literal
from enum import Enum
from gameutils.monster_cards import MonsterCard
from gameutils.spell_cards import SpellCard
from gameutils.nullpoga_system import instance_card
from dataclasses import dataclass, field
import uuid
from uuid import UUID
import logging
import json


class Zone:
    """バトルフィールド、スタンバイフィールドをまとめてZoneとする"""

    def __init__(self):
        # 自分から見ての5列の場をフィールドとして初期化
        self.battle_field = [Slot() for _ in range(5)]
        self.standby_field: List[Optional[MonsterCard]] = [None for _ in range(5)]

    def set_battle_field_card(self, index: int, card: MonsterCard):
        if 0 <= index < len(self.battle_field):
            self.battle_field[index].set_card(card)

    def set_standby_field_card(self, index: int, card: MonsterCard):
        if 0 <= index < len(self.standby_field):
            self.standby_field[index] = card

    def get_battle_field_slot(self, index: int) -> Slot:
        return self.battle_field[index]

    def get_standby_field_card(self, index: int) -> MonsterCard | None:
        return self.standby_field[index]

    def remove_battle_field_card(self, index: int):
        if 0 <= index < len(self.battle_field):
            self.battle_field[index].remove_card()

    def remove_standby_field_card(self, index: int):
        if 0 <= index < len(self.standby_field):
            self.standby_field[index] = None


class FieldStatus(Enum):
    NORMAL = "Normal"
    WILDERNESS = "Wilderness"  # 荒野状態などの他の状態


class Slot:
    """バトルフィールドのそれぞれのマスをSlotとする"""

    __slots__ = ["status", "card"]

    def __init__(self):
        self.status: FieldStatus = FieldStatus.NORMAL
        self.card: Optional[MonsterCard] = None  # このフィールドに置かれているカード

    def set_card(self, card: MonsterCard):
        """Slotにモンスターカードを設定する"""
        self.card = card

    def remove_card(self):
        """Slotのカードを除外する"""
        self.card = None

    def set_wild(self):
        """Slotの状態を荒野状態にする"""
        self.status = FieldStatus.WILDERNESS


@dataclass
class Action:
    action_type: ActionType
    action_data: Optional[ActionData] = None

    def __str__(self):
        # data = self.__dict__
        data = {
            "action_type": self.action_type.name,
            "action_data": str(self.action_data)
        }
        return json.dumps(data)
        # if self.action_type == ActionType.SUMMON_MONSTER:
        #     card_name = self.action_data.monster_card.card_name
        #     cost = self.action_data.monster_card.mana_cost
        #     return f"召喚アクション {cost}コス{card_name}を{self.action_data.summon_standby_field_idx}に召喚"
        # if self.action_type == ActionType.MONSTER_MOVE:
        #     idx = self.action_data.move_battle_field_idx
        #     direction = self.action_data.move_direction
        #     return f"移動アクション 列{idx}のカードを{direction}に移動"
        # if self.action_type == ActionType.MONSTER_ATTACK:
        #     idx = self.action_data.attack_declaration_idx
        #     return f"攻撃宣言アクション 列{idx}のカードで攻撃"


@dataclass
class ActionData:
    # SUMMON_MONSTER用
    # summon_card_no: Optional[int] = field(default=None)  # モンスターカードの番号
    monster_card: Optional[MonsterCard] = field(default=None)  # モンスターカード
    summon_standby_field_idx: Optional[int] = field(default=None)  # 左から何番目か
    # MONSTER_MOVE用
    move_battle_field_idx: Optional[int] = field(default=None)  # 左から何番目か
    move_direction: Optional[Literal["RIGHT", "LEFT"]] = field(default=None)  # 移動方向
    # MONSTER_ATTACK用
    attack_declaration_idx: Optional[int] = field(default=None)  # 不使用になるかも：攻撃宣言するバトルフィールドのインデックス

    # SUMMON_MONSTER用
    summon_index: Optional[int] = field(default=None)  # index:召喚するときに使用
    # 以下現状不使用
    spell_card: Optional[SpellCard] = field(default=None)

    def __str__(self):
        return json.dumps({
            "monster_card": str(self.monster_card),
            "summon_standby_field_idx": self.summon_standby_field_idx
        })


class PhaseKind(Enum):
    SPELL_PHASE = "SPELL_PHASE"  # スペルフェイズ。未実装
    SUMMON_PHASE = "SUMMON_PHASE"  # 召喚行動フェイズ
    ACTIVITY_PHASE = "ACTIVITY_PHASE"  # 攻撃フェイズ
    END_PHASE = "END_PHASE"  # エンドフェイズ（というかターン終了の宣言）


class ActionType(Enum):
    CAST_SPELL = "CAST_SPELL"  # スペル。未実装
    SUMMON_MONSTER = "SUMMON_MONSTER"  # 召喚
    MONSTER_MOVE = "MONSTER_MOVE"  # 移動
    DISABLE_ACTION = "DISABLE_ACTION"  # 何もしないを選んだ場合
    MONSTER_ATTACK = "MONSTER_ATTACK"  # 攻撃宣言
    SPELL_PHASE_END = "SPELL_PHASE_END"  # スペルフェイズ終了宣言。未実装というか不要？
    SUMMON_PHASE_END = "SUMMON_PHASE_END"  # 召喚フェイズ終了宣言。未実装というか不要？
    ACTIVITY_PHASE_END = "ACTIVITY_PHASE_END"  # ターン終了宣言に流用。


class Player:
    """プレイヤーオブジェクト？なぜPiece？
    あくまで管理用でこれをAPIで動かすイメージ
    """

    summon_phase_actions: list[Action]

    def __init__(self, deck_cards: List[int], mana=3):
        """

        :param deck_cards:デッキのカードの順番になる。シャッフルしてから渡す
        :param mana:
        """
        self.turn_count = 0
        self.player_id: UUID = uuid.uuid4()
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

        # フェイズも管理。（現在不使用）
        # self.phase = PhaseKind.SPELL_PHASE
        self.phase = PhaseKind.SUMMON_PHASE

        self.mana = mana  # 相手のマナに干渉するカードを考えるためにplanと分けた
        self.plan_mana = copy.copy(self.mana)
        self.life = 15

        self.spell_phase_actions: List[Action] = []
        self.summon_phase_actions: List[Action] = []
        self.activity_phase_actions: List[Action] = []

        self.is_first_player: Optional[bool] = None

    def legal_actions(self) -> List[Action]:
        """nagai 現在の盤面を見て合法手を返す
        plan_manaで可能なマナを考慮する。"""
        print("legal_actions 現在のphase:", self.phase)
        if self.phase == PhaseKind.SPELL_PHASE:
            spell_phase_actions: List[Union[Action]] = [
                Action(action_type=ActionType.CAST_SPELL, action_data=ActionData(spell_card=card)) for card in
                self.plan_hand_cards if
                isinstance(card, SpellCard) and card.mana_cost <= self.mana]
            spell_phase_actions.append(Action(action_type=ActionType.SPELL_PHASE_END))
            # メモ：スペルの取れる選択肢の数だけactionsは増えるのでspell実装し始めたらそうする
            return spell_phase_actions
        elif self.phase == PhaseKind.SUMMON_PHASE:
            # プレイ可能なモンスターカードをフィルタリング
            possible_monster_cards = [
                card for card in self.plan_hand_cards
                if isinstance(card, MonsterCard) and card.mana_cost <= self.plan_mana
            ]
            # カードを配置可能なフィールドの位置を見つける
            empty_field_positions = [
                i for i, sd in enumerate(self.plan_zone.standby_field)
                if sd is None
            ]
            # 可能な組み合わせを生成
            combinations = []
            for card in possible_monster_cards:
                for position in empty_field_positions:
                    action = Action(action_type=ActionType.SUMMON_MONSTER,
                                    action_data=ActionData(card, summon_standby_field_idx=position))
                    combinations.append(action)
            combinations.append(Action(action_type=ActionType.SUMMON_PHASE_END))
            return combinations
        elif self.phase == PhaseKind.ACTIVITY_PHASE:
            combinations = []
            for i in range(len(self.zone.battle_field)):
                if self.zone.battle_field[i] and self.zone.battle_field[i].card.can_act:
                    card = self.zone.battle_field[i].card
                    combinations.append(
                        Action(action_type=ActionType.MONSTER_ATTACK, action_data=ActionData(card)))
                    if not self.zone.battle_field[i - 1]:
                        combinations.append(
                            Action(action_type=ActionType.MONSTER_MOVE,
                                   action_data=ActionData(card, move_direction="LEFT")))
                    if not self.zone.battle_field[i + 1]:
                        combinations.append(
                            Action(action_type=ActionType.MONSTER_MOVE,
                                   action_data=ActionData(monster_card=card, move_direction="RIGHT")))
                    # あえて何もしない場合のパターンもここに追加する予定、一旦ここにはなしにしておく一応用意しておくが

            combinations.append(Action(action_type=ActionType.ACTIVITY_PHASE_END))
            return combinations

    def select_plan_action(self, action: Action):
        """PlanのActionの配列があり、randomの場合次にするActionの
        一つが適当に選ばれる。選ばれたアクションをここに入れて処理する
        """
        if action.action_type == ActionType.CAST_SPELL:
            # 未実装
            pass
        elif action.action_type == ActionType.SPELL_PHASE_END:
            self.phase = PhaseKind.SUMMON_PHASE
            # スペル使用未実装
            # 進軍フェイズはスペルフェイズ終了時に処理してしまう
            self.move_forward_mock(self.plan_zone)

        elif action.action_type == ActionType.SUMMON_MONSTER:
            self.summon_phase_actions.append(action)
            self.plan_mana -= action.action_data.monster_card.mana_cost
            self.plan_zone.standby_field[action.action_data.summon_standby_field_idx] = action.action_data.monster_card
            # 手札から召喚したモンスターを削除(削除したい要素以外を残す)
            self.plan_hand_cards = [card for card in self.plan_hand_cards if
                                    card.uniq_id != action.action_data.monster_card.uniq_id]

        elif action.action_type == ActionType.SUMMON_PHASE_END:
            self.phase = PhaseKind.ACTIVITY_PHASE
        elif action.action_type == ActionType.MONSTER_ATTACK:
            self.activity_phase_actions.append(action)
            for i, slt in enumerate(self.plan_zone.battle_field):
                if slt.card.uniq_id == action.action_data.monster_card.uniq_id:
                    slt.card.can_act = False
                    break
        elif action.action_type == ActionType.MONSTER_MOVE:
            self.activity_phase_actions.append(action)
            self.monster_move(action)
        elif action.action_type == ActionType.ACTIVITY_PHASE_END:
            self.phase = PhaseKind.END_PHASE

    def monster_move(self, action: Action) -> None:
        zone = self.zone
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

    def move_forward(self):
        """Zoneのモンスターカードを全て進軍させる（強制）"""
        for i, standby_card in enumerate(self.zone.standby_field):
            if standby_card and not self.zone.battle_field[i].card:
                standby_card.can_act = False
                self.zone.battle_field[i].card = standby_card
                self.zone.standby_field[i] = None

    @staticmethod
    def move_forward_mock(zone: Zone):
        for i, sb in enumerate(zone.standby_field):
            if sb and not zone.battle_field[i].card:
                sb.can_act = False
                zone.battle_field[i].card = sb
                zone.standby_field[i] = None

    def draw_card(self):
        """デッキから１枚引く"""
        card = self.deck_cards.pop()
        self.hand_cards.append(card)
