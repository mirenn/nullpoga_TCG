import { Card } from './card';

export enum ActionType {
    CAST_SPELL = 'CAST_SPELL',
    SUMMON_MONSTER = 'SUMMON_MONSTER',
    MONSTER_MOVE = 'MONSTER_MOVE',
    DISABLE_ACTION = 'DISABLE_ACTION',
    MONSTER_ATTACK = 'MONSTER_ATTACK',
    SPELL_PHASE_END = 'SPELL_PHASE_END',
    SUMMON_PHASE_END = 'SUMMON_PHASE_END',
    ACTIVITY_PHASE_END = 'ACTIVITY_PHASE_END'
}

export interface ActionData {
    spellCard?: any;
    monsterCard?: any;
    summonStandbyFieldIdx?: number;
    moveBattleFieldIdx?: number;
    moveDirection?: string;
    attackDeclarationIdx?: number;
    attackerIdx?: number;
    targetIdx?: number;
    fromIdx?: number;
    toIdx?: number;
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

    static fromDict(data: any): Action {
        let actionData: ActionData | undefined;
        
        if (data.actionData) {
            const ad = { ...data.actionData };
            if (ad.monsterCard) {
                ad.monsterCard = Card.fromDict(ad.monsterCard);
            }
            actionData = ad;
        }
        
        return new Action(data.actionType, actionData);
    }
}