import * as assert from 'node:assert';
import { computeCpuLaunchAngle, shouldCpuParry } from './circleCpu';
import { OMEGA, RING, CircleUnit } from './circlePhysics';

console.log('Testing circleCpu: finds an angle to launch');
const [tx, ty] = computeCpuLaunchAngle(100, 0, OMEGA);
assert.strictEqual(typeof tx, 'number');
assert.strictEqual(typeof ty, 'number');
console.log('  -> PASSED');

console.log('Testing circleCpu: shouldCpuParry triggers only when player unit approaches open inner ring gap');
const baseThreat: CircleUnit = {
  id: 'p1', owner: 'p',
  x: RING + 12, y: 0, // angle 0 (gap at th=0)
  vx: -80, vy: 0,     // moving inward toward center hole
  t: 1, cardNo: 1, hp: 3, maxHp: 3, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 80, range: 10,
};
assert.strictEqual(shouldCpuParry([baseThreat], 0), true, 'Must parry when player unit is about to enter gap');
assert.strictEqual(shouldCpuParry([baseThreat], Math.PI / 2), false, 'Must not parry when ring wall is already blocking');
assert.strictEqual(shouldCpuParry([{ ...baseThreat, vx: 80 }], 0), false, 'Must not parry when unit is moving outward');
console.log('  -> PASSED');
