from __future__ import annotations
from random import choice
from npg_monte_carlo_tree_search.istate import IState
from typing import List, Optional, Final, Union, Any, Tuple, Literal
import copy
from enum import Enum
from gameutils.spell_cards import SpellCard
from gameutils.nullpoga_system import instance_card
from dataclasses import dataclass, field
import uuid
from uuid import UUID
from itertools import zip_longest

from nullpoga_cui.gameutils.monster_cards import MonsterCard

LENGTH: Final[int] = 3
HEIGHT: Final[int] = 3
WIDTH: Final[int] = 3

DECK_1: Final = [7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2]
DECK_2: Final = [4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2]


class State(IState):

    def __init__(self, pieces: Optional[List[int]] = None, enemy_pieces: Optional[List[int]] = None):
        self.pieces: Optional[NullPoGaPiece] = pieces if pieces is not None else NullPoGaPiece(DECK_1)
        self.enemy_pieces: Optional[NullPoGaPiece] = enemy_pieces if enemy_pieces is not None else NullPoGaPiece(DECK_2)

    def next(self, action: int) -> State:
        pieces = copy.deepcopy(self.pieces)
        actions = pieces.legal_actions()
        pieces.select_plan_action(actions[action])
        if pieces.phase == PhaseKind.END_PHASE:
            if self.enemy_pieces == PhaseKind.END_PHASE:
                e_pieces = copy.deepcopy(self.enemy_pieces)
                # 実際に処理する必要がある
                self.execute_plan(pieces, e_pieces)
                return State(e_pieces, pieces)
            else:
                return State(self.enemy_pieces, pieces)

        else:
            return State(pieces, self.enemy_pieces)

    def execute_plan(self, pieces: NullPoGaPiece, e_pieces: NullPoGaPiece):
        """
        planの内容を実際に実行する。
        :param pieces:
        :param e_pieces:
        :return:
        """
        # スペルフェイズ未実装
        # 進軍フェイズ
        pieces.move_forward(pieces.zone)
        e_pieces.move_forward(e_pieces.zone)
        # summonフェイズ
        self.execute_summon(pieces, e_pieces)
        # activityフェイズ
        self.execute_activity(pieces, e_pieces)

    @staticmethod
    def execute_summon(pieces: NullPoGaPiece, e_pieces: NullPoGaPiece):
        """
        召喚実行
        :param pieces:
        :param e_pieces:
        :return:
        """
        for my_act, e_act in zip_longest(pieces.summon_phase_actions, e_pieces.summon_phase_actions):
            if (my_act and not pieces.zone.standby_field[my_act.action_data.index] and
                    my_act.action_data.monster_card.mana_cost <= pieces.mana):
                pieces.mana -= my_act.action_data.monster_card.mana_cost
                pieces.zone.standby_field[my_act.action_data.index] = my_act.action_data.monster_card
                # 手札から召喚したモンスターを削除(削除したい要素以外を残す)
                pieces.hand_cards = [card for card in pieces.hand_cards if
                                     card.uniq_id != my_act.action_data.monster_card.uniq_id]
            if (e_act and not e_pieces.zone.standby_field[e_act.action_data.index] and
                    e_act.action_data.monster_card.mana_cost <= e_pieces.mana):
                e_pieces.mana -= e_act.action_data.monster_card.mana_cost
                e_pieces.zone.standby_field[e_act.action_data.index] = e_act.action_data.monster_card
                # 手札から召喚したモンスターを削除(削除したい要素以外を残す)
                e_pieces.hand_cards = [card for card in e_pieces.hand_cards if
                                       card.uniq_id != e_act.action_data.monster_card.uniq_id]
            # メモ召喚時効果未実装
        pieces.summon_phase_actions = []
        e_pieces.summon_phase_actions = []

    def execute_activity(self, my_pieces: NullPoGaPiece, e_pieces: NullPoGaPiece):
        for my_act, e_act in zip_longest(my_pieces.activity_phase_actions, e_pieces.activity_phase_actions):
            if my_act and my_act.action_type == ActionType.MONSTER_MOVE:
                my_pieces.monster_move(my_act, my_pieces.zone)
            if e_act and e_act.action_type == ActionType.MONSTER_MOVE:
                e_pieces.monster_move(e_act, e_pieces.zone)
            if my_act and my_act.action_type == ActionType.MONSTER_ATTACK:
                e_pieces.monster_attacked(my_act, my_pieces.zone)
            if e_act and e_act.action_type == ActionType.MONSTER_ATTACK:
                my_pieces.monster_attacked(e_act, e_pieces.zone)
            self.delete_monster(my_pieces, e_pieces)

    def delete_monster(self, my_pieces: NullPoGaPiece, e_pieces: NullPoGaPiece):
        """
        ライフがゼロ以下になったモンスターを削除する
        :param my_pieces:
        :param e_pieces:
        :return:
        """
        for i, slt in enumerate(my_pieces.zone.battle_field):
            if slt.card is not None and slt.card.life <= 0:
                slt.card = None
        for i, slt in enumerate(e_pieces.zone.battle_field):
            if slt.card is not None and slt.card.life <= 0:
                slt.card = None

    def legal_actions(self) -> List[int]:
        return [i for i in range(HEIGHT * WIDTH) if self.pieces[i] == 0 and self.enemy_pieces[i] == 0]

    def random_action(self) -> int:
        return choice(self.legal_actions())

    @staticmethod
    def pieces_count(pieces: List[int]) -> int:
        return pieces.count(1)

    def is_lose(self) -> bool:
        dy = [0, 1, 1, -1]
        dx = [1, 0, 1, -1]

        for y in range(HEIGHT):
            for x in range(WIDTH):
                for k in range(4):
                    lose = True
                    ny, nx = y, x
                    for i in range(LENGTH):
                        if ny < 0 or ny >= HEIGHT or nx < 0 or nx >= WIDTH:
                            lose = False
                            break
                        if self.enemy_pieces[ny * WIDTH + nx] == 0:
                            lose = False
                            break
                        ny += dy[k]
                        nx += dx[k]
                    if lose:
                        return True

        return False

    def is_draw(self) -> bool:
        return self.pieces_count(self.pieces) + self.pieces_count(self.enemy_pieces) == HEIGHT * WIDTH

    def is_done(self) -> bool:
        return self.is_lose() or self.is_draw()

    def is_first_player(self) -> bool:
        return self.pieces_count(self.pieces) == self.pieces_count(self.enemy_pieces)

    def __str__(self) -> str:
        ox = ('o', 'x') if self.is_first_player() else ('x', 'o')
        ret = ""
        for i in range(HEIGHT * WIDTH):
            if self.pieces[i] == 1:
                ret += ox[0]
            elif self.enemy_pieces[i] == 1:
                ret += ox[1]
            else:
                ret += '-'
            if i % WIDTH == WIDTH - 1:
                ret += '\n'
        return ret


class Zone:
    battle_field: list[Slot]

    def __init__(self):
        # 自分から見ての5列の場をフィールドとして初期化
        self.battle_field: list[Slot] = [Slot() for _ in range(5)]
        self.standby_field: List[Optional[MonsterCard]] = [None, None, None, None, None]

    def set_battle_field_card(self, index: int, card: MonsterCard):
        if 0 <= index < len(self.battle_field):
            self.battle_field[index].set_card(card)

    def set_standby_field_card(self, index: int, card: MonsterCard):
        if 0 <= index < len(self.standby_field):
            self.standby_field[index] = card

    def remove_battle_field_card(self, index: int):
        if 0 <= index < len(self.battle_field):
            self.battle_field[index].remove_card()

    def remove_standby_field_card(self, index: int):
        if 0 <= index < len(self.standby_field):
            self.standby_field[index] = None

    def gen_summon_combinations(self, m_card: MonsterCard) -> List[Tuple[int, MonsterCard]]:
        m_combinations = []
        for i in range(len(self.standby_field)):
            if self.standby_field[i] is None:
                combination = self.standby_field.copy()
                combination[i] = m_card
                m_combinations.append((i, m_card))
        return m_combinations


class FieldStatus(Enum):
    NORMAL = "Normal"
    WILDERNESS = "Wilderness"  # 荒野状態などの他の状態


class Slot:
    card: MonsterCard | None
    __slots__ = ['status', 'card']

    def __init__(self):
        self.status: FieldStatus = FieldStatus.NORMAL
        self.card: Optional[MonsterCard] = None  # このフィールドに置かれているカード

    def set_card(self, card: MonsterCard):
        self.card = card

    def remove_card(self):
        self.card = None

    def set_wild(self):
        self.status = FieldStatus.WILDERNESS


class PhaseKind(Enum):
    SPELL_PHASE = "SPELL_PHASE"
    SUMMON_PHASE = "SUMMON_PHASE"
    ACTIVITY_PHASE = "ACTIVITY_PHASE"
    END_PHASE = "END_PHASE"


class ActionType(Enum):
    CAST_SPELL = "CAST_SPELL"
    SUMMON_MONSTER = "SUMMON_MONSTER"
    MONSTER_ATTACK = "MONSTER_ATTACK"
    MONSTER_MOVE = "MONSTER_MOVE"
    SPELL_PHASE_END = "SPELL_PHASE_END"
    SUMMON_PHASE_END = "SUMMON_PHASE_END"
    ACTIVITY_PHASE_END = "ACTIVITY_PHASE_END"


@dataclass
class Action:
    action_type: ActionType
    action_data: Optional[ActionData] = None  # 未定


@dataclass
class ActionData:
    index: Optional[int] = field(default=None)
    move_direction: Optional[Literal["right", "left"]] = field(default=None)
    monster_card: Optional[MonsterCard] = field(default=None)
    spell_card: Optional[SpellCard] = field(default=None)
