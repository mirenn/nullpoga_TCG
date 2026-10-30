import * as assert from 'node:assert';
import { stepPhysics, CircleUnit, SPAWN, R } from './circlePhysics';

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
