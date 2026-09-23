import { Card } from './card';

export enum ActionType {
    CAST_SPELL = 'CAST_SPELL',
    SUMMON_MONSTER = 'SUMMON_MONSTER',
    MONSTER_MOVE = 'MONSTER_MOVE',
    MONSTER_ADVANCE = 'MONSTER_ADVANCE', // 待機フィールドからバトルフィールドへの進軍
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
    fromStandbyIdx?: number;
    toBattleIdx?: number;
    moveBattleFieldIdx?: number;
    moveDirection?: string;
    attackDeclarationIdx?: number;
    attackerIdx?: number;
    targetIdx?: number;
    fromIdx?: number;
    toIdx?: number;
    targetPlayerId?: string;
    targetZone?: string;
    fizzled?: boolean;
}

export class Action {
    constructor(
        public actionType: ActionType,
        public actionData?: ActionData
    ) {}

    toDict(): Record<string, any> {
        let ad = this.actionData ? { ...this.actionData } : undefined;
        if (ad) {
            if (ad.monsterCard && typeof ad.monsterCard.toDict === 'function') {
                ad.monsterCard = ad.monsterCard.toDict();
            }
            if (ad.spellCard && typeof ad.spellCard.toDict === 'function') {
                ad.spellCard = ad.spellCard.toDict();
            }
        }
        return {
            actionType: this.actionType,
            actionData: ad
        };
    }

    static fromDict(data: any): Action {
        let actionData: ActionData | undefined;
        
        if (data.actionData) {
            const ad = { ...data.actionData };
            if (ad.monsterCard) {
                ad.monsterCard = Card.fromDict(ad.monsterCard);
            }
            if (ad.spellCard) {
                ad.spellCard = Card.fromDict(ad.spellCard);
            }
            actionData = ad;
        }
        
        return new Action(data.actionType, actionData);
    }
}