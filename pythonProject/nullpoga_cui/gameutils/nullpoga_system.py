from enum import Enum
from .spell_cards import SpellCard
from .monster_cards import MonsterCard
import types


class CardType(Enum):
    SPELL = "SPELL"
    MONSTER = "MONSTER"


def instance_card(card_no: int):
    """0未採番だが0~99モンスターカード、100~199スペルカード"""
    match card_no:
        case 1:
            return MonsterCard(card_no, 1, "ネズミ", 1, 1)
        case 2:
            card = MonsterCard(card_no, 2, "柴犬ラン丸", 2, 1)

            def custom_move_effect(self):
                self.attack = self.attack + 1

            card.move_effect = types.MethodType(custom_move_effect, card)
            return card
        case 3:
            return MonsterCard(card_no, 2, "ネコ", 1, 2)
        case 4:
            card = MonsterCard(card_no, 2, "カエル三等兵", 0, 1)

            def custom_turn_start_effect(self):
                if not hasattr(self, 'count'):
                    self.count = 0
                    self.life += 1
                elif self.count == 1:
                    self.attack += 1
                elif self.count == 2:
                    self.attack += 1
                    self.life += 1
                self.count += 1

            card.turn_start_effect = types.MethodType(custom_turn_start_effect, card)
            return card
        case 5:
            return MonsterCard(card_no, 2, "亀", 0, 4)
        case 6:
            card = MonsterCard(card_no, 2, "電気クラゲ", 1, 1)

            def custom_attack_effect(self, opo_card: MonsterCard):
                opo_card.stun_count += 1

            card.attack_effect = types.MethodType(custom_attack_effect, card)
            # メモ：スタンはどう実装するか?
            # 盤面の情報から相手のモンスターカード自身にスタンのカウントを1増やす
            # スタンのカウントが1以上のときはlegal_attack_targets,legal_movesが空配列になる
            # スタンのカウントはターン終了時に1減らす
            return card
        case 7:
            return MonsterCard(card_no, 3, "イノシシ", 3, 2)
        case 11:
            return MonsterCard(card_no, 7, "炎のドラゴン", 5, 6)

        case 100:
            def cast_spell():
                pass

            return SpellCard(card_no, 1, "隕石落下", cast_spell)
