export enum CardType {
    MONSTER = "MONSTER",
    SPELL = "SPELL"
}

export abstract class Card {
    public attackDeclaration: boolean = false;

    constructor(
        public cardNo: number,
        public manaCost: number,
        public cardName: string,
        public cardType: CardType,
        public uniqId: string = Math.random().toString(36).substring(7)
    ) {}

    toDict(): Record<string, any> {
        return {
            cardNo: this.cardNo,
            manaCost: this.manaCost,
            cardName: this.cardName,
            cardType: this.cardType,
            uniqId: this.uniqId,
            attackDeclaration: this.attackDeclaration
        };
    }

    toString(): string {
        return this.cardName;
    }
}

export function instanceCard(cardNo: number): Card {
    // 0未採番だが0~99モンスターカード、100~199スペルカード
    if (cardNo < 100) {
        return new MonsterCard(cardNo);
    } else {
        switch (cardNo) {
            case 1000:
                return new SpellCard(cardNo, 1, "隕石落下");
            default:
                throw new Error(`Unknown spell card number: ${cardNo}`);
        }
    }
}

export class MonsterCard extends Card {
    public attack: number;
    public imageUrl: string | null;
    public stunCount: number = 0;
    public justSummoned: boolean = true;
    public canAct: boolean = true;
    public life: number;
    private turnCount?: number;

    constructor(cardNo: number, uniqId?: string) {
        // Initialize base stats based on card number
        const stats = MonsterCard.getCardStats(cardNo);
        super(cardNo, stats.manaCost, stats.cardName, CardType.MONSTER, uniqId);
        
        this.life = stats.life;
        this.attack = stats.attack;
        this.imageUrl = stats.imageUrl || null;
        
        // Initialize card-specific effects based on cardNo
        switch (cardNo) {
            case 2: // 柴犬ラン丸
                this._initShibaInuRanmaru();
                break;
            case 4: // カエル三等兵
                this._initFrogPrivate();
                break;
            case 6: // 電気クラゲ
                this._initElectricJellyfish();
                break;
        }
    }

    private static getCardStats(cardNo: number): { life: number; manaCost: number; attack: number; cardName: string; imageUrl?: string } {
        switch (cardNo) {
            case 1: // ネズミ
                return { life: 1, manaCost: 1, attack: 1, cardName: "ネズミ", imageUrl: "/images/1.png" };
            case 2: // 柴犬ラン丸
                return { life: 2, manaCost: 2, attack: 1, cardName: "柴犬ラン丸", imageUrl: "/images/2.png" };
            case 3: // ネコ
                return { life: 2, manaCost: 1, attack: 2, cardName: "ネコ", imageUrl: "/images/3.png" };
            case 4: // カエル三等兵
                return { life: 2, manaCost: 0, attack: 1, cardName: "カエル三等兵" };
            case 5: // 亀
                return { life: 2, manaCost: 0, attack: 4, cardName: "亀" };
            case 6: // 電気クラゲ
                return { life: 2, manaCost: 1, attack: 1, cardName: "電気クラゲ" };
            case 7: // イノシシ
                return { life: 3, manaCost: 3, attack: 2, cardName: "イノシシ" };
            case 11: // 炎のドラゴン
                return { life: 7, manaCost: 5, attack: 6, cardName: "炎のドラゴン" };
            case 12: // ウルヴァン
                return { life: 8, manaCost: 8, attack: 8, cardName: "ウルヴァン" };
            default:
                throw new Error(`Unknown monster card number: ${cardNo}`);
        }
    }

    private _initShibaInuRanmaru(): void {
        const originalMoveEffect = this.moveEffect.bind(this);
        this.moveEffect = () => {
            originalMoveEffect();
            this.attack += 1;
        };
    }

    private _initFrogPrivate(): void {
        this.turnCount = 0;
        const originalTurnStartEffect = this.turnStartEffect.bind(this);
        this.turnStartEffect = () => {
            originalTurnStartEffect();
            if (this.turnCount === 0) {
                this.life += 1;
            } else if (this.turnCount === 1) {
                this.attack += 1;
            } else if (this.turnCount === 2) {
                this.attack += 1;
                this.life += 1;
            }
            this.turnCount++;
        };
    }

    private _initElectricJellyfish(): void {
        const originalAttackEffect = this.attackEffect.bind(this);
        this.attackEffect = (opponentCard?: MonsterCard) => {
            originalAttackEffect(opponentCard);
            if (opponentCard) {
                opponentCard.stunCount += 1;
            }
        };
    }

    public clone(): MonsterCard {
        const cloned = instanceCard(this.cardNo) as MonsterCard;
        cloned.life = this.life;
        cloned.attack = this.attack;
        cloned.stunCount = this.stunCount;
        cloned.attackDeclaration = this.attackDeclaration;
        cloned.justSummoned = this.justSummoned;
        cloned.canAct = this.canAct;
        return cloned;
    }

    override toDict(): Record<string, any> {
        return {
            ...super.toDict(),
            life: this.life,
            attack: this.attack,
            imageUrl: this.imageUrl,
            stunCount: this.stunCount,
            justSummoned: this.justSummoned,
            canAct: this.canAct
        };
    }

    turnStartEffect(): void {
        // ターン開始時効果
    }

    summonEffect(): void {
        // 召喚時効果
    }

    moveEffect(): void {
        // 移動時効果
    }

    attackEffect(opponentCard?: MonsterCard): void {
        // 攻撃時効果
    }

    legalAttackTargets(): number[] {
        if (this.stunCount > 0) {
            return [];
        }
        return [];
    }

    legalMoves(): number[] {
        if (this.stunCount > 0) {
            return [];
        }
        return [];
    }
}

export class SpellCard extends Card {
    constructor(
        cardNo: number,
        manaCost: number,
        cardName: string,
        uniqId?: string
    ) {
        super(cardNo, manaCost, cardName, CardType.SPELL, uniqId);
    }

    castSpell(): void {
        // スペル開始時効果
    }
}