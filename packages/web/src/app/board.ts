/**
 * オープンフィールド座標＆戦闘ジオメトリ定義
 *
 * レーンの仕切りを完全廃止し、横位置 (x: 0〜100%) と縦位置 (y: 0〜100%) の
 * 連続2次元フィールドとして動作する。
 */

/** フィールドの横幅パーセント */
export const FIELD_WIDTH_PERCENT = 100;

/** フィールドの有効配置範囲 (左右端のマージンを考慮) */
export const SPAWN_X_MIN = 6;
export const SPAWN_X_MAX = 94;

/** 横方向の近接・索敵幅 (X座標の差がこの値以内の敵を捕捉して戦闘する) */
export const ENGAGE_HALF_WIDTH_X = 6.5;

/** 横方向の物理衝突幅 (X座標の差がこの値以内の障害物で前進が止まる) */
export const COLLISION_HALF_WIDTH_X = 5.0;

/** スペル（隕石など）の横方向の効果半径 (%) */
export const SPELL_RADIUS_X = 14.0;

/** 2つのオブジェクトが横方向で交戦可能か */
export function isWithinEngageX(xA: number, xB: number, halfWidth: number = ENGAGE_HALF_WIDTH_X): boolean {
  return Math.abs(xA - xB) <= halfWidth;
}

/** 2つのオブジェクトが横方向で物理衝突（前進ストップ）するか */
export function isWithinCollisionX(xA: number, xB: number, halfWidth: number = COLLISION_HALF_WIDTH_X): boolean {
  return Math.abs(xA - xB) <= halfWidth;
}

/** クリック/タッチ座標から有効なXパーセント(6〜94%)を算出 */
export function clampSpawnX(rawXPercent: number): number {
  return Math.max(SPAWN_X_MIN, Math.min(SPAWN_X_MAX, Math.round(rawXPercent * 10) / 10));
}
