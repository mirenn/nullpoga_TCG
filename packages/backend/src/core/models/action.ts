export enum ActionType {
    MONSTER_MOVE = 'MONSTER_MOVE',
    MONSTER_ATTACK = 'MONSTER_ATTACK',
    SPELL_PHASE_END = 'SPELL_PHASE_END',
    SUMMON_PHASE_END = 'SUMMON_PHASE_END',
    ACTIVITY_PHASE_END = 'ACTIVITY_PHASE_END'
}

export interface ActionData {
    summonStandbyFieldIdx?: number;
    monsterCard?: any; // Will update this type once we have MonsterCard defined
    fromIdx?: number;
    toIdx?: number;
    attackerIdx?: number;
    targetIdx?: number;
}

export class Action {
    constructor(
        public actionType: ActionType,
        public actionData?: ActionData
    ) {}

    toDict(): Record<string, any> {
        return {
            actionType: this.actionType,
            actionData: this.actionData
        };
    }
}