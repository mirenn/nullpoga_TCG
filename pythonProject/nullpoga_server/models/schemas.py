from typing import List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID, uuid4
from nullpoga_cui.gameutils.action import Action as npgAction, ActionData as npgActionData, ActionType
from nullpoga_cui.gameutils.monster_cards import MonsterCard as npgMonsterCard
from nullpoga_cui.gameutils.spell_cards import SpellCard as npgSpellCard
from nullpoga_cui.player import PhaseKind
from nullpoga_cui.gameutils.zone import FieldStatus


class MonsterCard(BaseModel):
    card_no: int
    mana_cost: int
    card_name: str
    attack: int
    life: int
    uniq_id: UUID = Field(default_factory=uuid4)
    image_url: str = None  # memo:本来クライアント側で自由に画像を持てる
    stun_count: int
    can_act: bool
    attack_declaration: bool
    done_activity: bool

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

    def to_dataclass(self) -> npgAction:
        """
        Pydantic Actionインスタンスをdataclass Actionに変換するメソッド
        """
        pydantic_data = self.action_data
        if pydantic_data:
            dataclass_data = npgActionData(
                monster_card=npgMonsterCard(
                    **pydantic_data.monster_card.dict()) if pydantic_data.monster_card else None,
                summon_standby_field_idx=pydantic_data.summon_standby_field_idx,
                move_battle_field_idx=pydantic_data.move_battle_field_idx,
                move_direction=pydantic_data.move_direction,
                attack_declaration_idx=pydantic_data.attack_declaration_idx,
                spell_card=npgSpellCard(**pydantic_data.spell_card.dict()) if pydantic_data.spell_card else None
            )
        else:
            dataclass_data = None

        # Pydantic Action から dataclass Action への変換
        return npgAction(
            action_type=self.action_type,
            action_data=dataclass_data
        )


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

    model_config = ConfigDict(arbitrary_types_allowed=True)


# 新しいレスポンスモデルを定義する
class RoomStateResponse(BaseModel):
    room_id: str
    state: State
