import { DemoCard, Owner, Unit } from '../types';
import { HOUND_TOKEN_SPEC, SPAWN_MIN_SPACE } from '../cards';
import {
  clampPlayerSpawnX,
  clampSpawnY,
  isWithinCollisionY,
  isWithinEngageY,
  PLAYER_DEFAULT_SPAWN_X,
  PLAYER_SPAWN_X_MAX,
  PLAYER_SPAWN_X_MIN,
} from '../board';
import { AMBUSH_DEPLOY_ATK_BONUS, findPlayerAmbushObstacle } from '../obstacles';
import { PlayValidationResult, RealtimeGameState, SpawnTimestampRecord } from './engineTypes';

/**
 * プレイヤーが指定カードをプレイ可能かどうかの純粋バリデーション関数
 */
export function validateCanPlayCard(
  state: RealtimeGameState,
  cardIndex: number,
  spawnX?: number,
  spawnY?: number,
  now: number = Date.now()
): PlayValidationResult {
  if (state.gameResult !== 'playing') {
    return { canPlay: false, reason: 'ゲーム終了' };
  }
  const card = state.deckState.hand[cardIndex];
  if (!card) {
    return { canPlay: false, reason: 'カードが存在しません' };
  }
  if (now < state.playCooldownUntil) {
    return { canPlay: false, reason: 'クールダウン中...' };
  }
  if (state.playerMana < card.manaCost) {
    return { canPlay: false, reason: `マナ不足 (⚡${card.manaCost}必要)` };
  }
  // ユニーク制限: 炎のドラゴン（cardNo: 11）は場に1体まで
  if (card.cardNo === 11) {
    const hasDragon = state.units.some(
      (u) => u.owner === 'player' && u.cardNo === 11 && u.hp > 0
    );
    if (hasDragon) {
      return { canPlay: false, reason: '炎のドラゴンは場に1体まで' };
    }
  }
  // モンスターの出撃エリア＆出撃スペース制限 (横・縦)
  if (card.type === 'MONSTER') {
    if (spawnX !== undefined && (spawnX < PLAYER_SPAWN_X_MIN || spawnX > PLAYER_SPAWN_X_MAX)) {
      return { canPlay: false, reason: '自陣エリア外' };
    }
    if (spawnX !== undefined || spawnY !== undefined) {
      const targetX = spawnX !== undefined ? clampPlayerSpawnX(spawnX) : PLAYER_DEFAULT_SPAWN_X;
      const targetY = spawnY !== undefined ? clampSpawnY(spawnY) : 50;

      // 出撃スペース制限: 指定(X, Y)座標の直前・至近に味方モンスターがいる場合は前進するまで待機
      const hasBlockingAlly = state.units.some((u) => {
        if (u.owner !== 'player' || u.hp <= 0 || !isWithinCollisionY(u.y, targetY)) {
          return false;
        }
        if (spawnX !== undefined) {
          return Math.abs(u.x - targetX) < SPAWN_MIN_SPACE;
        }
        return u.x < 5 + SPAWN_MIN_SPACE;
      });
      if (hasBlockingAlly) {
        return { canPlay: false, reason: '出撃スペース不足' };
      }
    }
  }
  return { canPlay: true };
}

export interface SpawnMonsterParams {
  card: DemoCard;
  owner: Owner;
  spawnX: number;
  spawnY: number;
  opponentSpawnTimestamps: SpawnTimestampRecord[];
  now: number;
}

/**
 * モンスターカードから出撃ユニット群（狩人の場合は猟犬トークン含む）を生成する純粋関数
 */
export function createMonsterUnitsForSpawn(params: SpawnMonsterParams): Unit[] {
  const { card, owner, spawnX, spawnY, opponentSpawnTimestamps, now } = params;

  // カウンターデプロイ判定: 1.5秒以内に同じレーン(Y)に出撃した相手ユニットがいるか
  const isCounterDeploy = opponentSpawnTimestamps.some(
    (s) => isWithinEngageY(s.y, spawnY) && now - s.time <= 1500
  );

  let counterBonusHp = 0;
  let counterBonusInterval = 0;
  if (isCounterDeploy) {
    counterBonusHp += 1;
    counterBonusInterval = 0.2;
  }

  // プレイヤー側の立体遮蔽物エリアからの奇襲出撃（アンブッシュ）判定
  const isAmbushDeploy =
    owner === 'player' ? Boolean(findPlayerAmbushObstacle(spawnX, spawnY)) : false;
  const ambushBonusAtk = isAmbushDeploy ? AMBUSH_DEPLOY_ATK_BONUS : 0;

  const mainUnit: Unit = {
    id: `${owner}_${now}_${Math.random()}`,
    cardNo: card.cardNo,
    name: card.name,
    owner,
    x: spawnX,
    lane: spawnY,
    y: spawnY,
    maxHp: (card.life || 1) + counterBonusHp,
    hp: (card.life || 1) + counterBonusHp,
    attack: (card.attack ?? 1) + ambushBonusAtk,
    speed: card.speed || 10,
    range: card.range || 3,
    canMoveWhileCharging: card.canMoveWhileCharging,
    isCircularRange: card.isCircularRange,
    fanHalfAngleDeg: card.fanHalfAngleDeg,
    obstacleAction: card.obstacleAction,
    hasSpellShield: card.hasSpellShield,
    hitRange: card.hitRange,
    attackCooldown: 0,
    attackInterval: Math.max(0.1, (card.attackInterval ?? 1.0) - counterBonusInterval),
    attackWindup: card.attackWindup ?? 0,
    isCharging: false,
    chargeStartTime: undefined,
    icon: card.icon,
    distanceTraveled: 0,
    isCounterDeploy,
    isAmbushDeploy: owner === 'player' ? isAmbushDeploy : undefined,
    killCount: 0,
  };

  if (card.cardNo === 12) {
    const houndX =
      owner === 'player'
        ? Math.min(PLAYER_SPAWN_X_MAX, spawnX + 2.5)
        : 93; // CPU側前衛（左方向へ先行）
    const houndUnit: Unit = {
      id: `${owner}_hound_${now}_${Math.random()}`,
      cardNo: HOUND_TOKEN_SPEC.cardNo,
      name: HOUND_TOKEN_SPEC.name,
      owner,
      x: houndX,
      lane: spawnY,
      y: spawnY,
      maxHp: HOUND_TOKEN_SPEC.life + counterBonusHp,
      hp: HOUND_TOKEN_SPEC.life + counterBonusHp,
      attack: HOUND_TOKEN_SPEC.attack + ambushBonusAtk,
      speed: HOUND_TOKEN_SPEC.speed,
      range: HOUND_TOKEN_SPEC.range,
      hitRange: HOUND_TOKEN_SPEC.hitRange,
      obstacleAction: HOUND_TOKEN_SPEC.obstacleAction,
      attackCooldown: 0,
      attackInterval: Math.max(0.1, HOUND_TOKEN_SPEC.attackInterval - counterBonusInterval),
      attackWindup: HOUND_TOKEN_SPEC.attackWindup,
      isCharging: false,
      chargeStartTime: undefined,
      icon: HOUND_TOKEN_SPEC.icon,
      distanceTraveled: 0,
      isCounterDeploy,
      isAmbushDeploy: owner === 'player' ? isAmbushDeploy : undefined,
      killCount: 0,
    };
    return [mainUnit, houndUnit];
  }

  return [mainUnit];
}
