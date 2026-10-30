/**
 * 横長フィールド座標＆戦闘ジオメトリ定義
 *
 * PC画面に最適化した左右方向（横長）レイアウト:
 * - 左側 (x: 0〜5%): 自軍拠点 (Player Base)
 * - 左側 (x: 6〜33%): 自軍出撃ゾーン (後衛・中衛・前衛)
 * - 中央 (x: 33〜67%): 両軍とも出撃できない中立ゾーン。ミッドラインは x=50%
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
export const PLAYER_SPAWN_X_MAX = 33; // 前衛端 (中央 x=33〜67 は両軍出撃不可の中立ゾーン)
export const PLAYER_DEFAULT_SPAWN_X = 6; // デフォルトの最奥出撃位置

/** 中立交戦ゾーン横範囲 (両軍とも出撃不可) */
export const NEUTRAL_ZONE_X_MIN = 33;
export const NEUTRAL_ZONE_X_MAX = 67;

/** 敵軍 (CPU) ゾーン横範囲 */
export const CPU_SPAWN_X_MIN = 67;
export const CPU_SPAWN_X_MAX = 94;

/** 縦方向（レーン交戦）の近接・索敵幅 (Y座標の差がこの値以内の敵を捕捉して戦闘する) */
export const ENGAGE_HALF_WIDTH_Y = 6.5;

/** 縦方向の物理衝突幅 (Y座標の差がこの値以内の障害物で前進が止まる) */
export const COLLISION_HALF_WIDTH_Y = 5.0;

/** スペル（隕石など）の効果半径 (%) */
export const SPELL_RADIUS = 14.0;

/** 烈火の呪文（縦一列範囲攻撃）のX軸効果半幅 (%) - 左右各9%で全レーン貫通の縦一列 */
export const FIRE_SPELL_HALF_WIDTH_X = 9.0;

/** 烈火の呪文のY軸（上下方向）への延焼伝播速度 (%/秒) - ドロップ地点を中心に上下へ火柱が順番に吹き上がる速度 */
export const FIRE_SPELL_SPREAD_SPEED_Y = 60;

/** 烈火の呪文の炎の柱の間隔 (%) */
export const FIRE_SPELL_PILLAR_STEP_Y = 7.5;

/** 烈火の呪文の炎の柱の情報 */
export interface FirePillarInfo {
  id: string;
  y: number;
  offsetY: number;
  delayMs: number;
  isOrigin: boolean;
}

/** ドロップ起点から上下へ順次吹き上がる炎の柱のリストを生成 */
export function generateFirePillars(
  originY: number,
  stepY: number = FIRE_SPELL_PILLAR_STEP_Y,
  minY: number = 3,
  maxY: number = 97,
  speed: number = FIRE_SPELL_SPREAD_SPEED_Y
): FirePillarInfo[] {
  const pillars: FirePillarInfo[] = [];

  // 1. 起点（ドロップ位置）
  pillars.push({
    id: 'pillar_origin',
    y: Math.max(minY, Math.min(maxY, originY)),
    offsetY: 0,
    delayMs: 0,
    isOrigin: true,
  });

  // 2. 上方向への火柱
  let upOffset = -stepY;
  let upIndex = 1;
  while (originY + upOffset >= minY - stepY * 0.4) {
    const y = Math.max(minY, originY + upOffset);
    pillars.push({
      id: `pillar_up_${upIndex}`,
      y,
      offsetY: upOffset,
      delayMs: Math.round((Math.abs(upOffset) / speed) * 1000),
      isOrigin: false,
    });
    upOffset -= stepY;
    upIndex++;
  }

  // 3. 下方向への火柱
  let downOffset = stepY;
  let downIndex = 1;
  while (originY + downOffset <= maxY + stepY * 0.4) {
    const y = Math.min(maxY, originY + downOffset);
    pillars.push({
      id: `pillar_down_${downIndex}`,
      y,
      offsetY: downOffset,
      delayMs: Math.round((Math.abs(downOffset) / speed) * 1000),
      isOrigin: false,
    });
    downOffset += stepY;
    downIndex++;
  }

  // 吹き上がりディレイ順にソート
  return pillars.sort((a, b) => a.delayMs - b.delayMs);
}

/** 2つのオブジェクト/座標が烈火の呪文（縦一列範囲）内にあるか */
export function isWithinFireSpellColumn(unitX: number, targetX: number, halfWidth: number = FIRE_SPELL_HALF_WIDTH_X): boolean {
  return Math.abs(unitX - targetX) <= halfWidth;
}

/** 烈火の炎がドロップ起点(originY)からtargetYに到達するまでの時間 (ms) */
export function calculateFireSpreadDelayMs(
  originY: number,
  targetY: number,
  speed: number = FIRE_SPELL_SPREAD_SPEED_Y
): number {
  return Math.round((Math.abs(targetY - originY) / speed) * 1000);
}

/** 指定の経過時間(elapsedMs)時点で、烈火の炎の波面がoriginYからtargetYに到達しているか */
export function isFireWaveReached(
  originY: number,
  targetY: number,
  elapsedMs: number,
  speed: number = FIRE_SPELL_SPREAD_SPEED_Y
): boolean {
  const spreadDistance = (elapsedMs / 1000) * speed;
  return Math.abs(targetY - originY) <= spreadDistance;
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

/** 2つの座標が円形探知範囲内にあるか（全方位ユークリッド距離） */
export function isWithinCircularRange(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): boolean {
  return Math.hypot(x1 - x2, y1 - y2) <= radius;
}

/** ターゲット座標 (x2, y2) が起点 (x1, y1) の前方扇形（半径 radius・片側角度 halfAngleDeg）内にあるか */
export function isWithinFanRange(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  owner: 'player' | 'cpu',
  halfAngleDeg: number
): boolean {
  const dx = owner === 'player' ? x2 - x1 : x1 - x2;
  if (dx < 0) return false;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return false;
  if (dist === 0) return true;
  const angleDeg = (Math.atan2(Math.abs(dy), dx) * 180) / Math.PI;
  return angleDeg <= halfAngleDeg;
}

/** 円形探知ユニットの射程範囲ジオメトリ情報 (%単位) */
export interface UnitCircularRangeZone {
  centerX: number;
  centerY: number;
  radius: number;
  left: number;
  top: number;
  diameter: number;
}

/**
 * 円形探知ユニットの現在座標 (x, y)・射程 (range) から、
 * フィールド上の円形射程範囲（半径 range%）を算出する
 */
export function computeUnitCircularRangeZone(
  x: number,
  y: number,
  range: number
): UnitCircularRangeZone {
  const radius = Math.max(0, range);
  return {
    centerX: x,
    centerY: y,
    radius,
    left: x - radius,
    top: y - radius,
    diameter: radius * 2,
  };
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

/** ユニットの射程範囲（交戦・攻撃可能領域）の矩形ジオメトリ情報 (%単位) */
export interface UnitRangeZone {
  left: number;
  right: number;
  width: number;
  top: number;
  bottom: number;
  height: number;
  frontEdgeX: number;
}

/**
 * ユニットの現在座標 (x, y)・射程 (range)・陣営 (owner) から、
 * フィールド上の実効射程範囲（X軸: 前方range%, Y軸: ±ENGAGE_HALF_WIDTH_Y%）を算出する
 */
export function computeUnitRangeZone(
  x: number,
  y: number,
  range: number,
  owner: 'player' | 'cpu',
  engageHalfWidthY: number = ENGAGE_HALF_WIDTH_Y
): UnitRangeZone {
  const effectiveRange = Math.max(0, range);
  const rawLeft = owner === 'player' ? x : x - effectiveRange;
  const rawRight = owner === 'player' ? x + effectiveRange : x;

  const left = Math.max(0, Math.min(FIELD_WIDTH_PERCENT, rawLeft));
  const right = Math.max(0, Math.min(FIELD_WIDTH_PERCENT, rawRight));
  const width = Math.max(0, right - left);
  const frontEdgeX = owner === 'player' ? right : left;

  const top = Math.max(0, Math.min(FIELD_HEIGHT_PERCENT, y - engageHalfWidthY));
  const bottom = Math.max(0, Math.min(FIELD_HEIGHT_PERCENT, y + engageHalfWidthY));
  const height = Math.max(0, bottom - top);

  return {
    left,
    right,
    width,
    top,
    bottom,
    height,
    frontEdgeX,
  };
}

/** クリック/タッチ座標から有効なプレイヤーXパーセント(6〜33%)を算出 */
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
  if (x <= 15) {
    return { key: 'rearguard', label: '後衛', icon: '🏹' };
  } else if (x <= 24) {
    return { key: 'midguard', label: '中衛', icon: '🛡️' };
  } else {
    return { key: 'vanguard', label: '前衛', icon: '⚔️' };
  }
}
