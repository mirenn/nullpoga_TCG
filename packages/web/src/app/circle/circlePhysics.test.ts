import * as assert from 'node:assert';
import { stepPhysics, predict, isInAttackRange, getUnitTangentVelocity, JELLYFISH_CARD_NO, RAILS, GRAVITY_WELLS, CircleUnit, SPAWN, R, OMEGA, BASE_SPEED } from './circlePhysics';

console.log('Testing circlePhysics: shoots straight to hole when omega = 0 from gap angle');
const u1: CircleUnit = {
  id: 'test1', owner: 'p',
  x: R - 14, y: 0,
  vx: -100, vy: 0,
  t: 0, cardNo: 1, hp: 1, maxHp: 1, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 100, range: 10
};

let hitHole = false;
let th = 0;
for (let i = 0; i < 300; i++) {
  const res = stepPhysics(u1, 0.05, th, 0);
  if (res === 'hole') {
    hitHole = true;
    break;
  }
}
assert.strictEqual(hitHole, true);
console.log('  -> PASSED');

console.log('Testing circlePhysics: reflects on outer wall');
const u2: CircleUnit = {
  id: 'test2', owner: 'p',
  x: 0, y: 190,
  vx: 0, vy: 100,
  t: 0, cardNo: 1, hp: 1, maxHp: 1, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 100, range: 10
};

stepPhysics(u2, 0.1, 0, 0);
assert.ok(u2.vy < 0);
console.log('  -> PASSED');

console.log('Testing circlePhysics: slow unit launches into right side (x > 0) before rotation sweeps it');
const slowSpeed = (2.5 / 10) * BASE_SPEED; // 亀 (27.5 px/s < 回転流速 63.2 px/s)
const pred = predict(SPAWN.p[0], SPAWN.p[1], 150, 40, slowSpeed, 0, OMEGA);
const maxRightX = Math.max(...pred.pts.map((p) => p[0]));
assert.ok(maxRightX > 20, `Expected trajectory to reach right side (x > 20), got maxRightX=${maxRightX}`);
// 減衰後は回転に負けて左方向へ流されることを確認
const endX = pred.pts[pred.pts.length - 1][0];
assert.ok(endX < maxRightX, `Expected unit to be swept back by rotation after boost decays`);
console.log('  -> PASSED');

console.log('Testing circlePhysics: jellyfish rectangular forward range and non-stopping movement');
const jelly: CircleUnit = {
  id: 'jelly', owner: 'p',
  x: 0, y: 100,
  vx: 0, vy: -40, // 上向き進行
  t: 5, cardNo: JELLYFISH_CARD_NO, hp: 4, maxHp: 4, attack: 1, attackInterval: 9, attackCooldown: 2, speed: 40, range: 112,
  isEngaged: true,
};
const enemyFront: CircleUnit = { ...jelly, id: 'ef', owner: 'c', x: 15, y: 10 }; // 前方90px, 横15px (範囲内)
const enemySide: CircleUnit = { ...jelly, id: 'es', owner: 'c', x: 50, y: 80 };  // 前方20px, 横50px (横幅26px外)
const enemyBack: CircleUnit = { ...jelly, id: 'eb', owner: 'c', x: 0, y: 130 };  // 後方30px (範囲外)
assert.strictEqual(isInAttackRange(jelly, enemyFront, 0), true);
assert.strictEqual(isInAttackRange(jelly, enemySide, 0), false);
assert.strictEqual(isInAttackRange(jelly, enemyBack, 0), false);
// 回転あり(OMEGA)では軌道の接線方向(-w*yによる左向き成分が加わった斜め左上)へ探知範囲が向くことを確認
const [tvx, tvy] = getUnitTangentVelocity(jelly, OMEGA);
assert.ok(tvx < 0 && tvy < 0, 'Expected tangent velocity to curve top-left under rotation');
const tangentEnemy: CircleUnit = { ...jelly, id: 'et', owner: 'c', x: jelly.x + tvx, y: jelly.y + tvy };
assert.strictEqual(isInAttackRange(jelly, tangentEnemy, OMEGA), true);
// isEngaged=true でも前進が止まらないことを確認
const prevY = jelly.y;
stepPhysics(jelly, 0.1, 0, 0);
assert.ok(jelly.y < prevY, 'Expected engaged unit to keep advancing');
console.log('  -> PASSED');

console.log('Testing circlePhysics: rail aligns unit velocity along rail direction on contact');
const [ra1, rd1, ra2, rd2] = RAILS[0];
const rx1 = Math.cos(ra1) * rd1;
const ry1 = Math.sin(ra1) * rd1;
const rx2 = Math.cos(ra2) * rd2;
const ry2 = Math.sin(ra2) * rd2;
const rtx = (rx2 - rx1) / Math.hypot(rx2 - rx1, ry2 - ry1);
const rty = (ry2 - ry1) / Math.hypot(rx2 - rx1, ry2 - ry1);
const railUnit: CircleUnit = {
  id: 'rail1', owner: 'p',
  x: (rx1 + rx2) / 2 + 5,
  y: (ry1 + ry2) / 2,
  vx: -100, vy: 0, // レールに対して斜め・横方向から進入
  t: 3, cardNo: 1, hp: 1, maxHp: 1, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 100, range: 10,
};
stepPhysics(railUnit, 1 / 60, 0, 0);
const railSpeed = Math.hypot(railUnit.vx, railUnit.vy);
const alignDot = (railUnit.vx * rtx + railUnit.vy * rty) / railSpeed;
assert.ok(alignDot > 0.99, `Expected velocity to align with rail tangent, got dot=${alignDot}`);
assert.ok(railSpeed > 100, `Expected rail glide speed boost, got speed=${railSpeed}`);
console.log('  -> PASSED');

console.log('Testing circlePhysics: gravity well curves trajectory and applies swing-by speed boost');
const [ga, gd, gr] = GRAVITY_WELLS[0];
const gx = Math.cos(ga) * gd;
const gy = Math.sin(ga) * gd;
const gravUnit: CircleUnit = {
  id: 'grav1', owner: 'p',
  x: gx + gr * 0.6,
  y: gy + gr * 0.6,
  vx: -100, vy: 0, // 重力源の近くを通過する軌道
  t: 3, cardNo: 1, hp: 1, maxHp: 1, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 100, range: 10,
};
for (let i = 0; i < 15; i++) {
  stepPhysics(gravUnit, 1 / 60, 0, 0);
}
const afterSpeed = Math.hypot(gravUnit.vx, gravUnit.vy);
assert.ok(gravUnit.vy < -10, `Expected trajectory to bend toward gravity well (vy < -10), got vy=${gravUnit.vy}`);
assert.ok(afterSpeed > 100, `Expected swing-by speed boost (> 100), got ${afterSpeed}`);
console.log('  -> PASSED');
