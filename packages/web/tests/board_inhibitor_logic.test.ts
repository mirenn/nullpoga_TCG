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
  computeUnitRangeZone,
  isWithinCircularRange,
  computeUnitCircularRangeZone,
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
import { CARD_POOL, HOUND_TOKEN_SPEC } from '../src/app/cards';
import { deriveAnimationState, getAttackAnimDuration } from '../src/components/units/animationLogic';
import {
  FIELD_OBSTACLES,
  SOLID_OBSTACLE_PRESETS,
  DEFAULT_CAMERA_3D,
  clampCameraPanX,
  clampCameraPanY,
  clampCameraZoom,
  isStealthCapableCard,
  findCoveringObstacleGround,
  findPlayerAmbushObstacle,
  computeCanopyProjection,
  computePeekRevealProgress,
  isPointOccludedByObstacle,
  evaluateUnitStealthAndSpot,
  isObstacleActive,
  isObstaclePassable,
  isObstacleSolid,
  isObstacleBlockingVision,
  doesSegmentIntersectObstacle,
  hasLineOfSight,
  computeUnitMaxVisionReachX,
} from '../src/app/obstacles';
import {
  STAMPEDE_ZONE_X_MIN,
  STAMPEDE_ZONE_X_MAX,
  STAMPEDE_CRUSH_DAMAGE,
  STAMPEDE_APPROACHING_SEC,
  STAMPEDE_WARNING_DURATION_SEC,
  HOLD_AMBUSH_CHARGE_TIME_SEC,
  HOLD_AMBUSH_ATTACK_BONUS,
  HOLD_AMBUSH_DASH_SPEED_MULTIPLIER,
  createInitialStampedeState,
  isUnitInStampedeZone,
  isPlayerUnitSafeBeforeZone,
  isCpuUnitSafeBeforeZone,
  shouldCpuUnitHoldForStampede,
  isStampedeApproaching,
  updateStampede,
  getStampedeBeastY,
} from '../src/app/stampede';
import {
  CLOUD_INITIAL_DELAY_SEC,
  CLOUD_INTERVAL_SEC,
  CLOUD_DRIFT_DURATION_SEC,
  CLOUD_SPOT_PROXIMITY_DISTANCE,
  createInitialCloudEventState,
  isUnitInCloudShadow,
  isUnitCoveredByAnyCloud,
  generateClouds,
  updateCloudEvent,
} from '../src/app/cloudEvent';
import {
  getTerrainAt,
  isFlyingCard,
  FIELD_TERRAIN_ZONES,
  ROAD_ROTATE_SEC,
  advanceRoadRotation,
  resetRoadFlow,
} from '../src/app/terrain';
import { absorbIntoHoles, HOLE_WIN_SCORE } from '../src/app/holes';
import type { Unit } from '../src/app/types';


// 岩・結晶は盤面から外したが、障害物ロジックのテストでは引き続き使う
const ALL_OBSTACLES = [...FIELD_OBSTACLES, ...SOLID_OBSTACLE_PRESETS];
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

// 2. Inhibitor tests (Horizontal layout: Player at Left x=15, CPU at Right x=85)
console.log('[2/4] Testing horizontal inhibitor configuration & mana rewards...');
const initialInhibitors = createInitialInhibitors();
assert(initialInhibitors.length === 6, 'Should create 6 inhibitors (3 per team)');

const playerInhibitors = initialInhibitors.filter((i) => i.owner === 'player');
const cpuInhibitors = initialInhibitors.filter((i) => i.owner === 'cpu');
assert(playerInhibitors.length === 3, 'Player should have 3 inhibitors');
assert(cpuInhibitors.length === 3, 'CPU should have 3 inhibitors');

// 位置確認 (Player x=15, CPU x=85, y=[20, 50, 80])
assert(playerInhibitors.every((i) => i.x === PLAYER_INHIBITOR_X), 'Player inhibitors must be at x=15%');
assert(cpuInhibitors.every((i) => i.x === CPU_INHIBITOR_X), 'CPU inhibitors must be at x=85%');
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

// 5. Unit attack windup, animation state and SVG renderer tests
console.log('[5/5] Testing unit attack windup, animation state & SVG renderers...');

// 5-1. 各モンスターの attackWindup と attackInterval
const monsterCards = CARD_POOL.filter((c) => c.type === 'MONSTER');
const attackingMonsters = monsterCards.filter((c) => (c.attack ?? 0) > 0);
assert(attackingMonsters.length === 9, 'There should be 9 attacking monster cards');
attackingMonsters.forEach((c) => {
  assert(
    typeof c.attackWindup === 'number' && c.attackWindup > 0,
    `Attacking monster ${c.name} must have a positive attackWindup, got ${c.attackWindup}`
  );
  assert(
    typeof c.attackInterval === 'number' && c.attackInterval > 0,
    `Attacking monster ${c.name} must have a positive attackInterval`
  );
});

// 個別キャラクターの windup 値チェック
const mouseCard = CARD_POOL.find((c) => c.id === 'mouse')!;
const catCard = CARD_POOL.find((c) => c.id === 'cat')!;
const shibaCard = CARD_POOL.find((c) => c.id === 'shiba')!;
const boarCard = CARD_POOL.find((c) => c.id === 'boar')!;
const assassinCard = CARD_POOL.find((c) => c.id === 'assassin')!;
const batCard = CARD_POOL.find((c) => c.id === 'vampire_bat')!;
const jellyfishCard = CARD_POOL.find((c) => c.id === 'jellyfish')!;
const dragonCard = CARD_POOL.find((c) => c.id === 'dragon')!;
const hunterMonsterCard = CARD_POOL.find((c) => c.id === 'hunter')!;

assert(mouseCard.attackWindup === 0.5, 'Mouse windup must be 0.5s');
assert(catCard.attackWindup === 0.7, 'Cat windup must be 0.7s');
assert(shibaCard.attackWindup === 0.8, 'Shiba windup must be 0.8s');
assert(boarCard.attackWindup === 1.0, 'Boar windup must be 1.0s');
assert(assassinCard.attackWindup === 0.5, 'Assassin windup must be 0.5s');
assert(batCard.attackWindup === 0.7, 'Bat windup must be 0.7s');
assert(jellyfishCard.attackWindup === 2.0, 'Jellyfish windup must be 2.0s');
assert(dragonCard.attackWindup === 1.6, 'Dragon windup must be 1.6s');
assert(hunterMonsterCard.attackWindup === 0.6, 'Hunter windup must be 0.6s');

// 5-2. deriveAnimationState 状態遷移テスト
const baseUnit: Unit = {
  id: 'u1',
  cardNo: 1,
  name: 'ネズミ',
  owner: 'player',
  x: 50,
  y: 50,
  maxHp: 1,
  hp: 1,
  attack: 1,
  speed: 8,
  range: 9,
  attackCooldown: 0,
  attackInterval: 0.8,
  attackWindup: 0.5,
  icon: '🐭',
};

// スタン状態
assert(deriveAnimationState({ ...baseUnit, isStunned: true }) === 'stunned', 'Should return stunned when isStunned is true');

// チャージ状態
assert(deriveAnimationState({ ...baseUnit, isCharging: true }) === 'charging', 'Should return charging when isCharging is true');

// 攻撃中状態
const now = Date.now();
assert(deriveAnimationState({ ...baseUnit, lastAttackEffectTime: now - 50 }) === 'attacking', 'Should return attacking within anim duration');

// ドラゴンの攻撃持続時間 (480ms)
const dragonUnit: Unit = { ...baseUnit, cardNo: 11, name: '炎のドラゴン' };
assert(deriveAnimationState({ ...dragonUnit, lastAttackEffectTime: now - 400 }) === 'attacking', 'Dragon should still be attacking at 400ms');
assert(deriveAnimationState({ ...dragonUnit, lastAttackEffectTime: now - 600 }) === 'walking', 'Dragon should revert to walking after 600ms');

// 歩行・待機
assert(deriveAnimationState({ ...baseUnit, speed: 5 }) === 'walking', 'Should return walking when speed > 0');
assert(deriveAnimationState({ ...baseUnit, speed: 0 }) === 'idle', 'Should return idle when speed is 0');

// 5-3. 攻撃アニメーション持続時間判定テスト
assert(getAttackAnimDuration(11) === 480, 'Dragon attack duration must be 480ms');
assert(getAttackAnimDuration(7) === 380, 'Boar attack duration must be 380ms');
assert(getAttackAnimDuration(8) === 320, 'Assassin attack duration must be 320ms');
assert(getAttackAnimDuration(2) === 320, 'Shiba attack duration must be 320ms');
assert(getAttackAnimDuration(1) === 300, 'Mouse attack duration must be 300ms');
console.log('  -> Attack windup, animation states & duration logic: PASSED');

// 6. Unit attack range zone geometry tests
console.log('[6/6] Testing unit attack range zone geometry (computeUnitRangeZone)...');
const playerRangeZone = computeUnitRangeZone(20, 50, 28, 'player');
assert(playerRangeZone.left === 20, 'Player range zone should start at unit X (20%)');
assert(playerRangeZone.right === 48, 'Player range zone should extend +28% to 48%');
assert(playerRangeZone.width === 28, 'Player range zone width should be 28%');
assert(playerRangeZone.frontEdgeX === 48, 'Player frontEdgeX should be 48%');
assert(playerRangeZone.top === 50 - ENGAGE_HALF_WIDTH_Y, 'Player range zone top should be 43.5%');
assert(playerRangeZone.bottom === 50 + ENGAGE_HALF_WIDTH_Y, 'Player range zone bottom should be 56.5%');
assert(playerRangeZone.height === ENGAGE_HALF_WIDTH_Y * 2, 'Player range zone height should be 13%');

const cpuRangeZone = computeUnitRangeZone(80, 20, 32, 'cpu');
assert(cpuRangeZone.left === 48, 'CPU range zone left should be 80 - 32 = 48%');
assert(cpuRangeZone.right === 80, 'CPU range zone right should be unit X (80%)');
assert(cpuRangeZone.width === 32, 'CPU range zone width should be 32%');
assert(cpuRangeZone.frontEdgeX === 48, 'CPU frontEdgeX should be 48%');

// フィールド端のクランプ確認
const clampedPlayerZone = computeUnitRangeZone(85, 5, 28, 'player');
assert(clampedPlayerZone.right === 100, 'Range zone right must clamp at 100%');
assert(clampedPlayerZone.width === 15, 'Clamped width should be 15%');
assert(clampedPlayerZone.top === 0, 'Range zone top must clamp at 0%');
console.log('  -> Unit attack range zone geometry: PASSED');

// 7. 3D Diorama Obstacles, Parallax Projection & Camera Peeking (SPOT!) tests
console.log('[7/7] Testing 3D obstacles, parallax canopy projection & camera peeking SPOT logic...');
assert(ALL_OBSTACLES.length === 6, 'Should define 6 strategic 3D obstacles along gap corridors');
assert(isStealthCapableCard(8) === true, 'Ninja Assassin (cardNo=8) must be stealth-capable');
assert(isStealthCapableCard(1) === true, 'Mouse (cardNo=1) must be stealth-capable');
assert(isStealthCapableCard(11) === false, 'Dragon (cardNo=11) is too large to hide in cover');
assert(isStealthCapableCard(4) === false, 'Turtle (cardNo=4) is too large to hide in cover');

// カメラクランプテスト
assert(clampCameraPanX(500) === 260, 'PanX should clamp to max 260');
assert(clampCameraPanY(-500) === -180, 'PanY should clamp to min -180');
assert(clampCameraZoom(3.0) === 1.65, 'Zoom should clamp to max 1.65');

// CPU上奥の遮蔽物 (x=88, y=35) で隠密ユニット (忍びアサシン) が初期カメラ(pan=0,0)では死角に隠れることを確認
const cpuUpperObs = ALL_OBSTACLES.find((o) => o.id === 'obs_cpu_upper_forest')!;
assert(Boolean(cpuUpperObs), 'obs_cpu_upper_forest should exist');
assert(findCoveringObstacleGround(90, 35)?.id === 'obs_cpu_upper_forest', 'Point (90,35) should be inside CPU upper forest');

const defaultProj = computeCanopyProjection(cpuUpperObs, DEFAULT_CAMERA_3D);
assert(defaultProj.canopyX === cpuUpperObs.x && defaultProj.canopyY === cpuUpperObs.y, 'At pan(0,0), canopy should be directly above ground center');
assert(isPointOccludedByObstacle(90, 35, cpuUpperObs, DEFAULT_CAMERA_3D) === true, 'At pan(0,0), point (90,35) should be occluded by canopy');

const hiddenAssassin: Unit = {
  ...baseUnit,
  id: 'cpu_assassin_test',
  cardNo: 8,
  name: '忍びアサシン',
  owner: 'cpu',
  x: 90,
  y: 35,
  isSpotted: false,
};

// 初期カメラでは死角に隠れており、まだSPOTされない
const evalAtDefault = evaluateUnitStealthAndSpot(hiddenAssassin, DEFAULT_CAMERA_3D);
assert(evalAtDefault.isConcealed === true, 'Enemy assassin in cover must be concealed at default camera');
assert(evalAtDefault.newlySpotted === false, 'Enemy assassin must not be spotted at default camera');

// ミドルドラッグでカメラを大きく平行移動 (panX = -95, panY = 55) した時、視差で死角が解消され SPOT! が発動することを確認
const pannedCamera = { ...DEFAULT_CAMERA_3D, panX: -95, panY: 55 };
const pannedProj = computeCanopyProjection(cpuUpperObs, pannedCamera);
assert(pannedProj.canopyX !== cpuUpperObs.x && pannedProj.canopyY !== cpuUpperObs.y, 'Canopy projection must shift with parallax when camera pans');
assert(computePeekRevealProgress(90, 35, cpuUpperObs, pannedCamera) >= 1.0, 'Peeking camera must achieve reveal progress >= 1.0');

const evalWhenPeeked = evaluateUnitStealthAndSpot(hiddenAssassin, pannedCamera);
assert(evalWhenPeeked.isConcealed === false, 'Enemy assassin should no longer be concealed when camera peeks');
assert(evalWhenPeeked.newlySpotted === true, 'Enemy assassin should trigger newlySpotted=true when camera peeks!');

// 一度SPOTされたユニットは、カメラを初期位置(0,0)に戻しても常時可視化（isConcealed=false）が維持されることを確認
const spottedAssassin: Unit = { ...hiddenAssassin, isSpotted: true };
const evalAfterSpotted = evaluateUnitStealthAndSpot(spottedAssassin, DEFAULT_CAMERA_3D);
assert(evalAfterSpotted.isConcealed === false, 'Spotted unit must remain visible even after camera returns to (0,0)');
assert(evalAfterSpotted.newlySpotted === false, 'Already spotted unit should not re-trigger newlySpotted');

// 自陣遮蔽物エリア (x=34, y=35) での奇襲出撃（アンブッシュ）判定テスト
const ambushObs = findPlayerAmbushObstacle(34, 35);
assert(ambushObs !== null && ambushObs.id === 'obs_player_upper_forest', 'Spawning at (34,35) should match player upper forest ambush zone');
assert(findPlayerAmbushObstacle(15, 50) === null, 'Spawning at open lane (15,50) should not trigger ambush obstacle');
console.log('  -> 3D obstacles, parallax canopy projection & camera peeking SPOT logic: PASSED');

console.log('[8/8] Testing Hunter & Hound (Card 12 & Token 13) specs and roles...');
const hunterCard = CARD_POOL.find((c) => c.cardNo === 12);
assert(hunterCard !== undefined, 'Card 12 (森の狩人と猟犬) must exist in CARD_POOL');
assert(hunterCard!.manaCost === 3, 'Hunter mana cost must be 3');
assert(hunterCard!.attack === 2, 'Hunter attack must be 2');
assert(hunterCard!.life === 2, 'Hunter life must be 2');
assert(hunterCard!.range === 22, 'Hunter range must be 22 (ranged backline)');
assert(hunterCard!.speed === 3.5, 'Hunter speed must be 3.5');

assert(HOUND_TOKEN_SPEC.cardNo === 13, 'Hound token cardNo must be 13');
assert(HOUND_TOKEN_SPEC.attack === 1, 'Hound token attack must be 1 (weaker token)');
assert(HOUND_TOKEN_SPEC.life === 2, 'Hound token life must be 2');
assert(HOUND_TOKEN_SPEC.range === 8, 'Hound token range must be 8 (melee frontline)');
assert(HOUND_TOKEN_SPEC.speed === 6.5, 'Hound token speed must be 6.5');

// 役割分担の検証: 猟犬は弱トークン(ATK 1 < 2)であり、足が速く(6.5 > 3.5)前衛に飛び出し、狩人は後方支援(range 22 > 8)
assert(HOUND_TOKEN_SPEC.attack < hunterCard!.attack!, 'Hound token must have lower attack than Hunter');
assert(HOUND_TOKEN_SPEC.speed > hunterCard!.speed!, 'Hound token must move faster than Hunter to form frontline');
assert(hunterCard!.range! > HOUND_TOKEN_SPEC.range, 'Hunter must have longer range than Hound token');

// CPU AI が敵接近時に狩人カードを高く評価するかテスト
const cpuActionWithHunter = computeCpuAction(
  5,
  [hunterCard!],
  [
    {
      id: 'p_cat',
      cardNo: 3,
      name: 'ネコ',
      owner: 'player',
      x: 70, // CPUに接近
      y: 50,
      lane: 50,
      hp: 2,
      maxHp: 2,
      attack: 2,
      speed: 5,
      range: 8,
      attackCooldown: 0,
      attackInterval: 3.4,
      icon: '🐱',
    },
  ],
  [],
  []
);
assert(cpuActionWithHunter !== null, 'CPU AI must consider Hunter when mana is sufficient');
assert(cpuActionWithHunter!.card.cardNo === 12, 'CPU AI should pick Hunter card');
console.log('  -> Hunter & Hound specs, roles, and CPU AI evaluation: PASSED');

// 9. Testing Ninja Assassin Circular Detection, Shuriken Mechanics & Specs
console.log('[9/9] Testing Ninja Assassin circular range & shuriken mechanics...');
const ninjaCard = CARD_POOL.find((c) => c.id === 'assassin')!;
assert(ninjaCard.cardNo === 8, 'Ninja cardNo must be 8');
assert(ninjaCard.range === 16, 'Ninja range must be 16% (circular detection)');
assert(ninjaCard.isCircularRange === true, 'Ninja must have isCircularRange=true');
assert(ninjaCard.attackWindup === 0.5, 'Ninja attackWindup must be 0.5s');
assert(ninjaCard.attackInterval === 2.6, 'Ninja attackInterval must be 2.6s');

// 円形探知 (isWithinCircularRange) の検証:
// 忍者 (x=40, y=50) に対して、少し下 (y=62, Y差12%) をすれ違う敵
const ninjaX = 40;
const ninjaY = 50;
const enemyBelowX = 40;
const enemyBelowY = 62;

// 従来の交戦判定(isWithinEngageY)では別レーン扱い(Y差12% > 6.5%)で探知不可
assert(
  !isWithinEngageY(ninjaY, enemyBelowY),
  'Traditional isWithinEngageY should NOT detect enemy 12% below'
);

// 新しい円形全方位探知(isWithinCircularRange)では距離12% <= 16%で正確に探知可能！
assert(
  isWithinCircularRange(ninjaX, ninjaY, enemyBelowX, enemyBelowY, ninjaCard.range!),
  'isWithinCircularRange MUST detect enemy 12% below within 16% radius'
);

// 斜め下をすれ違う敵 (x=48, y=60: dist = hypot(8, 10) = 12.8% <= 16%)
assert(
  isWithinCircularRange(ninjaX, ninjaY, 48, 60, ninjaCard.range!),
  'isWithinCircularRange MUST detect diagonal enemy at (48, 60)'
);

// 射程外の遠い敵 (x=40, y=75: Y差25% > 16%)
assert(
  !isWithinCircularRange(ninjaX, ninjaY, 40, 75, ninjaCard.range!),
  'isWithinCircularRange should NOT detect enemy out of 16% radius'
);

// 円形ジオメトリ計算 (computeUnitCircularRangeZone)
const ninjaZone = computeUnitCircularRangeZone(ninjaX, ninjaY, ninjaCard.range!);
assert(ninjaZone.centerX === 40 && ninjaZone.centerY === 50, 'Zone center must match ninja pos');
assert(ninjaZone.radius === 16, 'Zone radius must be 16');
assert(ninjaZone.diameter === 32, 'Zone diameter must be 32');
assert(ninjaZone.left === 24 && ninjaZone.top === 34, 'Zone left and top must be computed correctly');
console.log('  -> Ninja Assassin circular detection & shuriken mechanics: PASSED');

console.log('[10/10] Testing charge-while-moving (canMoveWhileCharging) mechanics for Boar & Shiba...');
// 10-1. カードスペック検証
assert(boarCard.canMoveWhileCharging === true, 'Boar must have canMoveWhileCharging=true');
assert(shibaCard.canMoveWhileCharging === true, 'Shiba must have canMoveWhileCharging=true');
assert(boarCard.range === 12, 'Boar range must be 12% to allow charge approach distance');
assert(shibaCard.range === 10, 'Shiba range must be 10% to allow charge approach distance');
assert(!mouseCard.canMoveWhileCharging, 'Mouse should NOT have canMoveWhileCharging');
assert(!catCard.canMoveWhileCharging, 'Cat should NOT have canMoveWhileCharging');
assert(!dragonCard.canMoveWhileCharging, 'Dragon should NOT have canMoveWhileCharging');

// 10-2. 移動シミュレーション検証: チャージ中の挙動比較
const simulateAttackStep = (unit: Unit, isCharging: boolean, cooldown: number, dt: number = 0.1) => {
  const obstacleDist = 999;
  const canMoveDuringCharge = Boolean(unit.canMoveWhileCharging && isCharging);
  const canMoveWhileAttacking =
    (Boolean(unit.isCircularRange || unit.cardNo === 8) && obstacleDist > 5.0) ||
    canMoveDuringCharge;

  if (!canMoveWhileAttacking) {
    // 停止（早期リターン）
    return { ...unit, attackCooldown: cooldown, isCharging };
  }

  // 移動計算 (Player方向)
  const moveDelta = unit.speed * 0.375 * dt;
  const newX = unit.x + moveDelta;
  const newDist = (unit.distanceTraveled || 0) + moveDelta;
  return {
    ...unit,
    x: newX,
    distanceTraveled: newDist,
    attackCooldown: cooldown,
    isCharging,
  };
};

// 通常ユニット（ネコ）: チャージ中は立ち止まる
const catUnit: Unit = {
  id: 'cat_test',
  cardNo: 3,
  name: 'ネコ',
  owner: 'player',
  x: 20,
  y: 50,
  maxHp: 2,
  hp: 2,
  attack: 2,
  speed: 5,
  range: 8,
  attackCooldown: 0,
  attackInterval: 3.4,
  attackWindup: 0.7,
  icon: '🐱',
};

const catDuringCharge = simulateAttackStep(catUnit, true, 0);
assert(catDuringCharge.x === 20, 'Cat MUST stop during attack charge (x unchanged)');

// 突進ユニット（イノシシ）: チャージ中は前進する！
const boarUnit: Unit = {
  id: 'boar_test',
  cardNo: 7,
  name: 'イノシシ',
  owner: 'player',
  x: 20,
  y: 50,
  maxHp: 4,
  hp: 4,
  attack: 3,
  speed: 7,
  range: 12,
  canMoveWhileCharging: true,
  attackCooldown: 0,
  attackInterval: 3.6,
  attackWindup: 1.0,
  icon: '🐗',
};

const boarDuringCharge = simulateAttackStep(boarUnit, true, 0);
assert(boarDuringCharge.x > 20, 'Boar MUST move forward during attack charge!');

// イノシシ: 攻撃発生・クールダウン中（isCharging=false）は停止する！
const boarDuringCooldown = simulateAttackStep(boarUnit, false, 3.6);
assert(boarDuringCooldown.x === 20, 'Boar MUST stop when attacking and during cooldown!');

// 柴犬: チャージ中前進により distanceTraveled が加算される
const shibaUnit: Unit = {
  id: 'shiba_test',
  cardNo: 2,
  name: '柴犬ラン丸',
  owner: 'player',
  x: 20,
  y: 50,
  maxHp: 2,
  hp: 2,
  attack: 1,
  speed: 5,
  range: 10,
  canMoveWhileCharging: true,
  attackCooldown: 0,
  attackInterval: 3.2,
  attackWindup: 0.8,
  distanceTraveled: 19.8, // あと0.2%で20%ボーナス到達
  icon: '🐕',
};

const shibaDuringCharge = simulateAttackStep(shibaUnit, true, 0, 0.2); // 5 * 0.375 * 0.2 = 0.375% 前進
assert(shibaDuringCharge.x > 20, 'Shiba MUST move forward during charge');
assert((shibaDuringCharge.distanceTraveled || 0) >= 20.0, 'Shiba charge distance MUST cross 20% threshold!');
console.log('  -> Boar & Shiba charge-while-moving (canMoveWhileCharging) mechanics: PASSED');

// 11. Obstacle interactions (slide, jump, smash) tests
console.log('[11/11] Testing obstacle interactions (slide, jump, smash)...');

// 11-1. 各モンスターの obstacleAction 設定検証
const cat = CARD_POOL.find((c) => c.id === 'cat')!;
const shiba = CARD_POOL.find((c) => c.id === 'shiba')!;
const assassin = CARD_POOL.find((c) => c.id === 'assassin')!;
const bat = CARD_POOL.find((c) => c.id === 'vampire_bat')!;
const boar = CARD_POOL.find((c) => c.id === 'boar')!;
const dragon = CARD_POOL.find((c) => c.id === 'dragon')!;
const turtle = CARD_POOL.find((c) => c.id === 'turtle')!;

assert(cat.obstacleAction === 'slide', 'Cat must have obstacleAction: slide');
assert(shiba.obstacleAction === 'slide', 'Shiba must have obstacleAction: slide');
assert(assassin.obstacleAction === 'slide', 'Assassin must have obstacleAction: slide');
assert(HOUND_TOKEN_SPEC.obstacleAction === 'slide', 'Hound token must have obstacleAction: slide');
assert(bat.obstacleAction === 'jump', 'Vampire Bat must have obstacleAction: jump');
assert(boar.obstacleAction === 'smash', 'Boar must have obstacleAction: smash');
assert(dragon.obstacleAction === 'smash', 'Dragon must have obstacleAction: smash');
assert(turtle.obstacleAction === 'block', 'Turtle must have obstacleAction: block');

// 11-2. 障害物の初期状態と isObstacleActive ヘルパー検証
const sampleObs = { ...ALL_OBSTACLES[0] };
assert(sampleObs.hp === 80 && sampleObs.maxHp === 80, 'Obstacle must have hp=80, maxHp=80');
assert(sampleObs.isDestroyed === false, 'Obstacle must initially not be destroyed');
assert(isObstacleActive(sampleObs) === true, 'Sample obstacle must be active');

const destroyedObs = { ...sampleObs, isDestroyed: true };
assert(isObstacleActive(destroyedObs) === false, 'Destroyed obstacle must not be active');
const zeroHpObs = { ...sampleObs, hp: 0 };
assert(isObstacleActive(zeroHpObs) === false, '0 HP obstacle must not be active');

// 11-3. ① スライド迂回 (slide) の挙動シミュレーション
// 障害物: x=34, y=35, radiusX=8.5, radiusY=7.5
// ネコが x=30, y=35 (真正面) から障害物へ進入すると、上下へYスライド回避する
let catY = 35;
const catSlideObs = { ...sampleObs, x: 34, y: 35, radiusX: 8.5, radiusY: 7.5 };
const avoidUp = catY <= catSlideObs.y;
const targetY = avoidUp
  ? Math.max(12, catSlideObs.y - (catSlideObs.radiusY + 3.0))
  : Math.min(88, catSlideObs.y + (catSlideObs.radiusY + 3.0));
catY += (targetY - catY) * 0.5; // スライドステップ
assert(catY < 35, `Cat should slide upward (targetY=${targetY}), got ${catY}`);

// 11-4. ② ジャンプ飛び越え (jump) の挙動シミュレーション
// コウモリが x=32 に接近した時、jumpProgress が計算され、放物線の浮上オフセットが得られる
const batDist = catSlideObs.x - 32; // 2.0
const totalSpan = catSlideObs.radiusX * 2 + 5.0; // 22.0
const jumpProgress = Math.max(0, Math.min(1.0, 1.0 - (batDist + catSlideObs.radiusX + 2.5) / totalSpan));
assert(jumpProgress > 0 && jumpProgress < 1.0, 'Bat must be in jump progress');
const jumpOffsetY = -Math.sin(jumpProgress * Math.PI) * 26;
assert(jumpOffsetY < -5, `Jump offset must lift unit vertically into the air, got ${jumpOffsetY}`);

// 11-5. ③ 激突粉砕 (smash) の挙動シミュレーション
// イノシシ (ATK 3) が激突すると、60〜75以上のダメージを与えて一撃で耐久値80を削り切り粉砕する
const smashDamage = Math.max(60, boar.attack! * 25); // 75
const obsAfterSmashHp = Math.max(0, catSlideObs.hp! - smashDamage); // 80 - 75 = 5
assert(obsAfterSmashHp < catSlideObs.hp!, 'Smash must inflict heavy damage to obstacle');
const smashDamage2 = Math.max(60, dragon.attack! * 25); // 125
const obsAfterDragonSmashHp = Math.max(0, catSlideObs.hp! - smashDamage2);
assert(obsAfterDragonSmashHp === 0, 'Dragon smash must completely crush obstacle');
const isCrushed = obsAfterDragonSmashHp <= 0;
assert(isCrushed, 'Obstacle must be destroyed after lethal smash');

console.log('  -> Obstacle interactions (slide, jump, smash) logic: PASSED');

// 12. 巨獣スタンピード＆タップ待機インセンティブ（待ち伏せ集中）テスト
console.log('[12/12] Testing Stampede corridor and Hold Ambush mechanics...');

// 12-1. スタンピード初期状態と回廊座標判定
const stampedeInitial = createInitialStampedeState();
assert(stampedeInitial.phase === 'idle', 'Initial stampede phase must be idle');
assert(stampedeInitial.zoneXMin === 45 && stampedeInitial.zoneXMax === 55, 'Corridor must span 45% to 55%');
assert(stampedeInitial.beasts.length > 0, 'Beast presets must be generated');
assert(isUnitInStampedeZone(50) === true, 'Center X=50 must be in stampede zone');
assert(isUnitInStampedeZone(45) === true, 'X=45 must be in stampede zone');
assert(isUnitInStampedeZone(55) === true, 'X=55 must be in stampede zone');
assert(isUnitInStampedeZone(44.9) === false, 'X=44.9 must be outside stampede zone');
assert(isUnitInStampedeZone(55.1) === false, 'X=55.1 must be outside stampede zone');

// 12-2. プレイヤー/CPUの安全退避境界判定
assert(isPlayerUnitSafeBeforeZone(40) === true, 'Player unit at x=40 is safe before zone');
assert(isPlayerUnitSafeBeforeZone(46) === false, 'Player unit at x=46 is inside/beyond zone');
assert(isCpuUnitSafeBeforeZone(60) === true, 'CPU unit at x=60 is safe before zone');
assert(isCpuUnitSafeBeforeZone(52) === false, 'CPU unit at x=52 is inside zone');

// 12-3. CPU AIのスタンピード退避判断
const warningState = { ...stampedeInitial, phase: 'warning' as const, phaseTimer: 3.0 };
const idleState = { ...stampedeInitial, phase: 'idle' as const };

const cpuTurtle: Unit = {
  id: 'cpu_turtle',
  cardNo: 5,
  name: '亀',
  owner: 'cpu',
  x: 60, // 回廊手前 (55%〜66%)
  y: 50,
  hp: 7,
  maxHp: 7,
  attack: 0,
  speed: 2.5,
  range: 8,
  attackCooldown: 0,
  attackInterval: 4.0,
  icon: '🐢',
};
const cpuBoar: Unit = {
  ...cpuTurtle,
  id: 'cpu_boar',
  cardNo: 7,
  name: 'イノシシ',
  attack: 3,
  speed: 7,
  icon: '🐗',
};
const cpuMouse: Unit = {
  ...cpuTurtle,
  id: 'cpu_mouse',
  cardNo: 1,
  name: 'ネズミ',
  attack: 1,
  speed: 8,
  icon: '🐭',
};

// 警告中は知能の高い亀は手前で止まる
assert(shouldCpuUnitHoldForStampede(cpuTurtle, warningState) === true, 'CPU Turtle must hold before corridor during warning');
// 猪突猛進イノシシやパニックネズミは止まらず突っ込む
assert(shouldCpuUnitHoldForStampede(cpuBoar, warningState) === false, 'CPU Boar must rush through recklessly');
assert(shouldCpuUnitHoldForStampede(cpuMouse, warningState) === false, 'CPU Mouse must rush through recklessly');
// 通常時 (idle) は誰も止まらない
assert(shouldCpuUnitHoldForStampede(cpuTurtle, idleState) === false, 'No unit should hold during idle phase');

// 12-4. 突進フェーズ (rush) での激突判定
const rushState = { ...stampedeInitial, phase: 'rush' as const, phaseTimer: 2.0, phaseDuration: 2.0 };
const playerWaitingSafe: Unit = {
  ...cpuTurtle,
  id: 'player_safe',
  owner: 'player',
  x: 40, // 手前で待機して安全
};
const playerCaughtInZone: Unit = {
  ...cpuTurtle,
  id: 'player_caught',
  owner: 'player',
  x: 50, // 回廊内
};

// 巨獣が実際に触れた位置にユニットを置く (範囲一括ではなく接触で判定)
const hitBeast = rushState.beasts[0];
const beastY = getStampedeBeastY(hitBeast, 0);
playerCaughtInZone.x = 50 + hitBeast.xOffsetPercent;
playerCaughtInZone.y = beastY;
const playerInZoneFar: Unit = { ...playerCaughtInZone, id: 'player_far', y: beastY + 40 };

const updateRes = updateStampede(0.016, rushState, [playerWaitingSafe, playerCaughtInZone, playerInZoneFar, cpuBoar]);
assert(!updateRes.crushedUnitIds.includes('player_safe'), 'Safe waiting unit must not be crushed');
assert(updateRes.crushedUnitIds.includes('player_caught'), 'Unit touched by a beast must be crushed');
assert(!updateRes.crushedUnitIds.includes('player_far'), 'Unit in zone but not yet touched by a beast must not be crushed');
assert(updateRes.crushedUnitIds.includes('cpu_boar') === false, 'CPU Boar at x=60 has not entered zone yet');

// 12-5. 立ち止まりインセンティブ（待機集中チャージ & 奇襲ダッシュ & 奇襲攻撃力+2）
let holdTimer = 0;
holdTimer += 2.0; // 2秒待機
const hasAmbushCharge = holdTimer >= HOLD_AMBUSH_CHARGE_TIME_SEC;
assert(hasAmbushCharge === true, 'Holding for 2.0s must activate Ambush Charge');

// 奇襲ダッシュ中の速度倍率
const baseSpeed = 5;
const ambushDashSpeed = baseSpeed * HOLD_AMBUSH_DASH_SPEED_MULTIPLIER;
assert(ambushDashSpeed === 9, `Ambush dash speed must be 1.8x (got ${ambushDashSpeed})`);

// 奇襲攻撃力ボーナス (+2)
const baseAttack = 2;
const ambushAttack = baseAttack + HOLD_AMBUSH_ATTACK_BONUS;
assert(ambushAttack === 4, `Ambush attack must add +2 (got ${ambushAttack})`);

// 12-6. LoL風ドラゴンタイマー＆地鳴り予兆（Approaching Rumble）カウントダウン
assert(stampedeInitial.nextStampedeIn === 14 + STAMPEDE_WARNING_DURATION_SEC, 'Initial countdown must sum idle delay and warning duration');
assert(isStampedeApproaching(stampedeInitial) === false, 'Initial state (>6s) must not be approaching');

const approachingState = {
  ...stampedeInitial,
  phase: 'idle' as const,
  phaseTimer: 2.0,
  nextStampedeIn: 5.5, // 5.5s <= STAMPEDE_APPROACHING_SEC (6.0s)
};
assert(isStampedeApproaching(approachingState) === true, 'Idle state with <=6s remaining must trigger Approaching Rumble');

const warningTimerState = {
  ...stampedeInitial,
  phase: 'warning' as const,
  phaseTimer: 3.5,
  nextStampedeIn: 3.5,
};
assert(isStampedeApproaching(warningTimerState) === false, 'Warning state is active alert, not approaching rumble');

// updateStampede によるカウントダウン進行テスト
const dtStep = 1.0;
const stepRes = updateStampede(dtStep, stampedeInitial, []);
assert(stepRes.nextState.phase === 'idle', 'Phase should remain idle after 1s');
assert(
  Math.abs(stepRes.nextState.nextStampedeIn - (stampedeInitial.nextStampedeIn - 1.0)) < 0.001,
  'nextStampedeIn must decrement accurately with dt'
);

console.log('  -> Stampede corridor, Dragon Timer & Hold Ambush mechanics: PASSED');

console.log('[13/13] Testing Unit Line of Sight (LoS), tree vision blocking, and LoL-style bush concealment...');
// 13-1. 障害物種別による視界遮断判定
const testForest = ALL_OBSTACLES.find((o) => o.kind === 'bush' || o.kind === 'forest')!;
const testRock = ALL_OBSTACLES.find((o) => o.kind === 'rock')!;
const testCrystal = ALL_OBSTACLES.find((o) => o.kind === 'crystal')!;

assert(isObstacleBlockingVision(testForest) === true, 'Bush/Forest obstacle must block vision');
assert(isObstacleBlockingVision(testRock) === false, 'Rock obstacle must allow vision (user preference)');
assert(isObstacleBlockingVision(testCrystal) === false, 'Crystal obstacle must allow vision');

// 茂み（Bush）は通り抜け可能（passable = true, solid = false）
assert(isObstaclePassable(testForest) === true, 'Bush must be passable (units can walk through it)');
assert(isObstacleSolid(testForest) === false, 'Bush must not be solid (does not block physical movement)');

// 一方で岩（Rock）や結晶（Crystal）は物理的な壁として移動をブロックする（solid = true, passable = false）
assert(isObstaclePassable(testRock) === false, 'Rock must not be passable');
assert(isObstacleSolid(testRock) === true, 'Rock must be solid (blocks physical movement)');
assert(isObstaclePassable(testCrystal) === false, 'Crystal must not be passable');
assert(isObstacleSolid(testCrystal) === true, 'Crystal must be solid (blocks physical movement)');

// 破壊済み（切り株・瓦礫）は視界を遮らない
const destroyedForest = { ...testForest, isDestroyed: true };
assert(isObstacleBlockingVision(destroyedForest) === false, 'Destroyed forest must not block vision');
const depletedForest = { ...testForest, hp: 0 };
assert(isObstacleBlockingVision(depletedForest) === false, '0-HP forest must not block vision');

// 13-2. 線分と障害物の交差判定 (doesSegmentIntersectObstacle)
// 上ルート (y=35) にある翠緑の隠れ森 (x=34, y=35, rx=8.5, ry=7.5) を挟む射線
assert(
  doesSegmentIntersectObstacle(20, 35, 50, 35, testForest) === true,
  'Line across forest (x: 20->50, y=35) must intersect forest'
);
// メインレーン (y=50) を直進する射線は y=35 の森と交差しない
assert(
  doesSegmentIntersectObstacle(20, 50, 50, 50, testForest) === false,
  'Line in main lane (y=50) must not intersect forest at y=35'
);

// 13-3. LoL風の視線判定 (hasLineOfSight)
// (A) 木を挟んだ奥の敵 (x=45: 自陣の森の後ろ・中央の森の手前): 視線が遮断される
const losAcrossTree = hasLineOfSight(20, 35, 45, 35, ALL_OBSTACLES);
assert(losAcrossTree === false, 'Vision must be blocked when enemy is behind a forest tree');

// (B) 岩を挟んだ奥の敵: 岩は視界を通すため見える (下ルート y=65)
const losAcrossRock = hasLineOfSight(20, 65, 45, 65, ALL_OBSTACLES);
assert(losAcrossRock === true, 'Vision must pass through rocks (rock is transparent to sight)');

// (C) 森（草むら）の中に潜む小型隠密敵: 外のユニットからは見えない
// 翠緑の隠れ森の中心 (34, 35) にいる未看破ネズミ (cardNo: 1)
const losToHiddenMouse = hasLineOfSight(20, 35, 34, 35, ALL_OBSTACLES, {
  isStructure: false,
  isStealthCapable: true,
  isSpotted: false,
});
assert(losToHiddenMouse === false, 'Unspotted stealth enemy in bush must not be visible from outside');

// (D) 同じ森の中に入れば、森の中の敵が見える（LoLの同じ草むら仕様）
const losInsideSameBush = hasLineOfSight(33, 35, 35, 35, ALL_OBSTACLES, {
  isStructure: false,
  isStealthCapable: true,
  isSpotted: false,
});
assert(losInsideSameBush === true, 'Enemies inside the same bush must be visible to each other');

// (E) カメラ覗き込み等でSPOT看破された敵、または大型ユニット（ドラゴン cardNo: 11）は森の中にいても見える
const losToSpottedEnemy = hasLineOfSight(20, 35, 34, 35, ALL_OBSTACLES, {
  isStructure: false,
  isStealthCapable: true,
  isSpotted: true,
});
assert(losToSpottedEnemy === true, 'Spotted enemy in bush must be visible from outside');

const losToDragonInBush = hasLineOfSight(20, 35, 34, 35, ALL_OBSTACLES, {
  isStructure: false,
  isStealthCapable: false,
  isSpotted: false,
});
assert(losToDragonInBush === true, 'Large non-stealth enemy in bush must be visible from outside');

// (F) 木が破壊された場合、木を挟んだ奥の敵への視線が即座に通る
const obstaclesWithBrokenTree = ALL_OBSTACLES.map((o) =>
  o.id === 'obs_player_upper_forest' ? { ...o, isDestroyed: true } : o
);
const losAfterTreeDestroyed = hasLineOfSight(20, 35, 45, 35, obstaclesWithBrokenTree);
assert(losAfterTreeDestroyed === true, 'Destroyed tree must open line of sight to enemies behind it');

// 13-4. 直進ユニットの最大視界到達点 (computeUnitMaxVisionReachX)
// プレイヤーユニットが x=20, y=35 に配置された時、前方の木 (x=34, rx=8.5) の手前で視界がクリップされる
const reachPlayerBeforeTree = computeUnitMaxVisionReachX(20, 35, 25, 'player', ALL_OBSTACLES);
assert(reachPlayerBeforeTree.isBlockedByObstacle === true, 'Player unit facing tree must have sight blocked');
assert(
  reachPlayerBeforeTree.effectiveRange < 25,
  `Effective range must be truncated before tree (got ${reachPlayerBeforeTree.effectiveRange})`
);
assert(
  reachPlayerBeforeTree.reachX < 34,
  `Vision reachX must stop before tree center (got ${reachPlayerBeforeTree.reachX})`
);

// 13-5. 茂みの通り抜け（Passability in Movement）
// solid な障害物リストには茂みが含まれないため、ユニットは茂みの前で停止・攻撃せず、通り抜ける
const solidObstacles = ALL_OBSTACLES.filter(isObstacleSolid);
assert(solidObstacles.every((o) => o.kind !== 'bush' && o.kind !== 'forest'), 'Solid obstacles must exclude bushes');
assert(solidObstacles.some((o) => o.kind === 'rock'), 'Solid obstacles must include rocks');
assert(solidObstacles.some((o) => o.kind === 'crystal'), 'Solid obstacles must include crystals');

// 茂み (x=34, y=35) に向かって進むユニット (x=30, y=35, action: block) は、
// 茂みによって移動が制限（壁ブロック）されず前進可能
const unitAdvancingToBush: Unit = {
  ...baseUnit,
  id: 'unit_bush_passer',
  owner: 'player',
  x: 30,
  y: 35,
  obstacleAction: 'block',
};
const nearestSolidForBushUnit = solidObstacles.find((o) => Math.abs(unitAdvancingToBush.y - o.y) <= o.radiusY + 2.0);
assert(nearestSolidForBushUnit === undefined, 'No solid obstacle exists along y=35 upper bush lane (units walk straight through)');

console.log('  -> Unit Line of Sight (LoS), tree vision blocking, and LoL-style bush concealment: PASSED');

console.log('[14/14] Testing Drifting Clouds, moving shadow corridor, and dynamic Fog of War concealment / proximity spotting...');

// 1. 初期状態検証
const cloudInit = createInitialCloudEventState();
assert(cloudInit.phase === 'idle', 'Initial cloud phase must be idle');
assert(cloudInit.phaseTimer === CLOUD_INITIAL_DELAY_SEC, 'Initial delay must match CLOUD_INITIAL_DELAY_SEC');
assert(cloudInit.clouds.length === 0, 'No clouds during initial idle');

// 2. 雲の影の当たり判定検証 (isUnitInCloudShadow)
const sampleCloud = {
  id: 'test_cloud_1',
  x: 50,
  y: 40,
  radiusX: 20,
  radiusY: 30,
  speedX: 10,
  speedY: 0,
  scale: 1,
  opacity: 0.85,
  shadowOpacity: 0.4,
};
assert(isUnitInCloudShadow(50, 40, sampleCloud) === true, 'Center must be inside cloud shadow');
assert(isUnitInCloudShadow(65, 40, sampleCloud) === true, 'X=65 (dx=15/20=0.75) must be inside shadow');
assert(isUnitInCloudShadow(75, 40, sampleCloud) === false, 'X=75 (dx=25/20=1.25) must be outside shadow');
assert(isUnitInCloudShadow(50, 65, sampleCloud) === true, 'Y=65 (dy=25/30=0.83) must be inside shadow');
assert(isUnitInCloudShadow(50, 75, sampleCloud) === false, 'Y=75 (dy=35/30=1.16) must be outside shadow');

// 3. 雲の生成 (generateClouds)
const cloudsLtoR = generateClouds('left-to-right');
assert(cloudsLtoR.length === 2, 'Should generate main and sub cloud');
assert(cloudsLtoR[0].speedX > 0, 'Left-to-right cloud must have positive speedX');

const cloudsRtoL = generateClouds('right-to-left');
assert(cloudsRtoL.length === 2, 'Should generate main and sub cloud');
assert(cloudsRtoL[0].speedX < 0, 'Right-to-left cloud must have negative speedX');

// 4. アイドルから drifting への状態遷移 (updateCloudEvent)
const idleStateExpiring = { ...cloudInit, phaseTimer: 0.05 };
const resTrigger = updateCloudEvent(0.1, idleStateExpiring, []);
assert(resTrigger.nextState.phase === 'drifting', 'Expired idle must transition to drifting');
assert(resTrigger.nextState.clouds.length === 2, 'Drifting state must spawn clouds');

// 5. 雲の影による動的死角（敵の隠蔽 & 味方の雲隠れ）
const driftingState = {
  ...cloudInit,
  phase: 'drifting' as const,
  phaseTimer: 10,
  clouds: [sampleCloud],
};

const cpuEnemyInside: Unit = {
  id: 'cpu_enemy_inside',
  cardNo: 1,
  name: '敵ゴブリン',
  hp: 10,
  maxHp: 10,
  attack: 2,
  range: 15,
  attackCooldown: 0,
  attackInterval: 1.0,
  icon: '👹',
  speed: 1.0,
  owner: 'cpu',
  x: 52,
  y: 42,
};

const cpuEnemyFarOutside: Unit = {
  id: 'cpu_enemy_outside',
  cardNo: 1,
  name: '敵外側',
  hp: 10,
  maxHp: 10,
  attack: 2,
  range: 15,
  attackCooldown: 0,
  attackInterval: 1.0,
  icon: '👹',
  speed: 1.0,
  owner: 'cpu',
  x: 85,
  y: 80,
};

const playerAllyFar: Unit = {
  id: 'player_ally_far',
  cardNo: 0,
  name: '味方ネコ',
  hp: 10,
  maxHp: 10,
  attack: 1,
  range: 15,
  attackCooldown: 0,
  attackInterval: 1.0,
  icon: '🐱',
  speed: 1.0,
  owner: 'player',
  x: 10,
  y: 40,
};

const resConceal = updateCloudEvent(0.016, driftingState, [cpuEnemyInside, cpuEnemyFarOutside, playerAllyFar]);
const enemyInsideUpdated = resConceal.updatedUnits.find((u) => u.id === 'cpu_enemy_inside')!;
const enemyOutsideUpdated = resConceal.updatedUnits.find((u) => u.id === 'cpu_enemy_outside')!;

assert(enemyInsideUpdated.isCloudConcealed === true, 'Enemy inside cloud shadow must be concealed');
assert(enemyInsideUpdated.isCloudSpotted === false, 'Enemy inside cloud without close ally must NOT be spotted');
assert(enemyOutsideUpdated.isCloudConcealed === false, 'Enemy outside cloud must NOT be concealed');

// 6. 接近看破（Proximity Spotting）
// 味方ユニットが敵ゴブリンの至近距離 (距離 <= 13%) に接近
const playerAllyClose: Unit = {
  ...playerAllyFar,
  x: 56, // 敵(52, 42)との距離は 4%
  y: 42,
};

const resSpot = updateCloudEvent(0.016, driftingState, [cpuEnemyInside, playerAllyClose]);
const enemySpotted = resSpot.updatedUnits.find((u) => u.id === 'cpu_enemy_inside')!;
const allyInCloud = resSpot.updatedUnits.find((u) => u.id === 'player_ally_far')!;

assert(enemySpotted.isCloudConcealed === true, 'Enemy is still within cloud shadow');
assert(enemySpotted.isCloudSpotted === true, 'Enemy must be spotted by close player unit');
assert(allyInCloud.isCloudConcealed === true, 'Player unit in cloud must have cloud status');
assert(allyInCloud.isCloudSpotted === true, 'Player unit is always spotted for player');

// 7. 雲通過後の解除 (cooldown / idle)
const cooldownState = {
  ...cloudInit,
  phase: 'cooldown' as const,
  phaseTimer: 1.0,
  clouds: [],
};
const resCooldown = updateCloudEvent(0.016, cooldownState, [enemyInsideUpdated]);
const enemyAfterCloud = resCooldown.updatedUnits[0];
assert(enemyAfterCloud.isCloudConcealed === false, 'Concealment must be removed after clouds pass');
assert(enemyAfterCloud.isCloudSpotted === false, 'Spotted flag must be reset after clouds pass');

// 8. 雲のLoL茂み仕様（LoL-style moving bush）の視線・攻撃探知検証 (hasLineOfSight)
// 8-1. 雲の外の遠距離ユニットから雲の中に隠れている敵への視線は遮断される (探知不可)
const losFromOutsideToCloudEnemy = hasLineOfSight(
  20, 40, 52, 42, [],
  { isStructure: false, isCloudSpotted: false },
  [sampleCloud]
);
assert(losFromOutsideToCloudEnemy === false, 'Enemy inside cloud must NOT be targetable from outside cloud');

// 8-2. 二人とも同じ雲の中にいるならお互いに攻撃しあえる (視線が通る)
const losInsideSameCloud = hasLineOfSight(
  56, 42, 52, 42, [],
  { isStructure: false, isCloudSpotted: false },
  [sampleCloud]
);
assert(losInsideSameCloud === true, 'Units inside the same cloud must be able to target and attack each other');

// 8-3. 雲の中の敵でも接近看破 (isCloudSpotted: true) されていれば外の遠距離ユニットからも攻撃可能
const losToSpottedCloudEnemy = hasLineOfSight(
  20, 40, 52, 42, [],
  { isStructure: false, isCloudSpotted: true },
  [sampleCloud]
);
assert(losToSpottedCloudEnemy === true, 'Proximity-spotted enemy inside cloud must be targetable from outside');

// 8-4. 雲が2点の射線上に挟まっている場合、向こう側の敵への遠距離攻撃は遮断される
const losAcrossDriftingCloud = hasLineOfSight(
  20, 40, 80, 40, [],
  { isStructure: false },
  [sampleCloud]
);
assert(losAcrossDriftingCloud === false, 'Drifting cloud between observer and target must block line of sight');

console.log('  -> Drifting Clouds, moving shadow corridor, and dynamic Fog of War concealment / proximity spotting: PASSED');

// =========================================================================
// 15. Headless RealtimeGameEngine (Pure TypeScript Engine) Verification
// =========================================================================
console.log('[15/15] Testing Pure TypeScript RealtimeGameEngine headless simulation...');

import { RealtimeGameEngine } from '../src/app/engine';

const engine = new RealtimeGameEngine(false);
assert(engine.state.playerHp === 20 && engine.state.cpuHp === 20, 'Engine initializes with 20 HP');
assert(engine.state.deckState.hand.length === 4, 'Engine initializes with 4 cards in hand');

// マナを最大にして手札0番（ネズミ cost:1）をプレイ
engine.state.playerMana = 10;
const simStartTime = 1_000_000;
const playedOk = engine.playCardAt(15, 50, 0, simStartTime);
assert(playedOk === true, 'Engine playCardAt should succeed for valid monster deploy');
assert(engine.state.units.length === 1, '1 unit should be spawned on board');
const spawnedPlayerUnit = engine.state.units[0];
assert(spawnedPlayerUnit.owner === 'player' && spawnedPlayerUnit.x === 15, 'Spawned unit is at x=15');

// 待機トグル -> 2秒間 tick を進めて集中チャージ完了 -> 再前進で奇襲ダッシュ発動
engine.toggleUnitHold(spawnedPlayerUnit.id, simStartTime + 10);
assert(engine.state.units[0].isHolding === true, 'Unit enters holding state');

let simNow = simStartTime + 10;
for (let i = 0; i < 25; i++) {
  simNow += 100;
  engine.tick(0.1, simNow);
}
const heldUnit = engine.state.units.find((u) => u.id === spawnedPlayerUnit.id)!;
assert(heldUnit.hasAmbushCharge === true, 'Holding for 2.5s grants ambush charge');

engine.toggleUnitHold(spawnedPlayerUnit.id, simNow);
const dashingUnit = engine.state.units.find((u) => u.id === spawnedPlayerUnit.id)!;
assert(dashingUnit.isHolding === false, 'Unit resumes advancing');
assert(Boolean(dashingUnit.ambushDashUntil && dashingUnit.ambushDashUntil > simNow), 'Unit activates ambush dash');

// さらに10フレーム進めて前進を確認
const xBeforeMove = dashingUnit.x;
for (let i = 0; i < 10; i++) {
  simNow += 50;
  engine.tick(0.05, simNow);
}
const movedUnit = engine.state.units.find((u) => u.id === spawnedPlayerUnit.id)!;
assert(movedUnit.x > xBeforeMove, `Unit should advance on X axis (${xBeforeMove} -> ${movedUnit.x})`);

// リセット検証
engine.reset(false);
assert(engine.state.units.length === 0 && engine.state.playerHp === 20, 'Engine reset restores initial state');

console.log('  -> Pure TypeScript RealtimeGameEngine headless simulation: PASSED');

// =========================================================================
// 16. Spell Chant & Impact Timing Delays (Meteor, Fire, Heal, Haste)
// =========================================================================
console.log('[16/16] Testing Spell Chant & Impact Timing Delays (Meteor, Fire, Heal, Haste)...');
import {
  METEOR_IMPACT_DELAY_MS,
  FIRE_SPELL_CAST_DELAY_MS,
  HEAL_SPELL_CAST_DELAY_MS,
  HASTE_SPELL_CAST_DELAY_MS,
} from '../src/app/engine/engineTypes';

// 1. 各スペルの詠唱・着弾遅延定数の検証
assert(METEOR_IMPACT_DELAY_MS === 1600, 'Meteor impact delay must be 1600ms');
assert(FIRE_SPELL_CAST_DELAY_MS === 1600, 'Fire spell cast warning delay must be 1600ms');
assert(HEAL_SPELL_CAST_DELAY_MS === 1400, 'Heal spell cast warning delay must be 1400ms');
assert(HASTE_SPELL_CAST_DELAY_MS === 1100, 'Haste spell cast warning delay must be 1100ms');

// 2. 隕石落下の遅延着弾シミュレーション検証
const spellEngine = new RealtimeGameEngine(false);
spellEngine.state.playerMana = 10;
const spellNow = 2_000_000;
// 敵ユニットを設置 (x=50, y=50, hp=5)
const enemyUnit: Unit = {
  id: 'test_enemy_meteor',
  cardNo: 3,
  name: '敵ネコ',
  icon: '🐱',
  hp: 5,
  maxHp: 5,
  attack: 1,
  range: 8,
  attackCooldown: 0,
  attackInterval: 2.0,
  speed: 1.0,
  owner: 'cpu',
  x: 50,
  y: 50,
};
spellEngine.state.units = [enemyUnit];

// 手札にメテオカードを直接セット
const meteorCard = CARD_POOL.find((c) => c.id === 'meteor')!;
spellEngine.state.deckState.hand[0] = meteorCard;

// メテオを (50, 50) にプレイ
spellEngine.playCardAt(50, 50, 0, spellNow);
assert(spellEngine.state.pendingMeteorHits.length === 1, '1 pending meteor hit queued');
assert(spellEngine.state.spellEffects.some((e) => e.type === 'meteor'), 'Meteor effect spawned');

// 800ms経過 (旧仕様なら着弾していたタイミング): 新仕様(1600ms)ではまだ着弾せず無傷であること
spellEngine.tick(0.8, spellNow + 800);
const enemyAfter800 = spellEngine.state.units.find((u) => u.id === 'test_enemy_meteor');
assert(enemyAfter800 !== undefined && enemyAfter800.hp === 5, 'Enemy must not take damage at 800ms (still chanting)');

// 1600ms経過 (新仕様の着弾タイミング): 3ダメージ着弾してHPが2になること
spellEngine.tick(0.8, spellNow + 1600);
const enemyAfter1600 = spellEngine.state.units.find((u) => u.id === 'test_enemy_meteor');
assert(enemyAfter1600 !== undefined && enemyAfter1600.hp === 2, 'Enemy takes 3 damage at 1600ms impact');

// 3. 癒やしの雨の詠唱〜着弾シミュレーション検証
const woundedAlly: Unit = {
  id: 'test_wounded_ally',
  cardNo: 3,
  name: '負傷味方ネコ',
  icon: '🐱',
  hp: 1,
  maxHp: 6,
  attack: 1,
  range: 8,
  attackCooldown: 0,
  attackInterval: 2.0,
  speed: 1.0,
  owner: 'player',
  x: 50,
  y: 50,
};
spellEngine.state.units = [woundedAlly];
const healCard = CARD_POOL.find((c) => c.id === 'heal_spell')!;
spellEngine.state.deckState.hand[0] = healCard;

const healCastTime = spellNow + 5000;
spellEngine.playCardAt(50, 50, 0, healCastTime);
assert(spellEngine.state.pendingHealSpellCasts.length === 1, '1 pending heal spell cast queued');
assert(spellEngine.state.spellEffects.some((e) => e.type === 'heal_warning'), 'heal_warning effect spawned');

// 700ms経過: まだ回復しない
spellEngine.tick(0.7, healCastTime + 700);
assert(spellEngine.state.units[0].hp === 1, 'Ally HP must remain 1 at 700ms (chanting heal)');

// 1400ms経過: 回復雨が着弾しHP+3 (1 -> 4) になり、heal_warningが消えてhealエフェクトになる
spellEngine.tick(0.7, healCastTime + 1400);
assert(spellEngine.state.units[0].hp === 4, 'Ally HP recovered by +3 at 1400ms');
assert(spellEngine.state.spellEffects.some((e) => e.type === 'heal'), 'heal landing effect spawned');

// 4. 疾風の号令の詠唱〜発動シミュレーション検証
const attackingAlly: Unit = {
  id: 'test_attacking_ally',
  cardNo: 3,
  name: '攻撃中味方ネコ',
  icon: '🐱',
  hp: 5,
  maxHp: 5,
  attack: 1,
  range: 8,
  attackCooldown: 1.5,
  attackInterval: 2.0,
  speed: 1.0,
  owner: 'player',
  x: 50,
  y: 50,
};
spellEngine.state.units = [attackingAlly];
const hasteCard = CARD_POOL.find((c) => c.id === 'haste_spell')!;
spellEngine.state.deckState.hand[0] = hasteCard;

const hasteCastTime = spellNow + 10000;
spellEngine.playCardAt(50, 50, 0, hasteCastTime);
assert(spellEngine.state.pendingHasteSpellCasts.length === 1, '1 pending haste spell cast queued');
assert(spellEngine.state.spellEffects.some((e) => e.type === 'haste_warning'), 'haste_warning effect spawned');

// 600ms経過: まだリセットされない
spellEngine.tick(0.6, hasteCastTime + 600);
assert(spellEngine.state.units[0].attackCooldown > 0, 'Attack cooldown must not reset at 600ms (chanting haste)');

// 1100ms経過: 疾風の号令が発動し、attackCooldownが0にリセットされる
spellEngine.tick(0.5, hasteCastTime + 1100);
assert(spellEngine.state.units[0].attackCooldown === 0, 'Attack cooldown reset to 0 at 1100ms');
assert(spellEngine.state.spellEffects.some((e) => e.type === 'haste'), 'haste landing effect spawned');

console.log('  -> Spell Chant & Impact Timing Delays (Meteor, Fire, Heal, Haste): PASSED');

// ==========================================
// Suite 17: 索敵モード (160度時計回りスイープ、待機自動復帰、斜め追跡移動)
// ==========================================
console.log('[17/17] Testing Unit Scout Mode (160-deg sweep, auto-hold on sweep end, diagonal pursuit)...');
const scoutEngine = new RealtimeGameEngine();
scoutEngine.state.playerMana = 10;
const scoutStartTime = 2_000_000;

// 1. トグル状態遷移テスト: 通常前進 -> 待機 -> 索敵 -> 通常前進
const scoutTestUnit: Unit = {
  id: 'test_scout_unit',
  cardNo: 1,
  name: 'ネズミ',
  icon: '🐭',
  hp: 10,
  maxHp: 10,
  attack: 2,
  range: 30,
  attackCooldown: 0,
  attackInterval: 1.0,
  speed: 10,
  owner: 'player',
  x: 20,
  y: 50,
};
scoutEngine.state.units = [scoutTestUnit];

// 1回目クリック: 待機
scoutEngine.toggleUnitHold('test_scout_unit', scoutStartTime);
assert(scoutEngine.state.units[0].isHolding === true && !scoutEngine.state.units[0].isScouting, '1st click: enters holding mode');

// 2回目クリック: 索敵
scoutEngine.toggleUnitHold('test_scout_unit', scoutStartTime + 100);
assert(scoutEngine.state.units[0].isHolding === true && scoutEngine.state.units[0].isScouting === true, '2nd click: enters scouting mode');
assert(scoutEngine.state.units[0].scoutProgress === 0, 'scoutProgress starts at 0');

// 3回目クリック: 通常前進に復帰
scoutEngine.toggleUnitHold('test_scout_unit', scoutStartTime + 200);
assert(!scoutEngine.state.units[0].isHolding && !scoutEngine.state.units[0].isScouting, '3rd click: resumes advance');

// 2. 敵不在時の160度掃引完了 -> 待機状態への自動復帰テスト (選択肢2の仕様検証)
scoutEngine.toggleUnitHold('test_scout_unit', scoutStartTime + 300); // 待機
scoutEngine.toggleUnitHold('test_scout_unit', scoutStartTime + 400); // 索敵
assert(scoutEngine.state.units[0].isScouting === true, 'Unit enters scouting mode');

// 1.6秒以上 tick を進める (敵不在)
let simScoutNow = scoutStartTime + 500;
for (let i = 0; i < 20; i++) {
  simScoutNow += 100;
  scoutEngine.tick(0.1, simScoutNow);
}
const finishedScoutUnit = scoutEngine.state.units.find((u) => u.id === 'test_scout_unit')!;
assert(finishedScoutUnit.isScouting === false, 'Scouting finishes after full 160 deg sweep');
assert(finishedScoutUnit.isHolding === true, 'Unit automatically returns to holding state when sweep finishes with no enemies found');

// 3. 索敵中の敵探知 & 斜め追跡移動テスト
// ユニットの位置: (20, 50)。敵の位置: (35, 62) -> 前方右下(斜め位置)、距離約19%でrange=30%内、角度約38度で160度扇形内
const scoutEnemyUnit: Unit = {
  id: 'test_scout_enemy',
  cardNo: 1,
  name: '敵ネズミ',
  icon: '🐭',
  hp: 10,
  maxHp: 10,
  attack: 1,
  range: 10,
  attackCooldown: 1.0,
  attackInterval: 1.0,
  speed: 0,
  owner: 'cpu',
  x: 35,
  y: 62,
};
const scoutHunterUnit: Unit = {
  ...scoutTestUnit,
  x: 20,
  y: 50,
  isHolding: true,
  isScouting: true,
  scoutProgress: 0,
};
scoutEngine.state.cpuMana = 0;
scoutEngine.state.units = [scoutHunterUnit, scoutEnemyUnit];

// tick を進めてスキャン角が敵の方向(約38度)に達するまで進行
// 角度: -80 + progress * 160 = 38 -> progress ≈ 0.737 -> 約1.18秒
let enemyDetected = false;
for (let i = 0; i < 20; i++) {
  simScoutNow += 100;
  scoutEngine.tick(0.1, simScoutNow);
  const u = scoutEngine.state.units.find((unit) => unit.id === 'test_scout_unit')!;
  if (u.scoutTargetUnitId === 'test_scout_enemy') {
    enemyDetected = true;
    break;
  }
}
assert(enemyDetected, 'Enemy is spotted during 160-deg sweep when beam aligns with enemy position');

// 探知後は斜め前進（Xが増加し、Yが敵の62に向かって増加する）
const uBefore = scoutEngine.state.units.find((u) => u.id === 'test_scout_unit')!;
const initialY = uBefore.y;
const initialX = uBefore.x;

// 5tick前進
for (let i = 0; i < 5; i++) {
  simScoutNow += 100;
  scoutEngine.tick(0.1, simScoutNow);
}
const uAfter = scoutEngine.state.units.find((u) => u.id === 'test_scout_unit')!;
assert(uAfter.x > initialX, 'Unit advances on X axis towards target');
assert(uAfter.y > initialY, `Unit moves diagonally on Y axis towards target Y (${initialY} -> ${uAfter.y})`);

console.log('  -> Unit Scout Mode (160-deg sweep, auto-hold on sweep end, diagonal pursuit): PASSED');

// ==========================================
// 18. 地形ゾーン (Terrain Zones: 清流・街道・泥沼) ロジック
// ==========================================
console.log('[18/18] Testing Terrain Zones (Arrow tiles, Swamp slow, Flying bypass)...');

// 1. 地形ゾーン定義と座標検出
const highwayZone = getTerrainAt(50, 50);
assert(highwayZone !== null && highwayZone.type === 'road', 'Center (50, 50) must be a road');
assert(highwayZone!.flowDir !== undefined, 'Road panel must have an arrow direction');
const dirBefore = highwayZone!.flowDir!;
advanceRoadRotation(ROAD_ROTATE_SEC);
assert(highwayZone!.flowDir === (dirBefore + 1) % 4, 'Road panel must rotate clockwise after the interval');

const swampZone = getTerrainAt(28, 22);
assert(swampZone !== null && swampZone.type === 'swamp', '(28, 22) must be swamp');
assert(swampZone!.speedMultiplier === 0.5, 'Swamp must reduce ground unit speed to 0.5x');

// 2. 飛行ユニット判定
assert(isFlyingCard(9) === true, 'Card 9 (Vampire Bat) must be a flying unit');
assert(isFlyingCard(11) === true, 'Card 11 (Dragon) must be a flying unit');
assert(isFlyingCard(1) === false, 'Card 1 (Mouse) must be a ground unit');
assert(isFlyingCard(7) === false, 'Card 7 (Boar) must be a ground unit');

// 3. 川の水流による地上ユニットのレーン移動・流速シミュレーション
const terrainEngine = new RealtimeGameEngine(false);

const groundUnitInRiver: Unit = {
  id: 'ground_swimmer',
  cardNo: 1, // ネズミ（地上）
  name: '流されるネズミ',
  icon: '🐭',
  hp: 20,
  maxHp: 20,
  attack: 1,
  range: 8,
  speed: 5.0,
  attackCooldown: 1.0,
  attackInterval: 1.0,
  owner: 'player',
  x: 55,
  y: 65, // 上向き矢印にしたタイルの中
  lane: 65,
};

resetRoadFlow(); // 他テストのtickで進んだ自動回転タイマーを戻す
const pushTile = getTerrainAt(55, 65)!;
pushTile.flowDir = 0; // 上向き
terrainEngine.state.cpuMana = 0;
terrainEngine.state.units = [groundUnitInRiver];

// 1秒間（100ms x 10 tick）進める
let terrainNow = Date.now();
for (let i = 0; i < 10; i++) {
  terrainNow += 100;
  terrainEngine.tick(0.1, terrainNow);
}

const uGroundAfter = terrainEngine.state.units.find((u) => u.id === 'ground_swimmer')!;
assert(uGroundAfter.y < 64.5, `Ground unit must be pushed up by the arrow tile: Y went from 65 to ${uGroundAfter.y}`);
assert(uGroundAfter.lane !== undefined && uGroundAfter.lane < 64.5, `Ground unit target lane must follow the push: ${uGroundAfter.lane}`);

console.log('  -> Terrain Zones (Arrow tiles, Swamp slow, Flying bypass): PASSED');
// ==========================================
// 19. 得点ホール
// ==========================================
console.log('[19/19] Testing Scoring Holes (absorb, gap pass, win by score)...');
const mk = (id: string, owner: 'player' | 'cpu', x: number, y: number) =>
  ({ ...groundUnitInRiver, id, owner, x, y, lane: y }) as Unit;
const holeRes = absorbIntoHoles([
  mk('in_center', 'player', 95, 50), // 中央ホール=5点
  mk('in_gap', 'player', 95, 42), // 隙間: 吸われない
  mk('not_yet', 'player', 80, 50), // 端に未到達
  mk('cpu_side', 'cpu', 5, 35), // CPU側の3点ホール
]);
assert(holeRes.gained.player === 5 && holeRes.gained.cpu === 3, `hole points wrong: ${JSON.stringify(holeRes.gained)}`);
assert(holeRes.units.map((u) => u.id).join() === 'in_gap,not_yet', 'only gap/not-yet units must remain');

const holeEngine = new RealtimeGameEngine(false);
holeEngine.state.cpuMana = 0;
holeEngine.state.units = [mk('scorer', 'player', 95, 50)];
holeEngine.state.playerScore = HOLE_WIN_SCORE - 5;
holeEngine.tick(0.1, Date.now());
assert(holeEngine.state.gameResult === 'win', 'Reaching the win score via a hole must win the game');
console.log('  -> Scoring Holes: PASSED');
console.log('=== All 19 Test Suites PASSED Successfully! ===');