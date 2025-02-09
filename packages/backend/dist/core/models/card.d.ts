export declare abstract class Card {
    cardNo: number;
    life: number;
    manaCost: number;
    uniqId: string;
    attackDeclaration: boolean;
    constructor(cardNo: number, life: number, manaCost: number, uniqId?: string);
    toDict(): Record<string, any>;
}
export declare class MonsterCard extends Card {
    constructor(cardNo: number, life: number, manaCost: number, uniqId?: string);
}
export declare class SpellCard extends Card {
    constructor(cardNo: number, life: number, manaCost: number, uniqId?: string);
}
