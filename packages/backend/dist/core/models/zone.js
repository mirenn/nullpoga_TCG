"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zone = exports.Slot = exports.FieldStatus = void 0;
var FieldStatus;
(function (FieldStatus) {
    FieldStatus["NORMAL"] = "NORMAL";
    FieldStatus["WILDERNESS"] = "WILDERNESS";
})(FieldStatus || (exports.FieldStatus = FieldStatus = {}));
class Slot {
    constructor(card = null, status = FieldStatus.NORMAL) {
        this.card = card;
        this.status = status;
    }
    removeCard() {
        this.card = null;
    }
    clone() {
        const newSlot = new Slot();
        if (this.card) {
            newSlot.card = this.card instanceof MonsterCard ? this.card.clone() : instanceCard(this.card.cardNo);
        }
        newSlot.status = this.status;
        return newSlot;
    }
}
exports.Slot = Slot;
class Zone {
    constructor() {
        this.battleField = Array(5).fill(null).map(() => new Slot());
        this.standbyField = Array(5).fill(null);
    }
    toDict() {
        return {
            battleField: this.battleField.map(slot => ({
                card: slot.card,
                status: slot.status
            })),
            standbyField: this.standbyField
        };
    }
    clone() {
        const newZone = new Zone();
        newZone.battleField = this.battleField.map(slot => slot.clone());
        newZone.standbyField = this.standbyField.map(slot => slot ?
            (slot instanceof MonsterCard ? slot.clone() : instanceCard(slot.cardNo))
            : null);
        return newZone;
    }
}
exports.Zone = Zone;
//# sourceMappingURL=zone.js.map