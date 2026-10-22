import type {
  DemoCard,
  Unit,
  SpellEffect,
  AttackEffect,
  CpuSpawnWarning,
  Inhibitor,
  Owner,
  StampedeState,
  CloudEventState,
} from '../types';
import type { DeckState } from '../cards';
import type { FieldObstacle, Camera3DState } from '../obstacles';

export const INITIAL_LIFE = 20;
export const INITIAL_MANA = 3;
export const MAX_MANA = 10;
// 範囲攻撃ユニット(hitRange指定)の、主標的以外への巻き込みダメージ倍率
export const AREA_SPLASH_DAMAGE_RATIO = 0.7;

// 電気クラゲの雷撃飛行時間（距離に比例: 最小220ms〜最大380ms、目で弾道をしっかり追えるスピード感）
export const LIGHTNING_FLIGHT_MIN_MS = 220;
export const LIGHTNING_FLIGHT_MAX_MS = 380;
export const LIGHTNING_MAX_RANGE = 28; // クラゲの射程（%）

/** 隕石アニメーション(2s)の着弾タイミング(80% = 1.6秒)。ダメージ判定はこの時点で行う */
export const METEOR_IMPACT_DELAY_MS = 1600;
/** 烈火の呪文の詠唱予兆（警告の縦帯・地熱チャージ）を見せてから延焼を開始するまでの時間 (旧900ms -> 1600ms) */
export const FIRE_SPELL_CAST_DELAY_MS = 1600;
/** 癒やしの雨の詠唱開始（慈愛の魔方陣・雨雲発生）から回復雨着弾までの時間 (旧0ms即時 -> 1400ms) */
export const HEAL_SPELL_CAST_DELAY_MS = 1400;
/** 疾風の号令の詠唱開始（旋風集約）から号令着弾（AA即時リセット）までの時間 (旧0ms即時 -> 1100ms) */
export const HASTE_SPELL_CAST_DELAY_MS = 1100;

/** 着弾待ちの雷撃ヒット予約 */
export interface PendingLightningHit {
  id: string;
  targetId: string;       // 着弾対象ユニットID
  attackerId: string;     // 攻撃者ID（クラゲ）
  x: number;
  lane?: number;
  damage: number;
  stunDuration: number;   // ms (1200)
  hitTime: number;        // 着弾予定時刻 (now + 飛行時間)
}

/** 着弾待ちの隕石ヒット予約 (setTimeoutに頼らずゲームループ内で決定論的に解決) */
export interface PendingMeteorHit {
  id: string;
  x: number;
  y: number;
  targetOwner: Owner;
  damage: number;
  impactTime: number;
}

/** 詠唱予兆中の烈火の呪文予約 (setTimeoutに頼らずゲームループ内で決定論的に解決) */
export interface PendingFireSpellCast {
  warningId: string;
  x: number;
  y: number;
  targetOwner: Owner;
  igniteTime: number;
}

/** 詠唱待ちの癒やしの雨予約 (setTimeoutに頼らずゲームループ内で決定論的に解決) */
export interface PendingHealSpellCast {
  id: string;
  warningId: string;
  x: number;
  y: number;
  targetOwner: Owner;
  healAmount: number;
  applyTime: number;
}

/** 詠唱待ちの疾風の号令予約 (setTimeoutに頼らずゲームループ内で決定論的に解決) */
export interface PendingHasteSpellCast {
  id: string;
  warningId: string;
  x: number;
  y: number;
  targetOwner: Owner;
  applyTime: number;
}

/** 烈火の呪文: 上下へ伝播中の延焼状態 */
export interface ActiveFireSpell {
  id: string;
  x: number;
  originY: number;
  targetOwner: Owner;
  startTime: number;
  damage: number;
  hitUnitIds: Set<string>;
  durationMs: number;
}

/** 索敵対象（敵ユニット or 敵インヒビター） */
export interface CombatTarget {
  id: string;
  x: number;
  y: number;
  isStructure: boolean;
  lane?: number;
  cardNo?: number;
  isSpotted?: boolean;
  isCloudSpotted?: boolean;
}

/** 出撃履歴（カウンターデプロイ判定用） */
export interface SpawnTimestampRecord {
  x: number;
  y: number;
  time: number;
}

/** コンボ状態 */
export interface ComboState {
  count: number;
  lastTime: number;
}

/**
 * Reactから完全に独立したリアルタイムバトルの状態スナップショット
 */
export interface RealtimeGameState {
  playerHp: number;
  cpuHp: number;
  playerScore: number;
  cpuScore: number;
  playerMana: number;
  cpuMana: number;
  manaRegenRate: number;
  deckState: DeckState;
  cpuDeckState: DeckState;
  selectedCardIndex: number | null;
  playCooldownUntil: number;
  cpuSpawnWarnings: CpuSpawnWarning[];
  units: Unit[];
  inhibitors: Inhibitor[];
  obstacles: FieldObstacle[];
  stampede: StampedeState;
  cloudEvent: CloudEventState;
  camera3D: Camera3DState;
  spottedCount: number;
  spellEffects: SpellEffect[];
  attackEffects: AttackEffect[];
  pendingLightningHits: PendingLightningHit[];
  pendingMeteorHits: PendingMeteorHit[];
  pendingFireSpellCasts: PendingFireSpellCast[];
  activeFireSpells: ActiveFireSpell[];
  pendingHealSpellCasts: PendingHealSpellCast[];
  pendingHasteSpellCasts: PendingHasteSpellCast[];
  gameResult: 'playing' | 'win' | 'lose';
  playerCombo: ComboState;
  cpuCombo: ComboState;
  playerSpawnTimestamps: SpawnTimestampRecord[];
  cpuSpawnTimestamps: SpawnTimestampRecord[];
  cpuActionTimer: number;
  manaTimer: number;
}

export type PlayValidationResult = {
  canPlay: boolean;
  reason?: string;
};
