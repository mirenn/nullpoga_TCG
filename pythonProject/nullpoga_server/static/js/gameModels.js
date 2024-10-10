//import { v4 as uuidv4 } from 'uuid';
// Enumsの定義をエクスポート
export var ActionType;
(function (ActionType) {
    ActionType["CAST_SPELL"] = "CAST_SPELL";
    ActionType["SUMMON_MONSTER"] = "SUMMON_MONSTER";
    ActionType["MONSTER_MOVE"] = "MONSTER_MOVE";
    ActionType["DISABLE_ACTION"] = "DISABLE_ACTION";
    ActionType["MONSTER_ATTACK"] = "MONSTER_ATTACK";
    ActionType["SPELL_PHASE_END"] = "SPELL_PHASE_END";
    ActionType["SUMMON_PHASE_END"] = "SUMMON_PHASE_END";
    ActionType["ACTIVITY_PHASE_END"] = "ACTIVITY_PHASE_END";
})(ActionType || (ActionType = {}));
export var PhaseKind;
(function (PhaseKind) {
    PhaseKind["SPELL_PHASE"] = "SPELL_PHASE";
    PhaseKind["SUMMON_PHASE"] = "SUMMON_PHASE";
    PhaseKind["ACTIVITY_PHASE"] = "ACTIVITY_PHASE";
    PhaseKind["END_PHASE"] = "END_PHASE";
})(PhaseKind || (PhaseKind = {}));
export var FieldStatus;
(function (FieldStatus) {
    FieldStatus["NORMAL"] = "Normal";
    FieldStatus["WILDERNESS"] = "Wilderness";
})(FieldStatus || (FieldStatus = {}));
// CardType Enumの定義
export var CardType;
(function (CardType) {
    CardType["SPELL"] = "SPELL";
    CardType["MONSTER"] = "MONSTER";
})(CardType || (CardType = {}));
//#endregion
