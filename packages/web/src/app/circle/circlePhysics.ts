export const W = 420;
export const C = W / 2;
export const R = 195;
export const HOLE = 12;
export const RING = 70;
export const UR = 7;
export const MIN_DEPTH_SCALE = 0.35;
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
export const BUMPERS: [number, number, number][] = [[0.5, 135, 14], [0.5 + Math.PI, 135, 14]]; // [角度, 中心距離, 半径]
// レール: [始点角度, 始点距離, 終点角度, 終点距離]（当たるとレールに沿って内周側へスーッと滑走）
export const RAILS: [number, number, number, number][] = [
  [1.75, 150, 2.35, 100],
  [1.75 + Math.PI, 150, 2.35 + Math.PI, 100],
];
export const RAIL_CAPTURE_WIDTH = 9;
export const RAIL_SPEED_MULT = 1.25;
// 重力源: [角度, 中心距離, 重力圏半径]（近くを通ると重力スイングバイで軌道が曲がり加速）
export const GRAVITY_WELLS: [number, number, number][] = [
  [2.75, 135, 44],
  [2.75 + Math.PI, 135, 44],
];
export const GRAVITY_BEND_RATE = 3.2;
export const GRAVITY_BOOST_RATE = 1.4;

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
 * 中心に向かって深く（遠くに）なるすり鉢状の遠近スケール係数 (MIN_DEPTH_SCALE 〜 1.0)
 * 外周付近は手前(1.0)に見え、内周(RING〜中心HOLE)へ進むほど遠くの深い谷底へ縮小する
 */
export function getDepthScale(x: number, y: number): number {
  const ratio = Math.min(1, Math.hypot(x, y) / R);
  const curve = 1 - Math.pow(1 - ratio, 2.2);
  return MIN_DEPTH_SCALE + (1 - MIN_DEPTH_SCALE) * curve;
}

/**
 * ユニットの現在の軌道接線ベクトル (dx/dt, dy/dt) を返す
 * 自力の推進ベクトル(初速ブースト・遠近深度スケール込み)と盤面回転による流速(-w*y, w*x)の合成ベクトル
 */
export function getUnitTangentVelocity(u: CircleUnit, w: number = OMEGA): [number, number] {
  const boostScale = u.speed > 0 ? 1 + (LAUNCH_SPEED_BONUS / u.speed) * Math.exp(-u.t * LAUNCH_DECAY_RATE) : 1;
  const depthScale = getDepthScale(u.x, u.y);
  return [u.vx * boostScale * depthScale - w * u.y, u.vy * boostScale * depthScale + w * u.x];
}

/**
 * 攻撃対象 b が a の探知範囲内にいるか判定する
 * 電気クラゲ(cardNo=6)は軌道の接線方向(実際の移動方向)への長方形、それ以外は全方位円形（遠近深度スケールを反映）
 */
export function isInAttackRange(a: CircleUnit, b: CircleUnit, w: number = OMEGA): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const depthScale = getDepthScale(a.x, a.y);
  if (a.cardNo === JELLYFISH_CARD_NO) {
    const [tvx, tvy] = getUnitTangentVelocity(a, w);
    const len = Math.hypot(tvx, tvy) || 1;
    const fx = tvx / len;
    const fy = tvy / len;
    const forward = dx * fx + dy * fy;
    const lateral = Math.abs(-dx * fy + dy * fx);
    return forward >= 0 && forward <= a.range * depthScale && lateral <= JELLYFISH_HALF_WIDTH * depthScale;
  }
  return Math.hypot(dx, dy) < a.range * depthScale;
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

  const ur = UR * getDepthScale(u.x, u.y);

  // 速度ベクトルの法線成分 (反射計算用)
  const nx = u.x / d;
  const ny = u.y / d;
  const vn = u.vx * nx + u.vy * ny;

  // 外周壁の反射
  if (d > R - ur && vn > 0) {
    reflect(u, nx, ny, vn);
  }

  // リング壁(すき間あり)の反射
  if (Math.abs(d - RING) < ur) {
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
    if (dd < br + ur) {
      const mx = dx / dd;
      const my = dy / dd;
      const v2 = u.vx * mx + u.vy * my;
      if (v2 < 0) {
        reflect(u, mx, my, v2);
      }
    }
  }

  // レールの滑走判定（当たると反射せずレールに沿ってスーッと進む）
  for (const [a1, d1, a2, d2] of RAILS) {
    const x1 = Math.cos(a1 + th) * d1;
    const y1 = Math.sin(a1 + th) * d1;
    const x2 = Math.cos(a2 + th) * d2;
    const y2 = Math.sin(a2 + th) * d2;
    const rdx = x2 - x1;
    const rdy = y2 - y1;
    const rLen = Math.hypot(rdx, rdy) || 1;
    const tx = rdx / rLen;
    const ty = rdy / rLen;
    const s = (u.x - x1) * tx + (u.y - y1) * ty;
    if (s >= 0 && s <= rLen) {
      const cx = x1 + s * tx;
      const cy = y1 + s * ty;
      if (Math.hypot(u.x - cx, u.y - cy) < RAIL_CAPTURE_WIDTH + ur) {
        const dir = u.vx * tx + u.vy * ty < -u.speed * 0.25 ? -1 : 1;
        const glideSpeed = Math.max(Math.hypot(u.vx, u.vy), u.speed * RAIL_SPEED_MULT);
        u.vx = tx * dir * glideSpeed;
        u.vy = ty * dir * glideSpeed;
        u.x += (cx - u.x) * 0.35;
        u.y += (cy - u.y) * 0.35;
      }
    }
  }

  // 重力源による重力スイングバイ（軌道を中心側へ曲げつつ接近加速を残す）
  for (const [ga, gd, gr] of GRAVITY_WELLS) {
    const gx = Math.cos(ga + th) * gd;
    const gy = Math.sin(ga + th) * gd;
    const dx = gx - u.x;
    const dy = gy - u.y;
    const dg = Math.hypot(dx, dy);
    if (dg < gr && dg > 6) {
      const mx = dx / dg;
      const my = dy / dg;
      const vLen = Math.hypot(u.vx, u.vy) || 1;
      const vxUnit = u.vx / vLen;
      const vyUnit = u.vy / vLen;
      const dotV = mx * vxUnit + my * vyUnit;
      const falloff = 1 - (dg / gr) * 0.5;
      let px = mx - dotV * vxUnit;
      let py = my - dotV * vyUnit;
      if (Math.hypot(px, py) < 0.25) {
        px = -vyUnit * 0.4;
        py = vxUnit * 0.4;
      }
      const bend = vLen * GRAVITY_BEND_RATE * falloff * dt;
      const boost = u.speed * GRAVITY_BOOST_RATE * (dotV > 0 ? dotV : dotV * 0.2) * falloff * dt;
      u.vx += px * bend + vxUnit * boost;
      u.vy += py * bend + vyUnit * boost;
      const newSpeed = Math.hypot(u.vx, u.vy);
      const maxSpeed = u.speed * 1.65;
      if (newSpeed > maxSpeed) {
        u.vx = (u.vx / newSpeed) * maxSpeed;
        u.vy = (u.vy / newSpeed) * maxSpeed;
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

  for (let i = 0; i < 320; i++) {
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
