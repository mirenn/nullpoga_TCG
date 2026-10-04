import {
  ENGAGE_HALF_WIDTH_X,
  COLLISION_HALF_WIDTH_X,
  SPELL_RADIUS_X,
  isWithinEngageX,
  isWithinCollisionX,
  clampSpawnX,
  SPAWN_X_MIN,
  SPAWN_X_MAX,
} from '../src/app/board';
import {
  createInitialInhibitors,
  inhibitorBlocksX,
  inhibitorEngageableX,
  countDestroyedEnemyInhibitors,
  manaRegenMultiplier,
  INHIBITOR_SLOTS,
  INHIBITOR_MAX_HP,
  INHIBITOR_DESTROY_MANA_BONUS,
} from '../src/app/inhibitors';
import { computeCpuAction } from '../src/app/cpuAi';
import { CARD_POOL } from '../src/app/cards';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== Running Open Field & Inhibitor Logic Tests ===');

// 1. Open field geometry tests
console.log('[1/3] Testing open field continuous coordinates & geometry...');
assert(SPAWN_X_MIN === 6 && SPAWN_X_MAX === 94, 'Spawn range must be 6% to 94%');
assert(clampSpawnX(0) === SPAWN_X_MIN, 'Clamping 0% should return SPAWN_X_MIN');
assert(clampSpawnX(100) === SPAWN_X_MAX, 'Clamping 100% should return SPAWN_X_MAX');
assert(clampSpawnX(50.45) === 50.5, 'Clamping should round to 1 decimal place');

// 交戦判定テスト
assert(isWithinEngageX(50, 50), 'Same X should be within engage range');
assert(isWithinEngageX(50, 50 + ENGAGE_HALF_WIDTH_X), 'X at boundary should be within engage');
assert(isWithinEngageX(50, 55), 'X diff 5% should be within engage range (6.5%)');
assert(!isWithinEngageX(50, 60), 'X diff 10% should NOT be within engage range');

// 物理衝突判定テスト
assert(isWithinCollisionX(50, 50), 'Same X should collide');
assert(isWithinCollisionX(50, 54), 'X diff 4% should collide (half width 5.0%)');
assert(!isWithinCollisionX(50, 57), 'X diff 7% should NOT collide (past half width 5.0%)');
console.log('  -> Open field coordinates & geometry: PASSED');

// 2. Inhibitor tests
console.log('[2/3] Testing inhibitor configuration & mana rewards...');
const initialInhibitors = createInitialInhibitors();
assert(initialInhibitors.length === 6, 'Should create 6 inhibitors (3 per team)');

const playerInhibitors = initialInhibitors.filter((i) => i.owner === 'player');
const cpuInhibitors = initialInhibitors.filter((i) => i.owner === 'cpu');
assert(playerInhibitors.length === 3, 'Player should have 3 inhibitors');
assert(cpuInhibitors.length === 3, 'CPU should have 3 inhibitors');

// 位置確認 (x = 18%, 50%, 82%)
const playerXs = playerInhibitors.map((i) => i.x).sort((a, b) => a - b);
assert(
  JSON.stringify(playerXs) === JSON.stringify([18, 50, 82]),
  'Player inhibitors should be at X [18, 50, 82]'
);
assert(
  playerInhibitors.every((i) => i.hp === INHIBITOR_MAX_HP && i.maxHp === INHIBITOR_MAX_HP),
  'Inhibitors should have full max HP'
);

// 前進阻止判定（インヒビター正面はブロック、隙間は素通り）
const leftInhib = playerInhibitors.find((i) => i.x === 18)!;
assert(inhibitorBlocksX(leftInhib, 18), 'Unit directly in front of inhibitor (x=18%) must be blocked');
assert(inhibitorBlocksX(leftInhib, 22), 'Unit near inhibitor (x=22%) must be blocked');
assert(!inhibitorBlocksX(leftInhib, 34), 'Unit in the gap (x=34%) must NOT be blocked');
assert(!inhibitorBlocksX(leftInhib, 50), 'Unit at center (x=50%) must NOT be blocked by left inhibitor');

// マナ回復ボーナス計算
assert(manaRegenMultiplier(initialInhibitors, 'player') === 1.0, 'Initial multiplier should be 1.0');
assert(manaRegenMultiplier(initialInhibitors, 'cpu') === 1.0, 'Initial multiplier should be 1.0');

// 敵インヒビターを1基破壊
const oneDestroyed = initialInhibitors.map((i) =>
  i.id === 'inhib_cpu_left' ? { ...i, hp: 0 } : i
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
console.log('[3/3] Testing CPU AI continuous X coordinate decisions...');
const cpuHand = [CARD_POOL[0], CARD_POOL[1]]; // ネズミ (cost 1), 柴犬 (cost 2)
const action = computeCpuAction(5, cpuHand, [], [], initialInhibitors);
assert(action !== null, 'CPU should choose an action when mana is available');
assert(action!.targetX !== undefined, 'Action should have targetX');
assert(
  action!.targetX! >= SPAWN_X_MIN && action!.targetX! <= SPAWN_X_MAX,
  `TargetX (${action!.targetX}) must be between ${SPAWN_X_MIN}% and ${SPAWN_X_MAX}%`
);
console.log(`  -> CPU selected card "${action!.card.name}" at X=${action!.targetX}%`);
console.log('  -> CPU AI continuous X decisions: PASSED');

console.log('=== All 3 Test Suites PASSED Successfully! ===');
