export abstract class Card {
    public attackDeclaration: boolean = false;

    constructor(
        public cardNo: number,
        public life: number,
        public manaCost: number,
        public uniqId: string = Math.random().toString(36).substring(7)
    ) {}

    toDict(): Record<string, any> {
        return {
            cardNo: this.cardNo,
            life: this.life,
            manaCost: this.manaCost,
            uniqId: this.uniqId,
            attackDeclaration: this.attackDeclaration
        };
    }
}

export class MonsterCard extends Card {
    constructor(
        cardNo: number,
        life: number,
        manaCost: number,
        uniqId?: string
    ) {
        super(cardNo, life, manaCost, uniqId);
    }
}

export class SpellCard extends Card {
    constructor(
        cardNo: number,
        life: number,
        manaCost: number,
        uniqId?: string
    ) {
        super(cardNo, life, manaCost, uniqId);
    }
}