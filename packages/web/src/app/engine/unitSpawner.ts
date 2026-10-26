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
  SPAWN_Y_MAX,
} from '../board';
import { AMBUSH_DEPLOY_ATK_BONUS, findPlayerAmbushObstacle } from '../obstacles';
import { PlayValidationResult, RealtimeGameState, SpawnTimestampRecord } from './engineTypes';

/** 地上スライド射出時の基本摩擦減速度 (%/s^2) */
export const SLIDE_FRICTION = 140;

/** カードの重さ（HP）に応じたスライド距離倍率（軽量ほどよく滑り、重量級ほど手前で止まりやすい） */
export function getCardSlideWeightFactor(card: Pick<DemoCard, 'life'>): number {
  return Math.max(0.65, Math.min(1.2, 1.15 - (card.life ?? 3) * 0.06));
}

/** 手前(y=88%)からのドラッグ/ストローク量とカードの重さから奥方向(-Y)の初速(%/s)を算出 */
export function computeSlideLaunchVelocityY(
  card: Pick<DemoCard, 'life'>,
  targetY: number
): number {
  const strokeY = Math.max(0, SPAWN_Y_MAX - clampSpawnY(targetY));
  const dist = strokeY * getCardSlideWeightFactor(card);
  return dist > 0.5 ? -Math.sqrt(2 * SLIDE_FRICTION * dist) : 0;
}

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

      // 出撃スペース制限: 発射ライン(手前 y=88%)の同X座標付近に停止・歩行中の味方がいる場合は待機
      const hasBlockingAlly = state.units.some((u) => {
        if (
          u.owner !== 'player' ||
          u.hp <= 0 ||
          Math.abs(u.slideVy ?? 0) >= 5 ||
          !isWithinCollisionY(u.y, SPAWN_Y_MAX)
        ) {
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
  comboCount: number;
  opponentSpawnTimestamps: SpawnTimestampRecord[];
  now: number;
}

/**
 * モンスターカードから出撃ユニット群（狩人の場合は猟犬トークン含む）を生成する純粋関数
 */
export function createMonsterUnitsForSpawn(params: SpawnMonsterParams): Unit[] {
  const { card, owner, spawnX, spawnY, comboCount, opponentSpawnTimestamps, now } = params;

  // カウンターデプロイ判定: 1.5秒以内に同じレーン(Y)に出撃した相手ユニットがいるか
  const isCounterDeploy = opponentSpawnTimestamps.some(
    (s) => isWithinEngageY(s.y, spawnY) && now - s.time <= 1500
  );

  let comboBonusHp = 0;
  let comboBonusAtk = 0;
  if (comboCount >= 2) comboBonusHp += 1;
  if (comboCount >= 3) comboBonusAtk += 1;

  let counterBonusAtk = 0;
  let counterBonusInterval = 0;
  if (isCounterDeploy) {
    counterBonusAtk += 1;
    counterBonusInterval = 0.2;
  }

  // プレイヤーは常に手前(y=88%)から奥方向(-Y)へ地上スライド射出する
  const startY = owner === 'player' ? SPAWN_Y_MAX : spawnY;
  const slideVy = owner === 'player' ? computeSlideLaunchVelocityY(card, spawnY) : undefined;
  const slideVx = owner === 'player' && slideVy ? 0 : undefined;

  // プレイヤー側の立体遮蔽物エリアからの奇襲出撃（アンブッシュ）判定（滑走停止時にも再判定される）
  const isAmbushDeploy =
    owner === 'player' ? Boolean(findPlayerAmbushObstacle(spawnX, startY)) : false;
  const ambushBonusAtk = isAmbushDeploy ? AMBUSH_DEPLOY_ATK_BONUS : 0;

  const mainUnit: Unit = {
    id: `${owner}_${now}_${Math.random()}`,
    cardNo: card.cardNo,
    name: card.name,
    owner,
    x: spawnX,
    lane: startY,
    y: startY,
    maxHp: (card.life || 1) + comboBonusHp,
    hp: (card.life || 1) + comboBonusHp,
    attack: (card.attack || 1) + comboBonusAtk + counterBonusAtk + ambushBonusAtk,
    speed: card.speed || 10,
    range: card.range || 3,
    canMoveWhileCharging: card.canMoveWhileCharging,
    isCircularRange: card.isCircularRange,
    obstacleAction: card.obstacleAction,
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
    comboCount: comboCount > 1 ? comboCount : undefined,
    killCount: 0,
    slideVx,
    slideVy,
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
      lane: startY,
      y: startY,
      maxHp: HOUND_TOKEN_SPEC.life + comboBonusHp,
      hp: HOUND_TOKEN_SPEC.life + comboBonusHp,
      attack: HOUND_TOKEN_SPEC.attack + comboBonusAtk + counterBonusAtk + ambushBonusAtk,
      speed: HOUND_TOKEN_SPEC.speed,
      range: HOUND_TOKEN_SPEC.range,
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
      comboCount: comboCount > 1 ? comboCount : undefined,
      killCount: 0,
      slideVx,
      slideVy,
    };
    return [mainUnit, houndUnit];
  }

  return [mainUnit];
}
