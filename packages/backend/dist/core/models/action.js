"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = exports.ActionType = void 0;
var ActionType;
(function (ActionType) {
    ActionType["MONSTER_MOVE"] = "MONSTER_MOVE";
    ActionType["MONSTER_ATTACK"] = "MONSTER_ATTACK";
    ActionType["SPELL_PHASE_END"] = "SPELL_PHASE_END";
    ActionType["SUMMON_PHASE_END"] = "SUMMON_PHASE_END";
    ActionType["ACTIVITY_PHASE_END"] = "ACTIVITY_PHASE_END";
})(ActionType || (exports.ActionType = ActionType = {}));
class Action {
    constructor(actionType, actionData) {
        this.actionType = actionType;
        this.actionData = actionData;
    }
    toDict() {
        return {
            actionType: this.actionType,
            actionData: this.actionData
        };
    }
}
exports.Action = Action;
//# sourceMappingURL=action.js.map