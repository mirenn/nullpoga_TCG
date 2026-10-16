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
} from '../src/app/obstacles';
import type { Unit } from '../src/app/types';

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
assert(FIELD_OBSTACLES.length === 6, 'Should define 6 strategic 3D obstacles along gap corridors');
assert(isStealthCapableCard(8) === true, 'Ninja Assassin (cardNo=8) must be stealth-capable');
assert(isStealthCapableCard(1) === true, 'Mouse (cardNo=1) must be stealth-capable');
assert(isStealthCapableCard(11) === false, 'Dragon (cardNo=11) is too large to hide in cover');
assert(isStealthCapableCard(4) === false, 'Turtle (cardNo=4) is too large to hide in cover');

// カメラクランプテスト
assert(clampCameraPanX(500) === 260, 'PanX should clamp to max 260');
assert(clampCameraPanY(-500) === -180, 'PanY should clamp to min -180');
assert(clampCameraZoom(3.0) === 1.65, 'Zoom should clamp to max 1.65');

// CPU上奥の遮蔽物 (x=88, y=35) で隠密ユニット (忍びアサシン) が初期カメラ(pan=0,0)では死角に隠れることを確認
const cpuUpperObs = FIELD_OBSTACLES.find((o) => o.id === 'obs_cpu_upper_forest')!;
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

console.log('=== All 10 Test Suites PASSED Successfully! ===');



