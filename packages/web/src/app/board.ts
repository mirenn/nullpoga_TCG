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

/** プレイヤーユニットの有効配置縦範囲 (奥行き・前後方向) */
export const PLAYER_SPAWN_Y_MIN = 52; // 前衛上限 (ミッドライン y=50 のすぐ手前)
export const PLAYER_SPAWN_Y_MAX = 95; // 後衛下限 (自陣ベース手前)
export const PLAYER_DEFAULT_SPAWN_Y = 95; // 旧仕様・デフォルトの最奥行

/** クリック/タッチ座標から有効なプレイヤーYパーセント(52〜95%)を算出 */
export function clampPlayerSpawnY(rawYPercent: number): number {
  return Math.max(PLAYER_SPAWN_Y_MIN, Math.min(PLAYER_SPAWN_Y_MAX, Math.round(rawYPercent * 10) / 10));
}

/** 汎用のYパーセントクランプ */
export function clampSpawnY(
  rawYPercent: number,
  minY: number = 0,
  maxY: number = 100
): number {
  return Math.max(minY, Math.min(maxY, Math.round(rawYPercent * 10) / 10));
}

export type DepthRoleKey = 'vanguard' | 'midguard' | 'rearguard';

export interface DepthRoleInfo {
  key: DepthRoleKey;
  label: string;
  icon: string;
}

/** Y座標から奥行き配置の役割（前衛・中衛・後衛）を取得 */
export function getSpawnDepthRole(y: number): DepthRoleInfo {
  if (y < 65) {
    return { key: 'vanguard', label: '前衛', icon: '⚔️' };
  } else if (y < 80) {
    return { key: 'midguard', label: '中衛', icon: '🛡️' };
  } else {
    return { key: 'rearguard', label: '後衛', icon: '🏹' };
  }
}

