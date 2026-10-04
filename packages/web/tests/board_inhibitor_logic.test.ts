import { COLUMN_COUNT, COLUMNS, ENGAGE_WIDTH, isWithinEngage, columnLabel } from '../src/app/board';
import {
  createInitialInhibitors,
  inhibitorCoversColumn,
  countDestroyedEnemyInhibitors,
  manaRegenMultiplier,
  INHIBITOR_COLUMNS,
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

console.log('=== Running Board & Inhibitor Logic Tests ===');

// 1. Board tests
console.log('[1/3] Testing board grid specifications...');
assert(COLUMN_COUNT === 9, 'COLUMN_COUNT should be 9');
assert(COLUMNS.length === 9, 'COLUMNS should contain 9 elements');
assert(COLUMNS[0] === 0 && COLUMNS[8] === 8, 'COLUMNS should range from 0 to 8');
assert(isWithinEngage(4, 4), 'Same column should be within engage');
assert(isWithinEngage(4, 3), 'Adjacent column (-1) should be within engage');
assert(isWithinEngage(4, 5), 'Adjacent column (+1) should be within engage');
assert(!isWithinEngage(4, 2), 'Column with delta 2 should NOT be within engage');
assert(!isWithinEngage(0, 8), 'Opposite ends should NOT be within engage');
assert(columnLabel(0) === '1', 'Column 0 should display as L1 or 1');
assert(columnLabel(8) === '9', 'Column 8 should display as L9 or 9');
console.log('  -> Board specs: PASSED');

// 2. Inhibitor tests
console.log('[2/3] Testing inhibitor configuration & mana rewards...');
const initialInhibitors = createInitialInhibitors();
assert(initialInhibitors.length === 6, 'Should create 6 inhibitors (3 per player)');

const playerInhibitors = initialInhibitors.filter((i) => i.owner === 'player');
const cpuInhibitors = initialInhibitors.filter((i) => i.owner === 'cpu');
assert(playerInhibitors.length === 3, 'Player should have 3 inhibitors');
assert(cpuInhibitors.length === 3, 'CPU should have 3 inhibitors');

// 位置確認 (0, 4, 8)
const playerLanes = playerInhibitors.map((i) => i.lane).sort((a, b) => a - b);
assert(
  JSON.stringify(playerLanes) === JSON.stringify([0, 4, 8]),
  'Player inhibitors should be at columns [0, 4, 8]'
);
assert(
  playerInhibitors.every((i) => i.hp === INHIBITOR_MAX_HP && i.maxHp === INHIBITOR_MAX_HP),
  'Inhibitors should have full max HP'
);

// 前進阻止判定
assert(inhibitorCoversColumn(playerInhibitors[0], 0), 'Inhibitor at 0 should cover column 0');
assert(!inhibitorCoversColumn(playerInhibitors[0], 1), 'Inhibitor at 0 should NOT cover column 1');

// マナ回復ボーナス計算
assert(manaRegenMultiplier(initialInhibitors, 'player') === 1.0, 'Initial multiplier should be 1.0');
assert(manaRegenMultiplier(initialInhibitors, 'cpu') === 1.0, 'Initial multiplier should be 1.0');

// 敵インヒビターを1つ破壊
const oneDestroyed = initialInhibitors.map((i) =>
  i.id === 'inhib_cpu_0' ? { ...i, hp: 0 } : i
);
assert(countDestroyedEnemyInhibitors(oneDestroyed, 'player') === 1, 'Player destroyed 1 CPU inhibitor');
assert(Math.abs(manaRegenMultiplier(oneDestroyed, 'player') - 1.2) < 0.001, 'Multiplier should be 1.2 (+20%)');
assert(manaRegenMultiplier(oneDestroyed, 'cpu') === 1.0, 'CPU multiplier unchanged');

// 敵インヒビターを3つ全て破壊
const allCpuDestroyed = initialInhibitors.map((i) =>
  i.owner === 'cpu' ? { ...i, hp: 0 } : i
);
assert(countDestroyedEnemyInhibitors(allCpuDestroyed, 'player') === 3, 'Player destroyed 3 CPU inhibitors');
assert(Math.abs(manaRegenMultiplier(allCpuDestroyed, 'player') - 1.6) < 0.001, 'Multiplier should be 1.6 (+60%)');
console.log('  -> Inhibitor specs & rewards: PASSED');

// 3. CPU AI tests on 9 columns
console.log('[3/3] Testing CPU AI on 9 columns with inhibitors...');
const cpuHand = [CARD_POOL[0], CARD_POOL[1]]; // ネズミ (cost 1), 柴犬 (cost 2)
const action = computeCpuAction(5, cpuHand, [], [], initialInhibitors);
assert(action !== null, 'CPU should choose an action when mana is available');
assert(action!.targetLane !== undefined, 'Monster action should have a targetLane');
assert(action!.targetLane! >= 0 && action!.targetLane! < 9, 'TargetLane must be between 0 and 8');
console.log(`  -> CPU selected card "${action!.card.name}" on lane ${action!.targetLane}`);
console.log('  -> CPU AI 9-column decisions: PASSED');

console.log('=== All 3 Test Suites PASSED Successfully! ===');
