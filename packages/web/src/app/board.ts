/**
 * 盤面（フィールド）の横方向グリッド定義
 *
 * 旧仕様: 5本の独立したレーン（同一レーン内でしか戦闘しない）
 * 新仕様: 横位置を COLUMN_COUNT 段階の「列(column)」に細分化し、
 *         横のずれが ENGAGE_WIDTH 以内の敵とは交戦する。
 *         → 2列の中間に置いて両側をカバーする／端ギリギリを抜ける、といった配置の駆け引きが生まれる。
 *
 * ※ 互換性のため Unit 等のフィールド名は `lane` のままだが、値は 0〜COLUMN_COUNT-1 の列インデックス。
 */

/** 横方向の列数 */
export const COLUMN_COUNT = 9;

/** 列インデックス一覧 [0, 1, ..., COLUMN_COUNT-1] */
export const COLUMNS: number[] = Array.from({ length: COLUMN_COUNT }, (_, i) => i);

/** 交戦判定の横幅（|列差| がこの値以下の敵ユニットを索敵・攻撃する） */
export const ENGAGE_WIDTH = 1;

/** 範囲スペル（隕石・回復・疾風）の横方向の効果幅（|列差| がこの値以下） */
export const SPELL_WIDTH = 1;

/** 列同士の描画上の隙間(px) */
export const COLUMN_GAP_PX = 3;

/** 2つの列が交戦範囲内か */
export function isWithinEngage(colA: number, colB: number, width: number = ENGAGE_WIDTH): boolean {
  return Math.abs(colA - colB) <= width;
}

/** 列のラベル（L1〜L9） */
export function columnLabel(col: number): string {
  return `${col + 1}`;
}
