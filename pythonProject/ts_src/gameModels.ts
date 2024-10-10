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
  card_no: number;
  mana_cost: number;
  card_name: string;
  attack: number;
  life: number;
  image_url: string;
  readonly card_type: CardType.MONSTER;
  uniq_id: UUID;
  stun_count: number;
  can_act: boolean;
  attack_declaration: boolean;
  done_activity: boolean;
}

export interface SpellCard {
  card_no: number;
  card_name: string;
  mana_cost: number;
  readonly card_type: CardType.SPELL;
  effect: string;
  uniq_id: UUID;
  image_url: string;
}

export interface ActionData {
  spell_card?: SpellCard | null;
  monster_card?: MonsterCard | null;
  summon_standby_field_idx?: number | null;
  move_battle_field_idx?: number | null;
  move_direction?: string | null;
  attack_declaration_idx?: number | null;
}

export interface Action {
  action_type: ActionType;
  action_data: ActionData;
}

export interface Slot {
  status: FieldStatus;
  card?: MonsterCard | null;
}

export interface Zone {
  battle_field: Slot[];
  standby_field: (MonsterCard | null)[];
}

export interface Player {
  user_id: string;
  player_id: UUID;
  turn_count: number;
  deck_cards: (MonsterCard | SpellCard)[];
  plan_deck_cards: (MonsterCard | SpellCard)[];
  hand_cards: (MonsterCard | SpellCard)[];
  plan_hand_cards: (MonsterCard | SpellCard)[];
  zone: Zone;
  plan_zone: Zone;
  phase: PhaseKind;
  base_mana: number;
  mana: number;
  plan_mana: number;
  life: number;
  spell_phase_actions: Action[];
  summon_phase_actions: Action[];
  activity_phase_actions: Action[];
  is_first_player?: boolean | null;
}

export interface State {
  player_1: Player;
  player_2: Player;
  history: Record<string, any>[]; // dictの具体的な構造に基づいて詳細な型を指定できます
}

export interface RoomStateResponse {
  room_id: string;
  state: State;
}

export type GameStateResponse = {
  room_id: string;
  game_state: State;
};

//#region debug用のWindow
export {};

declare global {
  interface Window {
    debugValues: { [key: string]: any };
  }
}
//#endregion
