"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellCard = exports.MonsterCard = exports.Card = exports.CardType = void 0;
exports.instanceCard = instanceCard;
var CardType;
(function (CardType) {
    CardType["MONSTER"] = "MONSTER";
    CardType["SPELL"] = "SPELL";
})(CardType || (exports.CardType = CardType = {}));
class Card {
    constructor(cardNo, manaCost, cardName, cardType, uniqId = Math.random().toString(36).substring(7)) {
        this.cardNo = cardNo;
        this.manaCost = manaCost;
        this.cardName = cardName;
        this.cardType = cardType;
        this.uniqId = uniqId;
        this.attackDeclaration = false;
    }
    toDict() {
        return {
            cardNo: this.cardNo,
            manaCost: this.manaCost,
            cardName: this.cardName,
            cardType: this.cardType,
            uniqId: this.uniqId,
            attackDeclaration: this.attackDeclaration
        };
    }
    toString() {
        return this.cardName;
    }
}
exports.Card = Card;
function instanceCard(cardNo) {
    if (cardNo < 100) {
        return new MonsterCard(cardNo);
    }
    else {
        switch (cardNo) {
            case 1000:
                return new SpellCard(cardNo, 1, "隕石落下");
            default:
                throw new Error(`Unknown spell card number: ${cardNo}`);
        }
    }
}
class MonsterCard extends Card {
    constructor(cardNo, uniqId) {
        const stats = MonsterCard.getCardStats(cardNo);
        super(cardNo, stats.manaCost, stats.cardName, CardType.MONSTER, uniqId);
        this.stunCount = 0;
        this.justSummoned = true;
        this.canAct = true;
        this.life = stats.life;
        this.attack = stats.attack;
        this.imageUrl = stats.imageUrl || null;
        switch (cardNo) {
            case 2:
                this._initShibaInuRanmaru();
                break;
            case 4:
                this._initFrogPrivate();
                break;
            case 6:
                this._initElectricJellyfish();
                break;
        }
    }
    static getCardStats(cardNo) {
        switch (cardNo) {
            case 1:
                return { life: 1, manaCost: 1, attack: 1, cardName: "ネズミ", imageUrl: "/images/1.png" };
            case 2:
                return { life: 2, manaCost: 2, attack: 1, cardName: "柴犬ラン丸", imageUrl: "/images/2.png" };
            case 3:
                return { life: 2, manaCost: 1, attack: 2, cardName: "ネコ", imageUrl: "/images/3.png" };
            case 4:
                return { life: 2, manaCost: 0, attack: 1, cardName: "カエル三等兵" };
            case 5:
                return { life: 2, manaCost: 0, attack: 4, cardName: "亀" };
            case 6:
                return { life: 2, manaCost: 1, attack: 1, cardName: "電気クラゲ" };
            case 7:
                return { life: 3, manaCost: 3, attack: 2, cardName: "イノシシ" };
            case 11:
                return { life: 7, manaCost: 5, attack: 6, cardName: "炎のドラゴン" };
            case 12:
                return { life: 8, manaCost: 8, attack: 8, cardName: "ウルヴァン" };
            default:
                throw new Error(`Unknown monster card number: ${cardNo}`);
        }
    }
    _initShibaInuRanmaru() {
        const originalMoveEffect = this.moveEffect.bind(this);
        this.moveEffect = () => {
            originalMoveEffect();
            this.attack += 1;
        };
    }
    _initFrogPrivate() {
        this.turnCount = 0;
        const originalTurnStartEffect = this.turnStartEffect.bind(this);
        this.turnStartEffect = () => {
            originalTurnStartEffect();
            if (this.turnCount === 0) {
                this.life += 1;
            }
            else if (this.turnCount === 1) {
                this.attack += 1;
            }
            else if (this.turnCount === 2) {
                this.attack += 1;
                this.life += 1;
            }
            this.turnCount++;
        };
    }
    _initElectricJellyfish() {
        const originalAttackEffect = this.attackEffect.bind(this);
        this.attackEffect = (opponentCard) => {
            originalAttackEffect(opponentCard);
            if (opponentCard) {
                opponentCard.stunCount += 1;
            }
        };
    }
    toDict() {
        return Object.assign(Object.assign({}, super.toDict()), { life: this.life, attack: this.attack, imageUrl: this.imageUrl, stunCount: this.stunCount, justSummoned: this.justSummoned, canAct: this.canAct });
    }
    turnStartEffect() {
    }
    summonEffect() {
    }
    moveEffect() {
    }
    attackEffect(opponentCard) {
    }
    legalAttackTargets() {
        if (this.stunCount > 0) {
            return [];
        }
        return [];
    }
    legalMoves() {
        if (this.stunCount > 0) {
            return [];
        }
        return [];
    }
}
exports.MonsterCard = MonsterCard;
class SpellCard extends Card {
    constructor(cardNo, manaCost, cardName, uniqId) {
        super(cardNo, manaCost, cardName, CardType.SPELL, uniqId);
    }
    castSpell() {
    }
}
exports.SpellCard = SpellCard;
//# sourceMappingURL=card.js.map