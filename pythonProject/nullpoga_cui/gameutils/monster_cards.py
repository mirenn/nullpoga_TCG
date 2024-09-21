from dataclasses import dataclass, field, asdict
from typing import List
from uuid import UUID, uuid4
from nullpoga_cui.gameutils.card_type import CardType


@dataclass
class MonsterCard:
    card_no: int
    mana_cost: int
    card_name: str
    attack: int
    life: int
    card_type: CardType = field(default=CardType.MONSTER)
    uniq_id: UUID = field(default_factory=uuid4)  # UUIDをデフォルトで生成
    stun_count: int = 0
    can_act: bool = True
    attack_declaration: bool = False
    done_activity: bool = False

    def __str__(self):
        return f"{self.card_name}"

    def to_dict(self):
        # return {
        #     "card_name": self.card_name,
        #     "life": self.life
        # }
        return asdict(self)

    def turn_start_effect(self):
        """
        ターン開始時効果
        """
        pass

    def summon_effect(self):
        """
        召喚時効果
        """
        pass

    def move_effect(self):
        """
        移動時効果
        """
        pass

    def attack_effect(self):
        """
        攻撃時効果

        攻撃時効果例：
         - 電気クラゲ　スタン付与
         - 隣のオコジョ 右前にも攻撃
        """
        pass

    def legal_attack_targets(self) -> List:
        """
        取れる攻撃対象(敵の盤面いずれでも攻撃できるモンスターを実装するつもりがある)
        隣のオコジョの場合は前と右前を攻撃できるが、このターゲットとしては前のみ。
        攻撃時に両方攻撃するだけ。
        """
        if self.stun_count > 0:
            return []
        pass

    def legal_moves(self) -> List:
        """
        左右移動が可能ならその分リストを返す
        """
        if self.stun_count > 0:
            return []
        pass
