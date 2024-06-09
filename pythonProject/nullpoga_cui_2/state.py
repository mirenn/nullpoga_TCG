from __future__ import annotations
import hashlib
import json
import random

from istate import IState
from typing import List, Optional, Final
import copy
from gameutils.monster_cards import MonsterCard
from gameutils.spell_cards import SpellCard
from player import Player, Action, ActionData, ActionType, Slot, FieldStatus

import logging

DECK_1: Final = [7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2]
DECK_2: Final = [4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2]


# デバッグ用
# Trueにすると攻撃処理とnext処理のたびに停止してキー入力を受け付ける
DEBUG = False


def get_view(target: Slot | int | MonsterCard | SpellCard | None):
    """CLI表示の見た目調整用"""
    L = 15
    if target is None:
        return " " * L
    if type(target) == Slot:
        if target.card is None:
            if target.status == FieldStatus.WILDERNESS:
                return "x" * L
            else:
                return " " * L
        else:
            card = target.card
            attack_declaration = "ad" if card.attack_declaration else "--"
            status = f"{attack_declaration}"
            if target.status == FieldStatus.WILDERNESS:
                return f"xx {card.card_no:02}({str(card.life):>2},{status}) xx"
            else:
                return f"   {card.card_no:02}({str(card.life):>2},{status})   "
    if type(target) == MonsterCard or SpellCard:
        card = target
        attack_declaration = "ad" if card.attack_declaration else "--"
        status = f"{attack_declaration}"
        status = f"{attack_declaration}"
        return f"   {card.card_no:02}({str(card.life):>2},{status})   "
    if type(target) == int:
        return f"{target:02}"


class State(IState):
    """ゲームの状態を管理する。本質的な情報はPlayerが持つ。"""

    def __init__(self, player_1: Optional[Player] = None, player_2: Optional[Player] = None):
        # player_1を「手番のプレイヤー」と呼ぶ
        self.player_1: Player = player_1 if player_1 is not None else Player(DECK_1)
        self.player_2: Player = player_2 if player_2 is not None else Player(DECK_2)

        # ゲーム終了判定フラグ
        self.game_finished = False
        self.first_player_win = False
        self.second_player_win = False

    def init_game(self, debug=False):
        """初期状態からゲームを始める"""
        # デバッグ用
        global DEBUG
        DEBUG = debug

        # 便宜上「先手プレイヤー」のフラグを付けておく
        # 「先手プレイヤー」はplayer_1にもplayer_2にもなるので注意
        # というか手番が変わっても先手プレイヤーが判断できるようにフラグつけている
        self.player_1.is_first_player = True
        self.player_2.is_first_player = False

        # デッキをシャッフル
        random.shuffle(self.player_1.deck_cards)
        random.shuffle(self.player_2.deck_cards)

        # ５枚ドロー
        for _ in range(5):
            self.player_1.draw_card()
            self.player_2.draw_card()

        # 初期マナを付与（デッキ枚数とゲームスピードの調整のため少し多めにしている）
        self.player_1.mana += 10
        self.player_2.mana += 10

    def to_json(self):
        """お試し。ゲーム情報のインポート、エクスポート用"""
        state_json = {
            "palyer1": {
                "life": self.player_1.life,
                "phase": str(self.player_1.phase),
                "hands": [card.card_no for card in self.player_1.hand_cards],
                "deck": [card.card_no for card in self.player_1.deck_cards],
                "zone": {
                    "battle_field": [get_view(slot) for slot in self.player_1.zone.battle_field],
                    "standby": [get_view(card) if card is not None else None for card in self.player_1.zone.standby_field],
                },
            },
            "palyer2": {
                "life": self.player_2.life,
                "phase": str(self.player_2.phase),
                "hands": [get_view(card) for card in self.player_2.hand_cards],
                "deck": [get_view(card) for card in self.player_2.deck_cards],
                "zone": {
                    "battle_field": [get_view(slot) for slot in self.player_2.zone.battle_field],
                    "standby": [get_view(card) if card is not None else None for card in self.player_2.zone.standby_field],
                },
            },
        }
        return state_json

    def __hash__(self) -> int:
        """お試し。盤面管理の効率化のためにハッシュ化できるようにしておく"""
        return hashlib.md5(json.dumps(self.to_json(), sort_keys=True)).hexdigest()

    def __eq__(self, other: State):
        """お試し。等価判定。ハッシュが衝突したとき用だけどほぼ無意味"""
        return json.dumps(self.to_json(), sort_keys=True) == json.dumps(other.to_json(), sort_keys=True)

    def next_turn(self) -> State:
        """各プレイヤーの入力が終わっている前提で、１ターン文の処理を行う。
        お互いのプレイヤーの予約されたアクションを処理する"""
        # すでにゲームが終了している場合はエラー
        if self.game_finished:
            raise Exception("# すでにゲームが終了しています。")
        # 一旦nextで実装だが、まとめてもよさそう
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)
        temp_state = State(player_1, player_2)
        # ★スペルフェイズを処理
        # スペル処理（プレイヤー入力）
        for action in player_1.spell_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()
        for action in player_2.spell_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()

        # ★召喚フェイズを処理
        # 進軍処理（自動）
        temp_state.player_1.move_forward()
        temp_state.player_2.move_forward()
        # 召喚処理（プレイヤー入力）
        for action in player_1.summon_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()
        for action in player_2.summon_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()

        # ★行動フェイズを処理
        # 行動、攻撃宣言処理（プレイヤー入力）
        # メモ：攻撃宣言はインデックスで宣言。個劇処理時に宣言箇所にカードがなければ不発（スキップ）
        for action in player_1.activity_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()
        for action in player_2.activity_phase_actions:
            temp_state = temp_state.next(action)
        temp_state = temp_state.change_player()
        # 攻撃処理（自動）
        for i in range(5):
            temp_state = temp_state.resolve_attack_phase_1step()
            if DEBUG:
                input(f"攻撃処理 [{i}/5]step")
                temp_state.print()
                input("デバッグモード・・・適当なキーを押してください")
            if temp_state.game_finished:
                break

        # ターン終了
        # 移動済みモンスターが攻撃できないようにする場合はここで行動済みフラグをリセットする
        for idx, slot in enumerate(player_1.zone.battle_field):
            if slot.card is not None and slot.card.attack_declaration:
                slot.card.done_activity = False
        for idx, slot in enumerate(player_2.zone.battle_field):
            if slot.card is not None:
                slot.card.done_activity = False

        # デッキ切れ判定（とりあえず引き分け）
        if len(temp_state.player_1.deck_cards) == 0 or len(temp_state.player_2.deck_cards) == 0:
            temp_state.game_finished = True
            logging.debug("# デッキ切れのためゲーム終了です")
            return temp_state

        if temp_state.game_finished:
            logging.debug("# ゲーム終了です")

        # 次のターン開始して再度プレイヤーの入力を受け付ける
        temp_state.player_1.draw_card()
        temp_state.player_2.draw_card()
        temp_state.player_1.mana += 1
        temp_state.player_2.mana += 1

        return temp_state

    def resolve_attack_phase_1step(self) -> State:
        """1回分の攻撃処理。新しいゲームの状態を返す"""
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)
        new_state = State(player_1, player_2)

        def attack(player: Player, enemy_player: Player, battle_field_idx: int):
            # 攻撃対象のモンスターがいない場合はなにもしない
            if battle_field_idx is None:
                return
            card = player.zone.battle_field[battle_field_idx].card
            # 攻撃対象にカードがない場合
            target_slot = enemy_player.zone.battle_field[4 - battle_field_idx]
            if target_slot.card is None and target_slot.status == FieldStatus.WILDERNESS:
                logging.debug(f"# 直接攻撃（荒野済み）-> {card.attack}ダメージ")
                enemy_player.life -= card.attack
            elif target_slot.card is None:
                logging.debug(f"# 直接攻撃＆荒野化-> {card.attack}ダメージ")
                enemy_player.life -= card.attack
                target_slot.set_wild()
            elif target_slot.status == FieldStatus.WILDERNESS:
                logging.debug(f"# カードに攻撃（荒野済み）-> {card.attack}ダメージ")
                target_slot.card.life -= card.attack
            else:
                logging.debug(f"# カードに攻撃-> {card.attack}ダメージ")
                target_slot.card.life -= card.attack
            card.attack_declaration = False

        # 攻撃可能モンスターの判定
        player_1_idx = None
        player_2_idx = None
        for idx, slot in enumerate(player_1.zone.battle_field):
            if slot.card is not None and slot.card.attack_declaration:
                player_1_idx = idx
                break
        for idx, slot in enumerate(player_2.zone.battle_field):
            if slot.card is not None and slot.card.attack_declaration:
                player_2_idx = idx
                break

        attack(player_1, player_2, player_1_idx)
        attack(player_2, player_1, player_2_idx)

        # モンスターカードの破壊処理
        for idx, slot in enumerate(player_1.zone.battle_field):
            if slot.card is not None and slot.card.life <= 0:
                slot.remove_card()
        for idx, slot in enumerate(player_2.zone.battle_field):
            if slot.card is not None and slot.card.life <= 0:
                slot.remove_card()

        # 各種勝敗判定
        # 先手のプレイヤーが勝ち
        if new_state.second_player().life <= 0 and new_state.second_player().life < new_state.first_player().life:
            new_state = State(player_1, player_2)
            new_state.game_finished = True
            new_state.first_player_win = True
            return new_state
        # 後手のプレイヤーが勝ち
        if new_state.first_player().life <= 0 and new_state.first_player().life < new_state.second_player().life:
            new_state = State(player_1, player_2)
            new_state.game_finished = True
            new_state.second_player_win = True
            return new_state
        # 引き分け
        if new_state.first_player().life <= 0 and new_state.second_player().life <= 0:
            new_state = State(player_1, player_2)
            new_state.game_finished = True
            if new_state.first_player().life > new_state.second_player().life:
                new_state.first_player_win = True
            elif new_state.second_player().life > new_state.second_player().life:
                new_state.second_player_win = True
            return new_state

        # 先手フィールドの荒野判定
        first_player_wilderness_all = True
        for idx, slot in enumerate(new_state.first_player().zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                first_player_wilderness_all = False

        # 後手フィールドの荒野判定
        second_player_wilderness_all = True
        for idx, slot in enumerate(new_state.second_player().zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                second_player_wilderness_all = False

        # 先手勝ちの場合
        if not first_player_wilderness_all and second_player_wilderness_all:
            new_state.game_finished = True
            new_state.first_player_win = True
            return new_state
        if first_player_wilderness_all and not second_player_wilderness_all:
            new_state.game_finished = True
            new_state.second_player_win = True
            return new_state
        if first_player_wilderness_all and second_player_wilderness_all:
            # 両方荒野の場合はライフで判断
            new_state.game_finished = True
            if new_state.first_player().life > new_state.second_player().life:
                new_state.first_player_win = True
            elif new_state.second_player().life > new_state.second_player().life:
                new_state.second_player_win = True
            return new_state

        return State(player_1, player_2)

    def change_player(self) -> State:
        """手番を変更して新しい状態を返す"""
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)
        return State(player_2, player_1)

    def next(self, action: Action) -> State:
        """アクションを受け付け、状態を更新して次の状態を返す。
        めっちゃ細かい。実質デバッグ用。

        Parameters
        ----------
        action : Action
            アクション

        Returns
        -------
        State
            新しいゲームの状態
        """
        # 古い状態を辺にいじらないようにコピーする
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)

        if action.action_type == ActionType.SUMMON_MONSTER:
            logging.debug(f"ActionType.SUMMON_MONSTER {str(action)}")
            player_1.do_summon_monster(action)
        if action.action_type == ActionType.MONSTER_MOVE:
            logging.debug(f"ActionType.MONSTER_MOVE {str(action)}")
            player_1.do_move_monster(action)
        if action.action_type == ActionType.MONSTER_ATTACK:
            logging.debug(f"ActionType.MONSTER_ATTACK {str(action)}")
            player_1.do_monster_attack_declaration(action)

        new_state = State(player_1, player_2)
        if DEBUG:
            new_state.print()
            input("デバッグモード・・・適当なキーを押してください")
        return new_state

    def legal_actions(self) -> List[int]:
        """手番のプレイヤーの現在の状態での合法手を列挙する。

        Returns
        -------
        List[int]
            合法手のリスト
        """
        return self.player_1.legal_actions()

    def random_action(self) -> None:
        """手番のプレイヤーのアクションを設定する"""
        summon_actions = self.player_1.legal_summon_actions()
        random.shuffle(summon_actions)
        self.player_1.summon_phase_actions = summon_actions

        move_actions = self.player_1.legal_move_actions()
        attack_actions = self.player_1.legal_attack_actions()
        activity_actions = move_actions + attack_actions
        random.shuffle(activity_actions)
        self.player_1.activity_phase_actions = activity_actions

    def is_lose_first_player(self) -> bool:
        """先手が負けているかを判定"""
        return self.game_finished and self.second_player_win

    def is_lose_second_player(self) -> bool:
        """後手が負けているかを判定"""
        return self.game_finished and self.first_player_win

    def is_draw(self) -> bool:
        """引き分けを判定"""
        return self.game_finished and not self.first_player_win and not self.second_player_win

    def is_done(self) -> bool:
        """ゲーム終了条件を判定"""
        return self.game_finished

    def first_player(self) -> Player:
        return self.player_1 if self.player_1.is_first_player else self.player_2

    def second_player(self) -> Player:
        return self.player_2 if self.player_1.is_first_player else self.player_1

    def is_first_player(self) -> bool:
        """現在の手番が先手番の場合True"""
        return self.player_1.is_first_player

    def is_lose(self) -> bool:
        return self.is_lose_first_player()

    def __str__(self) -> str:
        """コンソールでの確認用"""
        L = 110
        s = "=" * L + "\n"
        s += "player2_mana    : " + f"{self.player_2.mana:>3}" + "\n"
        s += "player2_life    : " + f"{self.player_2.life:>3} ({self.player_2.phase})" + "\n"
        s += "player2_hand    : " + ",".join(f"[{get_view(card)}]" for card in self.player_2.hand_cards[::-1]) + "\n"
        s += "-" * L + "\n"
        s += "player2_standby : " + ",".join(f"[{get_view(card)}]" for card in self.player_2.zone.standby_field[::-1]) + "\n"
        s += "-" * L + "\n"
        s += "player2_battle  : " + ",".join(f"[{get_view(card)}]" for card in self.player_2.zone.battle_field[::-1]) + "\n"
        s += "=" * L + "\n"
        s += "player1_battle  : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.zone.battle_field) + "\n"
        s += "-" * L + "\n"
        s += "player1_standby : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.zone.standby_field) + "\n"
        s += "-" * L + "\n"
        s += "player1_hand    : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.hand_cards) + "\n"
        s += "player1_life    : " + f"{self.player_1.life:>3} ({self.player_1.phase})" + "\n"
        s += "player1_mana    : " + f"{self.player_1.mana:>3}" + "\n"
        s += "=" * L + "\n"
        if self.is_first_player():
            s += f"(先手番視点)\n"
        else:
            s += f"(後手番視点)\n"
        return s

    def print(self):
        print(str(self))


if __name__ == "__main__":
    # デバッグ用

    # 準備
    state = State()
    state.print()

    # ゲーム開始（５枚ドロー）
    state.init_game()
    state.print()

    for _ in range(10):
        state.random_action()
        state = state.change_player()
        state.random_action()
        state = state.change_player()
        state = state.next_turn()
        state.print()

        if state.is_done():
            break

    # デバッグ用
    if False:
        # デバッグ用手動実行
        # 召喚（先手プレイヤー）
        action = Action(ActionType.SUMMON_MONSTER, action_data=ActionData(summon_card_no=2, summon_standby_field_idx=4))
        state = state.next(action)
        state.print()

        # 召喚（先手プレイヤー）
        action = Action(ActionType.SUMMON_MONSTER, action_data=ActionData(summon_card_no=6, summon_standby_field_idx=1))
        state = state.next(action)
        state.print()

        # 先手プレイヤーのターンを終了する
        action = Action(ActionType.ACTIVITY_PHASE_END, action_data=ActionData())
        state = state.next(action)
        state = state.change_player()  # ここでプレイヤーが入れ替わるのに注意
        state.print()

        # 後手プレイヤーは何もしないでターンを終了
        action = Action(ActionType.ACTIVITY_PHASE_END, action_data=ActionData())
        state = state.next(action)
        state = state.change_player()  # ここでプレイヤーが入れ替わるのに注意
        state.print()

        # 進軍フェーズ（強制）
        state.player_1.move_forward()
        state.player_2.move_forward()
        state.print()

        # 行動フェーズ（移動アクションの処理）
        action = Action(
            ActionType.MONSTER_MOVE,
            action_data=ActionData(
                move_battle_field_idx=4,
                move_direction="left",
            ),
        )
        state = state.next(action)
        state.print()

        # 行動フェーズ（攻撃宣言の処理）
        action = Action(
            ActionType.MONSTER_ATTACK,
            action_data=ActionData(attack_declaration_idx=1),
        )
        state = state.next(action)
        state.print()

        # 本当は５回やる
        state = state.resolve_attack_phase_1step()
        state.print()
