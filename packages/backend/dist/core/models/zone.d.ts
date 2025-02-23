export declare enum FieldStatus {
    NORMAL = "NORMAL",
    WILDERNESS = "WILDERNESS"
}
export declare class Slot {
    card: any;
    status: FieldStatus;
    constructor(card?: any, status?: FieldStatus);
    removeCard(): void;
    clone(): Slot;
}
export declare class Zone {
    battleField: Slot[];
    standbyField: (any | null)[];
    constructor();
    toDict(): Record<string, any>;
    clone(): Zone;
}
