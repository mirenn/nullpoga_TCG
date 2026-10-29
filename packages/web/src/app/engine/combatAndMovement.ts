import {
  AttackEffect,
  AttackEffectType,
  CloudEntity,
  Inhibitor,
  Owner,
  SpellEffect,
  StampedeState,
  Unit,
} from '../types';
import { ALLY_MIN_GAP, MOVE_SPEED_SCALE } from '../cards';
import {
  COLLISION_HALF_WIDTH_Y,
  FIRE_SPELL_SPREAD_SPEED_Y,
  isWithinCollisionY,
  isWithinEngageY,
  isWithinFireSpellColumn,
  isWithinMeteorRange,
  SPELL_RADIUS,
} from '../board';
import {
  inhibitorBlocksY,
  inhibitorEngageableY,
  SCUTTLE_RESPAWN_MS,
  SCUTTLE_SHRINE_RADIUS,
} from '../inhibitors';
import {
  AMBUSH_DEPLOY_ATK_BONUS,
  Camera3DState,
  evaluateUnitStealthAndSpot,
  FIELD_OBSTACLES,
  FieldObstacle,
  hasLineOfSight,
  isObstacleActive,
  isObstacleSolid,
  isStealthCapableCard,
  SPOT_AMBUSH_STUN_MS,
} from '../obstacles';
import {
  clearRoadTurned,
  footOffsetY,
  getTerrainAt,
  isFlyingCard,
  ROAD_TURN_DECAY,
  roadPush,
} from '../terrain';
import {
  HOLD_AMBUSH_ATTACK_BONUS,
  HOLD_AMBUSH_CHARGE_TIME_SEC,
  HOLD_AMBUSH_DASH_SPEED_MULTIPLIER,
  shouldCpuUnitHoldForStampede,
} from '../stampede';

export const SCOUT_SWEEP_DURATION_SEC = 1.6; // 160度スキャンの所要時間（秒）
export const SCOUT_TOTAL_ANGLE_DEG = 160; // 索敵の総角度（度）
export const SCOUT_START_ANGLE_DEG = -80; // 開始角度（度、正面0度から上へ80度）
export const SCOUT_BEAM_TOLERANCE_DEG = 25; // ビームの探知判定角度幅（度）

import {
  ActiveFireSpell,
  AREA_SPLASH_DAMAGE_RATIO,
  CombatTarget,
  LIGHTNING_FLIGHT_MAX_MS,
  LIGHTNING_FLIGHT_MIN_MS,
  LIGHTNING_MAX_RANGE,
  PendingFireSpellCast,
  PendingHasteSpellCast,
  PendingHealSpellCast,
  PendingLightningHit,
  PendingMeteorHit,
} from './engineTypes';

/** 足元の矢印タイルの押し出し＋回転時バースト加速を座標に加える（交戦中・移動中の両方で共通） */
function applyRoadPush(unit: Unit, x: number, y: number, lane: number, dt: number, footDy: number) {
  const terrain = getTerrainAt(x, y + footDy);
  const turnedRoad = [terrain, getTerrainAt(x, y)].find((z) => z?.type === 'road' && z.turned);
  let [kickVx, kickVy] = turnedRoad ? roadPush(turnedRoad, true) : [unit.kickVx ?? 0, unit.kickVy ?? 0];
  const spin = turnedRoad ? (unit.spin ?? 0) + 360 : unit.spin;
  const [px, py] = terrain?.type === 'road' ? roadPush(terrain) : [0, 0];
  const vx = px + kickVx;
  const vy = py + kickVy;
  const decay = Math.max(0, 1 - dt * ROAD_TURN_DECAY);
  kickVx = Math.abs(kickVx * decay) < 0.5 ? 0 : kickVx * decay;
  kickVy = Math.abs(kickVy * decay) < 0.5 ? 0 : kickVy * decay;
  return {
    x: Math.max(5, Math.min(95, x + vx * dt)),
    y: Math.max(12, Math.min(88, y + vy * dt)),
    lane: Math.max(12, Math.min(88, lane + vy * dt)),
    kickVx,
    kickVy,
    spin,
  };
}

/**
 * 味方が攻撃などで停止中（射程内に敵・敵インヒビターがいる）か判定
 */
export function isAllyUnitStopped(
  ally: Unit,
  units: Unit[],
  inhibitors: Inhibitor[]
): boolean {
  const fwd = (tx: number) => (ally.owner === 'player' ? tx - ally.x : ally.x - tx);
  const enemyInReach = units.some(
    (e) =>
      e.owner !== ally.owner &&
      e.hp > 0 &&
      isWithinEngageY(e.y, ally.y) &&
      fwd(e.x) >= -2 &&
      fwd(e.x) <= ally.range
  );
  if (enemyInReach) return true;
  return inhibitors.some(
    (i) =>
      i.owner !== ally.owner &&
      i.hp > 0 &&
      inhibitorEngageableY(i, ally.y) &&
      fwd(i.x) >= -2 &&
      fwd(i.x) <= ally.range
  );
}

/**
 * 着弾待ちの隕石・烈火の呪文・癒やしの雨・疾風の号令を解決する
 */
export function resolveDelayedSpellQueue(params: {
  units: Unit[];
  pendingMeteorHits: PendingMeteorHit[];
  pendingFireSpellCasts: PendingFireSpellCast[];
  activeFireSpells: ActiveFireSpell[];
  pendingHealSpellCasts?: PendingHealSpellCast[];
  pendingHasteSpellCasts?: PendingHasteSpellCast[];
  spellEffects: SpellEffect[];
  now: number;
}): {
  units: Unit[];
  pendingMeteorHits: PendingMeteorHit[];
  pendingFireSpellCasts: PendingFireSpellCast[];
  activeFireSpells: ActiveFireSpell[];
  pendingHealSpellCasts: PendingHealSpellCast[];
  pendingHasteSpellCasts: PendingHasteSpellCast[];
  spellEffects: SpellEffect[];
} {
  const { now } = params;
  let units = params.units;
  const stillMeteorHits: PendingMeteorHit[] = [];
  const resolvedMeteors: PendingMeteorHit[] = [];

  for (const m of params.pendingMeteorHits) {
    if (now >= m.impactTime) {
      resolvedMeteors.push(m);
    } else {
      stillMeteorHits.push(m);
    }
  }

  if (resolvedMeteors.length > 0) {
    units = units
      .map((u) => {
        let hp = u.hp;
        let hasSpellShield = u.hasSpellShield;
        for (const m of resolvedMeteors) {
          if (u.owner === m.targetOwner && isWithinMeteorRange(u.x, u.y, m.x, m.y)) {
            if (hasSpellShield) {
              hasSpellShield = false;
            } else {
              hp -= m.damage;
            }
          }
        }
        return hp !== u.hp || hasSpellShield !== u.hasSpellShield
          ? { ...u, hp, hasSpellShield }
          : u;
      })
      .filter((u) => u.hp > 0);
  }

  const stillFireCasts: PendingFireSpellCast[] = [];
  const ignitedFireCasts: PendingFireSpellCast[] = [];
  for (const fc of params.pendingFireSpellCasts) {
    if (now >= fc.igniteTime) {
      ignitedFireCasts.push(fc);
    } else {
      stillFireCasts.push(fc);
    }
  }

  let spellEffects = params.spellEffects;
  const activeFireSpells = [...params.activeFireSpells];

  if (ignitedFireCasts.length > 0) {
    const removedWarningIds = new Set(ignitedFireCasts.map((fc) => fc.warningId));
    const newBurnEffects: SpellEffect[] = [];

    for (const fc of ignitedFireCasts) {
      const effectId = `burn_${fc.targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
      newBurnEffects.push({
        id: effectId,
        x: fc.x,
        y: fc.y,
        originY: fc.y,
        type: 'burn',
        createdAt: now,
      });
      activeFireSpells.push({
        id: effectId,
        x: fc.x,
        originY: fc.y,
        targetOwner: fc.targetOwner,
        startTime: now,
        damage: 3,
        hitUnitIds: new Set<string>(),
        durationMs: 2000,
      });
    }

    spellEffects = [
      ...spellEffects.filter((e) => !removedWarningIds.has(e.id)),
      ...newBurnEffects,
    ];
  }

  // 癒やしの雨の解決（詠唱完了 -> 範囲内の味方HP回復）
  const stillHealCasts: PendingHealSpellCast[] = [];
  const appliedHealCasts: PendingHealSpellCast[] = [];
  for (const hc of params.pendingHealSpellCasts ?? []) {
    if (now >= hc.applyTime) {
      appliedHealCasts.push(hc);
    } else {
      stillHealCasts.push(hc);
    }
  }

  if (appliedHealCasts.length > 0) {
    const removedWarningIds = new Set(appliedHealCasts.map((hc) => hc.warningId));
    const newHealEffects: SpellEffect[] = [];

    for (const hc of appliedHealCasts) {
      newHealEffects.push({
        id: hc.id,
        x: hc.x,
        y: hc.y,
        type: 'heal',
        createdAt: now,
      });

      units = units.map((u) => {
        if (u.owner === hc.targetOwner && Math.hypot(u.x - hc.x, u.y - hc.y) <= SPELL_RADIUS) {
          if (u.hasSpellShield) {
            return { ...u, hasSpellShield: false };
          }
          const knockback = u.owner === 'player' ? -10 : 10;
          return {
            ...u,
            x: Math.max(5, Math.min(95, u.x + knockback)),
            attackCooldown: u.attackInterval,
            isCharging: false,
            chargeStartTime: undefined,
          };
        }
        return u;
      });
    }

    spellEffects = [
      ...spellEffects.filter((e) => !removedWarningIds.has(e.id)),
      ...newHealEffects,
    ];
  }

  // 疾風の号令の解決（詠唱完了 -> 範囲内の味方攻撃クールダウン即時リセット）
  const stillHasteCasts: PendingHasteSpellCast[] = [];
  const appliedHasteCasts: PendingHasteSpellCast[] = [];
  for (const hc of params.pendingHasteSpellCasts ?? []) {
    if (now >= hc.applyTime) {
      appliedHasteCasts.push(hc);
    } else {
      stillHasteCasts.push(hc);
    }
  }

  if (appliedHasteCasts.length > 0) {
    const removedWarningIds = new Set(appliedHasteCasts.map((hc) => hc.warningId));
    const newHasteEffects: SpellEffect[] = [];

    for (const hc of appliedHasteCasts) {
      newHasteEffects.push({
        id: hc.id,
        x: hc.x,
        y: hc.y,
        type: 'haste',
        createdAt: now,
      });

      units = units.map((u) => {
        if (u.owner === hc.targetOwner && Math.hypot(u.x - hc.x, u.y - hc.y) <= SPELL_RADIUS) {
          return { ...u, attackCooldown: 0 };
        }
        return u;
      });
    }

    spellEffects = [
      ...spellEffects.filter((e) => !removedWarningIds.has(e.id)),
      ...newHasteEffects,
    ];
  }

  return {
    units,
    pendingMeteorHits: stillMeteorHits,
    pendingFireSpellCasts: stillFireCasts,
    activeFireSpells,
    pendingHealSpellCasts: stillHealCasts,
    pendingHasteSpellCasts: stillHasteCasts,
    spellEffects,
  };
}

/**
 * 着弾時刻に達した電気クラゲの雷撃ヒットを解決する
 */
export function resolveLightningHits(
  currentUnits: Unit[],
  currentPendingHits: PendingLightningHit[],
  now: number
): {
  unitsAfterHits: Unit[];
  stillPendingHits: PendingLightningHit[];
  resolvedHits: PendingLightningHit[];
  delayedBasePlayerDmg: number;
  delayedBaseCpuDmg: number;
} {
  const stillPendingHits: PendingLightningHit[] = [];
  const resolvedHits: PendingLightningHit[] = [];
  for (const hit of currentPendingHits) {
    if (now >= hit.hitTime) {
      resolvedHits.push(hit);
    } else {
      stillPendingHits.push(hit);
    }
  }

  let delayedBaseCpuDmg = 0;
  let delayedBasePlayerDmg = 0;
  for (const hit of resolvedHits) {
    if (hit.targetId === 'cpu') {
      delayedBaseCpuDmg += hit.damage;
    } else if (hit.targetId === 'player') {
      delayedBasePlayerDmg += hit.damage;
    }
  }

  const unitsAfterHits = currentUnits
    .map((unit) => {
      let hp = unit.hp;
      let stunnedUntil = unit.isStunnedUntil;
      let hasSpellShield = unit.hasSpellShield;
      for (const hit of resolvedHits) {
        if (hit.targetId === unit.id && hp > 0) {
          if (hasSpellShield) {
            hasSpellShield = false;
          } else {
            hp -= hit.damage;
            stunnedUntil = now + hit.stunDuration;
          }
        }
      }
      if (
        hp !== unit.hp ||
        stunnedUntil !== unit.isStunnedUntil ||
        hasSpellShield !== unit.hasSpellShield
      ) {
        const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
        return {
          ...unit,
          hp,
          isStunnedUntil: stunnedUntil,
          isStunned: isUnitStunned,
          hasSpellShield,
        };
      }
      return unit;
    })
    .filter((u) => u.hp > 0);

  return {
    unitsAfterHits,
    stillPendingHits,
    resolvedHits,
    delayedBasePlayerDmg,
    delayedBaseCpuDmg,
  };
}

/**
 * 烈火の呪文の延焼波によるダメージ解決と期限切れクリーンアップ
 */
export function resolveFireSpellWaves(
  units: Unit[],
  activeFireSpells: ActiveFireSpell[],
  now: number
): {
  unitsAfterFire: Unit[];
  remainingFireSpells: ActiveFireSpell[];
} {
  if (activeFireSpells.length === 0) {
    return { unitsAfterFire: units, remainingFireSpells: activeFireSpells };
  }

  const unitsAfterFire = units
    .map((unit) => {
      if (unit.hp <= 0) return unit;
      let hp = unit.hp;
      let hasSpellShield = unit.hasSpellShield;

      for (const fire of activeFireSpells) {
        if (unit.owner === fire.targetOwner && !fire.hitUnitIds.has(unit.id)) {
          if (isWithinFireSpellColumn(unit.x, fire.x)) {
            const elapsed = now - fire.startTime;
            const currentSpreadRadiusY = (elapsed / 1000) * FIRE_SPELL_SPREAD_SPEED_Y;
            if (Math.abs(unit.y - fire.originY) <= currentSpreadRadiusY) {
              fire.hitUnitIds.add(unit.id);
              if (hasSpellShield) {
                hasSpellShield = false;
              } else {
                hp -= fire.damage;
              }
            }
          }
        }
      }

      return hp !== unit.hp || hasSpellShield !== unit.hasSpellShield
        ? { ...unit, hp, hasSpellShield }
        : unit;
    })
    .filter((u) => u.hp > 0);

  const remainingFireSpells = activeFireSpells.filter(
    (fire) => now - fire.startTime < fire.durationMs
  );

  return { unitsAfterFire, remainingFireSpells };
}

/**
 * 3D箱庭カメラの覗き込みによる死角看破（SPOT!）解決
 */
export function resolveCameraSpot(
  units: Unit[],
  camera3D: Camera3DState,
  now: number
): {
  unitsAfterSpot: Unit[];
  newlySpottedCount: number;
} {
  let newlySpottedCount = 0;
  const unitsAfterSpot = units.map((unit) => {
    const evalResult = evaluateUnitStealthAndSpot(unit, camera3D, FIELD_OBSTACLES);
    if (evalResult.newlySpotted) {
      newlySpottedCount += 1;
      const spotStunUntil = Math.max(unit.isStunnedUntil || 0, now + SPOT_AMBUSH_STUN_MS);
      return {
        ...unit,
        isSpotted: true,
        lastSpottedTime: now,
        isSprinting: false,
        isStunnedUntil: spotStunUntil,
        isStunned: true,
      };
    }
    return unit;
  });

  return { unitsAfterSpot, newlySpottedCount };
}

/**
 * 各ユニットの索敵・攻撃・移動・障害物インタラクションを更新する
 */
export function updateUnitsMovementAndAttacks(params: {
  unitsAfterSpot: Unit[];
  unitsAfterHits: Unit[];
  inhibitors: Inhibitor[];
  obstacles: FieldObstacle[];
  stampede: StampedeState;
  clouds?: CloudEntity[];
  dt: number;
  now: number;
}): {
  rawUpdatedUnits: Unit[];
  newAttackEffects: AttackEffect[];
  newPendingHits: PendingLightningHit[];
  attackTargets: Map<string, CombatTarget>;
  pDamageToCpu: number;
  cpuDamageToPlayer: number;
  obstacleMutated: boolean;
} {
  const { unitsAfterSpot, unitsAfterHits, inhibitors, obstacles, stampede, clouds, dt, now } = params;
  const newAttackEffects: AttackEffect[] = [];
  const newPendingHits: PendingLightningHit[] = [];
  const attackTargets = new Map<string, CombatTarget>();
  let pDamageToCpu = 0;
  let cpuDamageToPlayer = 0;
  let obstacleMutated = false;

  const isAllyStopped = (ally: Unit) => isAllyUnitStopped(ally, unitsAfterHits, inhibitors);

  const rawUpdatedUnits = unitsAfterSpot.map((unit) => {
    const isStunned = unit.isStunnedUntil && unit.isStunnedUntil > now;
    let cooldown = Math.max(0, unit.attackCooldown - dt);
    let x = unit.x;
    let y = unit.y;
    let distance = unit.distanceTraveled || 0;
    const shibaBaseAtk = 1 + (unit.isAmbushDeploy ? AMBUSH_DEPLOY_ATK_BONUS : 0);
    let attack =
      unit.cardNo === 2
        ? shibaBaseAtk + Math.min(2, Math.floor(distance / 20))
        : unit.attack;
    let lastAttack = unit.lastAttackEffectTime;
    let isCharging = unit.isCharging || false;
    let chargeStartTime = unit.chargeStartTime;

    if (isStunned) {
      return {
        ...unit,
        attackCooldown: cooldown,
        isCharging: false,
        chargeStartTime: undefined,
        isStunned: true,
        isScouting: false,
        scoutProgress: undefined,
        isJumping: false,
        jumpProgress: 0,
        isSliding: false,
        isPushed: false,
        isPushing: false,
        isAttackingObstacle: false,
      };
    }

    // 敵ターゲット候補の探索
    let targetCandidates: CombatTarget[];
    let targetEnemy: CombatTarget | null = null;
    let minDistance = 999;

    if (unit.isCircularRange || unit.cardNo === 8) {
      const allEnemies = unitsAfterHits.filter((u) => u.owner !== unit.owner && u.hp > 0);
      const allInhibitors = inhibitors.filter((i) => i.owner !== unit.owner && i.hp > 0);
      targetCandidates = [
        ...allEnemies.map((e) => ({
          id: e.id,
          x: e.x,
          y: e.y,
          lane: e.y,
          isStructure: false,
          cardNo: e.cardNo,
          isSpotted: e.isSpotted,
          isCloudSpotted: e.isCloudSpotted,
        })),
        ...allInhibitors.map((i) => ({ id: i.id, x: i.x, y: i.y, lane: i.y, isStructure: true })),
      ];
      targetCandidates.forEach((enemy) => {
        const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
        if (dist <= unit.range && dist < minDistance) {
          const sightClear = hasLineOfSight(
            unit.x,
            unit.y,
            enemy.x,
            enemy.y,
            obstacles,
            {
              isStructure: enemy.isStructure,
              isStealthCapable:
                enemy.cardNo !== undefined ? isStealthCapableCard(enemy.cardNo) : false,
              isSpotted: enemy.isSpotted,
              isCloudSpotted: enemy.isCloudSpotted,
            },
            clouds
          );
          if (sightClear) {
            minDistance = dist;
            targetEnemy = enemy;
          }
        }
      });
    } else {
      const enemiesInRange = unitsAfterHits.filter(
        (u) =>
          (isWithinEngageY(u.y, unit.y) || u.id === unit.scoutTargetUnitId) &&
          u.owner !== unit.owner &&
          u.hp > 0
      );
      const enemyInhibitorsInPath = inhibitors.filter(
        (i) => i.owner !== unit.owner && inhibitorEngageableY(i, unit.y) && i.hp > 0
      );
      targetCandidates = [
        ...enemiesInRange.map((e) => ({
          id: e.id,
          x: e.x,
          y: e.y,
          lane: e.y,
          isStructure: false,
          cardNo: e.cardNo,
          isSpotted: e.isSpotted,
          isCloudSpotted: e.isCloudSpotted,
        })),
        ...enemyInhibitorsInPath.map((i) => ({
          id: i.id,
          x: i.x,
          y: i.y,
          lane: i.y,
          isStructure: true,
        })),
      ];
      targetCandidates.forEach((enemy) => {
        const isScoutTarget = unit.scoutTargetUnitId === enemy.id;
        const dist = isScoutTarget
          ? Math.hypot(enemy.x - unit.x, enemy.y - unit.y)
          : unit.owner === 'player'
          ? enemy.x - unit.x
          : unit.x - enemy.x;
        if (dist >= -2 && dist < minDistance) {
          const sightClear = hasLineOfSight(
            unit.x,
            unit.y,
            enemy.x,
            enemy.y,
            obstacles,
            {
              isStructure: enemy.isStructure,
              isStealthCapable:
                enemy.cardNo !== undefined ? isStealthCapableCard(enemy.cardNo) : false,
              isSpotted: enemy.isSpotted,
              isCloudSpotted: enemy.isCloudSpotted,
            },
            clouds
          );
          if (sightClear) {
            minDistance = Math.max(0, dist);
            targetEnemy = enemy;
          }
        }
      });
    }

    // 前方にいる敵ユニットまたはインヒビター（物理衝突・前進ストップ壁）
    let blockingObstacle: CombatTarget | null = null;
    let minBlockDist = 999;
    const obstacleCandidates =
      unit.isCircularRange || unit.cardNo === 8
        ? [
            ...unitsAfterHits
              .filter(
                (u) => u.owner !== unit.owner && u.hp > 0 && isWithinCollisionY(u.y, unit.y)
              )
              .map((e) => ({ id: e.id, x: e.x, y: e.y, lane: e.y, isStructure: false })),
            ...inhibitors
              .filter(
                (i) => i.owner !== unit.owner && i.hp > 0 && inhibitorBlocksY(i, unit.y)
              )
              .map((i) => ({ id: i.id, x: i.x, y: i.y, lane: i.y, isStructure: true })),
          ]
        : targetCandidates.filter((t) => {
            if (t.isStructure) {
              const foundInhib = inhibitors.find((i) => i.id === t.id);
              return foundInhib
                ? inhibitorBlocksY(foundInhib, unit.y)
                : isWithinCollisionY(t.y, unit.y);
            }
            return isWithinCollisionY(t.y, unit.y);
          });

    for (const obs of obstacleCandidates) {
      const dist = unit.owner === 'player' ? obs.x - unit.x : unit.x - obs.x;
      if (dist >= -1 && dist < minBlockDist) {
        minBlockDist = Math.max(0, dist);
        blockingObstacle = obs;
      }
    }

    // 前方にいる味方を探す（重なり防止）
    const alliesInFront = unitsAfterHits.filter(
      (u) =>
        isWithinCollisionY(u.y, unit.y) &&
        u.owner === unit.owner &&
        u.id !== unit.id &&
        u.hp > 0 &&
        !isAllyStopped(u)
    );
    let targetAlly: Unit | null = null;
    let minAllyDist = 999;
    alliesInFront.forEach((ally) => {
      const dist = unit.owner === 'player' ? ally.x - unit.x : unit.x - ally.x;
      if (dist > 0 && dist < minAllyDist) {
        minAllyDist = dist;
        targetAlly = ally;
      }
    });

    // 敵が射程内にいる場合：攻撃処理
    if (targetEnemy && minDistance <= unit.range) {
      const windup = unit.attackWindup || 0;

      if (cooldown <= 0) {
        if (windup > 0 && !isCharging) {
          isCharging = true;
          chargeStartTime = now;
        } else {
          const chargeElapsed =
            isCharging && chargeStartTime ? (now - chargeStartTime) / 1000 : 0;
          if (windup === 0 || chargeElapsed >= windup) {
            isCharging = false;
            chargeStartTime = undefined;
            cooldown = unit.attackInterval;
            lastAttack = now;

            let effectType: AttackEffectType = 'slash';
            let duration = 300;
            let flightMs: number | undefined;

            if (unit.cardNo === 11) {
              effectType = 'fireball';
              duration = 1350;
            } else if (unit.cardNo === 6) {
              effectType = 'lightning';
              const distRatio = Math.min(1, minDistance / LIGHTNING_MAX_RANGE);
              flightMs = Math.round(
                LIGHTNING_FLIGHT_MIN_MS +
                  distRatio * (LIGHTNING_FLIGHT_MAX_MS - LIGHTNING_FLIGHT_MIN_MS)
              );
              duration = flightMs + 450;
            } else if (unit.cardNo === 1) {
              effectType = 'bite';
              duration = 260;
            } else if (unit.cardNo === 2) {
              effectType = 'tackle';
              duration = 320;
            } else if (unit.cardNo === 3) {
              effectType = 'claw';
              duration = 300;
            } else if (unit.cardNo === 7) {
              effectType = 'headbutt';
              duration = 380;
            } else if (unit.cardNo === 8) {
              effectType = 'shuriken';
              const distRatio = Math.min(1, minDistance / 16);
              flightMs = Math.round(110 + distRatio * 110);
              duration = flightMs + 320;
            } else if (unit.cardNo === 9) {
              effectType = 'blood_bite';
              duration = 320;
            } else if (unit.cardNo === 12) {
              effectType = 'arrow';
              const distRatio = Math.min(1, minDistance / 25);
              flightMs = Math.round(100 + distRatio * 150);
              duration = flightMs + 300;
            } else if (unit.cardNo === 13) {
              effectType = 'bite';
              duration = 260;
            }

            const primaryTarget = targetEnemy as CombatTarget;
            attackTargets.set(unit.id, primaryTarget);

            const dirSign = unit.owner === 'player' ? 1 : -1;
            const effectToX =
              unit.hitRange !== undefined && minDistance > unit.hitRange
                ? unit.x + dirSign * unit.hitRange
                : primaryTarget.x;

            newAttackEffects.push({
              id: `atk_${now}_${Math.random().toString(36).substring(2, 7)}`,
              attackerId: unit.id,
              fromX: unit.x,
              toX: effectToX,
              lane: unit.lane ?? unit.y,
              toLane: primaryTarget.lane ?? primaryTarget.y,
              fromY: unit.y,
              toY: primaryTarget.y,
              owner: unit.owner,
              effectType,
              damage: attack,
              createdAt: now,
              duration,
              flightDuration: flightMs,
            });

            if (unit.cardNo === 6 && flightMs) {
              newPendingHits.push({
                id: `lhit_${now}_${Math.random().toString(36).substring(2, 7)}`,
                targetId: primaryTarget.id,
                attackerId: unit.id,
                x: primaryTarget.x,
                lane: unit.lane ?? unit.y,
                damage: attack,
                stunDuration: 1200,
                hitTime: now + flightMs,
              });
            }
          }
        }
      } else {
        isCharging = false;
        chargeStartTime = undefined;
      }

      const obstacleDist = blockingObstacle
        ? unit.owner === 'player'
          ? blockingObstacle.x - unit.x
          : unit.x - blockingObstacle.x
        : 999;
      const canMoveDuringCharge = Boolean(unit.canMoveWhileCharging && isCharging);
      const canMoveWhileAttacking =
        (Boolean(unit.isCircularRange || unit.cardNo === 8) && obstacleDist > 8.0) ||
        canMoveDuringCharge ||
        Boolean(
          unit.scoutTargetUnitId &&
            targetEnemy &&
            !isWithinEngageY((targetEnemy as CombatTarget).y, unit.y)
        );

      if (!canMoveWhileAttacking) {
        // 交戦中で立ち止まっていても矢印タイルには流される
        const pushed = unit.isHolding
          ? { x: unit.x, y: unit.y, lane: unit.lane, kickVx: 0, kickVy: 0, spin: unit.spin }
          : applyRoadPush(unit, unit.x, unit.y, unit.lane ?? unit.y, dt, footOffsetY(unit.distanceTraveled || 0, unit.owner));
        return {
          ...unit,
          ...pushed,
          attackCooldown: cooldown,
          lastAttackEffectTime: lastAttack,
          isCharging,
          chargeStartTime,
          isHolding: Boolean(unit.isHolding),
          isScouting: unit.isScouting,
          scoutProgress: unit.scoutProgress,
          scoutTargetUnitId: unit.scoutTargetUnitId,
          isJumping: false,
          jumpProgress: 0,
          isSliding: false,
          isPushed: false,
          isPushing: false,
          isAttackingObstacle: false,
        };
      }
    } else {
      if (isCharging && !unit.isAttackingObstacle) {
        isCharging = false;
        chargeStartTime = undefined;
      }
    }

    // 敵陣最奥に到達しているか？
    const isAtBase = unit.owner === 'player' ? x >= 94 : x <= 6;
    if (isAtBase) {
      const windup = unit.attackWindup || 0;
      let baseCharging = unit.isCharging || false;
      let baseChargeStart = unit.chargeStartTime;

      if (cooldown <= 0) {
        if (windup > 0 && !baseCharging) {
          baseCharging = true;
          baseChargeStart = now;
        } else {
          const chargeElapsed =
            baseCharging && baseChargeStart ? (now - baseChargeStart) / 1000 : 0;
          if (windup === 0 || chargeElapsed >= windup) {
            baseCharging = false;
            baseChargeStart = undefined;
            cooldown = unit.attackInterval;
            lastAttack = now;
            const targetBaseX = unit.owner === 'player' ? 98 : 2;
            let effectType: AttackEffectType = 'base_hit';
            let duration = 320;
            let baseFlightMs: number | undefined;

            if (unit.cardNo === 11) {
              effectType = 'fireball';
              duration = 1350;
            } else if (unit.cardNo === 6) {
              effectType = 'lightning';
              const baseDist = Math.abs(unit.x - targetBaseX);
              const distRatio = Math.min(1, baseDist / LIGHTNING_MAX_RANGE);
              baseFlightMs = Math.round(
                LIGHTNING_FLIGHT_MIN_MS +
                  distRatio * (LIGHTNING_FLIGHT_MAX_MS - LIGHTNING_FLIGHT_MIN_MS)
              );
              duration = baseFlightMs + 450;
            } else if (unit.cardNo === 8) {
              effectType = 'shuriken';
              const baseDist = Math.abs(unit.x - targetBaseX);
              const distRatio = Math.min(1, baseDist / 16);
              baseFlightMs = Math.round(110 + distRatio * 110);
              duration = baseFlightMs + 320;
            } else if (unit.cardNo === 12) {
              effectType = 'arrow';
              const baseDist = Math.abs(unit.x - targetBaseX);
              const distRatio = Math.min(1, baseDist / 25);
              baseFlightMs = Math.round(100 + distRatio * 150);
              duration = baseFlightMs + 300;
            } else if (unit.cardNo === 13) {
              effectType = 'bite';
              duration = 260;
            }

            newAttackEffects.push({
              id: `atk_base_${now}_${Math.random().toString(36).substring(2, 7)}`,
              attackerId: unit.id,
              fromX: unit.x,
              toX: targetBaseX,
              lane: unit.lane ?? unit.y,
              fromY: unit.y,
              toY: unit.y,
              owner: unit.owner,
              effectType,
              damage: attack,
              createdAt: now,
              duration,
              flightDuration: baseFlightMs,
            });

            if (unit.cardNo === 6 && baseFlightMs) {
              newPendingHits.push({
                id: `lhit_base_${now}_${Math.random().toString(36).substring(2, 7)}`,
                targetId: unit.owner === 'player' ? 'cpu' : 'player',
                attackerId: unit.id,
                x: targetBaseX,
                lane: unit.lane ?? unit.y,
                damage: attack,
                stunDuration: 0,
                hitTime: now + baseFlightMs,
              });
            } else {
              if (unit.owner === 'player') {
                pDamageToCpu += attack;
              } else {
                cpuDamageToPlayer += attack;
              }
            }

            return {
              ...unit,
              hp: 0,
              attackCooldown: cooldown,
              lastAttackEffectTime: lastAttack,
              isCharging: false,
              chargeStartTime: undefined,
              isJumping: false,
              jumpProgress: 0,
              isSliding: false,
              isPushed: false,
              isPushing: false,
              isAttackingObstacle: false,
            };
          }
        }
      } else {
        baseCharging = false;
        baseChargeStart = undefined;
      }
      return {
        ...unit,
        attackCooldown: cooldown,
        lastAttackEffectTime: lastAttack,
        isCharging: baseCharging,
        chargeStartTime: baseChargeStart,
        isJumping: false,
        jumpProgress: 0,
        isSliding: false,
        isPushed: false,
        isPushing: false,
        isAttackingObstacle: false,
      };
    }

    // 忍びアサシン（cardNo: 8）疾走判定＆ホールド判定
    const enemiesInFrontLane = unitsAfterHits.filter(
      (u) =>
        isWithinEngageY(u.y, unit.y) &&
        u.owner !== unit.owner &&
        u.hp > 0 &&
        (unit.owner === 'player' ? u.x > unit.x - 2 : u.x < unit.x + 2)
    );
    const isCpuHolding = shouldCpuUnitHoldForStampede(unit, stampede);
    let isScouting = Boolean(unit.isScouting);
    let scoutProgress = unit.scoutProgress;
    let scoutTargetUnitId = unit.scoutTargetUnitId;

    if (isScouting) {
      const nextProgress = (scoutProgress ?? 0) + dt / SCOUT_SWEEP_DURATION_SEC;
      scoutProgress = nextProgress;

      // 現在のスキャン角度 (度数法): プレイヤー正面=0度, 上=-80度, 下=+80度
      const currentAngleDeg = SCOUT_START_ANGLE_DEG + nextProgress * SCOUT_TOTAL_ANGLE_DEG;

      // 扇形スキャンビーム内の敵探索
      const detectedEnemy = unitsAfterHits.find((e) => {
        if (e.owner === unit.owner || e.hp <= 0) return false;
        // プレイヤー基準: 前方(dx > -1)
        const dx = unit.owner === 'player' ? e.x - unit.x : unit.x - e.x;
        const dy = e.y - unit.y;
        if (dx < -1) return false;
        const dist = Math.hypot(dx, dy);
        if (dist > unit.range) return false;

        const enemyAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        const angleDiff = Math.abs(enemyAngleDeg - currentAngleDeg);
        if (angleDiff > SCOUT_BEAM_TOLERANCE_DEG) return false;

        return hasLineOfSight(
          unit.x,
          unit.y,
          e.x,
          e.y,
          obstacles,
          {
            isStructure: false,
            isStealthCapable: isStealthCapableCard(e.cardNo),
            isSpotted: e.isSpotted,
            isCloudSpotted: e.isCloudSpotted,
          },
          clouds
        );
      });

      if (detectedEnemy) {
        // 敵を探知！索敵終了 -> その敵へ向かって前進開始
        isScouting = false;
        scoutProgress = undefined;
        scoutTargetUnitId = detectedEnemy.id;
      } else if (nextProgress >= 1.0) {
        // スキャン完了 (160度掃引して敵未発見) -> 待機状態に戻る
        isScouting = false;
        scoutProgress = undefined;
      }
    }

    const isHolding =
      (unit.owner === 'player' && (Boolean(unit.isHolding) || isScouting)) && !scoutTargetUnitId
        ? true
        : (unit.owner === 'player' && Boolean(unit.isHolding) && !scoutTargetUnitId) || isCpuHolding;

    let holdDuration = unit.holdDuration || 0;
    let hasAmbushCharge = Boolean(unit.hasAmbushCharge);
    if (isScouting) {
      holdDuration = 0;
      hasAmbushCharge = false;
    } else if (isHolding) {
      holdDuration += dt;
      if (holdDuration >= HOLD_AMBUSH_CHARGE_TIME_SEC) {
        hasAmbushCharge = true;
      }
    } else if (!unit.ambushDashUntil || now >= unit.ambushDashUntil) {
      holdDuration = 0;
    }

    const isAmbushDashing =
      !isHolding && Boolean(unit.ambushDashUntil && now < unit.ambushDashUntil);
    const isSprinting =
      !isHolding && unit.cardNo === 8 && enemiesInFrontLane.length === 0 && !unit.isSpotted;

    // 移動計算 (X軸方向 & 障害物・味方インタラクション)
    const obsAction = unit.obstacleAction ?? 'block';
    const isFlying = isFlyingCard(unit.cardNo);
    const terrain = getTerrainAt(x, unit.y);

    let speedMult = 1.0;
    if (terrain) {
      if (terrain.type === 'swamp') {
        if (!isFlying) speedMult = terrain.speedMultiplier;
      } else if (terrain.type === 'road') {
        speedMult = terrain.speedMultiplier;
      }
    }

    let currentSpeed = (isSprinting ? unit.speed * 3 : unit.speed) * speedMult;
    if (isAmbushDashing) {
      currentSpeed *= HOLD_AMBUSH_DASH_SPEED_MULTIPLIER;
    }
    let moveDelta = isHolding ? 0 : currentSpeed * MOVE_SPEED_SCALE * dt;
    y = unit.y;
    let updatedLane = unit.lane ?? unit.y;

    let isJumping = false;
    let jumpProgress = 0;
    let isSliding = false;
    let isAttackingObstacle = false;
    let maxXMove = x;

    const scoutTarget = scoutTargetUnitId
      ? unitsAfterHits.find((u) => u.id === scoutTargetUnitId && u.hp > 0)
      : null;

    let scoutTargetDx = 0;
    let scoutTargetDy = 0;
    let scoutTargetDist = 0;
    if (scoutTarget) {
      scoutTargetDx = scoutTarget.x - x;
      scoutTargetDy = scoutTarget.y - y;
      scoutTargetDist = Math.hypot(scoutTargetDx, scoutTargetDy);
      const inLaneReach = isWithinEngageY(scoutTarget.y, y);
      const isCloseEnough =
        scoutTargetDist < 2.5 || (inLaneReach && Math.abs(scoutTargetDx) <= unit.range);
      if (isCloseEnough) {
        scoutTargetUnitId = undefined;
      }
    } else if (scoutTargetUnitId) {
      // ターゲット敵が死亡・消失
      scoutTargetUnitId = undefined;
    }

    if (!isHolding) {
      let allyToOvertake: Unit | null = null;
      if (obsAction === 'slide' || obsAction === 'jump') {
        let bestDist = 999;
        for (const u of unitsAfterHits) {
          if (u.owner !== unit.owner || u.id === unit.id || u.hp <= 0) continue;
          const sameLaneOrColliding =
            isWithinCollisionY(u.y, y) ||
            (unit.lane !== undefined && isWithinCollisionY(u.y, unit.lane));
          if (!sameLaneOrColliding) continue;

          const fwdDist = unit.owner === 'player' ? u.x - unit.x : unit.x - u.x;
          const isStartingOvertake =
            fwdDist >= 0 &&
            fwdDist <= ALLY_MIN_GAP + 1.5 &&
            (currentSpeed > u.speed ||
              Boolean(u.isHolding) ||
              isAllyStopped(u) ||
              fwdDist <= ALLY_MIN_GAP + 0.2);
          const isContinuingOvertake =
            (Boolean(unit.isSliding) || Boolean(unit.isJumping)) &&
            fwdDist >= -(ALLY_MIN_GAP + 0.5) &&
            fwdDist <= ALLY_MIN_GAP + 1.5;

          if ((isStartingOvertake || isContinuingOvertake) && Math.abs(fwdDist) < bestDist) {
            bestDist = Math.abs(fwdDist);
            allyToOvertake = u;
          }
        }

        if (allyToOvertake) {
          const minOvertakeSpeed =
            obsAction === 'jump' ? allyToOvertake.speed + 3.0 : allyToOvertake.speed + 2.0;
          const boostedSpeed = Math.max(currentSpeed, minOvertakeSpeed);
          moveDelta = boostedSpeed * MOVE_SPEED_SCALE * dt;
        }
      }

      if (scoutTarget && scoutTargetUnitId && scoutTargetDist > 0) {
        const dirX = scoutTargetDx / scoutTargetDist;
        const dirY = scoutTargetDy / scoutTargetDist;
        const step = currentSpeed * MOVE_SPEED_SCALE * dt;
        const forwardBias =
          unit.owner === 'player' ? Math.max(0.15, dirX) : Math.min(-0.15, dirX);
        maxXMove = x + forwardBias * step;
        y = Math.max(8, Math.min(92, y + dirY * step));
        moveDelta = Math.hypot(forwardBias * step, dirY * step);
      } else {
        maxXMove = unit.owner === 'player' ? x + moveDelta : x - moveDelta;
      }

      if (blockingObstacle) {
        const enemyWall =
          unit.owner === 'player'
            ? (blockingObstacle as CombatTarget).x - 7.5
            : (blockingObstacle as CombatTarget).x + 7.5;
        maxXMove =
          unit.owner === 'player'
            ? Math.min(maxXMove, enemyWall)
            : Math.max(maxXMove, enemyWall);
      }

      if (targetAlly && obsAction === 'block') {
        const allyWall =
          unit.owner === 'player'
            ? (targetAlly as Unit).x - ALLY_MIN_GAP
            : (targetAlly as Unit).x + ALLY_MIN_GAP;
        maxXMove =
          unit.owner === 'player' ? Math.min(maxXMove, allyWall) : Math.max(maxXMove, allyWall);
      }

      // 物理的な壁として移動をブロックする障害物（岩・結晶など）のみ衝突判定
      // ※ 茂み（bush）は視界を遮るが自由に通り抜け可能（LoL仕様）
      const solidObstacles = obstacles.filter(isObstacleSolid);
      let nearestObs: FieldObstacle | null = null;
      let minObsFwdDist = 999;

      for (const obs of solidObstacles) {
        if (Math.abs(y - obs.y) <= obs.radiusY + 2.0) {
          const fwdDist = unit.owner === 'player' ? obs.x - unit.x : unit.x - obs.x;
          const extraReach =
            (obsAction === 'smash' || obsAction === 'block') &&
            targetAlly &&
            minAllyDist <= ALLY_MIN_GAP + 1.5
              ? ALLY_MIN_GAP + 1.5
              : 0;
          if (fwdDist >= -obs.radiusX - 2.5 && fwdDist <= obs.radiusX + 3.0 + extraReach) {
            if (fwdDist < minObsFwdDist) {
              minObsFwdDist = fwdDist;
              nearestObs = obs;
            }
          }
        }
      }

      if (nearestObs) {
        if (obsAction === 'smash') {
          const contactDist =
            unit.owner === 'player' ? nearestObs.x - unit.x : unit.x - nearestObs.x;
          const extraSmashReach =
            targetAlly && minAllyDist <= ALLY_MIN_GAP + 1.5 ? ALLY_MIN_GAP + 1.0 : 0;
          if (
            contactDist <= nearestObs.radiusX + 1.5 + extraSmashReach &&
            contactDist >= -nearestObs.radiusX
          ) {
            const smashDamage = Math.max(60, unit.attack * 30);
            const curHp = nearestObs.hp ?? 80;
            const nextHp = Math.max(0, curHp - smashDamage);
            nearestObs.hp = nextHp;
            nearestObs.lastHitTime = now;
            obstacleMutated = true;

            if (nextHp <= 0 && !nearestObs.isDestroyed) {
              nearestObs.isDestroyed = true;
              newAttackEffects.push({
                id: `smash_${now}_${Math.random().toString(36).substring(2, 7)}`,
                attackerId: unit.id,
                fromY: nearestObs.y,
                toY: nearestObs.y,
                fromX: unit.x,
                toX: nearestObs.x,
                owner: unit.owner,
                effectType: 'headbutt',
                damage: unit.attack,
                createdAt: now,
                duration: 400,
              });
            }
          }
        } else if (obsAction === 'jump') {
          const jumpDist =
            unit.owner === 'player' ? nearestObs.x - unit.x : unit.x - nearestObs.x;
          const totalSpan = nearestObs.radiusX * 2 + 5.0;
          const progress = Math.max(
            0,
            Math.min(1.0, 1.0 - (jumpDist + nearestObs.radiusX + 2.5) / totalSpan)
          );
          isJumping = true;
          jumpProgress = progress;
        } else if (obsAction === 'slide') {
          const slideDist =
            unit.owner === 'player' ? nearestObs.x - unit.x : unit.x - nearestObs.x;
          if (slideDist <= nearestObs.radiusX + 2.5 && slideDist >= -nearestObs.radiusX - 2.0) {
            isSliding = true;
            const avoidUp = y <= nearestObs.y;
            const targetY = avoidUp
              ? Math.max(12, nearestObs.y - (nearestObs.radiusY + 3.0))
              : Math.min(88, nearestObs.y + (nearestObs.radiusY + 3.0));
            y += (targetY - y) * Math.min(1.0, dt * 7.0);
          }
        } else {
          const hasSmashBehind = unitsAfterHits.some((u) => {
            if (u.owner !== unit.owner || u.id === unit.id || u.hp <= 0) return false;
            if ((u.obstacleAction ?? 'block') !== 'smash') return false;
            if (!isWithinCollisionY(u.y, unit.y)) return false;
            const behindDist = unit.owner === 'player' ? unit.x - u.x : u.x - unit.x;
            return behindDist > 0 && behindDist <= ALLY_MIN_GAP + 1.5;
          });
          const blockDist =
            unit.owner === 'player' ? nearestObs.x - unit.x : unit.x - nearestObs.x;
          if (!hasSmashBehind && blockDist >= 0 && blockDist <= nearestObs.radiusX + 1.5) {
            const obsWall =
              unit.owner === 'player'
                ? nearestObs.x - nearestObs.radiusX - 1.2
                : nearestObs.x + nearestObs.radiusX + 1.2;
            if (unit.owner === 'player') {
              maxXMove = Math.min(maxXMove, obsWall);
            } else {
              maxXMove = Math.max(maxXMove, obsWall);
            }
          }

          const actualAdvance = Math.abs(maxXMove - x);
          const maxObsAttackDist = nearestObs.radiusX + 2.0 + (targetAlly ? ALLY_MIN_GAP : 0);
          if (
            !hasSmashBehind &&
            blockDist >= -1.0 &&
            blockDist <= maxObsAttackDist &&
            actualAdvance < moveDelta * 0.5
          ) {
            isAttackingObstacle = true;
            const obsWindup = Math.min(unit.attackWindup || 0.35, 0.5);
            const obsInterval = Math.min(unit.attackInterval || 1.5, 1.5);

            if (cooldown <= 0) {
              if (obsWindup > 0 && !isCharging) {
                isCharging = true;
                chargeStartTime = now;
              } else {
                const chargeElapsed =
                  isCharging && chargeStartTime ? (now - chargeStartTime) / 1000 : 0;
                if (obsWindup === 0 || chargeElapsed >= obsWindup) {
                  isCharging = false;
                  chargeStartTime = undefined;
                  cooldown = obsInterval;
                  lastAttack = now;

                  const obsAtkPower = Math.max(1, unit.attack);
                  const obsHitDamage = Math.max(28, obsAtkPower * 22);
                  const curHp = nearestObs.hp ?? 80;
                  const nextHp = Math.max(0, curHp - obsHitDamage);
                  nearestObs.hp = nextHp;
                  nearestObs.lastHitTime = now;
                  obstacleMutated = true;

                  if (nextHp <= 0 && !nearestObs.isDestroyed) {
                    nearestObs.isDestroyed = true;
                  }

                  let obsEffectType: AttackEffectType = 'tackle';
                  if (unit.cardNo === 1 || unit.cardNo === 13) obsEffectType = 'bite';
                  else if (unit.cardNo === 6) obsEffectType = 'lightning';
                  else if (unit.cardNo === 12) obsEffectType = 'arrow';

                  newAttackEffects.push({
                    id: `obs_atk_${now}_${Math.random().toString(36).substring(2, 7)}`,
                    attackerId: unit.id,
                    fromX: unit.x,
                    toX: nearestObs.x,
                    lane: unit.lane ?? unit.y,
                    toLane: nearestObs.y,
                    fromY: unit.y,
                    toY: nearestObs.y,
                    owner: unit.owner,
                    effectType: obsEffectType,
                    damage: obsAtkPower,
                    createdAt: now,
                    duration: 320,
                  });
                }
              }
            }
          }
        }
      } else if (allyToOvertake) {
        const allyFwdDist =
          unit.owner === 'player' ? allyToOvertake.x - unit.x : unit.x - allyToOvertake.x;
        if (obsAction === 'jump') {
          const totalSpan = ALLY_MIN_GAP + 1.5 + (ALLY_MIN_GAP + 0.5);
          const progress = Math.max(
            0,
            Math.min(1.0, 1.0 - (allyFwdDist + ALLY_MIN_GAP + 0.5) / totalSpan)
          );
          isJumping = true;
          jumpProgress = progress;
        } else if (obsAction === 'slide') {
          isSliding = true;
          let avoidUp: boolean;
          if (Math.abs(y - allyToOvertake.y) > 0.35) {
            avoidUp = y < allyToOvertake.y;
          } else if (allyToOvertake.y <= 22) {
            avoidUp = false;
          } else if (allyToOvertake.y >= 78) {
            avoidUp = true;
          } else {
            avoidUp = unit.id.charCodeAt(unit.id.length - 1) % 2 === 0;
          }
          const slideOffset = COLLISION_HALF_WIDTH_Y + 1.4;
          const targetY = avoidUp
            ? Math.max(12, allyToOvertake.y - slideOffset)
            : Math.min(88, allyToOvertake.y + slideOffset);
          y += (targetY - y) * Math.min(1.0, dt * 8.0);
        }
      } else {
        if (updatedLane !== undefined && Math.abs(y - updatedLane) > 0.4) {
          const hasAllyBesideOnLane = unitsAfterHits.some(
            (u) =>
              u.owner === unit.owner &&
              u.id !== unit.id &&
              u.hp > 0 &&
              Math.abs(u.x - unit.x) < ALLY_MIN_GAP &&
              isWithinCollisionY(u.y, updatedLane as number)
          );
          if (!hasAllyBesideOnLane) {
            y += (updatedLane - y) * Math.min(1.0, dt * 2.5);
          }
        }
      }
    }

    if (!isAttackingObstacle && unit.isAttackingObstacle && !targetEnemy) {
      isCharging = false;
      chargeStartTime = undefined;
    }

    x = unit.owner === 'player' ? Math.min(95, maxXMove) : Math.max(5, maxXMove);
    distance += moveDelta;

    // 街道パネルの微弱な押し出し＋回転時のバースト加速
    const pushed = isHolding
      ? { x, y, lane: updatedLane, kickVx: 0, kickVy: 0, spin: unit.spin }
      : applyRoadPush(unit, x, y, updatedLane, dt, footOffsetY(distance, unit.owner));
    ({ x, y, lane: updatedLane } = pushed);

    if (unit.cardNo === 2) {
      const bonus = Math.min(2, Math.floor(distance / 20));
      attack = shibaBaseAtk + bonus;
    }

    return {
      ...unit,
      x,
      y,
      lane: updatedLane,
      kickVx: pushed.kickVx,
      kickVy: pushed.kickVy,
      spin: pushed.spin,
      attack,
      distanceTraveled: distance,
      attackCooldown: cooldown,
      lastAttackEffectTime: lastAttack,
      isCharging,
      chargeStartTime,
      isHolding,
      holdDuration,
      hasAmbushCharge,
      ambushDashUntil: unit.ambushDashUntil,
      isScouting,
      scoutProgress,
      scoutTargetUnitId,
      isSprinting,
      isJumping,
      jumpProgress,
      isSliding,
      isPushed: false,
      isPushing: false,
      isAttackingObstacle,
    };
  });
  clearRoadTurned();

  return {
    rawUpdatedUnits,
    newAttackEffects,
    newPendingHits,
    attackTargets,
    pDamageToCpu,
    cpuDamageToPlayer,
    obstacleMutated,
  };
}

/**
 * smashユニット（イノシシ・ドラゴン）による前方味方の押し出し（プッシュ）解決パス
 */
export function resolveSmashPush(
  rawUpdatedUnits: Unit[],
  unitsAfterHits: Unit[],
  inhibitors: Inhibitor[]
): Unit[] {
  const updatedUnits = [...rawUpdatedUnits];
  const isAllyStopped = (ally: Unit) => isAllyUnitStopped(ally, unitsAfterHits, inhibitors);

  for (const owner of ['player', 'cpu'] as const) {
    const dir = owner === 'player' ? 1 : -1;
    const ownerIndices = updatedUnits
      .map((u, idx) => ({ u, idx }))
      .filter(({ u }) => u.owner === owner && u.hp > 0)
      .sort((a, b) => (owner === 'player' ? a.u.x - b.u.x : b.u.x - a.u.x))
      .map(({ idx }) => idx);

    // Pass 1 (後方から前方へ): smashユニット（または連鎖で押された味方）が前方の味方をグイグイ押し出す
    for (let i = 0; i < ownerIndices.length; i++) {
      const pusherIdx = ownerIndices[i];
      const pusher = updatedUnits[pusherIdx];
      const pusherAction = pusher.obstacleAction ?? 'block';
      const canPush =
        (pusherAction === 'smash' || Boolean(pusher.isPushed)) &&
        !pusher.isStunned &&
        !pusher.isHolding &&
        !isAllyStopped(pusher);
      if (!canPush) continue;

      for (let j = i + 1; j < ownerIndices.length; j++) {
        const frontIdx = ownerIndices[j];
        const front = updatedUnits[frontIdx];
        if (isAllyStopped(front) || front.isJumping || front.isSliding) continue;
        if (!isWithinCollisionY(front.y, pusher.y)) continue;

        const gap = dir * (front.x - pusher.x);
        if (gap >= -2.0 && gap < ALLY_MIN_GAP) {
          let frontMaxAllowedX = owner === 'player' ? 95 : 5;
          for (const enemy of unitsAfterHits) {
            if (enemy.owner === owner || enemy.hp <= 0) continue;
            if (!isWithinCollisionY(enemy.y, front.y)) continue;
            const eDist = dir * (enemy.x - front.x);
            if (eDist >= -1) {
              const wallX = enemy.x - dir * 7.5;
              frontMaxAllowedX =
                owner === 'player'
                  ? Math.min(frontMaxAllowedX, wallX)
                  : Math.max(frontMaxAllowedX, wallX);
            }
          }
          for (const inhib of inhibitors) {
            if (inhib.owner === owner || inhib.hp <= 0) continue;
            if (!inhibitorBlocksY(inhib, front.y)) continue;
            const iDist = dir * (inhib.x - front.x);
            if (iDist >= -1) {
              const wallX = inhib.x - dir * 7.5;
              frontMaxAllowedX =
                owner === 'player'
                  ? Math.min(frontMaxAllowedX, wallX)
                  : Math.max(frontMaxAllowedX, wallX);
            }
          }

          const desiredFrontX = pusher.x + dir * ALLY_MIN_GAP;
          const newFrontX =
            owner === 'player'
              ? Math.min(desiredFrontX, frontMaxAllowedX)
              : Math.max(desiredFrontX, frontMaxAllowedX);
          const pushedDelta = Math.max(0, dir * (newFrontX - front.x));
          const nextDist = (front.distanceTraveled || 0) + pushedDelta;
          let nextFrontAtk = front.attack;
          if (front.cardNo === 2) {
            const frontShibaBaseAtk = 1 + (front.isAmbushDeploy ? AMBUSH_DEPLOY_ATK_BONUS : 0);
            nextFrontAtk = frontShibaBaseAtk + Math.min(2, Math.floor(nextDist / 20));
          }

          updatedUnits[frontIdx] = {
            ...front,
            x: pushedDelta > 0 ? newFrontX : front.x,
            distanceTraveled: nextDist,
            attack: nextFrontAtk,
            isPushed: true,
          };
          updatedUnits[pusherIdx] = {
            ...updatedUnits[pusherIdx],
            isPushing: true,
          };
        }
      }
    }

    // Pass 2 (前方から後方へ): 前方の味方が敵壁等で止まった場合、後方のプッシュ元も重ならないようクランプ
    for (let i = ownerIndices.length - 1; i >= 0; i--) {
      const front = updatedUnits[ownerIndices[i]];
      if (isAllyStopped(front) || front.isJumping || front.isSliding) continue;

      for (let j = i - 1; j >= 0; j--) {
        const backIdx = ownerIndices[j];
        const back = updatedUnits[backIdx];
        const backAction = back.obstacleAction ?? 'block';
        if (
          isAllyStopped(back) ||
          back.isJumping ||
          back.isSliding ||
          backAction === 'slide' ||
          backAction === 'jump'
        ) {
          continue;
        }
        if (!isWithinCollisionY(front.y, back.y)) continue;

        const gap = dir * (front.x - back.x);
        if (gap >= -2.0 && gap < ALLY_MIN_GAP) {
          const clampedBackX = front.x - dir * ALLY_MIN_GAP;
          const nextBackX =
            owner === 'player'
              ? Math.min(back.x, clampedBackX)
              : Math.max(back.x, clampedBackX);
          updatedUnits[backIdx] = {
            ...back,
            x: nextBackX,
          };
        }
      }
    }
  }

  return updatedUnits;
}

/**
 * ユニット同士の攻撃ダメージ・巻き込み・ノックバック・インヒビター被害・キル成長を解決する
 */
export function resolveCombatDamageAndInhibitors(params: {
  updatedUnits: Unit[];
  attackTargets: Map<string, CombatTarget>;
  resolvedHits: PendingLightningHit[];
  inhibitors: Inhibitor[];
  now: number;
}): {
  finalUnits: Unit[];
  nextInhibitors: Inhibitor[];
  inhibitorDestroyedBy: Owner[];
} {
  const { updatedUnits, attackTargets, resolvedHits, inhibitors, now } = params;
  const killCountMap = new Map<string, number>();

  const unitsAfterDamage = updatedUnits.map((unit) => {
    let currentHp = unit.hp;
    let stunnedUntil = unit.isStunnedUntil;
    let x = unit.x;
    let hasSpellShield = unit.hasSpellShield;

    updatedUnits.forEach((attacker) => {
      if (attacker.owner === unit.owner || attacker.lastAttackEffectTime !== now) return;
      if (attacker.cardNo === 6) return; // クラゲは遅延着弾なのでスキップ
      const primary = attackTargets.get(attacker.id);
      if (!primary || primary.isStructure) return;

      const isPrimary = primary.id === unit.id;
      const dist = attacker.owner === 'player' ? unit.x - attacker.x : attacker.x - unit.x;
      if (attacker.hitRange !== undefined && dist > attacker.hitRange) return;
      const isAreaAttacker = attacker.hitRange !== undefined;
      const splashReach = isAreaAttacker ? (attacker.hitRange as number) : attacker.range + 2;
      const isSplash =
        isAreaAttacker &&
        isWithinEngageY(unit.y, primary.y, 4.0) &&
        dist >= -2 &&
        dist <= splashReach;

      if (isPrimary || isSplash) {
        if (hasSpellShield) {
          hasSpellShield = false;
          return;
        }
        const hadHp = currentHp > 0;
        const hasAmbushBonus = Boolean(
          attacker.hasAmbushCharge || (attacker.ambushDashUntil && now < attacker.ambushDashUntil)
        );
        const effectiveAttack = hasAmbushBonus
          ? attacker.attack + HOLD_AMBUSH_ATTACK_BONUS
          : attacker.attack;
        const dealt =
          isAreaAttacker && !isPrimary
            ? Math.round(effectiveAttack * AREA_SPLASH_DAMAGE_RATIO)
            : effectiveAttack;
        currentHp -= dealt;
        if (hadHp && currentHp <= 0) {
          killCountMap.set(attacker.id, (killCountMap.get(attacker.id) || 0) + 1);
        }

        if (attacker.cardNo === 7) {
          const pushBackAmount = 3 + Math.random();
          if (attacker.owner === 'player') {
            x = Math.min(95, x + pushBackAmount);
          } else {
            x = Math.max(5, x - pushBackAmount);
          }
          stunnedUntil = now + 300;
        }
      }
    });

    const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
    return {
      ...unit,
      hp: currentHp,
      x,
      isStunnedUntil: stunnedUntil,
      isStunned: isUnitStunned,
      hasSpellShield,
    };
  });

  // インヒビター＆中立スカトルへのダメージ
  const inhibitorDamage = new Map<string, number>();
  const inhibitorLastAttacker = new Map<string, Unit>();
  updatedUnits.forEach((attacker) => {
    if (attacker.lastAttackEffectTime !== now || attacker.cardNo === 6) return;
    const primary = attackTargets.get(attacker.id);
    if (primary && primary.isStructure) {
      inhibitorDamage.set(primary.id, (inhibitorDamage.get(primary.id) || 0) + attacker.attack);
      inhibitorLastAttacker.set(primary.id, attacker);
    }
  });
  for (const hit of resolvedHits) {
    if (hit.targetId.startsWith('inhib_')) {
      inhibitorDamage.set(hit.targetId, (inhibitorDamage.get(hit.targetId) || 0) + hit.damage);
      const atk = updatedUnits.find((u) => u.id === hit.attackerId);
      if (atk) inhibitorLastAttacker.set(hit.targetId, atk);
    }
  }

  let nextInhibitors = inhibitors;
  const inhibitorDestroyedBy: Owner[] = [];
  const scuttleKilledBy: { side: Owner; x: number; y: number }[] = [];
  if (inhibitorDamage.size > 0) {
    nextInhibitors = inhibitors.map((inhib) => {
      const dmg = inhibitorDamage.get(inhib.id);
      if (!dmg || inhib.hp <= 0) return inhib;
      const hp = Math.max(0, inhib.hp - dmg);
      const lastAtk = inhibitorLastAttacker.get(inhib.id);
      if (hp === 0) {
        const killerSide: Owner =
          inhib.owner === 'neutral'
            ? (lastAtk?.owner ?? 'player')
            : inhib.owner === 'player'
            ? 'cpu'
            : 'player';
        inhibitorDestroyedBy.push(killerSide);
        if (inhib.owner === 'neutral') {
          scuttleKilledBy.push({ side: killerSide, x: inhib.x, y: inhib.y });
          if (lastAtk) {
            killCountMap.set(lastAtk.id, (killCountMap.get(lastAtk.id) || 0) + 1);
          }
          return { ...inhib, hp: 0, lastHitTime: now, respawnAt: now + SCUTTLE_RESPAWN_MS };
        }
      }
      return { ...inhib, hp, lastHitTime: now };
    });
  }

  // 生存ユニットにキルボーナス（吸血コウモリ成長など）・スカトルシュライン効果＆奇襲チャージ消費を適用
  const finalUnits = unitsAfterDamage
    .filter((u) => u.hp > 0)
    .map((unit) => {
      let updated = unit;
      if (
        unit.lastAttackEffectTime === now &&
        (unit.hasAmbushCharge || unit.ambushDashUntil)
      ) {
        updated = {
          ...updated,
          hasAmbushCharge: false,
          ambushDashUntil: undefined,
        };
      }

      for (const sc of scuttleKilledBy) {
        if (
          updated.owner === sc.side &&
          Math.hypot(updated.x - sc.x, updated.y - sc.y) <= SCUTTLE_SHRINE_RADIUS
        ) {
          updated = {
            ...updated,
            attackCooldown: 0,
            ambushDashUntil: now + 2000,
          };
        } else if (updated.owner !== sc.side && !updated.isSpotted) {
          updated = {
            ...updated,
            isSpotted: true,
            lastSpottedTime: now,
            isSprinting: false,
          };
        }
      }

      const kills = killCountMap.get(unit.id) || 0;
      if (kills > 0) {
        const newKillCount = (updated.killCount || 0) + kills;
        if (updated.cardNo === 9) {
          const bonusAtk = kills * 1;
          const bonusHp = kills * 1;
          const nextMaxHp = updated.maxHp + bonusHp;
          const nextHp = Math.min(nextMaxHp, updated.hp + bonusHp);
          return {
            ...updated,
            killCount: newKillCount,
            attack: updated.attack + bonusAtk,
            maxHp: nextMaxHp,
            hp: nextHp,
            lastKillTime: now,
          };
        }
        return {
          ...updated,
          killCount: newKillCount,
          lastKillTime: now,
        };
      }
      return updated;
    });

  return {
    finalUnits,
    nextInhibitors,
    inhibitorDestroyedBy,
  };
}
