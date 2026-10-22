import type { Owner, Unit, CloudEntity } from './types';
import { isUnitInCloudShadow } from './cloudEvent';

/**
 * 3D箱庭フィールドの立体遮蔽物（森の樹冠・巨岩アーチ・結晶群）＆
 * 3DCC風カメラ平行移動（ミドルドラッグ・覗き込み索敵）ロジック
 *
 * 【ゲーム性コンセプト】
 * 1. インヒビターの隙間ルート（y=35%, y=65%）に背の高い3D遮蔽物（樹冠・巨岩・結晶）が配置される。
 * 2. デフォルトのカメラ位置（panX=0, panY=0）では、立体遮蔽物の「傘（キャノピー）」が真下の地面を覆い、
 *    小型・隠密ユニット（🥷忍びアサシン、🐭ネズミ、🦇吸血コウモリ等）やCPUの召喚予兆が死角に隠れる。
 * 3. プレイヤーが3DCGソフトのように「ミドルクリック押し込み＋ドラッグ」でカメラを平行移動（パン）させると、
 *    視差（パララックス）によって高い位置にある樹冠・岩の傘がズレて、死角の裏側を覗き込むことができる！
 * 4. 遮蔽物の裏に潜む敵ユニットをカメラ移動で覗き込んで視界に捉えると「👁️ SPOT!（奇襲看破）」が発動！
 *    - 永続的にターゲットロック表示（透視マーカー）が付与される
 *    - 🥷忍びアサシンの「疾走（移動速度3倍）」が解除され、さらに看破ショック（短時間スタン）を与える！
 * 5. 逆にプレイヤーが自陣側の遮蔽物（x=34%, y=35%/65%）の陰にモンスターを出撃させると、
 *    「🌲 奇襲出撃（アンブッシュ）」ボーナスとして攻撃力+1が付与される！
 */

export type ObstacleKind = 'bush' | 'forest' | 'rock' | 'crystal';

export interface FieldObstacle {
  id: string;
  name: string;
  kind: ObstacleKind;
  side: Owner | 'neutral';
  /** 地面の中心X座標 (0〜100%) */
  x: number;
  /** 地面の中心Y座標 (0〜100%) */
  y: number;
  /** 地面および樹冠の横半径 (%単位) */
  radiusX: number;
  /** 地面および樹冠の縦半径 (%単位) */
  radiusY: number;
  /** 3D空間での高さ (px相当: 大きいほどカメラ移動時の視差シフトが大きい) */
  heightZ: number;
  /** 耐久値・HP (未指定時は 80) */
  hp?: number;
  /** 最大耐久値 */
  maxHp?: number;
  /** イノシシなどの激突粉砕によって破壊されたか */
  isDestroyed?: boolean;
  /** 被弾・激突演出用タイムスタンプ */
  lastHitTime?: number;
}

/** 3D箱庭カメラの状態 */
export interface Camera3DState {
  /** 水平パン移動量 (px: -260 〜 +260) */
  panX: number;
  /** 垂直パン移動量 (px: -180 〜 +180) */
  panY: number;
  /** ズーム倍率 (0.75 〜 1.65) */
  zoom: number;
  /** X軸チルト角度 (度: 3D箱庭モード時は約22度) */
  tiltDeg: number;
  /** 3D箱庭パースペクティブ有効フラグ */
  is3DMode: boolean;
}

export const CAMERA_PAN_X_MIN = -260;
export const CAMERA_PAN_X_MAX = 260;
export const CAMERA_PAN_Y_MIN = -180;
export const CAMERA_PAN_Y_MAX = 180;
export const CAMERA_ZOOM_MIN = 0.75;
export const CAMERA_ZOOM_MAX = 1.65;
export const DEFAULT_TILT_DEG = 30;

export const DEFAULT_CAMERA_3D: Camera3DState = {
  panX: 0,
  panY: 0,
  zoom: 1.0,
  tiltDeg: DEFAULT_TILT_DEG,
  is3DMode: true,
};

/** 看破（SPOT）発動時のスタン時間 (ms) */
export const SPOT_AMBUSH_STUN_MS = 900;

/** 自陣遮蔽物からの奇襲出撃（アンブッシュ）時の攻撃力ボーナス */
export const AMBUSH_DEPLOY_ATK_BONUS = 1;

/**
 * フィールド上の立体遮蔽物（茂み3箇所。岩・結晶は SOLID_OBSTACLE_PRESETS へ退避）
 * インヒビター（y=20, 50, 80）の間の素通り回廊（y=35, y=65）に配置し、
 * 奇襲ルートとカメラ覗き込みの駆け引きを生み出す。
 */
export const FIELD_OBSTACLES: FieldObstacle[] = [
  // 自陣側（プレイヤーが奇襲出撃バフを得られる遮蔽物: 茂み）
  {
    id: 'obs_player_upper_forest',
    name: '翠緑の茂み',
    kind: 'bush',
    side: 'player',
    x: 34,
    y: 35,
    radiusX: 8.5,
    radiusY: 7.5,
    heightZ: 68,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
  // 中央交戦エリア（中立の立体遮蔽物: 茂み）
  {
    id: 'obs_mid_upper_forest',
    name: '迷いの茂み',
    kind: 'bush',
    side: 'neutral',
    x: 56,
    y: 35,
    radiusX: 9.0,
    radiusY: 8.0,
    heightZ: 76,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
  // 敵陣奥（CPUの出撃予兆や忍びアサシンの出撃を隠す死角遮蔽物: x=88, radiusX=9.5 -> x=78.5〜97.5%をカバー）
  {
    id: 'obs_cpu_upper_forest',
    name: '霧隠れの茂み',
    kind: 'bush',
    side: 'cpu',
    x: 88,
    y: 35,
    radiusX: 9.5,
    radiusY: 8.5,
    heightZ: 84,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
];

/**
 * 盤面から外した固い障害物（岩・結晶）。矢印タイルの押し出しを邪魔するため FIELD_OBSTACLES には含めない。
 * 障害物ロジックのテストと、将来の再配置用に残している。
 */
export const SOLID_OBSTACLE_PRESETS: FieldObstacle[] = [
  {
    id: 'obs_player_lower_rock',
    name: '渓谷の遮蔽岩',
    kind: 'rock',
    side: 'player',
    x: 34,
    y: 65,
    radiusX: 8.5,
    radiusY: 7.5,
    heightZ: 68,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
  {
    id: 'obs_mid_lower_crystal',
    name: '蒼晶の巨大群生',
    kind: 'crystal',
    side: 'neutral',
    x: 56,
    y: 65,
    radiusX: 9.0,
    radiusY: 8.0,
    heightZ: 76,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
  {
    id: 'obs_cpu_lower_rock',
    name: '黒曜の巨岩アーチ',
    kind: 'rock',
    side: 'cpu',
    x: 88,
    y: 65,
    radiusX: 9.5,
    radiusY: 8.5,
    heightZ: 84,
    hp: 80,
    maxHp: 80,
    isDestroyed: false,
  },
];

/** 障害物が現在有効（未破壊かつHP>0）かどうか判定 */
export function isObstacleActive(obs: FieldObstacle): boolean {
  return !obs.isDestroyed && (obs.hp === undefined || obs.hp > 0);
}

export function clampCameraPanX(panX: number): number {
  return Math.max(CAMERA_PAN_X_MIN, Math.min(CAMERA_PAN_X_MAX, Math.round(panX)));
}

export function clampCameraPanY(panY: number): number {
  return Math.max(CAMERA_PAN_Y_MIN, Math.min(CAMERA_PAN_Y_MAX, Math.round(panY)));
}

export function clampCameraZoom(zoom: number): number {
  return Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, Math.round(zoom * 100) / 100));
}

/**
 * 遮蔽物の死角に隠れることができる小型・隠密系カードかどうか
 * - 小型・隠密系: 1(ネズミ), 2(柴犬), 3(ネコ), 8(忍びアサシン), 9(吸血コウモリ) -> true
 * - 大型・発光系: 4(亀吉), 6(電気クラゲ), 7(イノシシ), 11(炎のドラゴン) -> false（頭や光がハミ出て常に見える）
 */
export function isStealthCapableCard(cardNo: number): boolean {
  return cardNo === 1 || cardNo === 2 || cardNo === 3 || cardNo === 8 || cardNo === 9;
}

/**
 * 指定の地面座標 (x, y) が特定の遮蔽物の基底エリア（楕円範囲）内にあるか判定
 */
export function isPointInObstacleFootprint(
  x: number,
  y: number,
  obstacle: FieldObstacle,
  marginScale: number = 1.0
): boolean {
  const rx = obstacle.radiusX * marginScale;
  const ry = obstacle.radiusY * marginScale;
  if (rx <= 0 || ry <= 0) return false;
  const dx = (x - obstacle.x) / rx;
  const dy = (y - obstacle.y) / ry;
  return dx * dx + dy * dy <= 1.0;
}

/**
 * 指定の地面座標 (x, y) がいずれかの遮蔽物の地面エリア内にある場合、その遮蔽物を返す
 */
export function findCoveringObstacleGround(
  x: number,
  y: number,
  obstacles: FieldObstacle[] = FIELD_OBSTACLES
): FieldObstacle | null {
  for (const obs of obstacles) {
    if (isPointInObstacleFootprint(x, y, obs, 1.0)) {
      return obs;
    }
  }
  return null;
}

/**
 * 自陣または中立の遮蔽物エリア内への出撃（奇襲出撃ボーナス対象）か判定
 */
export function findPlayerAmbushObstacle(
  spawnX: number,
  spawnY: number,
  obstacles: FieldObstacle[] = FIELD_OBSTACLES
): FieldObstacle | null {
  for (const obs of obstacles) {
    if (obs.side !== 'cpu' && isPointInObstacleFootprint(spawnX, spawnY, obs, 1.05)) {
      return obs;
    }
  }
  return null;
}

/**
 * カメラの平行移動 (panX, panY) によって生じる、立体遮蔽物の「傘（樹冠・岩の頂部）」の
 * 地面に対する見かけの投影中心座標 (canopyX, canopyY) を算出する。
 *
 * - カメラが初期位置 (panX=0, panY=0) のとき: 傘は真上 (obs.x, obs.y) を覆い隠す。
 * - カメラをドラッグして平行移動させると、高さ (heightZ) に応じた視差（パララックス）が発生し、
 *   傘の投影位置が地面からズレることで、下に隠れているユニットが露出する！
 */
export interface CanopyProjection {
  /** 地面座標系での見かけの傘中心X (%) */
  canopyX: number;
  /** 地面座標系での見かけの傘中心Y (%) */
  canopyY: number;
  /** 視差によるXシフト量 (%) */
  shiftXPercent: number;
  /** 視差によるYシフト量 (%) */
  shiftYPercent: number;
}

export function computeCanopyProjection(
  obstacle: FieldObstacle,
  camera: Camera3DState
): CanopyProjection {
  const heightFactor = obstacle.heightZ / 75;
  // カメラをパンしたとき、高い位置にある樹冠ほど大きく視差シフトする
  // 約70px以上のミドルドラッグで樹冠が大きくスライドして裏側が見える設計
  const shiftXPercent = (camera.panX / 12) * heightFactor;
  const shiftYPercent = (camera.panY / 10) * heightFactor;

  return {
    canopyX: obstacle.x + shiftXPercent,
    canopyY: obstacle.y + shiftYPercent,
    shiftXPercent,
    shiftYPercent,
  };
}

/**
 * カメラ移動によって指定の遮蔽物の死角をどれくらい覗き込めているか (0.0 = 死角のまま 〜 1.0以上 = 完全看破)
 * - 視差によってユニット座標 (targetX, targetY) が傘の中心から外れた場合、
 *   またはカメラを一定以上動かして角度をつけた場合に 1.0 以上となる。
 */
export function computePeekRevealProgress(
  targetX: number,
  targetY: number,
  obstacle: FieldObstacle,
  camera: Camera3DState
): number {
  const proj = computeCanopyProjection(obstacle, camera);
  // 1. 視差シフト後の傘の中心からの正規化距離 (0=ど真ん中, 1.0=傘のフチから露出した!)
  const rx = Math.max(1, obstacle.radiusX * 0.72);
  const ry = Math.max(1, obstacle.radiusY * 0.72);
  const normDistFromShiftedCanopy = Math.hypot(
    (targetX - proj.canopyX) / rx,
    (targetY - proj.canopyY) / ry
  );

  // 2. カメラ自体の平行移動量による覗き込み角度ボーナス (約65px以上のドラッグで死角解消)
  const panDistance = Math.hypot(camera.panX, camera.panY);
  const panRevealScore = panDistance / 68;

  // カメラがほぼ初期位置 (panDistance < 12px) の場合は、地面エリア内のユニットは確実に死角に隠れる
  if (panDistance < 12) {
    return 0;
  }

  return Math.max(normDistFromShiftedCanopy, panRevealScore);
}

/**
 * 地面上の点 (targetX, targetY) が、現在のカメラ角度において指定の遮蔽物の死角に隠れているか
 */
export function isPointOccludedByObstacle(
  targetX: number,
  targetY: number,
  obstacle: FieldObstacle,
  camera: Camera3DState
): boolean {
  // まず地面の遮蔽物エリア内にいるか
  if (!isPointInObstacleFootprint(targetX, targetY, obstacle, 1.0)) {
    return false;
  }
  // カメラの覗き込み進行度が 1.0 未満ならまだ死角に隠れている
  return computePeekRevealProgress(targetX, targetY, obstacle, camera) < 1.0;
}

/**
 * ユニットの隠密（死角遮蔽）状態およびカメラ覗き込みによる新規看破（SPOT!）を判定する
 */
export interface UnitStealthEvaluation {
  /** 現在入っている遮蔽物（なければ null） */
  coveringObstacle: FieldObstacle | null;
  /** 現在のカメラ角度で死角に隠れているか（未スポットの小型敵ユニット） */
  isConcealed: boolean;
  /** このフレームでカメラの覗き込みによって新たに看破（SPOT!）されたか */
  newlySpotted: boolean;
}

export function evaluateUnitStealthAndSpot(
  unit: Unit,
  camera: Camera3DState,
  obstacles: FieldObstacle[] = FIELD_OBSTACLES
): UnitStealthEvaluation {
  const coveringObstacle = findCoveringObstacleGround(unit.x, unit.y, obstacles);

  // 遮蔽物エリア外、または大型・発光ユニットは隠れない
  if (!coveringObstacle || !isStealthCapableCard(unit.cardNo)) {
    return {
      coveringObstacle,
      isConcealed: false,
      newlySpotted: false,
    };
  }

  // プレイヤー自身のユニットはプレイヤーからは常に見える（アンブッシュ状態として表示）
  if (unit.owner === 'player') {
    return {
      coveringObstacle,
      isConcealed: false,
      newlySpotted: false,
    };
  }

  // すでに看破（SPOT）済みの敵ユニットは常に見える
  if (unit.isSpotted) {
    return {
      coveringObstacle,
      isConcealed: false,
      newlySpotted: false,
    };
  }

  // まだ看破されていない敵の隠密ユニットが遮蔽物内にいる場合:
  // カメラの覗き込み度合いをチェック
  const revealProgress = computePeekRevealProgress(unit.x, unit.y, coveringObstacle, camera);
  if (revealProgress >= 1.0) {
    // カメラ平行移動で死角を覗き込み、敵を発見した！ -> SPOT!
    return {
      coveringObstacle,
      isConcealed: false,
      newlySpotted: true,
    };
  }

  // まだ死角に隠れている
  return {
    coveringObstacle,
    isConcealed: true,
    newlySpotted: false,
  };
}

/**
 * 障害物がユニットの通行（通り抜け）を許可するかどうか判定
 * - 茂み（bush/forest）: LoLの茂みと同様、視界は遮るがユニットは自由に通り抜け可能 (true)
 * - 岩（rock）/ 結晶（crystal）: 物理的な壁として移動をブロックする (false)
 */
export function isObstaclePassable(obstacle: FieldObstacle): boolean {
  return obstacle.kind === 'bush' || obstacle.kind === 'forest';
}

/**
 * 障害物がユニットの移動を物理的に妨げる壁（衝突停止・攻撃破壊対象）かどうか判定
 */
export function isObstacleSolid(obstacle: FieldObstacle): boolean {
  if (!isObstacleActive(obstacle)) {
    return false;
  }
  return !isObstaclePassable(obstacle);
}

/**
 * 障害物がユニットの視界（Line of Sight）を遮るかどうか判定
 * - 茂み（bush/forest）: LoLの茂みと同様、茂みにより視界を遮断する (true)
 * - 岩（rock）/ 結晶（crystal）: 背が低い等の理由で視界・射線を通す (false)
 * - 破壊済み（isDestroyed または HP<=0）: 視界を通す (false)
 */
export function isObstacleBlockingVision(obstacle: FieldObstacle): boolean {
  if (!isObstacleActive(obstacle)) {
    return false;
  }
  return obstacle.kind === 'bush' || obstacle.kind === 'forest';
}

/**
 * 2点 (x1, y1) と (x2, y2) を結ぶ線分が、楕円領域 (cx, cy, rx, ry) と交差するか判定する汎用幾何関数
 */
export function doesSegmentIntersectEllipse(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): boolean {
  if (rx <= 0 || ry <= 0) return false;

  // 楕円の中心を原点とし、各軸を半径で正規化した座標系へ変換
  const u1 = (x1 - cx) / rx;
  const v1 = (y1 - cy) / ry;
  const u2 = (x2 - cx) / rx;
  const v2 = (y2 - cy) / ry;

  const du = u2 - u1;
  const dv = v2 - v1;
  const segmentLenSq = du * du + dv * dv;

  if (segmentLenSq === 0) {
    // 始点と終点が同一
    return u1 * u1 + v1 * v1 <= 1.0;
  }

  // 線分 P(t) = P1 + t * (P2 - P1) 上で原点 (0,0) に最も近い t を算出 (0 <= t <= 1)
  const tClosest = -(u1 * du + v1 * dv) / segmentLenSq;
  const t = Math.max(0, Math.min(1, tClosest));

  const closestU = u1 + t * du;
  const closestV = v1 + t * dv;

  return closestU * closestU + closestV * closestV <= 1.0;
}

/**
 * 2点 (x1, y1) と (x2, y2) を結ぶ線分が、指定の障害物のフットプリント（楕円）と交差するか判定する
 * @param marginScale 障害物の当たり判定スケール（デフォルト 0.95）
 */
export function doesSegmentIntersectObstacle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacle: FieldObstacle,
  marginScale: number = 0.95
): boolean {
  return doesSegmentIntersectEllipse(
    x1,
    y1,
    x2,
    y2,
    obstacle.x,
    obstacle.y,
    obstacle.radiusX * marginScale,
    obstacle.radiusY * marginScale
  );
}

export interface TargetVisionInfo {
  isStructure?: boolean;
  isStealthCapable?: boolean;
  isSpotted?: boolean;
  isCloudSpotted?: boolean;
}

/**
 * 観測者 (x1, y1) からターゲット (x2, y2) への視線（Line of Sight）が通っているか判定する
 * 【LoLライクな視界ルール（茂み & 流雲）】
 * 1. 観測者自身が茂み・雲の中にいる場合、その茂み・雲自身によって視界は遮られない。
 * 2. ターゲットが茂み・雲の中にいる場合:
 *    - 観測者も同じ茂み・雲の中にいるなら見える（お互い攻撃しあえる）。
 *    - ターゲットが構造物（インヒビター等）、大型（非隠密）、または看破済み(isSpotted / isCloudSpotted)なら外からでも見える。
 *    - それ以外（未看破の敵で観測者が外）なら死角に潜んでいるため見えない（遠距離攻撃ユニットの探知に引っかからない）。
 * 3. 観測者からターゲットへの線分上に、観測者の外側にある茂みや雲が存在する場合:
 *    - 視界・射線を遮断するため、その後ろにあるターゲットは見えない。
 * 4. 岩（rock）や結晶（crystal）は視界を通すため遮断しない。
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: FieldObstacle[] = FIELD_OBSTACLES,
  targetInfo?: TargetVisionInfo,
  clouds?: CloudEntity[]
): boolean {
  // 1. 固定障害物（茂み・森）によるLoLライクな視界判定
  for (const obs of obstacles) {
    if (!isObstacleBlockingVision(obs)) {
      continue;
    }

    const observerInside = isPointInObstacleFootprint(x1, y1, obs, 1.0);
    const targetInside = isPointInObstacleFootprint(x2, y2, obs, 1.0);

    // ターゲットが茂みの中にいる場合の判定
    if (targetInside) {
      if (observerInside) {
        // 同じ茂みの中にいれば互いに見える
        continue;
      }
      // 観測者が外にいる場合:
      // 大型（非隠密）、看破済み、または構造物でない限り見えない
      const canBeSeenFromOutside =
        targetInfo?.isStructure ||
        targetInfo?.isSpotted ||
        (targetInfo?.isStealthCapable === false);

      if (!canBeSeenFromOutside) {
        return false;
      }
      // ターゲット自身がこの茂みの中にいて外から視認可能な場合、
      // この茂み自身がターゲットへの視線を遮ることはないため通過
      continue;
    }

    // 茂みが2点の間にある（視線を遮断する）場合の判定
    // 観測者が茂みの外にいる場合のみ、その茂みが視線を遮断する
    if (!observerInside) {
      if (doesSegmentIntersectObstacle(x1, y1, x2, y2, obs, 0.95)) {
        return false;
      }
    }
  }

  // 2. 流雲（Drifting Clouds）による動的死角判定（LoLの動く茂み仕様）
  if (clouds && clouds.length > 0) {
    for (const cloud of clouds) {
      if (cloud.radiusX <= 0 || cloud.radiusY <= 0) continue;

      const observerInside = isUnitInCloudShadow(x1, y1, cloud);
      const targetInside = isUnitInCloudShadow(x2, y2, cloud);

      // (A) ターゲットが雲の影（死角）の中にいる場合
      if (targetInside) {
        if (observerInside) {
          // 二人とも同じ雲の中にいるなら通常通り視認・攻撃可能
          continue;
        }
        // 観測者が雲の外にいる場合:
        // 構造物（インヒビター等）、または接近看破（isCloudSpotted || isSpotted）でない限り、
        // 敵の遠距離攻撃ユニットの探知に引っかからない！
        const canBeSeenFromOutside =
          targetInfo?.isStructure ||
          targetInfo?.isCloudSpotted ||
          targetInfo?.isSpotted;

        if (!canBeSeenFromOutside) {
          return false;
        }
        continue;
      }

      // (B) 雲が観測者とターゲットの間を横切っている（射線を遮断する）場合
      // 観測者が雲の外にいる場合のみ、雲が視線を遮断する
      if (!observerInside) {
        if (
          doesSegmentIntersectEllipse(
            x1,
            y1,
            x2,
            y2,
            cloud.x,
            cloud.y,
            cloud.radiusX * 0.95,
            cloud.radiusY * 0.95
          )
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * 前方直進ユニットの最大視界到達点 (reachX) を算出する
 * ユニットの前方に未破壊の茂みや雲がある場合、視界・探知は手前で遮断される
 */
export function computeUnitMaxVisionReachX(
  x: number,
  y: number,
  range: number,
  owner: Owner,
  obstacles: FieldObstacle[] = FIELD_OBSTACLES,
  engageHalfWidthY: number = 6.5,
  clouds?: CloudEntity[]
): {
  reachX: number;
  effectiveRange: number;
  isBlockedByObstacle: boolean;
  blockerObstacle: FieldObstacle | null;
} {
  const isPlayer = owner === 'player';
  let minFwdDist = range;
  let blocker: FieldObstacle | null = null;

  for (const obs of obstacles) {
    if (!isObstacleBlockingVision(obs)) continue;

    // ユニット自身がすでにその森の中にいる場合は遮られない
    if (isPointInObstacleFootprint(x, y, obs, 1.0)) continue;

    // Y軸が障害物と交差するか（交戦幅と障害物半径）
    if (Math.abs(y - obs.y) <= obs.radiusY + engageHalfWidthY * 0.8) {
      // 障害物の手前端X
      const obsEdgeX = isPlayer
        ? obs.x - obs.radiusX * 0.95
        : obs.x + obs.radiusX * 0.95;
      const fwdDist = isPlayer ? obsEdgeX - x : x - obsEdgeX;

      // 前方にあり、射程内に障害物手前端があるか
      if (fwdDist >= 0 && fwdDist < minFwdDist) {
        minFwdDist = fwdDist;
        blocker = obs;
      }
    }
  }

  // 雲による前方視界遮断
  if (clouds && clouds.length > 0) {
    for (const cloud of clouds) {
      if (cloud.radiusX <= 0 || cloud.radiusY <= 0) continue;
      // ユニット自身がすでに雲の中にいる場合は遮られない
      if (isUnitInCloudShadow(x, y, cloud)) continue;

      if (Math.abs(y - cloud.y) <= cloud.radiusY + engageHalfWidthY * 0.8) {
        const cloudEdgeX = isPlayer
          ? cloud.x - cloud.radiusX * 0.95
          : cloud.x + cloud.radiusX * 0.95;
        const fwdDist = isPlayer ? cloudEdgeX - x : x - cloudEdgeX;

        if (fwdDist >= 0 && fwdDist < minFwdDist) {
          minFwdDist = fwdDist;
        }
      }
    }
  }

  const isBlocked = blocker !== null || minFwdDist < range;
  const effectiveRange = Math.max(0, minFwdDist);
  const reachX = isPlayer ? x + effectiveRange : x - effectiveRange;

  return {
    reachX,
    effectiveRange,
    isBlockedByObstacle: isBlocked,
    blockerObstacle: blocker,
  };
}
