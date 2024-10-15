from __future__ import annotations
import hashlib
import random
from random import choice
from typing import List, Optional, Final, Union, Any, Tuple, Literal
import copy
# from dataclasses import dataclass, field, asdict
from pydantic import BaseModel
from typing import Dict, Any

from nullpoga_cui.npg_monte_carlo_tree_search.istate import IState
from nullpoga_cui.gameutils.monster_cards import MonsterCard
from nullpoga_cui.gameutils.spell_cards import SpellCard
from itertools import zip_longest
from nullpoga_cui.player import Player, PhaseKind
from nullpoga_cui.gameutils.zone import FieldStatus, Slot
from nullpoga_cui.gameutils.action import ActionType, ActionData, Action
import json

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
        return f"   {card.card_no:02}({str(card.life):>2},{status})   "
    if type(target) == int:
        return f"{target:02}"


class State(IState):

    def __init__(self, player_1: Optional[Player] = None, player_2: Optional[Player] = None, history=None,
                 turn_his=None):
        # player_1を「手番のプレイヤー」と呼ぶ
        self.player_1: Player = player_1 if player_1 is not None else Player(DECK_1)
        self.player_2: Player = player_2 if player_2 is not None else Player(DECK_2)
        if history is None:
            self.history: List[List[dict]] = []  # メモ：historyは、基本クライアント用なのでmontecarlosearchの自己対戦には不要。無駄にメモリを食いそう
        else:
            self.history = history
        if turn_his is None:
            self.turn_his: List[dict] = []  # StepHistory
        else:
            self.turn_his = turn_his

    def to_dict(self):
        return {
            "player_1": self.player_1.to_dict(),
            "player_2": self.player_2.to_dict(),
            "history": self.history
        }

    def to_dict_without_his(self):
        return {
            "player_1": self.player_1.to_dict(),
            "player_2": self.player_2.to_dict(),
        }

    def init_game(self, debug=False):
        """初期状態からゲームを始める nagai:使わないかも"""
        # デバッグ用
        global DEBUG
        DEBUG = debug

        # 便宜上「先手プレイヤー」のフラグを付けておく
        # 「先手プレイヤー」はplayer_1にもplayer_2にもなるので注意
        # というか手番が変わっても先手プレイヤーが判断できるようにフラグつけている
        self.player_1.is_first_player = True
        self.player_2.is_first_player = False

        # デッキをシャッフル
        # random.shuffle(self.player_1.deck_cards)
        # random.shuffle(self.player_2.deck_cards)

        # ５枚ドロー
        # for _ in range(5):
        #     self.player_1.draw_card()
        #     self.player_2.draw_card()

        # # 初期マナを付与（デッキ枚数とゲームスピードの調整のため少し多めにしている）
        # self.player_1.mana += 10
        # self.player_2.mana += 10

    def to_json(self):
        """お試し。ゲーム情報のインポート、エクスポート用"""
        state_json = {
            "player1": self.player_1.to_dict(),
            "player2": self.player_2.to_dict(),
        }
        return state_json

    def __hash__(self) -> str:
        """お試し。盤面管理の効率化のためにハッシュ化できるようにしておく"""
        return hashlib.md5(json.dumps(self.to_json(), sort_keys=True).encode('utf-8')).hexdigest()

    def __eq__(self, other: State):
        """お試し。等価判定。ハッシュが衝突したとき用だけどほぼ無意味"""
        return json.dumps(self.to_json(), sort_keys=True) == json.dumps(other.to_json(), sort_keys=True)

    def is_game_end(self):
        """"
        - どちらかのライフがゼロ
        - どちらかがデッキアウトしたとき
        - バトルフィールドが全て荒野状態になったとき
        ゲーム終了と判定"""
        # 先手フィールドの荒野判定
        player_1_wilderness_all = True
        for idx, slot in enumerate(self.player_1.zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                player_1_wilderness_all = False
                break
        if player_1_wilderness_all:
            if DEBUG:
                print("ゲームエンド:フィールドが全て荒野")
            return True

        player_2_wilderness_all = True
        for idx, slot in enumerate(self.player_2.zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                player_2_wilderness_all = False
                break
        if player_2_wilderness_all:
            if DEBUG:
                print("ゲームエンド:フィールドが全て荒野")
            return True
        # ret_flag = (self.player_1.life <= 0) or (self.player_2.life <= 0) or (len(self.player_1.deck_cards) < 1) and (
        #         len(self.player_2.deck_cards) < 1)
        # デバッグのため確認
        if (self.player_1.life <= 0) or (self.player_2.life <= 0):
            if DEBUG:
                print("プレイヤーのライフがゼロ以下になったため終了")
            return True
        elif (len(self.player_1.deck_cards) < 1) and (
                len(self.player_2.deck_cards) < 1):
            if DEBUG:
                print("デッキ切れのため終了")
            return True

        return False

    def is_done(self):
        return self.is_game_end()

    def is_lose(self):
        return self.evaluate_result() == -1

    def is_draw(self):
        return self.evaluate_result() == 0

    def is_both_end_phase(self):
        return self.player_1.phase == self.player_2.phase == PhaseKind.END_PHASE

    @staticmethod
    def refresh_turn(player_1: Player, player_2: Player):
        player_1.next_turn_refresh()
        player_2.next_turn_refresh()

    def evaluate_result(self):
        """
        game_endが確定しているときに、ゲームの結果値を返す
        :return
        player_1が勝利 1
        player_2が勝利 -1
        引き分け 0

        - ライフによる勝利+1
        - デッキアウトによる勝利+1
        - 荒野状態による勝利+1
        これら全てを判定してplayer_1、player_2どちらが勝っているかを見て産出
        """
        player_1_point = 0
        player_2_point = 0

        if self.player_2.life <= 0 and self.player_1.life > self.player_2.life:
            player_1_point += 1
        elif self.player_2.life <= 0 and self.player_1.life < self.player_2.life:
            player_2_point += 1

        # デッキアウト勝ち
        if len(self.player_2.deck_cards) < 1 and len(self.player_1.deck_cards) >= 1:
            player_1_point += 1
        elif len(self.player_1.deck_cards) < 1 and len(self.player_2.deck_cards) >= 1:
            player_2_point += 1

        # 荒野状態による勝利
        # 先手フィールドの荒野判定
        player_2_point += 1
        for idx, slot in enumerate(self.player_1.zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                player_2_point -= 1
                break
        player_1_point += 1
        for idx, slot in enumerate(self.player_2.zone.battle_field):
            if slot.status != FieldStatus.WILDERNESS:
                player_1_point -= 1
                break

        if player_1_point > player_2_point:
            return 1
        elif player_1_point < player_2_point:
            return -1
        else:
            return 0

    def change_player(self) -> State:
        """手番を変更して新しい状態を返す"""
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)
        return State(player_2, player_1)

    def next(self, action_: Action) -> State:
        """
        Player1とPlayer2がエンドフェイズだったときは、
        処理を実行する、という処理を挟む
        :param action_:
        :return:
        """
        player_1 = copy.deepcopy(self.player_1)
        player_2 = copy.deepcopy(self.player_2)
        player_1.select_plan_action(action_)
        if player_1.phase == PhaseKind.END_PHASE:
            if player_2.phase == PhaseKind.END_PHASE:
                # 実際に処理する必要がある
                self.execute_endphase(player_1, player_2)
                self.refresh_turn(player_1, player_2)
            else:
                pass
            return State(player_2, player_1, history=self.history)  # nagai順番を変更する
        else:
            return State(player_1, player_2, history=self.history)  # nagaihisも引き継ぐ? 注意:turn_hisは配列で参照渡しで上書きされます

    def legal_actions(self) -> List[Action]:
        """手番のプレイヤーの現在の状態での合法手を列挙する。

        Returns
        -------
        List[Action]
            合法手のリスト
        """
        return self.player_1.legal_actions()

    def random_action(self) -> Action:
        """"player1の可能な手を返す
        """
        return choice(self.legal_actions())

    def first_player(self) -> Player:
        return self.player_1 if self.player_1.is_first_player else self.player_2

    def is_first_player(self) -> bool:
        """現在の手番が先手番の場合True"""
        return self.player_1.is_first_player

    def __str__(self) -> str:
        return json.dumps(self.__dict__)  # nagaiすべて出力してみる
        """コンソールでの確認用"""
        # L = 110
        # s = "=" * L + "\n"
        # s += "player2_mana    : " + f"{self.player_2.mana:>3}" + "\n"
        # s += "player2_life    : " + f"{self.player_2.life:>3} ({self.player_2.phase})" + "\n"
        # s += "player2_hand    : " + ",".join(f"[{get_view(card)}]" for card in self.player_2.hand_cards[::-1]) + "\n"
        # s += "-" * L + "\n"
        # s += "player2_standby : " + ",".join(
        #     f"[{get_view(card)}]" for card in self.player_2.zone.standby_field[::-1]) + "\n"
        # s += "-" * L + "\n"
        # s += "player2_battle  : " + ",".join(
        #     f"[{get_view(card)}]" for card in self.player_2.zone.battle_field[::-1]) + "\n"
        # s += "=" * L + "\n"
        # s += "player1_battle  : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.zone.battle_field) + "\n"
        # s += "-" * L + "\n"
        # s += "player1_standby : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.zone.standby_field) + "\n"
        # s += "-" * L + "\n"
        # s += "player1_hand    : " + ",".join(f"[{get_view(card)}]" for card in self.player_1.hand_cards) + "\n"
        # s += "player1_life    : " + f"{self.player_1.life:>3} ({self.player_1.phase})" + "\n"
        # s += "player1_mana    : " + f"{self.player_1.mana:>3}" + "\n"
        # s += "=" * L + "\n"
        # if self.is_first_player():
        #     s += f"(先手番視点)\n"
        # else:
        #     s += f"(後手番視点)\n"
        # return s

    def execute_endphase(self, player_1: Player, player_2: Player):
        """
        planの内容を実際に実行する。
        :param player_1:
        :param player_2:
        :return:
        """
        # スペルフェイズ未実装
        # 進軍フェイズ
        player_1.move_forward(player_1.zone)
        player_2.move_forward(player_2.zone)
        # summonフェイズ
        self.execute_summon(player_1, player_2)
        # activityフェイズ
        self.execute_activity(player_1, player_2)
        # 1ターン文の履歴をhistoryに追加
        self.history.append(self.turn_his)
        self.turn_his = []

    # @staticmethod
    def execute_summon(self, player_1: Player, player_2: Player):
        """
        召喚実行
        :param player_1: 召喚フェーズのプレイヤー
        :param player_2: 敵プレイヤー
        :return:
        """

        def summon_action(player: Player, action: Action):
            """個々のプレイヤーの召喚処理を行う"""
            if (action and action.action_data and not player.zone.standby_field[
                action.action_data.summon_standby_field_idx] and
                    action.action_data.monster_card.mana_cost <= player.mana and
                    any(card.uniq_id == action.action_data.monster_card.uniq_id for card in player.hand_cards)):
                player.mana -= action.action_data.monster_card.mana_cost
                player.zone.standby_field[action.action_data.summon_standby_field_idx] = action.action_data.monster_card
                # 手札から召喚したモンスターを削除(削除したい要素以外を残す)
                player.hand_cards = [card for card in player.hand_cards if
                                     card.uniq_id != action.action_data.monster_card.uniq_id]

        # 両プレイヤーの召喚処理を行う
        for my_act, e_act in zip_longest(player_1.summon_phase_actions, player_2.summon_phase_actions):
            his_act = {}
            if my_act:
                summon_action(player_1, my_act)
                his_act[player_1.user_id] = my_act
            if e_act:
                summon_action(player_2, e_act)
                his_act[player_2.user_id] = e_act
            self.turn_his.append({"State": self.to_dict_without_his(), "ActionDict": his_act})

        # アクションのリセット
        player_1.summon_phase_actions = []
        player_2.summon_phase_actions = []

    def execute_activity(self, player_1: Player, player_2: Player):
        step_history = []
        if DEBUG:
            print("turn count:", player_1.turn_count)
        for p1_act, p2_act in zip_longest(player_1.activity_phase_actions, player_2.activity_phase_actions):
            if DEBUG:
                print("exe_activity", "first_player" if player_1.is_first_player else "second_player",
                      p1_act.to_dict() if p1_act else None)
                print("exe_activity", "first_player" if player_2.is_first_player else "second_player",
                      p2_act.to_dict() if p2_act else None)

            his_act = {}

            if p1_act and p1_act.action_type == ActionType.MONSTER_MOVE:
                player_1.monster_move(p1_act, player_1.zone)
                his_act[player_1.user_id] = p1_act
            if p2_act and p2_act.action_type == ActionType.MONSTER_MOVE:
                player_2.monster_move(p2_act, player_2.zone)
                his_act[player_2.user_id] = p2_act
            if p1_act and p1_act.action_type == ActionType.MONSTER_ATTACK:
                player_2.monster_attacked(p1_act, player_1.zone, player_1.user_id)
                his_act[player_1.user_id] = p1_act
            if p2_act and p2_act.action_type == ActionType.MONSTER_ATTACK:
                player_1.monster_attacked(p2_act, player_2.zone)
                his_act[player_2.user_id] = p2_act
            self.delete_monster(player_1, player_2)
            self.turn_his.append({"State": self.to_dict_without_his(), "ActionDict": his_act})
            # ゲームエンドなら即終了する(先にゼロにしたらそこで終わりにすべきなため)
            if self.is_game_end():
                break

    @staticmethod
    def delete_monster(my_pieces: Player, e_pieces: Player):
        """
        ライフがゼロ以下になったモンスターを削除する
        :param my_pieces:
        :param e_pieces:
        :return:
        """
        for i, slt in enumerate(my_pieces.zone.battle_field):
            if slt.card is not None and slt.card.life <= 0:
                # slt.card = None
                slt.remove_card()
        for i, slt in enumerate(e_pieces.zone.battle_field):
            if slt.card is not None and slt.card.life <= 0:
                slt.card = None

    @staticmethod
    def pieces_count(pieces: List[int]) -> int:
        return pieces.count(1)


class StepHistory(BaseModel):
    """使用していないが、turn_his内のList[dict]のdictはこのStepHistoryの形"""
    ActionDict: dict[str, Action]  # キーはuser_id
    State: dict  # stete.to_dict_without_his()の出力
