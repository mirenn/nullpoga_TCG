import * as assert from 'node:assert';
import { computeCpuLaunchAngle } from './circleCpu';
import { OMEGA } from './circlePhysics';

console.log('Testing circleCpu: finds an angle to launch');
const [tx, ty] = computeCpuLaunchAngle(100, 0, OMEGA);
assert.strictEqual(typeof tx, 'number');
assert.strictEqual(typeof ty, 'number');
console.log('  -> PASSED');
