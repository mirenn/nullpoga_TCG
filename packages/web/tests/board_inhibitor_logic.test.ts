import {
  ENGAGE_HALF_WIDTH_Y,
  COLLISION_HALF_WIDTH_Y,
  SPELL_RADIUS,
  FIRE_SPELL_SPREAD_SPEED_Y,
  generateFirePillars,
  isWithinFireSpellColumn,
  calculateFireSpreadDelayMs,
  isFireWaveReached,
  isWithinMeteorRange,
  isWithinEngageY,
  isWithinCollisionY,
  isWithinEngageX,
  isWithinCollisionX,
  clampSpawnX,
  clampSpawnY,
  clampPlayerSpawnX,
  SPAWN_X_MIN,
  SPAWN_X_MAX,
  SPAWN_Y_MIN,
  SPAWN_Y_MAX,
  PLAYER_SPAWN_X_MIN,
  PLAYER_SPAWN_X_MAX,
  PLAYER_DEFAULT_SPAWN_X,
  getSpawnDepthRole,
} from '../src/app/board';
import {
  createInitialInhibitors,
  inhibitorBlocksY,
  inhibitorEngageableY,
  countDestroyedEnemyInhibitors,
  manaRegenMultiplier,
  INHIBITOR_SLOTS,
  INHIBITOR_MAX_HP,
  INHIBITOR_DESTROY_MANA_BONUS,
  PLAYER_INHIBITOR_X,
  CPU_INHIBITOR_X,
} from '../src/app/inhibitors';
import { computeCpuAction } from '../src/app/cpuAi';
import { CARD_POOL } from '../src/app/cards';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== Running Horizontal Board & Inhibitor Logic Tests ===');

// 1. Open field geometry tests
console.log('[1/4] Testing horizontal open field coordinates & geometry...');
assert(SPAWN_X_MIN === 6 && SPAWN_X_MAX === 94, 'Spawn range must be 6% to 94%');
assert(clampSpawnX(0) === SPAWN_X_MIN, 'Clamping 0% should return SPAWN_X_MIN');
assert(clampSpawnX(100) === SPAWN_X_MAX, 'Clamping 100% should return SPAWN_X_MAX');
assert(clampSpawnX(50.45) === 50.5, 'Clamping should round to 1 decimal place');

// 交戦判定テスト (Y軸・レーン)
assert(isWithinEngageY(50, 50), 'Same Y should be within engage range');
assert(isWithinEngageY(50, 50 + ENGAGE_HALF_WIDTH_Y), 'Y at boundary should be within engage');
assert(isWithinEngageY(50, 55), 'Y diff 5% should be within engage range (6.5%)');
assert(!isWithinEngageY(50, 60), 'Y diff 10% should NOT be within engage range');

// 物理衝突判定テスト (Y軸)
assert(isWithinCollisionY(50, 50), 'Same Y should collide');
assert(isWithinCollisionY(50, 54), 'Y diff 4% should collide (half width 5.0%)');
assert(!isWithinCollisionY(50, 57), 'Y diff 7% should NOT collide (past half width 5.0%)');

// 烈火の呪文（縦一列・全レーン貫通）効果範囲テスト
assert(isWithinFireSpellColumn(50, 50), 'Targeting same X should be within column range');
assert(isWithinFireSpellColumn(58, 50), 'X diff 8% should be within column range (half width 9.0%)');
assert(isWithinFireSpellColumn(42, 50), 'X diff -8% should be within column range (half width 9.0%)');
assert(!isWithinFireSpellColumn(60, 50), 'X diff 10% should NOT be within column range (half width 9.0%)');

// 烈火の呪文: 起点からの上下延焼ディレイ＆波面到達テスト (速度 60%/秒)
assert(calculateFireSpreadDelayMs(50, 50) === 0, 'Same Y should have 0ms delay (instant impact at drop point)');
// 60%/秒 = 15%につき250ms
assert(calculateFireSpreadDelayMs(50, 65) === 250, 'Distance 15% should take exactly 250ms');
assert(calculateFireSpreadDelayMs(50, 35) === 250, 'Upward distance 15% should also take exactly 250ms');
assert(calculateFireSpreadDelayMs(50, 20) === 500, 'Distance 30% should take 500ms');
// 波面到達判定 (elapsedMs)
assert(isFireWaveReached(50, 65, 250), 'At 250ms, wave should reach dist 15%');
assert(isFireWaveReached(50, 65, 300), 'At 300ms, wave should have passed dist 15%');
assert(!isFireWaveReached(50, 65, 200), 'At 200ms, wave should NOT yet reach dist 15%');
assert(isFireWaveReached(50, 20, 500), 'Upward dist 30% at 500ms should be reached');
assert(!isFireWaveReached(50, 20, 400), 'Upward dist 30% at 400ms should NOT be reached');

// 烈火の呪文: 炎の柱生成ヘルパーテスト (generateFirePillars)
const pillars = generateFirePillars(50);
assert(pillars.length >= 10, 'Should generate multiple pillars covering vertical field');
assert(pillars[0].isOrigin && pillars[0].y === 50 && pillars[0].delayMs === 0, 'First pillar should be origin with 0ms delay');
assert(pillars.every((p, idx) => idx === 0 || p.delayMs >= pillars[idx - 1].delayMs), 'Pillars should be sorted by ascending delayMs');
const hasUpperPillar = pillars.some((p) => p.y < 30);
const hasLowerPillar = pillars.some((p) => p.y > 70);
assert(hasUpperPillar && hasLowerPillar, 'Pillars should spread both upwards and downwards from origin');

// 隕石（メテオ・円形ユークリッド範囲）効果範囲テスト
assert(isWithinMeteorRange(50, 50, 50, 50), 'Same point should be within meteor range');
assert(isWithinMeteorRange(50 + SPELL_RADIUS, 50, 50, 50), 'Boundary X should be within meteor range');
assert(isWithinMeteorRange(50, 50 + SPELL_RADIUS, 50, 50), 'Boundary Y should be within meteor range');
assert(isWithinMeteorRange(50 + 9, 50 + 9, 50, 50), 'Diagonal (9,9) hypot~12.7 should be within meteor range (radius 14)');
assert(!isWithinMeteorRange(50 + 11, 50 + 11, 50, 50), 'Diagonal (11,11) hypot~15.5 should NOT be within meteor range');
console.log('  -> Horizontal coordinates & geometry & fire column & meteor: PASSED');

// 2. Inhibitor tests (Horizontal layout: Player at Left x=22, CPU at Right x=78)
console.log('[2/4] Testing horizontal inhibitor configuration & mana rewards...');
const initialInhibitors = createInitialInhibitors();
assert(initialInhibitors.length === 6, 'Should create 6 inhibitors (3 per team)');

const playerInhibitors = initialInhibitors.filter((i) => i.owner === 'player');
const cpuInhibitors = initialInhibitors.filter((i) => i.owner === 'cpu');
assert(playerInhibitors.length === 3, 'Player should have 3 inhibitors');
assert(cpuInhibitors.length === 3, 'CPU should have 3 inhibitors');

// 位置確認 (Player x=22, CPU x=78, y=[20, 50, 80])
assert(playerInhibitors.every((i) => i.x === PLAYER_INHIBITOR_X), 'Player inhibitors must be at x=22%');
assert(cpuInhibitors.every((i) => i.x === CPU_INHIBITOR_X), 'CPU inhibitors must be at x=78%');
const playerYs = playerInhibitors.map((i) => i.y).sort((a, b) => a - b);
assert(
  JSON.stringify(playerYs) === JSON.stringify([20, 50, 80]),
  'Player inhibitors should be at Y [20, 50, 80]'
);
assert(
  playerInhibitors.every((i) => i.hp === INHIBITOR_MAX_HP && i.maxHp === INHIBITOR_MAX_HP),
  'Inhibitors should have full max HP'
);

// 前進阻止判定（インヒビター正面y=20はブロック、隙間y=35は素通り）
const topInhib = playerInhibitors.find((i) => i.y === 20)!;
assert(inhibitorBlocksY(topInhib, 20), 'Unit directly in front of inhibitor (y=20%) must be blocked');
assert(inhibitorBlocksY(topInhib, 24), 'Unit near inhibitor (y=24%) must be blocked');
assert(!inhibitorBlocksY(topInhib, 35), 'Unit in the gap (y=35%) must NOT be blocked');
assert(!inhibitorBlocksY(topInhib, 50), 'Unit at center (y=50%) must NOT be blocked by top inhibitor');

// マナ回復ボーナス計算
assert(manaRegenMultiplier(initialInhibitors, 'player') === 1.0, 'Initial multiplier should be 1.0');
assert(manaRegenMultiplier(initialInhibitors, 'cpu') === 1.0, 'Initial multiplier should be 1.0');

// 敵インヒビターを1基破壊
const oneDestroyed = initialInhibitors.map((i) =>
  i.id === 'inhib_cpu_top' ? { ...i, hp: 0 } : i
);
assert(countDestroyedEnemyInhibitors(oneDestroyed, 'player') === 1, 'Player destroyed 1 CPU inhibitor');
assert(Math.abs(manaRegenMultiplier(oneDestroyed, 'player') - 1.2) < 0.001, 'Multiplier should be 1.2 (+20%)');
assert(manaRegenMultiplier(oneDestroyed, 'cpu') === 1.0, 'CPU multiplier unchanged');

// 敵インヒビターを3基全て破壊
const allCpuDestroyed = initialInhibitors.map((i) =>
  i.owner === 'cpu' ? { ...i, hp: 0 } : i
);
assert(countDestroyedEnemyInhibitors(allCpuDestroyed, 'player') === 3, 'Player destroyed 3 CPU inhibitors');
assert(Math.abs(manaRegenMultiplier(allCpuDestroyed, 'player') - 1.6) < 0.001, 'Multiplier should be 1.6 (+60%)');
console.log('  -> Inhibitor specs & rewards: PASSED');

// 3. CPU AI open field decisions
console.log('[3/4] Testing CPU AI continuous Y coordinate decisions...');
const cpuHand = [CARD_POOL[0], CARD_POOL[1]]; // ネズミ (cost 1), 柴犬 (cost 2)
const action = computeCpuAction(5, cpuHand, [], [], initialInhibitors);
assert(action !== null, 'CPU should choose an action when mana is available');
assert(action!.targetY !== undefined, 'Action should have targetY');
assert(
  action!.targetY! >= SPAWN_Y_MIN && action!.targetY! <= SPAWN_Y_MAX,
  `TargetY (${action!.targetY}) must be between ${SPAWN_Y_MIN}% and ${SPAWN_Y_MAX}%`
);
assert(action!.targetX === 95, 'CPU spawn targetX must be 95% (right edge base)');
console.log(`  -> CPU selected card "${action!.card.name}" at lane Y=${action!.targetY}% (X=95%)`);
console.log('  -> CPU AI continuous decisions: PASSED');

// 4. Horizontal depth coordinate & role classification tests
console.log('[4/4] Testing depth / horizontal coordinate ranges and roles...');
assert(PLAYER_SPAWN_X_MIN === 6 && PLAYER_SPAWN_X_MAX === 48, 'Player depth range must be 6% to 48%');
assert(PLAYER_DEFAULT_SPAWN_X === 6, 'Default spawn X must be 6%');
assert(clampPlayerSpawnX(0) === PLAYER_SPAWN_X_MIN, 'Clamping 0% (offscreen) should return PLAYER_SPAWN_X_MIN (6%)');
assert(clampPlayerSpawnX(80) === PLAYER_SPAWN_X_MAX, 'Clamping 80% (enemy area) should return PLAYER_SPAWN_X_MAX (48%)');
assert(clampPlayerSpawnX(25.45) === 25.5, 'Clamping should round to 1 decimal place');

// Role classification
assert(getSpawnDepthRole(12).key === 'rearguard' && getSpawnDepthRole(12).label === '後衛', 'X=12% should be rearguard');
assert(getSpawnDepthRole(25).key === 'midguard' && getSpawnDepthRole(25).label === '中衛', 'X=25% should be midguard');
assert(getSpawnDepthRole(42).key === 'vanguard' && getSpawnDepthRole(42).label === '前衛', 'X=42% should be vanguard');
console.log('  -> Depth & horizontal coordinates: PASSED');

console.log('=== All 4 Test Suites PASSED Successfully! ===');
