// Core Types & DTOs for Nullpoga TCG
import { ActionType } from './models/action';
import type { ActionData } from './models/action';
import { PhaseKind } from './models/phase';
import { FieldStatus } from './models/zone';
import { CardType } from './models/card';

export { ActionType, PhaseKind, FieldStatus, CardType };
export type { ActionData };

export type UUID = string;

export interface MonsterCardData {
  cardNo: number;
  manaCost: number;
  cardName: string;
  attack: number;
  life: number;
  imageUrl?: string | null;
  cardType: CardType.MONSTER;
  uniqId: UUID;
  stunCount: number;
  justSummoned: boolean;
  canAct: boolean;
  attackDeclaration: boolean;
}

export interface SpellCardData {
  cardNo: number;
  cardName: string;
  manaCost: number;
  cardType: CardType.SPELL;
  effect: string;
  uniqId: UUID;
  imageUrl?: string | null;
}

export type CardData = MonsterCardData | SpellCardData;


export interface ActionDTO {
  actionType: ActionType;
  actionData?: ActionData;
}

export interface SlotData {
  status: FieldStatus;
  card?: MonsterCardData | null;
}

export interface ZoneData {
  battleField: SlotData[];
  standbyField: (MonsterCardData | null)[];
}

export interface PlayerData {
  userId: string;
  turnCount: number;
  deckCards: CardData[];
  planDeckCards?: CardData[];
  handCards: CardData[];
  planHandCards: CardData[];
  zone: ZoneData;
  planZone: ZoneData;
  phase: PhaseKind;
  base_mana?: number;
  mana: number;
  planMana?: number;
  life: number;
  spellPhaseActions: ActionDTO[];
  summonPhaseActions: ActionDTO[];
  activityPhaseActions: ActionDTO[];
  isFirstPlayer?: boolean | null;
}

export interface HistoryEntryDTO {
  State: StateData;
  ActionDict: Record<string, ActionDTO>;
}

export interface StateData {
  player1: PlayerData;
  player2: PlayerData;
  history: HistoryEntryDTO[][];
  renderLastHisIndex?: number;
}

export interface GameRoomDTO {
  userIds?: string[];
  players?: string[];
  gameState: StateData;
}

export interface RoomStateResponse {
  room_id?: string;
  gameRoom: GameRoomDTO;
}



