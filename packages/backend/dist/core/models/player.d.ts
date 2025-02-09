import { PhaseKind } from './phase';
import { Zone } from './zone';
import { Action } from './action';
import { Card } from './card';
export declare class Player {
    zone: Zone;
    life: number;
    mana: number;
    isFirstPlayer: boolean;
    turnCount: number;
    phase: PhaseKind;
    userId: string;
    handCards: Card[];
    deckCards: number[];
    spellPhaseActions: Action[];
    summonPhaseActions: Action[];
    activityPhaseActions: Action[];
    constructor(deck: number[], userId?: string);
    drawCard(): void;
    nextTurnRefresh(): void;
    monsterMove(action: Action, zone: Zone): void;
    monsterAttacked(action: Action, enemyZone: Zone): void;
    legalActions(): Action[];
    private getSpellPhaseActions;
    private getSummonPhaseActions;
    private getActivityPhaseActions;
    toDict(): Record<string, any>;
    selectPlanAction(action: Action): void;
    private handleSpellPhase;
    private handleSummonPhase;
    private handleActivityPhase;
}
