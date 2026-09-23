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

    static fromDict(data: any): Card {
        if (data.cardType === CardType.MONSTER) {
            return MonsterCard.fromDict(data);
        } else if (data.cardType === CardType.SPELL) {
            return SpellCard.fromDict(data);
        }
        throw new Error(`Unknown card type: ${data.cardType}`);
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
        const stats = SpellCard.getSpellCardStats(cardNo);
        return new SpellCard(
            cardNo,
            stats.manaCost,
            stats.cardName,
            stats.effect,
            stats.imageUrl
        );
    }
}

export class MonsterCard extends Card {
    public attack: number;
    public imageUrl: string | null;
    public stunCount: number = 0;
    public justSummoned: boolean = true;
    public canAct: boolean = true;
    public life: number;
    public isInvincible: boolean = false;
    public burnCount: number = 0;
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
            case 99: // 不動の岩
                this._initImmovableRock();
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
                return { life: 8, manaCost: 8, attack: 8, cardName: "ウルヴァン", imageUrl: "/images/12.png" };
            case 99: // 不動の岩（トークン）
                return { life: 3, manaCost: 0, attack: 0, cardName: "不動の岩" };
            default:
                throw new Error(`Unknown monster card number: ${cardNo}`);
        }
    }

    private _initImmovableRock(): void {
        const originalTurnStartEffect = this.turnStartEffect.bind(this);
        this.turnStartEffect = () => {
            originalTurnStartEffect();
            this.life -= 1;
        };
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
            if (this.turnCount !== undefined) {
                this.turnCount++;
            }
        };
    }

    private _initElectricJellyfish(): void {
        const originalAttackEffect = this.attackEffect.bind(this);
        this.attackEffect = (opponentCard?: MonsterCard) => {
            if (opponentCard) {
                originalAttackEffect(opponentCard);
            }
            if (opponentCard) {
                opponentCard.stunCount += 1;
            }
        };
    }

    public clone(): MonsterCard {
        const cloned = instanceCard(this.cardNo) as MonsterCard;
        cloned.uniqId = this.uniqId;
        cloned.life = this.life;
        cloned.attack = this.attack;
        cloned.stunCount = this.stunCount;
        cloned.attackDeclaration = this.attackDeclaration;
        cloned.justSummoned = this.justSummoned;
        cloned.canAct = this.canAct;
        cloned.isInvincible = this.isInvincible;
        cloned.burnCount = this.burnCount;
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
            canAct: this.canAct,
            isInvincible: this.isInvincible,
            burnCount: this.burnCount
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
    static fromDict(data: any): MonsterCard {
        // Create instance using cardNo to get base stats/effects
        const card = new MonsterCard(data.cardNo, data.uniqId);
        
        // Override with saved state
        card.life = data.life;
        card.attack = data.attack;
        card.imageUrl = data.imageUrl;
        card.stunCount = data.stunCount ?? 0;
        card.justSummoned = data.justSummoned;
        card.canAct = data.canAct;
        card.attackDeclaration = data.attackDeclaration;
        card.isInvincible = Boolean(data.isInvincible);
        card.burnCount = data.burnCount ?? 0;
        
        return card;
    }
}

export class SpellCard extends Card {
    public effect: string;
    public imageUrl: string | null;

    constructor(
        cardNo: number,
        manaCost: number,
        cardName: string,
        effect: string = "",
        imageUrl: string | null = null,
        uniqId?: string
    ) {
        super(cardNo, manaCost, cardName, CardType.SPELL, uniqId);
        this.effect = effect;
        this.imageUrl = imageUrl;
    }

    public static getSpellCardStats(cardNo: number): { manaCost: number; cardName: string; effect: string; imageUrl?: string | null } {
        switch (cardNo) {
            case 101:
            case 1000:
                return {
                    manaCost: 3,
                    cardName: "隕石落下",
                    effect: "指定したゾーンのモンスターに3ダメージ。空のバトルゾーンなら荒野化する。",
                    imageUrl: "/images/101.png"
                };
            case 102:
                return {
                    manaCost: 3,
                    cardName: "不動の岩",
                    effect: "空いているバトルゾーンに不動の岩（攻0/HP3）を配置する。",
                    imageUrl: "/images/102.png"
                };
            case 103:
                return {
                    manaCost: 7,
                    cardName: "前後交換",
                    effect: "指定した列の縦2マス（前線と待機ゾーン、または敵モンスター引き寄せ）の配置を入れ替える。",
                    imageUrl: "/images/103.png"
                };
            case 104:
                return {
                    manaCost: 4,
                    cardName: "炎の守護",
                    effect: "味方モンスター1体を次のターンまで無敵にする。",
                    imageUrl: "/images/104.png"
                };
            case 105:
                return {
                    manaCost: 3,
                    cardName: "召喚の儀式",
                    effect: "手札のコスト3以下のモンスターを1体直接バトルゾーンに出す。",
                    imageUrl: "/images/105.png"
                };
            case 106:
                return {
                    manaCost: 5,
                    cardName: "烈火の呪文",
                    effect: "相手バトルゾーンの全モンスターに1ダメージを与え、火傷（次ターン開始時に1ダメージ）を付与する。",
                    imageUrl: "/images/106.png"
                };
            case 107:
                return {
                    manaCost: 6,
                    cardName: "火の雨",
                    effect: "ランダムなバトルゾーン3箇所に3ダメージを与える。",
                    imageUrl: "/images/107.png"
                };
            default:
                throw new Error(`Unknown spell card number: ${cardNo}`);
        }
    }

    public clone(): SpellCard {
        const cloned = instanceCard(this.cardNo) as SpellCard;
        cloned.uniqId = this.uniqId;
        cloned.effect = this.effect;
        cloned.imageUrl = this.imageUrl;
        return cloned;
    }

    override toDict(): Record<string, any> {
        return {
            ...super.toDict(),
            effect: this.effect,
            imageUrl: this.imageUrl
        };
    }

    static fromDict(data: any): SpellCard {
        return new SpellCard(
            data.cardNo,
            data.manaCost,
            data.cardName,
            data.effect || "",
            data.imageUrl || null,
            data.uniqId
        );
    }
}