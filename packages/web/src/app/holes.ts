import type { Owner, Unit } from './types';

/**
 * 得点ホール（横方向ピンボールの的）
 *
 * 両端（プレイヤーは右端=CPU陣地、CPUは左端=プレイヤー陣地）に縦5つ並ぶ。
 * 端まで到達したユニットがホールの縦範囲に入っていれば吸い込まれ、点数を得る。
 * ホール間の隙間に着いたユニットは従来どおり基地を攻撃する。
 */
export const HOLES = [
  { y: 20, points: 1 },
  { y: 35, points: 3 },
  { y: 50, points: 5 },
  { y: 65, points: 3 },
  { y: 80, points: 1 },
] as const;

export const HOLE_RADIUS_Y = 5;
/** 先にこの点数に到達した側の勝ち */
export const HOLE_WIN_SCORE = 10;

/** ホール到達ラインのx。プレイヤー(右進行)は94以上、CPU(左進行)は6以下 */
const reachedEdge = (u: Unit) => (u.owner === 'player' ? u.x >= 94 : u.x <= 6);

/** 端に着いてホールに入ったユニットを取り除き、各陣営の獲得点を返す */
export function absorbIntoHoles(units: Unit[]): { units: Unit[]; gained: Record<Owner, number> } {
  const gained: Record<Owner, number> = { player: 0, cpu: 0 };
  const remaining = units.filter((u) => {
    if (u.hp <= 0 || !reachedEdge(u)) return true;
    const hole = HOLES.find((h) => Math.abs(h.y - u.y) <= HOLE_RADIUS_Y);
    if (!hole) return true;
    gained[u.owner] += hole.points;
    return false;
  });
  return { units: remaining, gained };
}