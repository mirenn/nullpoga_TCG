"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = exports.DECK_2 = exports.DECK_1 = void 0;
const player_1 = require("./player");
const action_1 = require("./action");
const phase_1 = require("./phase");
const zone_1 = require("./zone");
exports.DECK_1 = [7, 5, 2, 1, 4, 6, 7, 5, 1, 4, 3, 3, 6, 2];
exports.DECK_2 = [4, 1, 7, 5, 5, 7, 6, 3, 4, 1, 3, 6, 2, 2];
class State {
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.history = [];
        this.turnHistory = [];
        this.player1 = player1 || new player_1.Player(exports.DECK_1);
        this.player2 = player2 || new player_1.Player(exports.DECK_2);
    }
    initGame() {
        this.player1.isFirstPlayer = true;
        this.player2.isFirstPlayer = false;
        for (let i = 0; i < 5; i++) {
            this.player1.drawCard();
            this.player2.drawCard();
        }
        this.player1.mana = 10;
        this.player2.mana = 10;
    }
    isGameEnd() {
        const player1WildernessAll = this.player1.zone.battleField.every(slot => slot.status === zone_1.FieldStatus.WILDERNESS);
        const player2WildernessAll = this.player2.zone.battleField.every(slot => slot.status === zone_1.FieldStatus.WILDERNESS);
        if (player1WildernessAll || player2WildernessAll) {
            return true;
        }
        return (this.player1.life <= 0 ||
            this.player2.life <= 0 ||
            (this.player1.deckCards.length < 1 && this.player2.deckCards.length < 1));
    }
    isDone() {
        return this.isGameEnd();
    }
    isLose() {
        return this.evaluateResult() === -1;
    }
    isDraw() {
        return this.evaluateResult() === 0;
    }
    isBothEndPhase() {
        return (this.player1.phase === phase_1.PhaseKind.END_PHASE &&
            this.player2.phase === phase_1.PhaseKind.END_PHASE);
    }
    evaluateResult() {
        let player1Point = 0;
        let player2Point = 0;
        if (this.player2.life <= 0 && this.player1.life > this.player2.life) {
            player1Point += 1;
        }
        else if (this.player1.life <= 0 && this.player1.life < this.player2.life) {
            player2Point += 1;
        }
        if (this.player2.deckCards.length < 1 && this.player1.deckCards.length >= 1) {
            player1Point += 1;
        }
        else if (this.player1.deckCards.length < 1 && this.player2.deckCards.length >= 1) {
            player2Point += 1;
        }
        if (this.player2.zone.battleField.every(slot => slot.status !== zone_1.FieldStatus.WILDERNESS)) {
            player1Point += 1;
        }
        if (this.player1.zone.battleField.every(slot => slot.status !== zone_1.FieldStatus.WILDERNESS)) {
            player2Point += 1;
        }
        if (player1Point > player2Point)
            return 1;
        if (player1Point < player2Point)
            return -1;
        return 0;
    }
    next(action) {
        const player1 = this.clonePlayer(this.player1);
        const player2 = this.clonePlayer(this.player2);
        player1.selectPlanAction(action);
        if (player1.phase === phase_1.PhaseKind.END_PHASE) {
            if (player2.phase === phase_1.PhaseKind.END_PHASE) {
                this.executeEndphase(player1, player2);
                this.refreshTurn(player1, player2);
            }
            return new State(player2, player1);
        }
        return new State(player1, player2);
    }
    executeEndphase(player1, player2) {
        this.moveForward(player1);
        this.moveForward(player2);
        this.executeSummon(player1, player2);
        this.executeActivity(player1, player2);
        this.history.push(this.turnHistory);
        this.turnHistory = [];
    }
    moveForward(player) {
        for (let i = 0; i < player.zone.standbyField.length; i++) {
            const card = player.zone.standbyField[i];
            if (card) {
                if (!player.zone.battleField[i].card) {
                    player.zone.battleField[i].card = card;
                    player.zone.standbyField[i] = null;
                }
            }
        }
    }
    executeSummon(player1, player2) {
        const executeSummonForPlayer = (player, action) => {
            var _a;
            if (((_a = action === null || action === void 0 ? void 0 : action.actionData) === null || _a === void 0 ? void 0 : _a.summonStandbyFieldIdx) !== undefined &&
                action.actionData.monsterCard &&
                !player.zone.standbyField[action.actionData.summonStandbyFieldIdx] &&
                action.actionData.monsterCard.manaCost <= player.mana) {
                player.mana -= action.actionData.monsterCard.manaCost;
                player.zone.standbyField[action.actionData.summonStandbyFieldIdx] = action.actionData.monsterCard;
                player.handCards = player.handCards.filter(card => card.uniqId !== action.actionData.monsterCard.uniqId);
            }
        };
        for (let i = 0; i < Math.max(player1.summonPhaseActions.length, player2.summonPhaseActions.length); i++) {
            const actionHistory = {};
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
        player1.summonPhaseActions = [];
        player2.summonPhaseActions = [];
    }
    executeActivity(player1, player2) {
        for (let i = 0; i < Math.max(player1.activityPhaseActions.length, player2.activityPhaseActions.length); i++) {
            const actionHistory = {};
            const p1Action = player1.activityPhaseActions[i];
            const p2Action = player2.activityPhaseActions[i];
            if ((p1Action === null || p1Action === void 0 ? void 0 : p1Action.actionType) === action_1.ActionType.MONSTER_MOVE) {
                player1.monsterMove(p1Action, player1.zone);
                actionHistory[player1.userId] = p1Action;
            }
            if ((p2Action === null || p2Action === void 0 ? void 0 : p2Action.actionType) === action_1.ActionType.MONSTER_MOVE) {
                player2.monsterMove(p2Action, player2.zone);
                actionHistory[player2.userId] = p2Action;
            }
            if ((p1Action === null || p1Action === void 0 ? void 0 : p1Action.actionType) === action_1.ActionType.MONSTER_ATTACK) {
                player2.monsterAttacked(p1Action, player1.zone);
                actionHistory[player1.userId] = p1Action;
            }
            if ((p2Action === null || p2Action === void 0 ? void 0 : p2Action.actionType) === action_1.ActionType.MONSTER_ATTACK) {
                player1.monsterAttacked(p2Action, player2.zone);
                actionHistory[player2.userId] = p2Action;
            }
            this.deleteMonster(player1, player2);
            if (Object.keys(actionHistory).length > 0) {
                this.turnHistory.push({
                    State: this.toJson(),
                    ActionDict: actionHistory
                });
            }
            if (this.isGameEnd()) {
                break;
            }
        }
        player1.activityPhaseActions = [];
        player2.activityPhaseActions = [];
    }
    refreshTurn(player1, player2) {
        player1.nextTurnRefresh();
        player2.nextTurnRefresh();
    }
    clonePlayer(player) {
        return JSON.parse(JSON.stringify(player));
    }
    toJson() {
        return {
            player1: this.player1.toDict(),
            player2: this.player2.toDict(),
            history: this.history
        };
    }
    deleteMonster(myPlayer, enemyPlayer) {
        myPlayer.zone.battleField.forEach(slot => {
            var _a;
            if (((_a = slot.card) === null || _a === void 0 ? void 0 : _a.life) <= 0) {
                slot.removeCard();
            }
        });
        enemyPlayer.zone.battleField.forEach(slot => {
            var _a;
            if (((_a = slot.card) === null || _a === void 0 ? void 0 : _a.life) <= 0) {
                slot.removeCard();
            }
        });
    }
}
exports.State = State;
//# sourceMappingURL=state.js.map