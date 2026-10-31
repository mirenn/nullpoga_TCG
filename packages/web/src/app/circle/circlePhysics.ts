export const W = 420;
export const C = W / 2;
export const R = 195;
export const HOLE = 18;
export const RING = 70;
export const UR = 7;
// SPEED scalar reference from prototype. We will scale card speed using this.
export const BASE_SPEED = 110;
// 射出時の初速ボーナスと減衰率（外周の回転流速を突破して狙った方向へ飛び出し、減速後は回転に流される）
export const LAUNCH_SPEED_BONUS = 200;
export const LAUNCH_DECAY_RATE = 1.4;
export const JELLYFISH_CARD_NO = 6;
export const JELLYFISH_HALF_WIDTH = 26; // 通常モードの ENGAGE_HALF_WIDTH_Y(6.5) * 4
export const TAU = Math.PI * 2;
export const GAPS = [0, Math.PI];
export const GAPW = 0.38;
export const BUMPERS: [number, number, number][] = [[0.5, 135, 14], [2.6, 135, 14], [4.7, 135, 14]]; // [角度, 中心距離, 半径]

export const SPAWN: Record<'p' | 'c', [number, number]> = {
  p: [0, R - 14],
  c: [0, -(R - 14)],
};

// 回転速度 (20度/s)
export const OMEGA = (20 * Math.PI) / 180;
export const MAX_SCORE = 10;

export interface CircleUnit {
  id: string;
  owner: 'p' | 'c';
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number; // lifetime

  // Game stats
  cardNo: number;
  hp: number;
  maxHp: number;
  attack: number;
  attackInterval: number;
  attackCooldown: number;
  speed: number;
  range: number;

  isDead?: boolean;
  isEngaged?: boolean;
  attackAnimUntil?: number;
}

export const rot = (x: number, y: number, a: number): [number, number] => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];

export const angDiff = (a: number, b: number): number => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export const reflect = (u: CircleUnit, nx: number, ny: number, vn: number) => {
  u.vx -= 2 * vn * nx;
  u.vy -= 2 * vn * ny;
};

export type StepResult = 'hole' | 'dead' | null;

/**
 * ユニットの現在の軌道接線ベクトル (dx/dt, dy/dt) を返す
 * 自力の推進ベクトル(初速ブースト込み)と盤面回転による流速(-w*y, w*x)の合成ベクトル
 */
export function getUnitTangentVelocity(u: CircleUnit, w: number = OMEGA): [number, number] {
  const boostScale = u.speed > 0 ? 1 + (LAUNCH_SPEED_BONUS / u.speed) * Math.exp(-u.t * LAUNCH_DECAY_RATE) : 1;
  return [u.vx * boostScale - w * u.y, u.vy * boostScale + w * u.x];
}

/**
 * 攻撃対象 b が a の探知範囲内にいるか判定する
 * 電気クラゲ(cardNo=6)は軌道の接線方向(実際の移動方向)への長方形、それ以外は全方位円形
 */
export function isInAttackRange(a: CircleUnit, b: CircleUnit, w: number = OMEGA): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (a.cardNo === JELLYFISH_CARD_NO) {
    const [tvx, tvy] = getUnitTangentVelocity(a, w);
    const len = Math.hypot(tvx, tvy) || 1;
    const fx = tvx / len;
    const fy = tvy / len;
    const forward = dx * fx + dy * fy;
    const lateral = Math.abs(-dx * fy + dy * fx);
    return forward >= 0 && forward <= a.range && lateral <= JELLYFISH_HALF_WIDTH;
  }
  return Math.hypot(dx, dy) < a.range;
}

/**
 * ユニットの物理挙動を1ステップ進める
 */
export function stepPhysics(u: CircleUnit, dt: number, th: number, w: number = OMEGA): StepResult {
  const [tvx, tvy] = getUnitTangentVelocity(u, w);
  u.x += tvx * dt;
  u.y += tvy * dt;

  const d = Math.hypot(u.x, u.y);
  if (d < HOLE) return 'hole';

  // 速度ベクトルの法線成分 (反射計算用)
  const nx = u.x / d;
  const ny = u.y / d;
  const vn = u.vx * nx + u.vy * ny;

  // 外周壁の反射
  if (d > R - UR && vn > 0) {
    reflect(u, nx, ny, vn);
  }

  // リング壁(すき間あり)の反射
  if (Math.abs(d - RING) < UR) {
    const a = Math.atan2(u.y, u.x) - th;
    if (!GAPS.some((g) => Math.abs(angDiff(a, g)) < GAPW) && vn * (d - RING) < 0) {
      reflect(u, nx, ny, vn);
    }
  }

  // バンパーの反射
  for (const [ba, bd, br] of BUMPERS) {
    const dx = u.x - Math.cos(ba + th) * bd;
    const dy = u.y - Math.sin(ba + th) * bd;
    const dd = Math.hypot(dx, dy);
    if (dd < br + UR) {
      const mx = dx / dd;
      const my = dy / dd;
      const v2 = u.vx * mx + u.vy * my;
      if (v2 < 0) {
        reflect(u, mx, my, v2);
      }
    }
  }

  u.t += dt;
  // プロトタイプでは14秒で消滅する処理があったが、今回は不要かもしれない？とりあえず残すか長くする
  if (u.t > 30) return 'dead';

  return null;
}

export function predict(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  speed: number,
  currentTheta: number,
  w: number = OMEGA
): { pts: [number, number][]; hit: boolean } {
  const l = Math.hypot(targetX - startX, targetY - startY) || 1;
  const vx = ((targetX - startX) / l) * speed;
  const vy = ((targetY - startY) / l) * speed;

  const u: CircleUnit = {
    id: 'pred', owner: 'p',
    x: startX, y: startY, vx, vy, t: 0,
    cardNo: 0, hp: 1, maxHp: 1, attack: 0, attackInterval: 1, attackCooldown: 0, speed, range: 0
  };

  const pts: [number, number][] = [[u.x, u.y]];
  let th = currentTheta;
  let hit = false;

  for (let i = 0; i < 240; i++) {
    th += w / 60;
    const r = stepPhysics(u, 1 / 60, th, w);
    pts.push([u.x, u.y]);
    if (r) {
      hit = r === 'hole';
      break;
    }
  }

  return { pts, hit };
}
