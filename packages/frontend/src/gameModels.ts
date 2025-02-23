//import { v4 as uuidv4 } from 'uuid';

type UUID = string; // UUIDはTypeScriptではstringとして扱います

// Enumsの定義をエクスポート
export enum ActionType {
  CAST_SPELL = 'CAST_SPELL',
  SUMMON_MONSTER = 'SUMMON_MONSTER',
  MONSTER_MOVE = 'MONSTER_MOVE',
  DISABLE_ACTION = 'DISABLE_ACTION',
  MONSTER_ATTACK = 'MONSTER_ATTACK',
  SPELL_PHASE_END = 'SPELL_PHASE_END',
  SUMMON_PHASE_END = 'SUMMON_PHASE_END',
  ACTIVITY_PHASE_END = 'ACTIVITY_PHASE_END',
}

export enum PhaseKind {
  SPELL_PHASE = 'SPELL_PHASE',
  SUMMON_PHASE = 'SUMMON_PHASE',
  ACTIVITY_PHASE = 'ACTIVITY_PHASE',
  END_PHASE = 'END_PHASE',
}

export enum FieldStatus {
  NORMAL = 'Normal',
  WILDERNESS = 'Wilderness',
}

// CardType Enumの定義
export enum CardType {
  SPELL = 'SPELL',
  MONSTER = 'MONSTER',
}

// MonsterCardインターフェース
export interface MonsterCard {
  cardNo: number;
  manaCost: number;
  cardName: string;
  attack: number;
  life: number;
  imageUrl: string;
  readonly cardType: CardType.MONSTER;
  uniqId: UUID;
  stunCount: number;
  justSummoned: boolean;
  canAct: boolean;
  attackDeclaration: boolean;
}

export interface SpellCard {
  cardNo: number;
  cardName: string;
  manaCost: number;
  readonly cardType: CardType.SPELL;
  effect: string;
  uniqId: UUID;
  imageUrl: string;
}

export interface ActionData {
  spellCard?: SpellCard | null;
  monsterCard?: MonsterCard | null;
  summonStandbyFieldIdx?: number | null;
  moveBattleFieldIdx?: number | null;
  moveDirection?: string | null;
  attackDeclarationIdx?: number | null;
}

export interface Action {
  actionType: ActionType;
  actionData: ActionData;
}

export interface Slot {
  status: FieldStatus;
  card?: MonsterCard | null;
}

export interface Zone {
  battleField: Slot[];
  standbyField: (MonsterCard | null)[];
}

export interface Player {
  userId: string;
  turnCount: number;
  deckCards: (MonsterCard | SpellCard)[];
  planDeckCards: (MonsterCard | SpellCard)[];
  handCards: (MonsterCard | SpellCard)[];
  planHandCards: (MonsterCard | SpellCard)[];
  zone: Zone;
  planZone: Zone;
  phase: PhaseKind; //phaseはplan_phaseないのでこれを使う
  base_mana: number;
  mana: number;
  plan_mana: number;
  life: number;
  spellPhaseActions: Action[];
  summonPhaseActions: Action[];
  activityPhaseActions: Action[];
  isFirstPlayer?: boolean | null;
}

export interface State {
  player1: Player;
  player2: Player;
  history: HistoryEntry[][];
  /** エンドフェイズ後の実行後の処理を描画する際に用いるindex。フロントエンド側でのみ用いる値 */
  renderLastHisIndex: undefined | number;
}
export interface HistoryEntry {
  State: State;
  ActionDict: ActionDict;
}
export interface ActionDict {
  [key: string]: Action;
}

export interface RoomStateResponse {
  room_id: string;
  gameRoom: GameRoom;
}

export interface GameRoom {
  players: string[];
  gameState: State;
}

//#region debug用のWindow
export {};

declare global {
  interface Window {
    debugValues: { [key: string]: any };
  }
}
//#endregion
