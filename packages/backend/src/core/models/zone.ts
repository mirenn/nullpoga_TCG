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
}