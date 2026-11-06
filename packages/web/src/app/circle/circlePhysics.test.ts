import * as assert from 'node:assert';
import { stepPhysics, predict, isInAttackRange, getUnitTangentVelocity, getDepthScale, createCircleUnitsForSpawn, JELLYFISH_CARD_NO, RAILS, GRAVITY_WELLS, SPIKES, SPIKE_DAMAGE, SIDE_CX, SIDE_R, SIDE_GAPW, DISK_PHASES, DISK_PHASE_DURATION, getDiskPhase, RING, COOK_READY_TIME, COOK_BURN_TIME, SLINGSHOT_WHEEL_MIN, CircleUnit, SPAWN, R, OMEGA, BASE_SPEED } from './circlePhysics';

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
assert.strictEqual(u2.hp, 1, 'Plain outer wall must not damage');
console.log('  -> PASSED');

console.log('Testing circlePhysics: spiked outer wall damages on bounce');
const [spikeA] = SPIKES[0];
const spikeUnit: CircleUnit = {
  ...u2, id: 'spike1', hp: 5,
  x: Math.cos(spikeA) * 190, y: Math.sin(spikeA) * 190,
  vx: Math.cos(spikeA) * 100, vy: Math.sin(spikeA) * 100,
};
stepPhysics(spikeUnit, 0.1, 0, 0);
assert.strictEqual(spikeUnit.hp, 5 - SPIKE_DAMAGE);
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

console.log('Testing circlePhysics: depth scale shrinks toward center, expanding effective inner field');
const outerScale = getDepthScale(0, R);
const innerRingScale = getDepthScale(0, 70);
const deepCenterScale = getDepthScale(0, 15);
assert.strictEqual(outerScale, 1);
assert.ok(innerRingScale < outerScale && innerRingScale > 0.7, `Expected inner ring scale around 0.75, got ${innerRingScale}`);
assert.ok(deepCenterScale < 0.5, `Expected deep center scale < 0.5, got ${deepCenterScale}`);
const outerUnit: CircleUnit = { ...gravUnit, x: 0, y: 180, vx: 100, vy: 0, t: 5 };
const deepUnit: CircleUnit = { ...gravUnit, x: 0, y: 20, vx: 100, vy: 0, t: 5 };
const [outerVx] = getUnitTangentVelocity(outerUnit, 0);
const [deepVx] = getUnitTangentVelocity(deepUnit, 0);
assert.ok(deepVx < outerVx * 0.55, `Expected apparent velocity in deep center (${deepVx}) to be < 55% of outer rim (${outerVx})`);
console.log('  -> PASSED');

console.log('Testing circlePhysics: spawn Forest Hunter (Card 12) spawns both Hunter and vanguard Hound');
const hunterUnits = createCircleUnitsForSpawn('p', 12, 0, 0);
assert.strictEqual(hunterUnits.length, 2, 'Card 12 must spawn exactly 2 units: Hunter and Hound');
const [hunter, hound] = hunterUnits;
assert.strictEqual(hunter.cardNo, 12);
assert.strictEqual(hunter.icon, '🏹');
assert.strictEqual(hunter.hp, 4);
assert.strictEqual(hunter.attack, 2);

assert.strictEqual(hound.cardNo, 13);
assert.strictEqual(hound.icon, '🐕‍🦺');
assert.strictEqual(hound.hp, 4);
assert.strictEqual(hound.attack, 1);

// 前衛猟犬が先行して出撃し、移動速度も狩人より速いことを確認
assert.ok(hound.speed > hunter.speed, 'Hound must have faster speed than hunter');
assert.ok(hound.y < hunter.y, 'Hound must spawn ahead (closer to center y=0) when launched from player spawn');
console.log('  -> PASSED');

console.log('Testing circlePhysics: rotating slit allows side area entry only when aligned with side entrance');
const slitUnit: CircleUnit = {
  id: 'slit1', owner: 'p',
  x: R - 10, y: 10, // 右サイド入り口付近 (atan2(10, 185) ≈ 0.054)
  vx: 110, vy: 25,
  t: 5, cardNo: 1, hp: 5, maxHp: 5, attack: 1, attackInterval: 1, attackCooldown: 0, speed: 110, range: 10,
};
let enteredSide = false;
let returnedToMain = false;
let simTh = 0;
for (let i = 0; i < 240; i++) {
  simTh += OMEGA / 60;
  stepPhysics(slitUnit, 1 / 60, simTh, OMEGA);
  const d = Math.hypot(slitUnit.x, slitUnit.y);
  if (d > R + 15) enteredSide = true;
  if (enteredSide) {
    const sd = Math.hypot(slitUnit.x - SIDE_CX, slitUnit.y);
    assert.ok(sd <= SIDE_R, `Expected unit inside side pocket to stay within SIDE_R (${SIDE_R}), got ${sd}`);
    if (d < R - 10) {
      returnedToMain = true;
      break;
    }
  }
}
assert.strictEqual(enteredSide, true, 'Unit aiming at aligned rotating slit must enter side area (d > R)');
assert.strictEqual(returnedToMain, true, 'Unit in side area must bounce and return through rotating slit to main circle');

// 切れ込みが回転して斜め方向(th = π/4)に移動しているときは、右サイド正面(y=0)でも壁で跳ね返ることを確認
const closedGateUnit: CircleUnit = {
  ...slitUnit,
  id: 'closed1',
  x: R - 9,
  y: 0,
  vx: 100,
  vy: 0,
};
stepPhysics(closedGateUnit, 0.05, Math.PI / 4, 0);
assert.ok(Math.hypot(closedGateUnit.x, closedGateUnit.y) < R, 'Unit must reflect when rotating slit is away from side area');
assert.ok(closedGateUnit.vx < 0, 'Unit velocity must reflect inward when rotating slit is closed');

// 切れ込みが上下方向(th = 0 で g = π/2 の切れ込みが真下 y = R に位置)にあるとき、上下端にはサイド領域がないため飛び出さず跳ね返ることを確認
const topWallUnit: CircleUnit = {
  ...slitUnit,
  id: 'top1',
  x: 0,
  y: R - 9,
  vx: 0,
  vy: 100,
};
stepPhysics(topWallUnit, 0.05, 0, 0);
assert.ok(Math.hypot(topWallUnit.x, topWallUnit.y) < R, 'Unit must not exit at top/bottom even when rotating slit passes there');

// マウスホイールによる左右円盤の回転(sideW)でサイド領域内のユニットが回転方向へ運ばれることを確認
const sideSpinPos: CircleUnit = { ...slitUnit, id: 'spinPos', x: 240, y: 0, vx: 0, vy: 0 };
const sideSpinNeg: CircleUnit = { ...slitUnit, id: 'spinNeg', x: 240, y: 0, vx: 0, vy: 0 };
stepPhysics(sideSpinPos, 0.05, 0, 0, 2.5);
stepPhysics(sideSpinNeg, 0.05, 0, 0, -2.5);
assert.ok(sideSpinPos.y > 5, `Expected positive sideW to sweep unit downward (+y), got y=${sideSpinPos.y}`);
assert.ok(sideSpinNeg.y < -5, `Expected negative sideW to sweep unit upward (-y), got y=${sideSpinNeg.y}`);
console.log('  -> PASSED');

console.log('Testing circlePhysics: deterministic disk phase rotation and smooth transition over time');
assert.strictEqual(getDiskPhase(0), DISK_PHASES[0]);
assert.strictEqual(getDiskPhase(DISK_PHASE_DURATION + 0.1), DISK_PHASES[1]);
assert.strictEqual(getDiskPhase(DISK_PHASE_DURATION * 2 + 0.1), DISK_PHASES[2]);
assert.strictEqual(getDiskPhase(DISK_PHASE_DURATION * 3 + 0.1), DISK_PHASES[3]);
assert.strictEqual(getDiskPhase(DISK_PHASE_DURATION * DISK_PHASES.length + 0.1), DISK_PHASES[0]);
assert.ok(DISK_PHASES[2].omega < 0, 'Phase 2 must reverse rotation direction');
// 切替直前の変形期間(最後3秒)は前後のフェーズの中間値へ滑らかに補間されることを確認
const midTrans = getDiskPhase(DISK_PHASE_DURATION - 1.5);
assert.ok(midTrans.gapw > DISK_PHASES[0].gapw && midTrans.gapw < DISK_PHASES[1].gapw, 'Transition must smoothly interpolate gapw');
// Phase 0(通常: gapw=0.38)では角度0.55radの内周リング壁は閉じているが、Phase 1(大開口: gapw=0.78)では開いて通過できることを確認
const testAng = 0.55;
const ringCheckUnitP0: CircleUnit = {
  ...slitUnit,
  id: 'ringP0',
  x: Math.cos(testAng) * (RING + 4),
  y: Math.sin(testAng) * (RING + 4),
  vx: -Math.cos(testAng) * 100,
  vy: -Math.sin(testAng) * 100,
  t: 5,
};
const ringCheckUnitP1: CircleUnit = { ...ringCheckUnitP0, id: 'ringP1' };
stepPhysics(ringCheckUnitP0, 1 / 60, 0, 0, 0, DISK_PHASES[0]);
stepPhysics(ringCheckUnitP1, 1 / 60, 0, 0, 0, DISK_PHASES[1]);
assert.ok(ringCheckUnitP0.vx > 0, 'Unit must bounce off inner ring at 0.55rad during Phase 0');
assert.ok(ringCheckUnitP1.vx < 0, 'Unit must pass straight through widened inner ring gap at 0.55rad during Phase 1');
console.log('  -> PASSED');

console.log('Testing circlePhysics: side pot cooking, slingshot launch, and overheat burn');
const potUnit: CircleUnit = {
  ...slitUnit,
  id: 'pot1',
  x: R + 18,
  y: 0,
  vx: 0,
  vy: 0,
  attack: 1,
  cookTime: 0,
  isCooked: false,
};
// 1. 完熟時間までサイド鍋で調理すると isCooked=true & 攻撃力+1
stepPhysics(potUnit, COOK_READY_TIME + 0.1, Math.PI / 4, 0, 0);
assert.strictEqual(potUnit.isCooked, true, 'Unit in side pot must become cooked after COOK_READY_TIME');
assert.strictEqual(potUnit.attack, 2, 'Cooked unit must gain +1 attack');
// 2. スリットが開いている角度(th=0)でホイールを強く回すとメイン円内へスリングショット射出(vx < 0, t = 0)
stepPhysics(potUnit, 0.05, 0, 0, SLINGSHOT_WHEEL_MIN + 0.5);
assert.ok(Math.hypot(potUnit.x, potUnit.y) < R, 'Slingshot must launch unit into main circle');
assert.ok(potUnit.vx < -potUnit.speed, 'Slingshot must propel unit inward toward center hole');
assert.strictEqual(potUnit.t, 0, 'Slingshot must reset t=0 for launch boost');
// 3. サイド鍋に放置しすぎると焦げ付き(dead)
const burnUnit: CircleUnit = { ...slitUnit, id: 'burn1', x: R + 35, y: 0, vx: 0, vy: 0, cookTime: 0, isCooked: false };
const burnRes = stepPhysics(burnUnit, COOK_BURN_TIME + 0.1, Math.PI / 4, 0, 0);
assert.strictEqual(burnRes, 'dead', 'Unit left in side pot past COOK_BURN_TIME must burn and die');
console.log('  -> PASSED');
