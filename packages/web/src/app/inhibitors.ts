import type { Inhibitor, Owner } from './types';

/**
 * インヒビター（LoL風の破壊可能オブジェクト）
 *
 * 横長（左右対戦）レイアウト仕様:
 * - 両陣営の自陣側、上(y=20%)・中央(y=50%)・下(y=80%)に配置（計6基）
 * - プレイヤー側インヒビター: x=18%
 * - CPU側インヒビター: x=82%
 * - 自らは攻撃しない防壁。縦幅(±6.0%)の範囲を進むユニットを足止めする
 * - その隙間（y=35% や y=65% など）を進むユニットは素通り可能！
 * - 破壊した側はマナを獲得（即時マナ+2 ＋ マナ回復速度+20%永続アップ）
 */

export interface InhibitorSlot {
  key: 'top' | 'center' | 'bottom';
  y: number;
  // 互換エイリアス
  x?: number;
}

export const INHIBITOR_SLOTS: InhibitorSlot[] = [
  { key: 'top', y: 20, x: 20 },
  { key: 'center', y: 50, x: 50 },
  { key: 'bottom', y: 80, x: 80 },
];

/** インヒビターの進路妨害・被弾縦幅 (半径) */
export const INHIBITOR_RADIUS_Y = 6.0;
export const INHIBITOR_RADIUS_X = INHIBITOR_RADIUS_Y; // 互換エイリアス

/** インヒビターの耐久値 */
export const INHIBITOR_MAX_HP = 12;

/** 配置位置（x%）: プレイヤー側(左) / CPU側(右) */
export const PLAYER_INHIBITOR_X = 18;
export const CPU_INHIBITOR_X = 82;

// 互換エイリアス
export const CPU_INHIBITOR_Y = CPU_INHIBITOR_X;
export const PLAYER_INHIBITOR_Y = PLAYER_INHIBITOR_X;

/** 破壊時の即時マナボーナス */
export const INHIBITOR_DESTROY_MANA_BONUS = 2;

/** 破壊1つごとのマナ回復速度の上昇率（+20%） */
export const INHIBITOR_REGEN_BONUS_PER_KILL = 0.2;

export function createInitialInhibitors(): Inhibitor[] {
  const list: Inhibitor[] = [];
  for (const owner of ['player', 'cpu'] as Owner[]) {
    for (const slot of INHIBITOR_SLOTS) {
      const x = owner === 'player' ? PLAYER_INHIBITOR_X : CPU_INHIBITOR_X;
      list.push({
        id: `inhib_${owner}_${slot.key}`,
        owner,
        lane: slot.y, // 互換性のためのエイリアス
        x,
        y: slot.y,
        hp: INHIBITOR_MAX_HP,
        maxHp: INHIBITOR_MAX_HP,
      });
    }
  }
  return list;
}

/** 指定のY位置を進むユニットを足止め（前進ストップ）するか */
export function inhibitorBlocksY(inhib: Inhibitor, unitY: number): boolean {
  return inhib.hp > 0 && Math.abs(inhib.y - unitY) <= INHIBITOR_RADIUS_Y;
}

/** 指定のY位置からインヒビターを攻撃・交戦できるか */
export function inhibitorEngageableY(inhib: Inhibitor, unitY: number): boolean {
  return inhib.hp > 0 && Math.abs(inhib.y - unitY) <= INHIBITOR_RADIUS_Y + 2.0;
}

// 互換エイリアス
export function inhibitorBlocksX(inhib: Inhibitor, unitYOrX: number): boolean {
  return inhibitorBlocksY(inhib, unitYOrX);
}
export function inhibitorEngageableX(inhib: Inhibitor, unitYOrX: number): boolean {
  return inhibitorEngageableY(inhib, unitYOrX);
}

/** `side` が破壊した相手インヒビター数 */
export function countDestroyedEnemyInhibitors(inhibitors: Inhibitor[], side: Owner): number {
  return inhibitors.filter((i) => i.owner !== side && i.hp <= 0).length;
}

/** `side` のマナ回復速度倍率 */
export function manaRegenMultiplier(inhibitors: Inhibitor[], side: Owner): number {
  return 1 + countDestroyedEnemyInhibitors(inhibitors, side) * INHIBITOR_REGEN_BONUS_PER_KILL;
}
