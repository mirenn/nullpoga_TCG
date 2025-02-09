"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellCard = exports.MonsterCard = exports.Card = void 0;
class Card {
    constructor(cardNo, life, manaCost, uniqId = Math.random().toString(36).substring(7)) {
        this.cardNo = cardNo;
        this.life = life;
        this.manaCost = manaCost;
        this.uniqId = uniqId;
        this.attackDeclaration = false;
    }
    toDict() {
        return {
            cardNo: this.cardNo,
            life: this.life,
            manaCost: this.manaCost,
            uniqId: this.uniqId,
            attackDeclaration: this.attackDeclaration
        };
    }
}
exports.Card = Card;
class MonsterCard extends Card {
    constructor(cardNo, life, manaCost, uniqId) {
        super(cardNo, life, manaCost, uniqId);
    }
}
exports.MonsterCard = MonsterCard;
class SpellCard extends Card {
    constructor(cardNo, life, manaCost, uniqId) {
        super(cardNo, life, manaCost, uniqId);
    }
}
exports.SpellCard = SpellCard;
//# sourceMappingURL=card.js.map