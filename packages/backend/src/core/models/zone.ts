import { MonsterCard, instanceCard } from './card';

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
}