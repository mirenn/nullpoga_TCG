from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict

from enum import Enum
from typing import Optional, Literal

from gameutils.monster_cards import MonsterCard
from gameutils.spell_cards import SpellCard


class ActionType(Enum):
    CAST_SPELL = "CAST_SPELL"  # スペル。未実装
    SUMMON_MONSTER = "SUMMON_MONSTER"  # 召喚
    MONSTER_MOVE = "MONSTER_MOVE"  # 移動
    DISABLE_ACTION = "DISABLE_ACTION"  # 何もしないを選んだ場合
    MONSTER_ATTACK = "MONSTER_ATTACK"  # 攻撃宣言
    SPELL_PHASE_END = "SPELL_PHASE_END"  # スペルフェイズ終了宣言。未実装というか不要？
    SUMMON_PHASE_END = "SUMMON_PHASE_END"  # 召喚フェイズ終了宣言。未実装というか不要？
    ACTIVITY_PHASE_END = "ACTIVITY_PHASE_END"  # ターン終了宣言に流用。


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

    # 以下現状不使用
    spell_card: Optional[SpellCard] = field(default=None)

    def __str__(self):
        return json.dumps({
            "monster_card": self.monster_card.to_dict() if self.monster_card else None,
            "summon_standby_field_idx": self.summon_standby_field_idx
        })

    def to_dict(self):
        # return {
        #     "monster_card": self.monster_card.to_dict() if self.monster_card else None,
        #     "summon_standby_field_idx": self.summon_standby_field_idx,
        #     "move_direction": self.move_direction
        # }
        return asdict(self)


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

    def to_dict(self):
        # return {
        #     "action_type": self.action_type.name,
        #     "action_data": self.action_data.to_dict() if self.action_data else None
        # }
        return asdict(self)
