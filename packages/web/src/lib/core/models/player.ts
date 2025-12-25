import { PhaseKind } from './phase';
import { Zone, Slot } from './zone';
import { Action, ActionType } from './action';
import { Card, MonsterCard, instanceCard } from './card';

export class Player {
    public zone: Zone;
    public planZone: Zone;
    public life: number = 20;
    public mana: number = 0;
    public planMana: number = 0;
    public isFirstPlayer: boolean = false;
    public turnCount: number = 0;
    public phase: PhaseKind = PhaseKind.SPELL_PHASE;
    public userId: string;
    public handCards: Card[] = [];
    public planHandCards: Card[] = [];
    public deckCards: Card[] = [];
    
    public spellPhaseActions: Action[] = [];
    public summonPhaseActions: Action[] = [];
    public activityPhaseActions: Action[] = [];

    constructor(deckNumbers: number[], userId: string = 'default') {
        this.zone = new Zone();
        this.planZone = new Zone();
        this.deckCards = [...deckNumbers.map(instanceCard)];
        this.userId = userId;
    }

    public init(): void {
        for (let i = 0; i < 5; i++) {
            this.drawCard();
        }
        this.currentToPlan();
    }

    private drawCard(): void {
        if (this.deckCards.length > 0) {
            const card = this.deckCards.shift()!;
            this.handCards.push(card);
        }
    }
    private currentToPlan(): void {
        // Clone hand cards
        this.planHandCards = this.handCards.map(card => 
            card instanceof MonsterCard ? card.clone() : instanceCard(card.cardNo)
        );
        
        // Clone zone
        this.planZone = this.zone.clone();
        
        this.planMana = this.mana;
    }

    nextTurnRefresh(): void {
        this.turnCount++;
        this.mana += 1;
        this.planMana = this.mana;
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
        this.currentToPlan();
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
        this.planHandCards.forEach(card => {
            if (card instanceof MonsterCard && card.manaCost <= this.planMana) {
                // 空いている待機フィールドに配置可能
                this.planZone.standbyField.forEach((slot, idx) => {
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
        this.planZone.battleField.forEach((fromSlot, fromIdx) => {
            if (fromSlot.card) {
                this.planZone.battleField.forEach((toSlot, toIdx) => {
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
        this.planZone.battleField.forEach((attackerSlot, attackerIdx) => {
            if (attackerSlot.card && !attackerSlot.card.attackDeclaration) {
                // 敵フィールドの各スロットを攻撃可能
                this.planZone.battleField.forEach((_, targetIdx) => {
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
    static fromDict(data: any): Player {
        const player = new Player([], data.userId);
        
        player.life = data.life;
        player.mana = data.mana;
        player.planMana = data.planMana || data.mana; // planMana might need to be recalculated or saved
        player.isFirstPlayer = data.isFirstPlayer;
        player.turnCount = data.turnCount;
        player.phase = data.phase;
        player.userId = data.userId;
        
        player.handCards = data.handCards.map((c: any) => Card.fromDict(c));
        player.deckCards = data.deckCards.map((c: any) => Card.fromDict(c)); // Assuming deckCards in dict are also serialized cards
        
        player.zone = Zone.fromDict(data.zone);
        // planZone should presumably be rebuilt from zone or saved. 
        // If not saved, we can init from zone.
        // But planZone might be different during phase?
        // Let's assume for now we rebuild or if saved use it.
        // data.zone is used.
        player.planZone = player.zone.clone(); // Re-init planZone for safety, or if we saved it use it.
        // The toDict implementation did NOT save planZone nor planHandCards explicitly?
        // Let's check toDict in previous view.
        // toDict: zone: this.zone.toDict(). planZone is MISSING in toDict.
        // So we must re-create it using `currentToPlan` logic or similar.
        player.currentToPlan(); // This sets planZone and planHandCards from current state.
        
        // Restore actions
        player.spellPhaseActions = data.spellPhaseActions.map((a: any) => Action.fromDict(a));
        player.summonPhaseActions = data.summonPhaseActions.map((a: any) => Action.fromDict(a));
        player.activityPhaseActions = data.activityPhaseActions.map((a: any) => Action.fromDict(a));
        
        return player;
    }
}