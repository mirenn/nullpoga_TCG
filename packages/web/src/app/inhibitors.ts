import type { Inhibitor, Owner } from './types';

/**
 * インヒビター（LoL風の破壊可能オブジェクト）
 *
 * - 両陣営の自陣側、左(x=18%)・中央(x=50%)・右(x=82%)に配置（計6基）
 * - 自らは攻撃しない「防壁」。その横幅(±5.5%)の範囲を通るユニットを足止めする
 * - その隙間（x=34% や x=66% など）を通過するユニットは素通り可能！
 * - 破壊した側はマナを獲得（即時マナ+2 ＋ マナ回復速度+20%永続アップ）
 */

export interface InhibitorSlot {
  key: 'left' | 'center' | 'right';
  x: number;
}

export const INHIBITOR_SLOTS: InhibitorSlot[] = [
  { key: 'left', x: 18 },
  { key: 'center', x: 50 },
  { key: 'right', x: 82 },
];

/** インヒビターの進路妨害・被弾横幅 (半径) */
export const INHIBITOR_RADIUS_X = 6.0;

/** インヒビターの耐久値 */
export const INHIBITOR_MAX_HP = 12;

/** 配置位置（y%）: CPU側 / プレイヤー側 */
export const CPU_INHIBITOR_Y = 22;
export const PLAYER_INHIBITOR_Y = 78;

/** 破壊時の即時マナボーナス */
export const INHIBITOR_DESTROY_MANA_BONUS = 2;

/** 破壊1つごとのマナ回復速度の上昇率（+20%） */
export const INHIBITOR_REGEN_BONUS_PER_KILL = 0.2;

export function createInitialInhibitors(): Inhibitor[] {
  const list: Inhibitor[] = [];
  for (const owner of ['cpu', 'player'] as Owner[]) {
    for (const slot of INHIBITOR_SLOTS) {
      list.push({
        id: `inhib_${owner}_${slot.key}`,
        owner,
        lane: slot.x, // 互換性のためのエイリアス
        x: slot.x,
        y: owner === 'cpu' ? CPU_INHIBITOR_Y : PLAYER_INHIBITOR_Y,
        hp: INHIBITOR_MAX_HP,
        maxHp: INHIBITOR_MAX_HP,
      });
    }
  }
  return list;
}

/** 指定のX位置を進むユニットを足止め（前進ストップ）するか */
export function inhibitorBlocksX(inhib: Inhibitor, unitX: number): boolean {
  return inhib.hp > 0 && Math.abs(inhib.x - unitX) <= INHIBITOR_RADIUS_X;
}

/** 指定のX位置からインヒビターを攻撃・交戦できるか */
export function inhibitorEngageableX(inhib: Inhibitor, unitX: number): boolean {
  return inhib.hp > 0 && Math.abs(inhib.x - unitX) <= INHIBITOR_RADIUS_X + 2.0;
}

/** `side` が破壊した相手インヒビター数 */
export function countDestroyedEnemyInhibitors(inhibitors: Inhibitor[], side: Owner): number {
  return inhibitors.filter((i) => i.owner !== side && i.hp <= 0).length;
}

/** `side` のマナ回復速度倍率 */
export function manaRegenMultiplier(inhibitors: Inhibitor[], side: Owner): number {
  return 1 + countDestroyedEnemyInhibitors(inhibitors, side) * INHIBITOR_REGEN_BONUS_PER_KILL;
}
