"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const phase_1 = require("./phase");
const zone_1 = require("./zone");
const action_1 = require("./action");
const card_1 = require("./card");
class Player {
    constructor(deckNumbers, userId = 'default') {
        this.life = 20;
        this.mana = 0;
        this.planMana = 0;
        this.isFirstPlayer = false;
        this.turnCount = 0;
        this.phase = phase_1.PhaseKind.SPELL_PHASE;
        this.handCards = [];
        this.planHandCards = [];
        this.deckCards = [];
        this.spellPhaseActions = [];
        this.summonPhaseActions = [];
        this.activityPhaseActions = [];
        this.zone = new zone_1.Zone();
        this.deckCards = [...deckNumbers.map(card_1.instanceCard)];
        this.userId = userId;
    }
    init() {
        for (let i = 0; i < 5; i++) {
            this.drawCard();
        }
        this.currentToPlan();
    }
    drawCard() {
        if (this.deckCards.length > 0) {
            const card = this.deckCards.shift();
            this.handCards.push(card);
        }
    }
    currentToPlan() {
        this.planHandCards = this.handCards.map(card => card instanceof card_1.MonsterCard ? card.clone() : (0, card_1.instanceCard)(card.cardNo));
        this.planZone = this.zone.clone();
        this.planMana = this.mana;
    }
    nextTurnRefresh() {
        this.turnCount++;
        this.mana += 1;
        this.planMana = this.mana;
        this.drawCard();
        this.spellPhaseActions = [];
        this.summonPhaseActions = [];
        this.activityPhaseActions = [];
        this.zone.battleField.forEach(slot => {
            if (slot.card) {
                slot.card.attackDeclaration = false;
            }
        });
        this.phase = phase_1.PhaseKind.SPELL_PHASE;
        this.currentToPlan();
    }
    monsterMove(action, zone) {
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
    monsterAttacked(action, enemyZone) {
        if (!action.actionData || action.actionData.attackerIdx === undefined || action.actionData.targetIdx === undefined) {
            return;
        }
        const { attackerIdx, targetIdx } = action.actionData;
        const attackerSlot = enemyZone.battleField[attackerIdx];
        const targetSlot = this.zone.battleField[targetIdx];
        if ((attackerSlot === null || attackerSlot === void 0 ? void 0 : attackerSlot.card) && (targetSlot === null || targetSlot === void 0 ? void 0 : targetSlot.card)) {
            targetSlot.card.life -= 1;
            attackerSlot.card.attackDeclaration = true;
        }
        else if ((attackerSlot === null || attackerSlot === void 0 ? void 0 : attackerSlot.card) && !(targetSlot === null || targetSlot === void 0 ? void 0 : targetSlot.card)) {
            this.life -= 1;
            attackerSlot.card.attackDeclaration = true;
        }
    }
    legalActions() {
        switch (this.phase) {
            case phase_1.PhaseKind.SPELL_PHASE:
                return this.getSpellPhaseActions();
            case phase_1.PhaseKind.SUMMON_PHASE:
                return this.getSummonPhaseActions();
            case phase_1.PhaseKind.ACTIVITY_PHASE:
                return this.getActivityPhaseActions();
            case phase_1.PhaseKind.END_PHASE:
                return [];
            default:
                return [];
        }
    }
    getSpellPhaseActions() {
        return [new action_1.Action(action_1.ActionType.SPELL_PHASE_END)];
    }
    getSummonPhaseActions() {
        const actions = [];
        this.planHandCards.forEach(card => {
            if (card instanceof card_1.MonsterCard && card.manaCost <= this.planMana) {
                this.planZone.standbyField.forEach((slot, idx) => {
                    if (!slot) {
                        actions.push(new action_1.Action(action_1.ActionType.SUMMON_PHASE_END, {
                            summonStandbyFieldIdx: idx,
                            monsterCard: card
                        }));
                    }
                });
            }
        });
        actions.push(new action_1.Action(action_1.ActionType.SUMMON_PHASE_END));
        return actions;
    }
    getActivityPhaseActions() {
        const actions = [];
        this.planZone.battleField.forEach((fromSlot, fromIdx) => {
            if (fromSlot.card) {
                this.planZone.battleField.forEach((toSlot, toIdx) => {
                    if (!toSlot.card && fromIdx !== toIdx) {
                        actions.push(new action_1.Action(action_1.ActionType.MONSTER_MOVE, {
                            fromIdx,
                            toIdx
                        }));
                    }
                });
            }
        });
        this.planZone.battleField.forEach((attackerSlot, attackerIdx) => {
            if (attackerSlot.card && !attackerSlot.card.attackDeclaration) {
                this.planZone.battleField.forEach((_, targetIdx) => {
                    actions.push(new action_1.Action(action_1.ActionType.MONSTER_ATTACK, {
                        attackerIdx,
                        targetIdx
                    }));
                });
            }
        });
        actions.push(new action_1.Action(action_1.ActionType.ACTIVITY_PHASE_END));
        return actions;
    }
    toDict() {
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
    selectPlanAction(action) {
        switch (this.phase) {
            case phase_1.PhaseKind.SPELL_PHASE:
                this.handleSpellPhase(action);
                break;
            case phase_1.PhaseKind.SUMMON_PHASE:
                this.handleSummonPhase(action);
                break;
            case phase_1.PhaseKind.ACTIVITY_PHASE:
                this.handleActivityPhase(action);
                break;
            case phase_1.PhaseKind.END_PHASE:
                break;
        }
    }
    handleSpellPhase(action) {
        this.spellPhaseActions.push(action);
        if (action.actionType === action_1.ActionType.SPELL_PHASE_END) {
            this.phase = phase_1.PhaseKind.SUMMON_PHASE;
        }
    }
    handleSummonPhase(action) {
        this.summonPhaseActions.push(action);
        if (action.actionType === action_1.ActionType.SUMMON_PHASE_END) {
            this.phase = phase_1.PhaseKind.ACTIVITY_PHASE;
        }
    }
    handleActivityPhase(action) {
        this.activityPhaseActions.push(action);
        if (action.actionType === action_1.ActionType.ACTIVITY_PHASE_END) {
            this.phase = phase_1.PhaseKind.END_PHASE;
        }
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map