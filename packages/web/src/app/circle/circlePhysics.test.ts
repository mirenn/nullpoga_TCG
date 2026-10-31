import * as assert from 'node:assert';
import { stepPhysics, predict, isInAttackRange, JELLYFISH_CARD_NO, CircleUnit, SPAWN, R, OMEGA, BASE_SPEED } from './circlePhysics';

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
assert.strictEqual(isInAttackRange(jelly, enemyFront), true);
assert.strictEqual(isInAttackRange(jelly, enemySide), false);
assert.strictEqual(isInAttackRange(jelly, enemyBack), false);
// isEngaged=true でも前進が止まらないことを確認
const prevY = jelly.y;
stepPhysics(jelly, 0.1, 0, 0);
assert.ok(jelly.y < prevY, 'Expected engaged unit to keep advancing');
console.log('  -> PASSED');
