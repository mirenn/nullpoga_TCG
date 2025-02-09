export declare enum ActionType {
    MONSTER_MOVE = "MONSTER_MOVE",
    MONSTER_ATTACK = "MONSTER_ATTACK",
    SPELL_PHASE_END = "SPELL_PHASE_END",
    SUMMON_PHASE_END = "SUMMON_PHASE_END",
    ACTIVITY_PHASE_END = "ACTIVITY_PHASE_END"
}
export interface ActionData {
    summonStandbyFieldIdx?: number;
    monsterCard?: any;
    fromIdx?: number;
    toIdx?: number;
    attackerIdx?: number;
    targetIdx?: number;
}
export declare class Action {
    actionType: ActionType;
    actionData?: ActionData;
    constructor(actionType: ActionType, actionData?: ActionData);
    toDict(): Record<string, any>;
}
