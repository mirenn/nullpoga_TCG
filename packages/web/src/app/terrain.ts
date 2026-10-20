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

export interface TerrainZone {
  id: string;
  name: string;
  type: TerrainZoneType;
  x: number;       // 中心X (%)
  y: number;       // 中心Y (%)
  width: number;   // 幅 (%)
  height: number;  // 高さ (%)
  speedMultiplier: number; // 移動速度倍率
  driftY?: number; // Y方向の流速 (%/s: 正で下方向、負で上方向)
}

/** 飛行ユニット判定（地上地形の流速・減速を無視） */
export function isFlyingCard(cardNo?: number): boolean {
  return cardNo === 9 || cardNo === 11; // 9: コウモリ, 11: ドラゴン
}

/**
 * フィールド上に配置される地形ゾーン定義
 */
export const FIELD_TERRAIN_ZONES: TerrainZone[] = [
  // 1. 中央街道 (石畳の高速路: 中央レーン y=50% を加速)
  {
    id: 'terrain_highway_center',
    name: '中央街道',
    type: 'road',
    x: 50,
    y: 50,
    width: 70,
    height: 10,
    speedMultiplier: 1.35,
  },
  // 2. 北の清流 (上レーン y=20 付近から中央 y=50 側へ下向きに流れる)
  {
    id: 'terrain_river_north',
    name: '北のせせらぎ',
    type: 'river',
    x: 50,
    y: 30,
    width: 12,
    height: 24,
    speedMultiplier: 0.9,
    driftY: 9.0, // 下向きに流す（中レーンへ合流）
  },
  // 3. 南の清流 (下レーン y=80 付近から中央 y=50 側へ上向きに流れる)
  {
    id: 'terrain_river_south',
    name: '南のせせらぎ',
    type: 'river',
    x: 50,
    y: 70,
    width: 12,
    height: 24,
    speedMultiplier: 0.9,
    driftY: -9.0, // 上向きに流す（中レーンへ合流）
  },
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
