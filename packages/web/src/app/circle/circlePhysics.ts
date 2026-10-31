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
 * ユニットの物理挙動を1ステップ進める
 * 交戦中(isEngaged=true)の場合は vx, vy の前進成分は0になるが、回転(ω)による流されは適用する。
 */
export function stepPhysics(u: CircleUnit, dt: number, th: number, w: number = OMEGA): StepResult {
  const x = u.x;
  const y = u.y;

  // 交戦中は前進速度(vx,vy)を無視し、回転の流され(-w*y, w*x)のみ適用する
  // 射出直後は初速ボーナスを乗せ、時間経過(u.t)とともに本来のカード速度(u.speed)へ減衰させる
  const boostScale = u.speed > 0 ? 1 + (LAUNCH_SPEED_BONUS / u.speed) * Math.exp(-u.t * LAUNCH_DECAY_RATE) : 1;
  const currentVx = u.isEngaged ? 0 : u.vx * boostScale;
  const currentVy = u.isEngaged ? 0 : u.vy * boostScale;

  u.x += (currentVx - w * y) * dt;
  u.y += (currentVy + w * x) * dt;

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
