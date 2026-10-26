/**
 * 地形ゾーン（Terrain Zones）
 *
 * ユニットの進路（X/Y座標）や移動速度に影響を与え、
 * 「横方向ピンボール」の盤面を作る。
 *
 * 1. 矢印タイル（Road）:
 *    レーンの間(y=35/65)の要所6枚に菱形タイルを置く（画面上でほぼ正方形）。各タイルが上下左右いずれかへ
 *    ユニットを押し、一定時間ごとに時計回りに回る。クリックでも回せる。
 * 2. 泥沼（Swamp）:
 *    タイルの上に重なる湿地帯。地上ユニットの移動速度を0.5倍に低下させる（タイルより優先）。
 *
 * ※ コウモリ（No.9）やドラゴン（No.11）などの飛行ユニットは、泥沼の減速を無視できる。
 */

export type TerrainZoneType = 'road' | 'swamp';

export type FlowDir = 0 | 1 | 2 | 3;

/** タイルの左右の押し出し速度 (%/s)。最遅ユニット(speed2.5 → 約0.94%/s)は逆向きの矢印で押し戻される */
export const ROAD_PUSH = 1.5;
/** 上下は進行方向(X)と直交し逆流しないので強め */
export const ROAD_PUSH_Y = 5;
/** タイルが時計回りに90度回る間隔 (秒) */
export const ROAD_ROTATE_SEC = 8;
const DIR_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

export interface TerrainZone {
  id: string;
  name: string;
  type: TerrainZoneType;
  x: number;       // 中心X (%)
  y: number;       // 中心Y (%)
  width: number;   // 幅 (%)
  height: number;  // 高さ (%)
  speedMultiplier: number; // 移動速度倍率
  flowDir?: FlowDir; // タイルの矢印の向き（0:上 1:右 2:下 3:左）
  spin?: number; // 矢印の累積回転角(度)。3→0 で逆回りに見えないための表示用
}

/** 飛行ユニット判定（地上地形の減速を無視） */
export function isFlyingCard(cardNo?: number): boolean {
  return cardNo === 9 || cardNo === 11; // 9: コウモリ, 11: ドラゴン
}

/**
 * フィールド上に配置される地形ゾーン定義
 * ※ getTerrainAt は先頭から検索するので、泥沼をタイルより前に置いて優先させる
 */
export const FIELD_TERRAIN_ZONES: TerrainZone[] = [
  // 1. 西の泥沼 (プレイヤー側上部の湿地)
  {
    id: 'terrain_swamp_west',
    name: '北西の沼地',
    type: 'swamp',
    x: 28,
    y: 22,
    width: 14,
    height: 16,
    speedMultiplier: 0.5,
  },
  // 2. 東の泥沼 (CPU側下部の湿地)
  {
    id: 'terrain_swamp_east',
    name: '南東の沼地',
    type: 'swamp',
    x: 72,
    y: 78,
    width: 14,
    height: 16,
    speedMultiplier: 0.5,
  },
  // 3. 矢印タイル: レーン間(y=35/65)の要所6枚だけに置く菱形。上下向きならレーン乗り換え、左右向きなら加速/押し戻し
  // shortcut: フィールドの縦横比を約1.75:1(デスクトップ実測)と仮定して縦を1.75倍にし正方形に見せる。画面比が大きく変わるなら実測値で描画側を補正する
  ...[-1, 0, 1].flatMap((col) => [-1, 1].map((row) => [col, row])).map(([col, row]): TerrainZone => {
    return {
      id: `terrain_tile_${row}_${col}`,
      name: '矢印タイル',
      type: 'road',
      x: 50 + col * 25,
      y: 50 + row * 15,
      width: 20, // 菱形の対角線の長さ（外接矩形）
      height: 35,
      speedMultiplier: 1,
      flowDir: (((col + row) % 4 + 4) % 4) as FlowDir,
    };
  }),
];

/** 指定した座標 (x, y) にある地形ゾーンを返す（複数重なる場合は配列の先頭側を優先） */
export function getTerrainAt(
  x: number,
  y: number,
  zones: TerrainZone[] = FIELD_TERRAIN_ZONES
): TerrainZone | null {
  for (const zone of zones) {
    const halfW = zone.width / 2;
    const halfH = zone.height / 2;
    const dx = Math.abs(x - zone.x);
    const dy = Math.abs(y - zone.y);
    // 矢印タイルは菱形（|dx|/halfW + |dy|/halfH <= 1）、それ以外は矩形
    if (zone.type === 'road' ? dx / halfW + dy / halfH <= 1 : dx <= halfW && dy <= halfH) {
      return zone;
    }
  }
  return null;
}

const INITIAL_FLOW = new Map(FIELD_TERRAIN_ZONES.map((z) => [z.id, z.flowDir]));

/** 新規ゲーム開始時にタイルの向きと回転タイマーを初期状態へ戻す。 */
export function resetRoadFlow(): void {
  roadElapsed = 0;
  for (const z of FIELD_TERRAIN_ZONES) {
    z.flowDir = INITIAL_FLOW.get(z.id);
    z.spin = undefined;
  }
}

/** 1歩の長さ (移動距離 %)。この距離ごとに右足・左足が入れ替わる */
export const FOOT_STEP = 3;
/** 足の位置の重心からの横ずれ (%)。タイルの境目を歩かせると左右の足で踏むタイルが変わる */
export const FOOT_OFFSET_Y = 2.5;

/**
 * 今踏んでいる足のY方向オフセット (%)。最初の一歩は右足。進行方向(player:右/cpu:左)に対し
 * 右足は画面下(player)・上(cpu)側。
 */
export function footOffsetY(distance: number, owner: 'player' | 'cpu'): number {
  const right = Math.floor(distance / FOOT_STEP) % 2 === 0;
  return (right === (owner === 'player') ? 1 : -1) * FOOT_OFFSET_Y;
}

/** タイルが与える (dx, dy) 速度 (%/s) */
export function roadPush(zone: TerrainZone): [number, number] {
  const [vx, vy] = DIR_VEC[zone.flowDir ?? 0];
  return [vx * ROAD_PUSH, vy * ROAD_PUSH_Y];
}

/** タイルを時計回りに90度回す（自動回転・クリック共通）。 */
export function turnRoadPanel(zone: TerrainZone): void {
  zone.spin = (zone.spin ?? (zone.flowDir ?? 0) * 90) + 90;
  zone.flowDir = (((zone.flowDir ?? 0) + 1) % 4) as FlowDir;
}

let roadElapsed = 0;
/** タイルを一定時間ごとに時計回りへ回す。エンジンが毎tick呼ぶ */
export function advanceRoadRotation(dt: number): void {
  roadElapsed += dt;
  if (roadElapsed < ROAD_ROTATE_SEC) return;
  roadElapsed -= ROAD_ROTATE_SEC;
  for (const z of FIELD_TERRAIN_ZONES) if (z.type === 'road') turnRoadPanel(z);
}

/** 現在の回転周期の経過秒数 (0 ~ ROAD_ROTATE_SEC) */
export function getRoadElapsed(): number {
  return roadElapsed;
}

/** 次回自動回転までの残り秒数 */
export function getRoadNextRotateIn(): number {
  return Math.max(0, ROAD_ROTATE_SEC - roadElapsed);
}

/** 現在の回転周期の進捗率 (0.0 ~ 1.0) */
export function getRoadProgress(): number {
  return Math.min(1, Math.max(0, roadElapsed / ROAD_ROTATE_SEC));
}