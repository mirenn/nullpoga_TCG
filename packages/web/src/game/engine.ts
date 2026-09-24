import { DemoCard, Unit, SpellEffect, AttackEffect, AttackEffectType } from './types';

export const CARD_POOL: DemoCard[] = [
  {
    id: 'mouse',
    cardNo: 1,
    name: 'ネズミ',
    type: 'MONSTER',
    manaCost: 1,
    attack: 1,
    life: 1,
    speed: 8,
    range: 9,
    effectDesc: '足が速い低コストアタッカー。奇襲や時間稼ぎに。',
    icon: '🐭',
  },
  {
    id: 'cat',
    cardNo: 3,
    name: 'ネコ',
    type: 'MONSTER',
    manaCost: 1,
    attack: 2,
    life: 2,
    speed: 5,
    range: 9,
    effectDesc: 'バランスの取れた標準的な歩兵ユニット。',
    icon: '🐱',
  },
  {
    id: 'shiba',
    cardNo: 2,
    name: '柴犬ラン丸',
    type: 'MONSTER',
    manaCost: 2,
    attack: 1,
    life: 2,
    speed: 5,
    range: 9,
    effectDesc: '前進した距離に応じて攻撃力が上昇する（最大+4）。',
    icon: '🐕',
  },
  {
    id: 'turtle',
    cardNo: 5,
    name: '亀 (亀吉)',
    type: 'MONSTER',
    manaCost: 2,
    attack: 0,
    life: 7,
    speed: 2.5,
    range: 8,
    effectDesc: '高耐久の盾役。後ろの味方を守りながらじっくり進む。',
    icon: '🐢',
  },
  {
    id: 'jellyfish',
    cardNo: 6,
    name: '電気クラゲ',
    type: 'MONSTER',
    manaCost: 2,
    attack: 1,
    life: 2,
    speed: 3.5,
    range: 28,
    effectDesc: '遠距離から放電し、相手ユニットを1.2秒間スタン（麻痺）させる。',
    icon: '🪼',
  },
  {
    id: 'boar',
    cardNo: 7,
    name: 'イノシシ',
    type: 'MONSTER',
    manaCost: 3,
    attack: 3,
    life: 4,
    speed: 7,
    range: 9,
    effectDesc: '素早い突進力と高い火力を併せ持つ突破ユニット。攻撃ヒット時に相手をノックバックさせる。',
    icon: '🐗',
  },
  {
    id: 'dragon',
    cardNo: 11,
    name: '炎のドラゴン',
    type: 'MONSTER',
    manaCost: 5,
    attack: 5,
    life: 8,
    speed: 3.5,
    range: 32,
    effectDesc: '遠距離から強烈な火炎ブレスを浴びせ、大ダメージを与える。',
    icon: '🐉',
  },
  {
    id: 'meteor',
    cardNo: 101,
    name: '隕石落下',
    type: 'SPELL',
    manaCost: 3,
    effectDesc: '指定したレーンに隕石を落とし、範囲内の敵に4ダメージ。',
    icon: '☄️',
  },
  {
    id: 'fire_spell',
    cardNo: 106,
    name: '烈火の呪文',
    type: 'SPELL',
    manaCost: 4,
    effectDesc: '戦場全体を炎で包み、全レーンの敵ユニットに2ダメージ。',
    icon: '🔥',
  },
];

export const MANA_SPEED_PRESETS = [
  { label: '低速 (4.0秒/マナ)', value: 0.25, secPerMana: '4.0秒' },
  { label: '標準 (2.5秒/マナ)', value: 0.40, secPerMana: '2.5秒' },
  { label: '速め (1.8秒/マナ)', value: 0.55, secPerMana: '1.8秒' },
  { label: '高速 (1.3秒/マナ)', value: 0.75, secPerMana: '1.3秒' },
] as const;

export const DEFAULT_MANA_REGEN_PER_SEC = 0.40;
export const MOVE_SPEED_SCALE = 1.0;
export const PLAY_CARD_COOLDOWN_MS = 120;
export const SPAWN_MIN_SPACE = 8.0;

const MAX_MANA = 10;
const LIGHTNING_MAX_RANGE = 28;
const LIGHTNING_FLIGHT_MIN_MS = 220;
const LIGHTNING_FLIGHT_MAX_MS = 380;

export interface PendingLightningHit {
  id: string;
  targetId: string;
  attackerId: string;
  lane: number;
  damage: number;
  stunDuration: number;
  hitTime: number;
}

export interface GameState {
  playerHp: number;
  cpuHp: number;
  playerMana: number;
  cpuMana: number;

  units: Unit[];
  spellEffects: SpellEffect[];
  attackEffects: AttackEffect[];
  pendingLightningHits: PendingLightningHit[];
  gameResult: 'playing' | 'player_win' | 'cpu_win' | null;
}

export class GameEngine {
  public state: GameState;

  public readonly maxMana = MAX_MANA;
  public manaRegenRate = DEFAULT_MANA_REGEN_PER_SEC;

  private cpuActionTimer = 0;
  private manaTimer = 0;
  private currentTimeMs = 0;

  private random() {
    return Math.random();
  }

  private now() {
    return this.currentTimeMs;
  }

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      playerHp: 20,
      cpuHp: 20,
      playerMana: 3,
      cpuMana: 3,
      units: [],
      spellEffects: [],
      attackEffects: [],
      pendingLightningHits: [],
      gameResult: 'playing',
    };
  }

  public reset() {
    this.state = this.getInitialState();
    this.cpuActionTimer = 0;
    this.manaTimer = 0;
    this.currentTimeMs = 0;
  }

  public update(dt: number) {
    if (this.state.gameResult !== 'playing') {
      return;
    }

    this.currentTimeMs += dt * 1000;
    const now = this.now();

    this.manaTimer += dt;
    if (this.manaTimer >= 0.08) {
      const deltaMana = this.manaRegenRate * this.manaTimer;
      this.manaTimer = 0;
      this.state.playerMana = Math.min(MAX_MANA, this.state.playerMana + deltaMana);
      this.state.cpuMana = Math.min(MAX_MANA, this.state.cpuMana + deltaMana);
    }

    this.handleCpuAi(dt);
    this.updateUnits(dt);
    this.processPendingHits(now);
    this.cleanupEffects(now);
  }

  private handleCpuAi(dt: number) {
    this.cpuActionTimer += dt;
    if (this.cpuActionTimer >= 2.5) {
      this.cpuActionTimer = 0;
      const currentCpuMana = this.state.cpuMana;
      if (currentCpuMana < 1) return;

      const availableCards = CARD_POOL.filter(
        (c) => c.type === 'MONSTER' && c.manaCost <= currentCpuMana
      );
      if (availableCards.length === 0) return;

      const chosenCard = availableCards[Math.floor(this.random() * availableCards.length)];

      if (chosenCard.cardNo === 11) {
        const hasDragon = this.state.units.some(
          (u) => u.owner === 'cpu' && u.cardNo === 11 && u.hp > 0
        );
        if (hasDragon) return;
      }

      const validLanes = [0, 1, 2, 3, 4].filter((lane) => {
        const cpuUnitsInLane = this.state.units.filter(
          (u) => u.owner === 'cpu' && u.lane === lane && u.hp > 0
        );
        if (cpuUnitsInLane.length >= 3) return false;
        const hasBlockingAlly = cpuUnitsInLane.some((u) => u.y < 5 + SPAWN_MIN_SPACE);
        return !hasBlockingAlly;
      });
      if (validLanes.length === 0) return;

      const lanePlayerCounts = [0, 0, 0, 0, 0];
      this.state.units.forEach((u) => {
        if (u.owner === 'player' && u.hp > 0) lanePlayerCounts[u.lane]++;
      });

      const candidateLanes = [...validLanes].sort(
        (a, b) => lanePlayerCounts[b] - lanePlayerCounts[a]
      );
      const chosenLane =
        this.random() < 0.65
          ? candidateLanes[0]
          : validLanes[Math.floor(this.random() * validLanes.length)];

      this.state.cpuMana = Math.max(0, this.state.cpuMana - chosenCard.manaCost);
      const cpuUnit: Unit = {
        id: `cpu_${this.now()}_${this.random()}`,
        cardNo: chosenCard.cardNo,
        name: chosenCard.name,
        owner: 'cpu',
        lane: chosenLane,
        y: 5,
        maxHp: chosenCard.life || 1,
        hp: chosenCard.life || 1,
        attack: chosenCard.attack || 1,
        speed: chosenCard.speed || 10,
        range: chosenCard.range || 3,
        attackCooldown: 0,
        attackInterval: 1.0,
        icon: chosenCard.icon,
        distanceTraveled: 0,
      };

      this.state.units.push(cpuUnit);
    }
  }

  private updateUnits(dt: number) {
    const now = this.now();
    let pDamageToCpu = 0;
    let cpuDamageToPlayer = 0;
    const newAttackEffects: AttackEffect[] = [];
    const newPendingHits: PendingLightningHit[] = [];

    const prevUnits = [...this.state.units];

    const updated = prevUnits.map((unit) => {
      const isStunned = unit.isStunnedUntil && unit.isStunnedUntil > now;
      let cooldown = Math.max(0, unit.attackCooldown - dt);
      let y = unit.y;
      let distance = unit.distanceTraveled || 0;
      let attack = unit.cardNo === 2
        ? 1 + Math.min(4, Math.floor(distance / 20))
        : unit.attack;
      let lastAttack = unit.lastAttackEffectTime;

      if (isStunned) {
        return { ...unit, attackCooldown: cooldown };
      }

      const enemiesInLane = prevUnits.filter(
        (u) => u.lane === unit.lane && u.owner !== unit.owner && u.hp > 0
      );

      let targetEnemy: Unit | null = null;
      let minDistance = 999;

      enemiesInLane.forEach((enemy) => {
        const dist = unit.owner === 'player' ? unit.y - enemy.y : enemy.y - unit.y;
        if (dist >= -2 && dist < minDistance) {
          minDistance = Math.max(0, dist);
          targetEnemy = enemy;
        }
      });

      const alliesInLane = prevUnits.filter(
        (u) => u.lane === unit.lane && u.owner === unit.owner && u.id !== unit.id && u.hp > 0
      );
      let targetAlly: Unit | null = null;
      let minAllyDist = 999;
      alliesInLane.forEach((ally) => {
        const dist = unit.owner === 'player' ? unit.y - ally.y : ally.y - unit.y;
        if (dist > 0 && dist < minAllyDist) {
          minAllyDist = dist;
          targetAlly = ally;
        }
      });

      if (targetEnemy && minDistance <= unit.range) {
        if (cooldown <= 0) {
          cooldown = unit.attackInterval;
          lastAttack = now;

          let effectType: AttackEffectType = 'slash';
          let duration = 300;
          let flightMs: number | undefined;

          if (unit.cardNo === 11) {
            effectType = 'fireball';
            duration = 550;
          } else if (unit.cardNo === 6) {
            effectType = 'lightning';
            const distRatio = Math.min(1, minDistance / LIGHTNING_MAX_RANGE);
            flightMs = Math.round(LIGHTNING_FLIGHT_MIN_MS + distRatio * (LIGHTNING_FLIGHT_MAX_MS - LIGHTNING_FLIGHT_MIN_MS));
            duration = flightMs + 450;
          }

          newAttackEffects.push({
            id: `atk_${now}_${this.random().toString(36).substring(2, 7)}`,
            attackerId: unit.id,
            lane: unit.lane,
            fromY: unit.y,
            toY: (targetEnemy as Unit).y,
            owner: unit.owner,
            effectType,
            damage: attack,
            createdAt: now,
            duration,
            flightDuration: flightMs,
          });

          if (unit.cardNo === 6 && flightMs) {
            newPendingHits.push({
              id: `lhit_${now}_${this.random().toString(36).substring(2, 7)}`,
              targetId: (targetEnemy as Unit).id,
              attackerId: unit.id,
              lane: unit.lane,
              damage: attack,
              stunDuration: 1200,
              hitTime: now + flightMs,
            });
          }
        }
        return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
      }

      const isAtBase = unit.owner === 'player' ? y <= 6 : y >= 94;
      if (isAtBase) {
        if (cooldown <= 0) {
          cooldown = unit.attackInterval;
          lastAttack = now;
          const targetBaseY = unit.owner === 'player' ? 2 : 98;
          let effectType: AttackEffectType = 'base_hit';
          let duration = 320;
          let baseFlightMs: number | undefined;

          if (unit.cardNo === 11) {
            effectType = 'fireball';
            duration = 550;
          } else if (unit.cardNo === 6) {
            effectType = 'lightning';
            const baseDist = Math.abs(unit.y - targetBaseY);
            const distRatio = Math.min(1, baseDist / LIGHTNING_MAX_RANGE);
            baseFlightMs = Math.round(LIGHTNING_FLIGHT_MIN_MS + distRatio * (LIGHTNING_FLIGHT_MAX_MS - LIGHTNING_FLIGHT_MIN_MS));
            duration = baseFlightMs + 450;
          }

          newAttackEffects.push({
            id: `atk_base_${now}_${this.random().toString(36).substring(2, 7)}`,
            attackerId: unit.id,
            lane: unit.lane,
            fromY: unit.y,
            toY: targetBaseY,
            owner: unit.owner,
            effectType,
            damage: attack,
            createdAt: now,
            duration,
            flightDuration: baseFlightMs,
          });

          if (unit.owner === 'player') {
            pDamageToCpu += attack;
          } else {
            cpuDamageToPlayer += attack;
          }
        }
        return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
      }

      const moveDelta = unit.speed * MOVE_SPEED_SCALE * dt;
      if (unit.owner === 'player') {
        let maxYMove = y - moveDelta;
        if (targetEnemy) maxYMove = Math.max(maxYMove, (targetEnemy as Unit).y + 7.5);
        if (targetAlly) maxYMove = Math.max(maxYMove, (targetAlly as Unit).y + 8.0);
        y = Math.max(5, maxYMove);
      } else {
        let maxYMove = y + moveDelta;
        if (targetEnemy) maxYMove = Math.min(maxYMove, (targetEnemy as Unit).y - 7.5);
        if (targetAlly) maxYMove = Math.min(maxYMove, (targetAlly as Unit).y - 8.0);
        y = Math.min(95, maxYMove);
      }
      distance += moveDelta;

      return { ...unit, y, attack, attackCooldown: cooldown, distanceTraveled: distance, lastAttackEffectTime: lastAttack };
    });

    const finalUnits = updated.map((unit) => {
      let hp = unit.hp;
      let stunnedUntil = unit.isStunnedUntil;
      let y = unit.y;

      updated.forEach((attacker) => {
        if (
          attacker.lane === unit.lane &&
          attacker.owner !== unit.owner &&
          attacker.lastAttackEffectTime === now
        ) {
          if (attacker.cardNo === 6) return;

          const dist = attacker.owner === 'player' ? attacker.y - unit.y : unit.y - attacker.y;
          if (dist >= -2 && dist <= attacker.range + 2) {
            hp -= attacker.attack;

            if (attacker.cardNo === 7) {
              const pushBackAmount = 8 + this.random() * 2;
              if (attacker.owner === 'player') {
                y = Math.max(5, y - pushBackAmount);
              } else {
                y = Math.min(95, y + pushBackAmount);
              }
              stunnedUntil = now + 300;
            }
          }
        }
      });

      const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
      return { ...unit, hp, y, isStunnedUntil: stunnedUntil, isStunned: isUnitStunned };
    });

    this.state.units = finalUnits.filter((u) => u.hp > 0);
    this.state.attackEffects.push(...newAttackEffects);
    this.state.pendingLightningHits.push(...newPendingHits);

    if (pDamageToCpu > 0) this.state.cpuHp = Math.max(0, this.state.cpuHp - pDamageToCpu);
    if (cpuDamageToPlayer > 0) this.state.playerHp = Math.max(0, this.state.playerHp - cpuDamageToPlayer);

    if (this.state.cpuHp <= 0) this.state.gameResult = 'player_win';
    else if (this.state.playerHp <= 0) this.state.gameResult = 'cpu_win';
  }

  private processPendingHits(now: number) {
    const remainingHits: PendingLightningHit[] = [];

    this.state.pendingLightningHits.forEach((hit) => {
      if (now >= hit.hitTime) {
        const targetIndex = this.state.units.findIndex((u) => u.id === hit.targetId && u.hp > 0);
        if (targetIndex !== -1) {
          this.state.units[targetIndex].hp -= hit.damage;
          this.state.units[targetIndex].isStunned = true;
          this.state.units[targetIndex].isStunnedUntil = now + hit.stunDuration;
        }
      } else {
        remainingHits.push(hit);
      }
    });

    this.state.pendingLightningHits = remainingHits;
    this.state.units = this.state.units.filter((u) => u.hp > 0);
  }

  private cleanupEffects(now: number) {
    this.state.spellEffects = this.state.spellEffects.filter((eff) => now - eff.createdAt < 1200);
    this.state.attackEffects = this.state.attackEffects.filter((eff) => now - eff.createdAt < eff.duration + 300);
  }

  public playCardOnLane(card: DemoCard, laneIndex: number) {
    if (this.state.gameResult !== 'playing') return false;

    if (card.cardNo === 11) {
      const hasDragon = this.state.units.some(
        (u) => u.owner === 'player' && u.cardNo === 11 && u.hp > 0
      );
      if (hasDragon) return false;
    }

    if (card.type === 'MONSTER') {
      const playerUnitsInLane = this.state.units.filter(
        (u) => u.owner === 'player' && u.lane === laneIndex && u.hp > 0
      );
      if (playerUnitsInLane.length >= 3) return false;

      const hasBlockingAlly = playerUnitsInLane.some((u) => u.y > 95 - SPAWN_MIN_SPACE);
      if (hasBlockingAlly) return false;
    }

    const now = this.now();

    this.state.playerMana = Math.max(0, this.state.playerMana - card.manaCost);

    if (card.type === 'MONSTER') {
      const newUnit: Unit = {
        id: `player_${now}_${this.random()}`,
        cardNo: card.cardNo,
        name: card.name,
        owner: 'player',
        lane: laneIndex,
        y: 95,
        maxHp: card.life || 1,
        hp: card.life || 1,
        attack: card.attack || 1,
        speed: card.speed || 10,
        range: card.range || 3,
        attackCooldown: 0,
        attackInterval: 1.0,
        icon: card.icon,
        distanceTraveled: 0,
      };
      this.state.units.push(newUnit);
    } else if (card.type === 'SPELL') {
      if (card.cardNo === 101) {
        this.state.spellEffects.push({
          id: `spell_${now}`,
          lane: laneIndex,
          y: 50,
          type: 'meteor',
          createdAt: now,
        });

        this.state.units.forEach((u) => {
          if (u.lane === laneIndex && u.owner === 'cpu') {
            u.hp -= 4;
          }
        });

      } else if (card.cardNo === 106) {
        this.state.spellEffects.push({
          id: `spell_${now}`,
          lane: -1,
          y: 50,
          type: 'burn',
          createdAt: now,
        });
        this.state.units.forEach((u) => {
          if (u.owner === 'cpu') {
            u.hp -= 2;
          }
        });
      }
      this.state.units = this.state.units.filter((u) => u.hp > 0);
    }

    return true;
  }
}
