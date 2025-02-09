import { PhaseKind } from './phase';
import { Zone } from './zone';
import { Action, ActionType } from './action';
import { Card, MonsterCard, instanceCard } from './card';

export class Player {
    public zone: Zone;
    public life: number = 20;
    public mana: number = 0;
    public isFirstPlayer: boolean = false;
    public turnCount: number = 0;
    public phase: PhaseKind = PhaseKind.SPELL_PHASE;
    public userId: string;

    public handCards: Card[] = [];
    public deckCards: number[] = [];
    
    public spellPhaseActions: Action[] = [];
    public summonPhaseActions: Action[] = [];
    public activityPhaseActions: Action[] = [];

    constructor(deck: number[], userId: string = 'default') {
        this.zone = new Zone();
        this.deckCards = [...deck];
        this.userId = userId;
    }

    drawCard(): void {
        if (this.deckCards.length > 0) {
            const cardNo = this.deckCards.shift()!;
            const card = instanceCard(cardNo);
            this.handCards.push(card);
        }
    }

    nextTurnRefresh(): void {
        this.turnCount++;
        this.mana += 1;
        this.drawCard();
        
        // Reset phase actions
        this.spellPhaseActions = [];
        this.summonPhaseActions = [];
        this.activityPhaseActions = [];
        
        // Reset attack declarations
        this.zone.battleField.forEach(slot => {
            if (slot.card) {
                slot.card.attackDeclaration = false;
            }
        });
        
        this.phase = PhaseKind.SPELL_PHASE;
    }

    monsterMove(action: Action, zone: Zone): void {
        if (!action.actionData || action.actionData.fromIdx === undefined || action.actionData.toIdx === undefined) {
            return;
        }
        
        const { fromIdx, toIdx } = action.actionData;
        const sourceSlot = zone.battleField[fromIdx];
        const targetSlot = zone.battleField[toIdx];
        
        if (sourceSlot && sourceSlot.card && !targetSlot.card) {
            targetSlot.card = sourceSlot.card;
            sourceSlot.removeCard();
        }
    }

    monsterAttacked(action: Action, enemyZone: Zone): void {
        if (!action.actionData || action.actionData.attackerIdx === undefined || action.actionData.targetIdx === undefined) {
            return;
        }

        const { attackerIdx, targetIdx } = action.actionData;
        const attackerSlot = enemyZone.battleField[attackerIdx];
        const targetSlot = this.zone.battleField[targetIdx];

        if (attackerSlot?.card && targetSlot?.card) {
            targetSlot.card.life -= 1;
            attackerSlot.card.attackDeclaration = true;
        } else if (attackerSlot?.card && !targetSlot?.card) {
            this.life -= 1;
            attackerSlot.card.attackDeclaration = true;
        }
    }

    legalActions(): Action[] {
        switch (this.phase) {
            case PhaseKind.SPELL_PHASE:
                return this.getSpellPhaseActions();
            case PhaseKind.SUMMON_PHASE:
                return this.getSummonPhaseActions();
            case PhaseKind.ACTIVITY_PHASE:
                return this.getActivityPhaseActions();
            case PhaseKind.END_PHASE:
                return []; // エンドフェーズでは行動できない
            default:
                return [];
        }
    }

    private getSpellPhaseActions(): Action[] {
        // 現状ではスペルカードの実装がないため、フェーズ終了のみ
        return [new Action(ActionType.SPELL_PHASE_END)];
    }

    private getSummonPhaseActions(): Action[] {
        const actions: Action[] = [];

        // 手札のモンスターカードを召喚可能な場所に配置するアクション
        this.handCards.forEach(card => {
            if (card instanceof MonsterCard && card.manaCost <= this.mana) {
                // 空いている待機フィールドに配置可能
                this.zone.standbyField.forEach((slot, idx) => {
                    if (!slot) {
                        actions.push(new Action(ActionType.SUMMON_PHASE_END, {
                            summonStandbyFieldIdx: idx,
                            monsterCard: card
                        }));
                    }
                });
            }
        });

        // フェーズ終了のアクション
        actions.push(new Action(ActionType.SUMMON_PHASE_END));
        
        return actions;
    }

    private getActivityPhaseActions(): Action[] {
        const actions: Action[] = [];

        // モンスターの移動アクション
        this.zone.battleField.forEach((fromSlot, fromIdx) => {
            if (fromSlot.card) {
                this.zone.battleField.forEach((toSlot, toIdx) => {
                    if (!toSlot.card && fromIdx !== toIdx) {
                        actions.push(new Action(ActionType.MONSTER_MOVE, {
                            fromIdx,
                            toIdx
                        }));
                    }
                });
            }
        });

        // モンスターの攻撃アクション
        this.zone.battleField.forEach((attackerSlot, attackerIdx) => {
            if (attackerSlot.card && !attackerSlot.card.attackDeclaration) {
                // 敵フィールドの各スロットを攻撃可能
                this.zone.battleField.forEach((_, targetIdx) => {
                    actions.push(new Action(ActionType.MONSTER_ATTACK, {
                        attackerIdx,
                        targetIdx
                    }));
                });
            }
        });

        // フェーズ終了のアクション
        actions.push(new Action(ActionType.ACTIVITY_PHASE_END));
        
        return actions;
    }

    toDict(): Record<string, any> {
        return {
            life: this.life,
            mana: this.mana,
            isFirstPlayer: this.isFirstPlayer,
            turnCount: this.turnCount,
            phase: this.phase,
            userId: this.userId,
            handCards: this.handCards.map(card => card.toDict()),
            deckCards: this.deckCards,
            zone: this.zone.toDict(),
            spellPhaseActions: this.spellPhaseActions.map(action => action.toDict()),
            summonPhaseActions: this.summonPhaseActions.map(action => action.toDict()),
            activityPhaseActions: this.activityPhaseActions.map(action => action.toDict())
        };
    }

    selectPlanAction(action: Action): void {
        switch (this.phase) {
            case PhaseKind.SPELL_PHASE:
                this.handleSpellPhase(action);
                break;
            case PhaseKind.SUMMON_PHASE:
                this.handleSummonPhase(action);
                break;
            case PhaseKind.ACTIVITY_PHASE:
                this.handleActivityPhase(action);
                break;
            case PhaseKind.END_PHASE:
                // すでにエンドフェーズの場合は何もしない
                break;
        }
    }

    private handleSpellPhase(action: Action): void {
        // スペルフェーズのアクションを処理
        this.spellPhaseActions.push(action);
        if (action.actionType === ActionType.SPELL_PHASE_END) {
            this.phase = PhaseKind.SUMMON_PHASE;
        }
    }

    private handleSummonPhase(action: Action): void {
        // 召喚フェーズのアクションを処理
        this.summonPhaseActions.push(action);
        if (action.actionType === ActionType.SUMMON_PHASE_END) {
            this.phase = PhaseKind.ACTIVITY_PHASE;
        }
    }

    private handleActivityPhase(action: Action): void {
        // アクティビティフェーズのアクションを処理
        this.activityPhaseActions.push(action);
        if (action.actionType === ActionType.ACTIVITY_PHASE_END) {
            this.phase = PhaseKind.END_PHASE;
        }
    }
}