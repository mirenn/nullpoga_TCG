from __future__ import annotations
from random import choice
from monte_carlo_tree_search.istate import IState
from typing import List, Optional, Final, Union, Any, Tuple
import copy
from enum import Enum
from gameutils.monster_cards import MonsterCard
from gameutils.spell_cards import SpellCard
from gameutils.nullpoga_system import instance_card
from dataclasses import dataclass

LENGTH: Final[int] = 3
HEIGHT: Final[int] = 3
WIDTH: Final[int] = 3

DECK_1: Final = [7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2]
DECK_2: Final = [4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2]


class NullPoGaPiece:
    def __init__(self, deckcards: List[int]):
        # デッキの状態(シャッフルはしないので、シャッフルしてから渡す)
        self.deck_cards: List[Union[MonsterCard, SpellCard]] = [instance_card(card_no) for card_no in deckcards]
        self.plan_deck_cards: List[Union[MonsterCard, SpellCard]] = [instance_card(card_no) for card_no in deckcards]
        # 手札
        self.hand_cards: List[Union[MonsterCard, SpellCard]] = []
        self.plan_hand_cards: List[Union[MonsterCard, SpellCard]] = []
        # 場の札 memo:場の札。5レーンのため。
        self.zone = Zone()
        self.plan_zone = Zone()
        # フェイズも管理。
        self.phase = PhaseKind.SPELL_PHASE
        self.mana = 0

        self.spell_phase_actions: List = []
        self.summon_phase_actions: List = []
        self.activity_phase_actions: List = []

    def legal_actions(self) -> List[Action]:
        if self.phase == PhaseKind.SPELL_PHASE:
            spell_phase_actions: List[Union[Action]] = [
                Action(action_type=ActionType.CAST_SPELL, action_data=card) for card in self.plan_hand_cards if
                isinstance(card, SpellCard) and card.mana_cost <= self.mana]
            spell_phase_actions.append(Action(action_type=ActionType.SPELL_PHASE_END))
            return spell_phase_actions
        elif self.phase == PhaseKind.SUMMON_PHASE:
            possible_monster_cards = [card for card in self.plan_hand_cards if
                                      isinstance(card, MonsterCard) and card.mana_cost <= self.mana]


class State(IState):

    def __init__(self, pieces: Optional[List[int]] = None, enemy_pieces: Optional[List[int]] = None):
        self.pieces: Optional[NullPoGaPiece] = pieces if pieces is not None else NullPoGaPiece(DECK_1)
        self.enemy_pieces: Optional[NullPoGaPiece] = enemy_pieces if enemy_pieces is not None else NullPoGaPiece(DECK_2)

    def next(self, action: int) -> State:
        pieces = copy.deepcopy(self.pieces)
        pieces[action] = 1
        return State(self.enemy_pieces, pieces)

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
    def __init__(self):
        # 自分から見ての5列の場をフィールドとして初期化
        self.battle_field = [Slot() for _ in range(5)]
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
    SPELL_PHASE_END = "SPELL_PHASE_END"
    SUMMON_PHASE_END = "SUMMON_PHASE_END"
    ACTIVITY_PHASE_END = "ACTIVITY_PHASE_END"


@dataclass
class Action:
    action_type: ActionType
    action_data: Optional[Any] = None  # 未定
