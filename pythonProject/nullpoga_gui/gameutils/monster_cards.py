from typing import List
from nullpoga_system import CardType
import uuid
from uuid import UUID


class MonsterCard:
    activity_done_f: bool
    stun_count: int
    life: int
    attack: int
    card_name: str
    mana_cost: int
    card_type: CardType
    card_no: int
    uniq_id: UUID

    def __init__(self, card_no: int, mana_cost: int, card_name: str, attack: int, life: int):
        self.uniq_id = uuid.uuid4()
        self.card_no = card_no
        self.card_type = CardType.MONSTER
        self.mana_cost = mana_cost
        self.card_name = card_name
        self.attack = attack
        self.life = life
        self.stun_count = 0
        self.can_act = True

    def __str__(self):
        return f"{self.card_name}"

    def turn_start_effect(self):
        """
        ターン開始時効果
        :return:
        """
        pass

    def summon_effect(self):
        """
        召喚時効果
        :return:
        """
        pass

    def move_effect(self):
        """
        移動時効果
        :return:
        """
        pass

    def attack_effect(self):
        """
        攻撃時効果例：
        電気クラゲ　スタン付与
        隣のオコジョ 右前にも攻撃
        :return:
        """
        pass

    def legal_attack_targets(self) -> List:
        """
        取れる攻撃対象(敵の盤面いずれでも攻撃できるモンスターを実装するつもりがある)
        隣のオコジョの場合は前と右前を攻撃できるが、このターゲットとしては前のみ。
        攻撃時に両方攻撃するだけ。
        :return:
        """
        if self.stun_count > 0:
            return []
        pass

    def legal_moves(self) -> List:
        """
        左右移動が可能ならその分リストを返す
        :return:
        """
        if self.stun_count > 0:
            return []
        pass
