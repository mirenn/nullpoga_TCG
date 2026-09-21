import { MonsterCard, instanceCard, Card } from './card';

export enum FieldStatus {
    NORMAL = 'NORMAL',
    WILDERNESS = 'WILDERNESS'
}

export class Slot {
    constructor(
        public card: any = null, // Will update this type once we have Card defined
        public status: FieldStatus = FieldStatus.NORMAL
    ) {}

    removeCard(): void {
        this.card = null;
    }

    public clone(): Slot {
        const newSlot = new Slot();
        if (this.card) {
            newSlot.card = this.card instanceof MonsterCard ? this.card.clone() : instanceCard(this.card.cardNo);
        }
        newSlot.status = this.status;
        return newSlot;
    }
    static fromDict(data: any): Slot {
        const slot = new Slot();
        if (data.card) {
            // Check if card is MonsterCard or SpellCard to use generic Card.fromDict? 
            // Slot usually holds MonsterCard on field?
            // Card.fromDict handles types.
            // Need to import Card methods? Slot imports MonsterCard, instanceCard.
            // I should modify import to include Card.
            // Assuming Card.fromDict is available.
            // Wait, import at top is: "import { MonsterCard, instanceCard } from './card';"
            // formatting: Slot.ts line 1.
            slot.card = data.card ? MonsterCard.fromDict(data.card) : null; 
            // Actually Field only holds Monsters?
            // "Zone" has "battleField" and "standbyField".
            // StandbyField can have Monsters.
            // BattleField cards are Monsters.
            // `MonsterCard.fromDict` is safer if we know it's a monster. 
            // But if generic Card... `data.card` has `cardType`.
            // Let's check Card import.
        }
        slot.status = data.status;
        return slot;
    }
}

export class Zone {
    public battleField: Slot[];
    public standbyField: (any | null)[]; // Will update this type once we have Card defined

    constructor() {
        this.battleField = Array(5).fill(null).map(() => new Slot());
        this.standbyField = Array(5).fill(null);
    }

    toDict(): Record<string, any> {
        return {
            battleField: this.battleField.map(slot => ({
                card: slot.card,
                status: slot.status
            })),
            standbyField: this.standbyField
        };
    }

    public clone(): Zone {
        const newZone = new Zone();
        newZone.battleField = this.battleField.map(slot => slot.clone());
        newZone.standbyField = this.standbyField.map(slot => slot ? 
            (slot instanceof MonsterCard ? slot.clone() : instanceCard(slot.cardNo)) 
            : null
        );
        return newZone;
    }
    static fromDict(data: any): Zone {
        const zone = new Zone();
        zone.battleField = data.battleField.map((slotData: any) => Slot.fromDict(slotData));
        zone.standbyField = data.standbyField.map((cardData: any) => 
            cardData ? MonsterCard.fromDict(cardData) : null
        );
        return zone;
    }
}