import types
from abc import ABC, abstractmethod
from typing import List
from .card_type import CardType
import uuid
from uuid import UUID
from typing import Callable


class SpellCard:
    uniq_id: UUID
    card_no: int
    mana_cost: int
    card_name: str
    card_type: CardType

    def __init__(self, card_no: int, mana_cost: int, card_name: str, cast_spell: Callable):
        self.uniq_id = uuid.uuid4()
        self.card_no = card_no
        self.card_type = CardType.SPELL
        self.mana_cost = mana_cost
        self.card_name = card_name
        self.cast_spell = cast_spell

    def __str__(self):
        return f"{self.card_name}"

    def to_json(self):
        return {
            "card_name": self.card_name,
        }

    def cast_spell(self):
        """
        スペル開始時効果
        :return:
        """
        return self.cast_spell()
