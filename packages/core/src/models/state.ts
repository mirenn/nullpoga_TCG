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

    public player1: Player;
    public player2: Player;

    constructor(
        player1?: Player,
        player2?: Player
    ) {
        this.player1 = player1 || new Player(DECK_1, 'player1');
        this.player2 = player2 || new Player(DECK_2, 'player2');
    }

    initGame(): void {
        // Set first player flags
        this.player1.isFirstPlayer = true;
        this.player2.isFirstPlayer = false;

        // Initial mana (開始マナ 1, 最大 10)
        this.player1.mana = 1;
        this.player2.mana = 1;

        // Initial draw
        this.player1.init();
        this.player2.init();
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

    public executeFullTurn(
        player1SummonActions: Action[],
        player1ActivityActions: Action[],
        player2SummonActions: Action[],
        player2ActivityActions: Action[]
    ): void {
        this.player1.summonPhaseActions = player1SummonActions;
        this.player1.activityPhaseActions = player1ActivityActions;
        this.player2.summonPhaseActions = player2SummonActions;
        this.player2.activityPhaseActions = player2ActivityActions;

        this.executeEndphase(this.player1, this.player2);
        this.refreshTurn(this.player1, this.player2);
    }

    private executeEndphase(player1: Player, player2: Player): void {
        // 1. ターン開始時点（進軍前・召喚前）のスナップショットを履歴の最初に記録
        this.turnHistory.push({
            State: this.toJson(false),
            ActionDict: {
                system: {
                    actionType: 'TURN_START_SNAPSHOT' as any,
                    actionData: {}
                }
            }
        });

        // 2. 進軍フェーズ（待機フィールドからバトルフィールドへの移動）の実行と記録
        const p1Moves = this.getAdvanceMoves(player1);
        const p2Moves = this.getAdvanceMoves(player2);

        // 先攻から順に進軍アクションを1体ずつ実行・履歴に記録
        const advanceOrder = player1.isFirstPlayer ? [player1, player2] : [player2, player1];
        const movesMap = new Map<Player, Array<{ card: MonsterCard; fromIdx: number; toIdx: number }>>([
            [player1, p1Moves],
            [player2, p2Moves],
        ]);
        const maxMoves = Math.max(p1Moves.length, p2Moves.length);

        for (let i = 0; i < maxMoves; i++) {
            for (const p of advanceOrder) {
                const moves = movesMap.get(p) || [];
                const move = moves[i];
                if (move) {
                    this.advanceOneMonster(p, move.fromIdx, move.toIdx);
                    this.turnHistory.push({
                        State: this.toJson(false),
                        ActionDict: {
                            [p.userId]: {
                                actionType: ActionType.MONSTER_ADVANCE,
                                actionData: {
                                    monsterCard: move.card,
                                    fromStandbyIdx: move.fromIdx,
                                    toBattleIdx: move.toIdx,
                                }
                            }
                        }
                    });
                }
            }
        }

        // 3. Execute summon phase
        this.executeSummon(player1, player2);

        // 4. Execute activity phase
        this.executeActivity(player1, player2);

        // Add turn history to main history
        this.history.push(this.turnHistory);
        this.turnHistory = [];
    }

    private getAdvanceMoves(player: Player): Array<{ card: MonsterCard; fromIdx: number; toIdx: number }> {
        const moves: Array<{ card: MonsterCard; fromIdx: number; toIdx: number }> = [];
        for (let i = 0; i < player.zone.standbyField.length; i++) {
            const card = player.zone.standbyField[i];
            if (card && !player.zone.battleField[i].card) {
                moves.push({ card, fromIdx: i, toIdx: i });
            }
        }
        return moves;
    }

    private advanceOneMonster(player: Player, fromIdx: number, toIdx: number): void {
        const card = player.zone.standbyField[fromIdx];
        if (card && !player.zone.battleField[toIdx].card) {
            player.zone.battleField[toIdx].card = card;
            player.zone.standbyField[fromIdx] = null;
            if (player.planZone) {
                player.planZone = player.zone.clone();
            }
        }
    }

    private executeSummon(player1: Player, player2: Player): void {
        const executeSummonForPlayer = (player: Player, action: Action) => {
            const data = action?.actionData;
            if (data?.summonStandbyFieldIdx !== undefined &&
                data.monsterCard &&
                !player.zone.standbyField[data.summonStandbyFieldIdx] &&
                data.monsterCard.manaCost <= player.mana) {

                // マナコストを支払う
                player.mana -= data.monsterCard.manaCost;

                // 待機フィールドにカードを配置
                player.zone.standbyField[data.summonStandbyFieldIdx] = data.monsterCard;
                if (player.planZone) {
                    player.planZone.standbyField[data.summonStandbyFieldIdx] = data.monsterCard;
                }

                // 手札からカードを削除
                player.handCards = player.handCards.filter(
                    card => card.uniqId !== data.monsterCard.uniqId
                );
                if (player.planHandCards) {
                    player.planHandCards = player.planHandCards.filter(
                        card => card.uniqId !== data.monsterCard.uniqId
                    );
                }
            }
        };

        // 両プレイヤーの召喚アクションを先攻から順に1アクションずつ実行・記録
        const summonOrder = player1.isFirstPlayer ? [player1, player2] : [player2, player1];
        const maxSummonLen = Math.max(player1.summonPhaseActions.length, player2.summonPhaseActions.length);
        for (let i = 0; i < maxSummonLen; i++) {
            for (const p of summonOrder) {
                const action = p.summonPhaseActions[i];
                if (action) {
                    executeSummonForPlayer(p, action);
                    this.turnHistory.push({
                        State: this.toJson(false),
                        ActionDict: {
                            [p.userId]: action
                        }
                    });
                }
            }
        }

        // アクションリストをクリア
        player1.summonPhaseActions = [];
        player2.summonPhaseActions = [];
    }

    private executeActivity(player1: Player, player2: Player): void {
        const activityOrder = player1.isFirstPlayer ? [player1, player2] : [player2, player1];
        const maxActivityLen = Math.max(player1.activityPhaseActions.length, player2.activityPhaseActions.length);

        for (let i = 0; i < maxActivityLen; i++) {
            for (const actor of activityOrder) {
                const target = actor === player1 ? player2 : player1;
                const act = actor.activityPhaseActions[i];
                if (!act) continue;

                if (act.actionType === ActionType.MONSTER_MOVE) {
                    actor.monsterMove(act, actor.zone);
                    this.deleteMonster(player1, player2);
                    if (player1.planZone) player1.planZone = player1.zone.clone();
                    if (player2.planZone) player2.planZone = player2.zone.clone();
                    this.turnHistory.push({
                        State: this.toJson(false),
                        ActionDict: { [actor.userId]: act }
                    });
                } else if (act.actionType === ActionType.MONSTER_ATTACK) {
                    target.monsterAttacked(act, actor.zone);
                    this.deleteMonster(player1, player2);
                    if (player1.planZone) player1.planZone = player1.zone.clone();
                    if (player2.planZone) player2.planZone = player2.zone.clone();
                    this.turnHistory.push({
                        State: this.toJson(false),
                        ActionDict: { [actor.userId]: act }
                    });
                }

                if (this.isGameEnd()) {
                    break;
                }
            }
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

    toJson(includeHistory: boolean = true): Record<string, any> {
        const data: Record<string, any> = {
            player1: this.player1.toDict(),
            player2: this.player2.toDict(),
        };
        if (includeHistory) {
            data.history = this.history;
        }
        return data;
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
    static fromDict(data: any): State {
        const player1 = Player.fromDict(data.player1);
        const player2 = Player.fromDict(data.player2);
        
        const state = new State(player1, player2);
        state.history = data.history || [];
        // turnHistory is transient? toDict output didn't seem to include turnHistory explicitly?
        // toJson(): player1, player2, history.
        // turnHistory is not saved? 
        // It seems turnHistory is accumulated then pushed to history.
        // If we load from saved state which is a snapshot, turnHistory might be empty or lost if not saved.
        // But `toJson` only saves history.
        
        return state;
    }
}