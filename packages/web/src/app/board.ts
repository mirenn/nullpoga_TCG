/**
 * 横長フィールド座標＆戦闘ジオメトリ定義
 *
 * PC画面に最適化した左右方向（横長）レイアウト:
 * - 左側 (x: 0〜5%): 自軍拠点 (Player Base)
 * - 左半面 (x: 6〜48%): 自軍出撃ゾーン (後衛・中衛・前衛)
 * - 中央 (x: 50%): ミッドライン (Midline)
 * - 右側 (x: 95〜100%): 敵軍拠点 (CPU Base)
 * - 縦軸 (y: 0〜100%): レーン軸 (Top=20%, Mid=50%, Bot=80%)
 *
 * ユニットは自陣から敵陣へ向かって横方向（プレイヤーは右へ、CPUは左へ）に進軍する。
 */

/** フィールドの横幅パーセント */
export const FIELD_WIDTH_PERCENT = 100;
export const FIELD_HEIGHT_PERCENT = 100;

/** 拠点位置 (X%) */
export const PLAYER_BASE_X = 5;
export const CPU_BASE_X = 95;
export const MIDLINE_X = 50;

/** フィールドの有効配置横範囲 */
export const SPAWN_X_MIN = 6;
export const SPAWN_X_MAX = 94;

/** フィールドの有効配置縦範囲 (上下マージンを考慮) */
export const SPAWN_Y_MIN = 12;
export const SPAWN_Y_MAX = 88;

/** プレイヤーユニットの有効配置横範囲 (奥行き・前後方向) */
export const PLAYER_SPAWN_X_MIN = 6;  // 後衛端 (自陣ベース手前)
export const PLAYER_SPAWN_X_MAX = 48; // 前衛端 (ミッドライン x=50 の手前)
export const PLAYER_DEFAULT_SPAWN_X = 6; // デフォルトの最奥出撃位置

/** 縦方向（レーン交戦）の近接・索敵幅 (Y座標の差がこの値以内の敵を捕捉して戦闘する) */
export const ENGAGE_HALF_WIDTH_Y = 6.5;

/** 縦方向の物理衝突幅 (Y座標の差がこの値以内の障害物で前進が止まる) */
export const COLLISION_HALF_WIDTH_Y = 5.0;

/** スペル（隕石など）の効果半径 (%) */
export const SPELL_RADIUS = 14.0;

/** 烈火の呪文（縦一列範囲攻撃）のX軸効果半幅 (%) - 左右各9%で全レーン貫通の縦一列 */
export const FIRE_SPELL_HALF_WIDTH_X = 9.0;

/** 2つのオブジェクト/座標が烈火の呪文（縦一列範囲）内にあるか */
export function isWithinFireSpellColumn(unitX: number, targetX: number, halfWidth: number = FIRE_SPELL_HALF_WIDTH_X): boolean {
  return Math.abs(unitX - targetX) <= halfWidth;
}

/** 2つの座標が隕石（円形範囲攻撃）内にあるか */
export function isWithinMeteorRange(
  unitX: number,
  unitY: number,
  targetX: number,
  targetY: number,
  radius: number = SPELL_RADIUS
): boolean {
  return Math.hypot(unitX - targetX, unitY - targetY) <= radius;
}

// === 互換性エイリアス ===
export const ENGAGE_HALF_WIDTH_X = ENGAGE_HALF_WIDTH_Y;
export const COLLISION_HALF_WIDTH_X = COLLISION_HALF_WIDTH_Y;
export const SPELL_RADIUS_X = SPELL_RADIUS;
export const PLAYER_SPAWN_Y_MIN = PLAYER_SPAWN_X_MIN;
export const PLAYER_SPAWN_Y_MAX = PLAYER_SPAWN_X_MAX;
export const PLAYER_DEFAULT_SPAWN_Y = PLAYER_DEFAULT_SPAWN_X;

/** 2つのオブジェクトが縦方向（同一レーン付近）で交戦可能か */
export function isWithinEngageY(yA: number, yB: number, halfWidth: number = ENGAGE_HALF_WIDTH_Y): boolean {
  return Math.abs(yA - yB) <= halfWidth;
}

/** 2つのオブジェクトが縦方向（同一レーン付近）で物理衝突（前進ストップ）するか */
export function isWithinCollisionY(yA: number, yB: number, halfWidth: number = COLLISION_HALF_WIDTH_Y): boolean {
  return Math.abs(yA - yB) <= halfWidth;
}

/** 互換性エイリアス */
export function isWithinEngageX(a: number, b: number, halfWidth: number = ENGAGE_HALF_WIDTH_Y): boolean {
  return isWithinEngageY(a, b, halfWidth);
}
export function isWithinCollisionX(a: number, b: number, halfWidth: number = COLLISION_HALF_WIDTH_Y): boolean {
  return isWithinCollisionY(a, b, halfWidth);
}

/** クリック/タッチ座標から有効なプレイヤーXパーセント(6〜48%)を算出 */
export function clampPlayerSpawnX(rawXPercent: number): number {
  return Math.max(PLAYER_SPAWN_X_MIN, Math.min(PLAYER_SPAWN_X_MAX, Math.round(rawXPercent * 10) / 10));
}

/** クリック/タッチ座標から有効な汎用Xパーセント(6〜94%)を算出 */
export function clampSpawnX(
  rawXPercent: number,
  minX: number = SPAWN_X_MIN,
  maxX: number = SPAWN_X_MAX
): number {
  return Math.max(minX, Math.min(maxX, Math.round(rawXPercent * 10) / 10));
}

/** クリック/タッチ座標から有効なYパーセント(12〜88%)を算出 */
export function clampSpawnY(
  rawYPercent: number,
  minY: number = SPAWN_Y_MIN,
  maxY: number = SPAWN_Y_MAX
): number {
  return Math.max(minY, Math.min(maxY, Math.round(rawYPercent * 10) / 10));
}

/** 互換性エイリアス */
export function clampPlayerSpawnY(rawPercent: number): number {
  return clampPlayerSpawnX(rawPercent);
}

export type DepthRoleKey = 'rearguard' | 'midguard' | 'vanguard';

export interface DepthRoleInfo {
  key: DepthRoleKey;
  label: string;
  icon: string;
}

/** X座標（奥行き）から配置の役割（後衛・中衛・前衛）を取得 */
export function getSpawnDepthRole(x: number): DepthRoleInfo {
  if (x <= 18) {
    return { key: 'rearguard', label: '後衛', icon: '🏹' };
  } else if (x <= 33) {
    return { key: 'midguard', label: '中衛', icon: '🛡️' };
  } else {
    return { key: 'vanguard', label: '前衛', icon: '⚔️' };
  }
}
