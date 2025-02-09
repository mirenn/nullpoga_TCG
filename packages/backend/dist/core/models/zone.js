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
}
exports.Zone = Zone;
//# sourceMappingURL=zone.js.map