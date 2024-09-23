from __future__ import annotations

from dataclasses import dataclass, asdict, field
from enum import Enum
from typing import List, Optional

from nullpoga_cui.gameutils.monster_cards import MonsterCard


class FieldStatus(str, Enum):
    NORMAL = "Normal"
    WILDERNESS = "Wilderness"  # 荒野状態などの他の状態


@dataclass
class Zone:
    """バトルフィールド、スタンバイフィールドをまとめてZoneとする"""

    """バトルフィールド、スタンバイフィールドをまとめてZoneとする"""
    battle_field: List[Slot] = field(default_factory=lambda: [Slot() for _ in range(5)])
    standby_field: List[Optional[MonsterCard]] = field(default_factory=lambda: [None for _ in range(5)])

    def to_dict(self):
        # return {
        #     "battle_field": [slt.to_dict() for slt in self.battle_field],
        #     "standby_field": [sf.to_dict() if sf else None for sf in self.standby_field]
        # }
        return asdict(self)

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


@dataclass
class Slot:
    """バトルフィールドのそれぞれのマスをSlotとする"""

    status: FieldStatus = FieldStatus.NORMAL
    card: Optional[MonsterCard] = None  # このフィールドに置かれているカード

    def to_dict(self):
        # return {"status": str(self.status),
        #         "card": self.card.to_dict() if self.card else None}
        return asdict(self)

    def set_card(self, card: MonsterCard):
        """Slotにモンスターカードを設定する"""
        self.card = card

    def remove_card(self):
        """Slotのカードを除外する"""
        self.card = None

    def set_wild(self):
        """Slotの状態を荒野状態にする"""
        self.status = FieldStatus.WILDERNESS
