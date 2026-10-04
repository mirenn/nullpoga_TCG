import type { Inhibitor, Owner } from './types';
import { COLUMN_COUNT } from './board';

/**
 * インヒビター（LoL風の破壊可能オブジェクト）
 *
 * - 両陣営の自陣側、左端・中央・右端の列に1つずつ配置（計6個）
 * - 自らは攻撃しない「壁役」。同じ列の敵ユニットは破壊するまで前進できない
 * - 破壊した側はマナを獲得（即時ボーナス ＋ マナ回復速度の永続アップ）
 */

/** インヒビターを置く列（左端・中央・右端） */
export const INHIBITOR_COLUMNS: number[] = [0, Math.floor(COLUMN_COUNT / 2), COLUMN_COUNT - 1];

/** 進路を塞ぐ横幅（|列差| がこの値以下のユニットを足止めし、攻撃対象になる） */
export const INHIBITOR_HALF_WIDTH = 0;

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
    for (const col of INHIBITOR_COLUMNS) {
      list.push({
        id: `inhib_${owner}_${col}`,
        owner,
        lane: col,
        y: owner === 'cpu' ? CPU_INHIBITOR_Y : PLAYER_INHIBITOR_Y,
        hp: INHIBITOR_MAX_HP,
        maxHp: INHIBITOR_MAX_HP,
      });
    }
  }
  return list;
}

/** 指定列のユニットを塞ぐ/攻撃対象となるか */
export function inhibitorCoversColumn(inhib: Inhibitor, col: number): boolean {
  return inhib.hp > 0 && Math.abs(inhib.lane - col) <= INHIBITOR_HALF_WIDTH;
}

/** `side` が破壊した相手インヒビター数 */
export function countDestroyedEnemyInhibitors(inhibitors: Inhibitor[], side: Owner): number {
  return inhibitors.filter((i) => i.owner !== side && i.hp <= 0).length;
}

/** `side` のマナ回復速度倍率 */
export function manaRegenMultiplier(inhibitors: Inhibitor[], side: Owner): number {
  return 1 + countDestroyedEnemyInhibitors(inhibitors, side) * INHIBITOR_REGEN_BONUS_PER_KILL;
}
