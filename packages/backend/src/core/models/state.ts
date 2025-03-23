import { IState } from '../interfaces/istate';
import { Player } from './player';
import { Action, ActionType } from './action';
import { PhaseKind } from './phase';
import { FieldStatus } from './zone';
import { MonsterCard, instanceCard } from './card';

// Initial deck configurations
export const DECK_1 = [7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2];
export const DECK_2 = [4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2];

export class State implements IState {
    private history: Array<Array<Record<string, any>>> = [];
    private turnHistory: Array<Record<string, any>> = [];

    constructor(
        public player1?: Player,
        public player2?: Player
    ) {
        this.player1 = player1 || new Player(DECK_1);
        this.player2 = player2 || new Player(DECK_2);
    }

    initGame(): void {
        // Set first player flags
        this.player1.isFirstPlayer = true;
        this.player2.isFirstPlayer = false;

        // Initial draw
        this.player1.init();
        this.player2.init();

        // Initial mana
        this.player1.mana = 10;
        this.player2.mana = 10;
    }

    isGameEnd(): boolean {
        // Check wilderness condition for both players
        const player1WildernessAll = this.player1.zone.battleField.every(
            slot => slot.status === FieldStatus.WILDERNESS
        );
        const player2WildernessAll = this.player2.zone.battleField.every(
            slot => slot.status === FieldStatus.WILDERNESS
        );

        if (player1WildernessAll || player2WildernessAll) {
            return true;
        }

        // Check life and deck conditions
        return (
            this.player1.life <= 0 ||
            this.player2.life <= 0 ||
            (this.player1.deckCards.length < 1 && this.player2.deckCards.length < 1)
        );
    }

    isDone(): boolean {
        return this.isGameEnd();
    }

    isLose(): boolean {
        return this.evaluateResult() === -1;
    }

    isDraw(): boolean {
        return this.evaluateResult() === 0;
    }

    isBothEndPhase(): boolean {
        return (
            this.player1.phase === PhaseKind.END_PHASE &&
            this.player2.phase === PhaseKind.END_PHASE
        );
    }

    evaluateResult(): number {
        let player1Point = 0;
        let player2Point = 0;

        // Life points
        if (this.player2.life <= 0 && this.player1.life > this.player2.life) {
            player1Point += 1;
        } else if (this.player1.life <= 0 && this.player1.life < this.player2.life) {
            player2Point += 1;
        }

        // Deck out points
        if (this.player2.deckCards.length < 1 && this.player1.deckCards.length >= 1) {
            player1Point += 1;
        } else if (this.player1.deckCards.length < 1 && this.player2.deckCards.length >= 1) {
            player2Point += 1;
        }

        // Wilderness points
        if (this.player2.zone.battleField.every(slot => slot.status !== FieldStatus.WILDERNESS)) {
            player1Point += 1;
        }
        if (this.player1.zone.battleField.every(slot => slot.status !== FieldStatus.WILDERNESS)) {
            player2Point += 1;
        }

        if (player1Point > player2Point) return 1;
        if (player1Point < player2Point) return -1;
        return 0;
    }

    next(action: Action): State {
        const player1 = this.clonePlayer(this.player1);
        const player2 = this.clonePlayer(this.player2);

        player1.selectPlanAction(action);
        if (player1.phase === PhaseKind.END_PHASE) {
            if (player2.phase === PhaseKind.END_PHASE) {
                this.executeEndphase(player1, player2);
                this.refreshTurn(player1, player2);
            }
            return new State(player2, player1);
        }
        return new State(player1, player2);
    }

    private executeEndphase(player1: Player, player2: Player): void {
        // Execute movement phase
        this.moveForward(player1);
        this.moveForward(player2);

        // Execute summon phase
        this.executeSummon(player1, player2);

        // Execute activity phase
        this.executeActivity(player1, player2);

        // Add turn history to main history
        this.history.push(this.turnHistory);
        this.turnHistory = [];
    }

    private moveForward(player: Player): void {
        // 待機フィールドからバトルフィールドへの移動
        for (let i = 0; i < player.zone.standbyField.length; i++) {
            const card = player.zone.standbyField[i];
            if (card) {
                // バトルフィールドの同じインデックスが空いているか確認
                if (!player.zone.battleField[i].card) {
                    // カードを移動
                    player.zone.battleField[i].card = card;
                    // 待機フィールドをクリア
                    player.zone.standbyField[i] = null;
                }
            }
        }
    }

    private executeSummon(player1: Player, player2: Player): void {
        const executeSummonForPlayer = (player: Player, action: Action) => {
            if (action?.actionData?.summonStandbyFieldIdx !== undefined &&
                action.actionData.monsterCard &&
                !player.zone.standbyField[action.actionData.summonStandbyFieldIdx] &&
                action.actionData.monsterCard.manaCost <= player.mana) {
                
                // マナコストを支払う
                player.mana -= action.actionData.monsterCard.manaCost;
                
                // 待機フィールドにカードを配置
                player.zone.standbyField[action.actionData.summonStandbyFieldIdx] = action.actionData.monsterCard;
                
                // 手札からカードを削除
                player.handCards = player.handCards.filter(
                    card => card.uniqId !== action.actionData.monsterCard.uniqId
                );
            }
        };

        // 両プレイヤーの召喚アクションを実行
        for (let i = 0; i < Math.max(player1.summonPhaseActions.length, player2.summonPhaseActions.length); i++) {
            const actionHistory: Record<string, Action> = {};
            
            if (player1.summonPhaseActions[i]) {
                executeSummonForPlayer(player1, player1.summonPhaseActions[i]);
                actionHistory[player1.userId] = player1.summonPhaseActions[i];
            }
            
            if (player2.summonPhaseActions[i]) {
                executeSummonForPlayer(player2, player2.summonPhaseActions[i]);
                actionHistory[player2.userId] = player2.summonPhaseActions[i];
            }

            if (Object.keys(actionHistory).length > 0) {
                this.turnHistory.push({
                    State: this.toJson(),
                    ActionDict: actionHistory
                });
            }
        }

        // アクションリストをクリア
        player1.summonPhaseActions = [];
        player2.summonPhaseActions = [];
    }

    private executeActivity(player1: Player, player2: Player): void {
        for (let i = 0; i < Math.max(player1.activityPhaseActions.length, player2.activityPhaseActions.length); i++) {
            const actionHistory: Record<string, Action> = {};
            const p1Action = player1.activityPhaseActions[i];
            const p2Action = player2.activityPhaseActions[i];

            // モンスターの移動処理
            if (p1Action?.actionType === ActionType.MONSTER_MOVE) {
                player1.monsterMove(p1Action, player1.zone);
                actionHistory[player1.userId] = p1Action;
            }
            if (p2Action?.actionType === ActionType.MONSTER_MOVE) {
                player2.monsterMove(p2Action, player2.zone);
                actionHistory[player2.userId] = p2Action;
            }

            // モンスターの攻撃処理
            if (p1Action?.actionType === ActionType.MONSTER_ATTACK) {
                player2.monsterAttacked(p1Action, player1.zone);
                actionHistory[player1.userId] = p1Action;
            }
            if (p2Action?.actionType === ActionType.MONSTER_ATTACK) {
                player1.monsterAttacked(p2Action, player2.zone);
                actionHistory[player2.userId] = p2Action;
            }

            // 各アクション後にライフが0以下になったモンスターを削除
            this.deleteMonster(player1, player2);

            // 行動履歴を記録
            if (Object.keys(actionHistory).length > 0) {
                this.turnHistory.push({
                    State: this.toJson(),
                    ActionDict: actionHistory
                });
            }

            // ゲーム終了条件をチェック
            if (this.isGameEnd()) {
                break;
            }
        }

        // アクションリストをクリア
        player1.activityPhaseActions = [];
        player2.activityPhaseActions = [];
    }

    private refreshTurn(player1: Player, player2: Player): void {
        player1.nextTurnRefresh();
        player2.nextTurnRefresh();
    }

    private clonePlayer(player: Player): Player {
        // 新しいPlayerオブジェクトを作成
        const newPlayer = new Player([], player.userId);
        
        // 基本的なプロパティをコピー
        newPlayer.life = player.life;
        newPlayer.mana = player.mana;
        newPlayer.planMana = player.planMana;
        newPlayer.isFirstPlayer = player.isFirstPlayer;
        newPlayer.turnCount = player.turnCount;
        newPlayer.phase = player.phase;
        
        // アクションをコピー
        newPlayer.spellPhaseActions = [...player.spellPhaseActions];
        newPlayer.summonPhaseActions = [...player.summonPhaseActions];
        newPlayer.activityPhaseActions = [...player.activityPhaseActions];
        
        // ゾーンとカードのコピー
        newPlayer.zone = player.zone.clone();
        newPlayer.planZone = player.planZone ? player.planZone.clone() : newPlayer.zone.clone();
        
        // カードコレクションのコピー
        newPlayer.handCards = player.handCards.map(card => 
            card instanceof MonsterCard ? card.clone() : instanceCard(card.cardNo)
        );
        
        newPlayer.planHandCards = player.planHandCards ? player.planHandCards.map(card => 
            card instanceof MonsterCard ? card.clone() : instanceCard(card.cardNo)
        ) : [];
        
        newPlayer.deckCards = [...player.deckCards];
        
        return newPlayer;
    }

    toJson(): Record<string, any> {
        return {
            player1: this.player1.toDict(),
            player2: this.player2.toDict(),
            history: this.history
        };
    }

    private deleteMonster(myPlayer: Player, enemyPlayer: Player): void {
        myPlayer.zone.battleField.forEach(slot => {
            if (slot.card?.life <= 0) {
                slot.removeCard();
            }
        });

        enemyPlayer.zone.battleField.forEach(slot => {
            if (slot.card?.life <= 0) {
                slot.removeCard();
            }
        });
    }
    /**
     * 
     * @returns 
     * @description
     * 現在のプレイヤーの合法なアクションを返します
     * モンテカルロ木探索で使用されます
     **/
    public legalActions(): Action[] {
        return this.player1.legalActions();
    }

    /**
     * 
     * @returns 
     * @description
     * ランダムなアクションを返します
     * モンテカルロ木探索で使用されます
     */
    public randomAction(): Action {
        const legalActions = this.player1.legalActions();
        return legalActions[Math.floor(Math.random() * legalActions.length)];
    }
}