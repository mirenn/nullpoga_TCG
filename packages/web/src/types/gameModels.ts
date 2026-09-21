// Re-export core models and define frontend-friendly aliases
import type {
  MonsterCardData,
  SpellCardData,
  ActionDTO,
  SlotData,
  ZoneData,
  PlayerData,
  StateData,
  HistoryEntryDTO,
  GameRoomDTO,
} from '@nullpoga/core';

export * from '@nullpoga/core';

// Frontend aliases
export type MonsterCard = MonsterCardData;
export type SpellCard = SpellCardData;
export type Action = ActionDTO;
export type Slot = SlotData;
export type Zone = ZoneData;
export type Player = PlayerData;
export type State = StateData;
export type HistoryEntry = HistoryEntryDTO;
export type ActionDict = Record<string, ActionDTO>;
export type GameRoom = GameRoomDTO;

//#region debug用のWindow
export {};

declare global {
  interface Window {
    debugValues: { [key: string]: any };
  }
}
//#endregion
