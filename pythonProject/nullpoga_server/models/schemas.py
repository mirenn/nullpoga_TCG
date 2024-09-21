from typing import List, Optional, Union
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from nullpoga_cui.gameutils.action import ActionType
from nullpoga_cui.player import PhaseKind
from nullpoga_cui.gameutils.zone import FieldStatus


class MonsterCard(BaseModel):
    card_no: int
    mana_cost: int
    attack: int
    life: int
    uniq_id: UUID = Field(default_factory=uuid4)

    def to_dict(self):
        return self.dict()


class SpellCard(BaseModel):
    card_no: int
    mana_cost: int
    effect: str
    uniq_id: UUID = Field(default_factory=uuid4)

    def to_dict(self):
        return self.dict()


class ActionData(BaseModel):
    spell_card: Optional[SpellCard] = None
    monster_card: Optional[MonsterCard] = None
    summon_standby_field_idx: Optional[int] = None
    move_battle_field_idx: Optional[int] = None
    move_direction: Optional[str] = None
    attack_declaration_idx: Optional[int] = None


class Action(BaseModel):
    action_type: ActionType
    action_data: ActionData


class Slot(BaseModel):
    status: FieldStatus = FieldStatus.NORMAL
    card: Optional[MonsterCard] = None

    def to_dict(self):
        return self.dict()


class Zone(BaseModel):
    battle_field: List[Slot] = Field(default_factory=lambda: [Slot() for _ in range(5)])
    standby_field: List[Optional[MonsterCard]] = Field(default_factory=lambda: [None for _ in range(5)])


class Player(BaseModel):
    user_id: str
    player_id: UUID = Field(default_factory=uuid4)
    turn_count: int = 0
    deck_cards: List[Union[MonsterCard, SpellCard]]
    plan_deck_cards: List[Union[MonsterCard, SpellCard]]
    hand_cards: List[Union[MonsterCard, SpellCard]]
    plan_hand_cards: List[Union[MonsterCard, SpellCard]]
    zone: Zone = Field(default_factory=Zone)
    plan_zone: Zone = Field(default_factory=Zone)
    phase: PhaseKind = PhaseKind.SPELL_PHASE
    base_mana: int = 1
    mana: int = 1
    plan_mana: int = 1
    life: int = 15
    spell_phase_actions: List[Action] = Field(default_factory=list)
    summon_phase_actions: List[Action] = Field(default_factory=list)
    activity_phase_actions: List[Action] = Field(default_factory=list)
    is_first_player: Optional[bool] = None
    user_id: str = ""

    def to_dict(self):
        return self.dict()


class State(BaseModel):
    player_1: Player
    player_2: Player
    history: List[dict] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True

    def to_json(self):
        """お試し。ゲーム情報のインポート、エクスポート用"""
        state_json = {
            "player1": self.player_1.dict(),
            "player2": self.player_2.dict(),
        }
        return state_json

# これにより、StateクラスのPydanticモデルを定義し、FastAPIを使ってエンドポイントで利用することができます。
