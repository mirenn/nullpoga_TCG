export declare enum CardType {
    MONSTER = "MONSTER",
    SPELL = "SPELL"
}
export declare abstract class Card {
    cardNo: number;
    manaCost: number;
    cardName: string;
    cardType: CardType;
    uniqId: string;
    attackDeclaration: boolean;
    constructor(cardNo: number, manaCost: number, cardName: string, cardType: CardType, uniqId?: string);
    toDict(): Record<string, any>;
    toString(): string;
}
export declare function instanceCard(cardNo: number): Card;
export declare class MonsterCard extends Card {
    attack: number;
    imageUrl: string | null;
    stunCount: number;
    justSummoned: boolean;
    canAct: boolean;
    life: number;
    private turnCount?;
    constructor(cardNo: number, uniqId?: string);
    private static getCardStats;
    private _initShibaInuRanmaru;
    private _initFrogPrivate;
    private _initElectricJellyfish;
    clone(): MonsterCard;
    toDict(): Record<string, any>;
    turnStartEffect(): void;
    summonEffect(): void;
    moveEffect(): void;
    attackEffect(opponentCard?: MonsterCard): void;
    legalAttackTargets(): number[];
    legalMoves(): number[];
}
export declare class SpellCard extends Card {
    constructor(cardNo: number, manaCost: number, cardName: string, uniqId?: string);
    castSpell(): void;
}
