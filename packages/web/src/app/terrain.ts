/**
 * 地形ゾーン（Terrain Zones）
 *
 * ユニットの進路（Y座標）や移動速度に影響を与え、
 * 「ただまっすぐ進むだけ」の展開に戦略的な経路選択とダイナミズムを生み出す。
 *
 * 1. 清流（River）:
 *    中央付近（x=46~54%）を流れる水流。地上ユニットをY方向（上下）へ押し流し、
 *    侵攻レーンを強制的に曲げる・合流させる。
 * 2. 街道（Road）:
 *    中央レーン（y=46~54%）の舗装路。移動速度が1.35倍に加速し、迅速な中央突破が可能。
 * 3. 泥沼（Swamp）:
 *    足を取られる湿地帯。地上ユニットの移動速度が0.5倍に低下。
 *
 * ※ コウモリ（No.9）やドラゴン（No.11）などの飛行ユニットは、川の水流や泥沼の減速を無視できる。
 */

export type TerrainZoneType = 'river' | 'road' | 'swamp';

export type FlowDir = 0 | 1 | 2 | 3;

/** 街道パネルが与える押し出し速度 (%/s)。最遅ユニット(speed2.5 → 約0.94%/s)未満にして逆流させない */
export const ROAD_PUSH = 0.8;
/** 街道パネルが時計回りに90度回る間隔 (秒) */
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
  flowDir?: FlowDir; // 街道パネルの矢印の向き（0:上 1:右 2:下 3:左）
  driftY?: number; // Y方向の流速 (%/s: 正で下方向、負で上方向)
}

/** 飛行ユニット判定（地上地形の流速・減速を無視） */
export function isFlyingCard(cardNo?: number): boolean {
  return cardNo === 9 || cardNo === 11; // 9: コウモリ, 11: ドラゴン
}

const riverPanel = (id: string, name: string, y: number, driftY: number): TerrainZone => ({
  id: `terrain_river_${id}`, name, type: 'river', x: 50, y, width: 12, height: 8, speedMultiplier: 0.9, driftY,
});

/**
 * フィールド上に配置される地形ゾーン定義
 */
export const FIELD_TERRAIN_ZONES: TerrainZone[] = [
  // 1. 中央街道: 10x10 のパネル7枚を敷き詰め、各パネルが4方向のいずれかへ微弱に押す（時計回りに自動回転）
  ...Array.from({ length: 7 }, (_, i): TerrainZone => ({
    id: `	errain_road_${i}`, name: '中央街道', type: 'road', x: 20 + i * 10, y: 50, width: 10, height: 10, speedMultiplier: 1, flowDir: (i % 4) as FlowDir,
  })),
  // 2-3. 清流: 北(y=18~42)・南(y=58~82)を各3枚のパネルに分割。クリックで流向を反転できる
  // 初期は中央 y=50 側へ合流する向き
  ...[18, 26, 34].map((top, i) => riverPanel(`north_${i}`, '北のせせらぎ', top + 4, 9.0)),
  ...[58, 66, 74].map((top, i) => riverPanel(`south_${i}`, '南のせせらぎ', top + 4, -9.0)),
  // 4. 西の泥沼 (プレイヤー側上部の湿地)
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
  // 5. 東の泥沼 (CPU側下部の湿地)
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
];

/** 指定した座標 (x, y) にある地形ゾーンを返す（複数重なる場合は最も効果の強いものを優先） */
export function getTerrainAt(
  x: number,
  y: number,
  zones: TerrainZone[] = FIELD_TERRAIN_ZONES
): TerrainZone | null {
  for (const zone of zones) {
    const halfW = zone.width / 2;
    const halfH = zone.height / 2;
    if (
      x >= zone.x - halfW &&
      x <= zone.x + halfW &&
      y >= zone.y - halfH &&
      y <= zone.y + halfH
    ) {
      return zone;
    }
  }
  return null;
}

const INITIAL_DRIFT = new Map(FIELD_TERRAIN_ZONES.map((z) => [z.id, [z.driftY, z.flowDir] as const]));

/** 川パネルの流向を反転する（エンジンは getTerrainAt 経由で毎フレーム参照するので即反映）。 */
export function toggleRiverFlow(zone: TerrainZone): void {
  if (zone.driftY) zone.driftY = -zone.driftY;
}

/** 新規ゲーム開始時に川の流向・街道パネルの向きを初期状態へ戻す。 */
export function resetRiverFlow(): void {
  roadElapsed = 0;
  for (const z of FIELD_TERRAIN_ZONES) [z.driftY, z.flowDir] = INITIAL_DRIFT.get(z.id)!;
}

/** 街道パネルが与える (dx, dy) 速度 (%/s) */
export function roadPush(zone: TerrainZone): [number, number] {
  const [vx, vy] = DIR_VEC[zone.flowDir ?? 0];
  return [vx * ROAD_PUSH, vy * ROAD_PUSH];
}

let roadElapsed = 0;
/** 街道パネルを一定時間ごとに時計回りへ回す。エンジンが毎tick呼ぶ */
export function advanceRoadRotation(dt: number): void {
  roadElapsed += dt;
  if (roadElapsed < ROAD_ROTATE_SEC) return;
  roadElapsed -= ROAD_ROTATE_SEC;
  for (const z of FIELD_TERRAIN_ZONES) if (z.type === 'road') z.flowDir = (((z.flowDir ?? 0) + 1) % 4) as FlowDir;
}
