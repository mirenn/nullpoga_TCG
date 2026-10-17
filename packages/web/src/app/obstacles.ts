import type { Owner, Unit } from './types';

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

export type ObstacleKind = 'forest' | 'rock' | 'crystal';

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
 * フィールド上の立体遮蔽物（計6箇所）
 * インヒビター（y=20, 50, 80）の間の素通り回廊（y=35, y=65）に配置し、
 * 奇襲ルートとカメラ覗き込みの駆け引きを生み出す。
 */
export const FIELD_OBSTACLES: FieldObstacle[] = [
  // 自陣側（プレイヤーが奇襲出撃バフを得られる遮蔽物）
  {
    id: 'obs_player_upper_forest',
    name: '翠緑の隠れ森',
    kind: 'forest',
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
  // 中央交戦エリア（中立の立体遮蔽物）
  {
    id: 'obs_mid_upper_forest',
    name: '迷いの大樹冠',
    kind: 'forest',
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
  // 敵陣奥（CPUの出撃予兆や忍びアサシンの出撃を隠す死角遮蔽物: x=88, radiusX=9.5 -> x=78.5〜97.5%をカバー）
  {
    id: 'obs_cpu_upper_forest',
    name: '霧隠れの古木林',
    kind: 'forest',
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
