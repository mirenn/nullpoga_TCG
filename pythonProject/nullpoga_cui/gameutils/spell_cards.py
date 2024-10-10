from dataclasses import dataclass, field
import uuid
from uuid import UUID
from typing import Callable
from .card_type import CardType


@dataclass
class SpellCard:
    card_no: int
    mana_cost: int
    card_name: str
    cast_spell: Callable
    uniq_id: UUID = field(default_factory=uuid.uuid4, init=False)
    card_type: CardType = field(default=CardType.SPELL, init=False)

    def __str__(self):
        return f"{self.card_name}"

    def to_dict(self):
        return {
            "card_name": self.card_name,
        }

    def cast_spell(self):
        """
        スペル開始時効果
        :return:
        """
        return self.cast_spell()
