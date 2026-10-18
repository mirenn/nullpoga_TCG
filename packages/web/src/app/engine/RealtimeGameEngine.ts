import { CpuSpawnWarning, Owner, SpellEffect } from '../types';
import {
  createDeterministicDeckState,
  createRandomDeckState,
  DEFAULT_MANA_REGEN_PER_SEC,
  PLAY_CARD_COOLDOWN_MS,
} from '../cards';
import { computeCpuAction } from '../cpuAi';
import {
  clampPlayerSpawnX,
  clampSpawnX,
  clampSpawnY,
  SPELL_RADIUS,
} from '../board';
import {
  createInitialInhibitors,
  INHIBITOR_DESTROY_MANA_BONUS,
  manaRegenMultiplier,
} from '../inhibitors';
import {
  Camera3DState,
  DEFAULT_CAMERA_3D,
  FIELD_OBSTACLES,
} from '../obstacles';
import {
  createInitialStampedeState,
  HOLD_AMBUSH_DASH_DURATION_SEC,
  STAMPEDE_CRUSH_DAMAGE,
  updateStampede,
} from '../stampede';
import {
  createInitialCloudEventState,
  updateCloudEvent,
} from '../cloudEvent';
import {
  FIRE_SPELL_CAST_DELAY_MS,
  HASTE_SPELL_CAST_DELAY_MS,
  HEAL_SPELL_CAST_DELAY_MS,
  INITIAL_LIFE,
  INITIAL_MANA,
  MAX_MANA,
  METEOR_IMPACT_DELAY_MS,
  PlayValidationResult,
  RealtimeGameState,
} from './engineTypes';
import { drawNextCardFromDeck } from './deckUtils';
import { createMonsterUnitsForSpawn, validateCanPlayCard } from './unitSpawner';
import {
  resolveCameraSpot,
  resolveCombatDamageAndInhibitors,
  resolveDelayedSpellQueue,
  resolveFireSpellWaves,
  resolveLightningHits,
  resolveSmashPush,
  updateUnitsMovementAndAttacks,
} from './combatAndMovement';

/**
 * 初期ゲーム状態を生成する純粋関数
 * @param randomize trueの場合はデッキをランダムシャッフル、falseの場合はSSR安全な固定順
 */
export function createInitialRealtimeGameState(randomize: boolean = false): RealtimeGameState {
  return {
    playerHp: INITIAL_LIFE,
    cpuHp: INITIAL_LIFE,
    playerMana: INITIAL_MANA,
    cpuMana: INITIAL_MANA,
    manaRegenRate: DEFAULT_MANA_REGEN_PER_SEC,
    deckState: randomize ? createRandomDeckState() : createDeterministicDeckState(),
    cpuDeckState: randomize ? createRandomDeckState() : createDeterministicDeckState(),
    selectedCardIndex: null,
    playCooldownUntil: 0,
    cpuSpawnWarnings: [],
    units: [],
    inhibitors: createInitialInhibitors(),
    obstacles: FIELD_OBSTACLES.map((o) => ({
      ...o,
      hp: o.maxHp ?? 80,
      isDestroyed: false,
      lastHitTime: undefined,
    })),
    stampede: createInitialStampedeState(),
    cloudEvent: createInitialCloudEventState(),
    camera3D: { ...DEFAULT_CAMERA_3D },
    spottedCount: 0,
    spellEffects: [],
    attackEffects: [],
    pendingLightningHits: [],
    pendingMeteorHits: [],
    pendingFireSpellCasts: [],
    activeFireSpells: [],
    pendingHealSpellCasts: [],
    pendingHasteSpellCasts: [],
    gameResult: 'playing',
    playerCombo: { count: 0, lastTime: 0 },
    cpuCombo: { count: 0, lastTime: 0 },
    playerSpawnTimestamps: [],
    cpuSpawnTimestamps: [],
    cpuActionTimer: 0,
    manaTimer: 0,
  };
}

/**
 * Reactから完全に独立したリアルタイムバトルの純粋TypeScriptゲームエンジン。
 * UIフレームワーク（React / Canvas / Headless Test）を問わず同一ロジックで動作し、
 * setTimeoutに依存しないため高速なAI対戦シミュレーションや単体テストも1ミリ秒で実行可能。
 */
export class RealtimeGameEngine {
  public state: RealtimeGameState;
  private listeners: Set<() => void> = new Set();

  constructor(randomizeDecks: boolean = false) {
    this.state = createInitialRealtimeGameState(randomizeDecks);
  }

  /** 状態変更リスナーを登録（解除関数を返す） */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.state = { ...this.state };
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** クライアント初回マウント時などに両者のデッキをランダムシャッフルする */
  public randomizeDecks(): void {
    this.state = {
      ...this.state,
      deckState: createRandomDeckState(),
      cpuDeckState: createRandomDeckState(),
    };
    this.notify();
  }

  /** ゲーム全体を初期状態にリセットする */
  public reset(randomizeDecks: boolean = true): void {
    this.state = createInitialRealtimeGameState(randomizeDecks);
    this.notify();
  }

  /** マナ自然回復速度（秒あたり）を設定 */
  public setManaRegenRate(
    updater: number | ((prev: number) => number)
  ): void {
    const next = typeof updater === 'function' ? updater(this.state.manaRegenRate) : updater;
    this.state = { ...this.state, manaRegenRate: next };
    this.notify();
  }

  /** 選択中の手札インデックスを変更 */
  public setSelectedCardIndex(
    updater: number | null | ((prev: number | null) => number | null)
  ): void {
    const next = typeof updater === 'function' ? updater(this.state.selectedCardIndex) : updater;
    this.state = { ...this.state, selectedCardIndex: next };
    this.notify();
  }

  /** 3D箱庭カメラの状態を更新 */
  public setCamera3D(
    updater: Camera3DState | ((prev: Camera3DState) => Camera3DState)
  ): void {
    const next = typeof updater === 'function' ? updater(this.state.camera3D) : updater;
    this.state = { ...this.state, camera3D: next };
    this.notify();
  }

  /** 3D/2Dモードを維持したままカメラ位置・角度をリセット */
  public resetCamera3D(): void {
    this.state = {
      ...this.state,
      camera3D: {
        ...DEFAULT_CAMERA_3D,
        is3DMode: this.state.camera3D.is3DMode,
      },
    };
    this.notify();
  }

  /** カードをプレイ可能かどうかの判定 */
  public checkCanPlayCard(
    cardIndex: number,
    spawnX?: number,
    spawnY?: number,
    now: number = Date.now()
  ): PlayValidationResult {
    return validateCanPlayCard(this.state, cardIndex, spawnX, spawnY, now);
  }

  /** 烈火の呪文の詠唱予約（プレイヤー・CPU共通） */
  private enqueueFireSpell(x: number, y: number, targetOwner: Owner, now: number): void {
    const warningId = `burn_warning_${targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    this.state.spellEffects = [
      ...this.state.spellEffects,
      { id: warningId, x, y, originY: y, type: 'burn_warning', createdAt: now },
    ];
    this.state.pendingFireSpellCasts = [
      ...this.state.pendingFireSpellCasts,
      {
        warningId,
        x,
        y,
        targetOwner,
        igniteTime: now + FIRE_SPELL_CAST_DELAY_MS,
      },
    ];
  }

  /** 隕石の着弾予約（プレイヤー・CPU共通） */
  private enqueueMeteorSpell(
    x: number,
    y: number,
    targetOwner: Owner,
    effectIdPrefix: string,
    now: number
  ): void {
    const id = `${effectIdPrefix}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    this.state.spellEffects = [
      ...this.state.spellEffects,
      { id, x, y, type: 'meteor', createdAt: now },
    ];
    this.state.pendingMeteorHits = [
      ...this.state.pendingMeteorHits,
      {
        id,
        x,
        y,
        targetOwner,
        damage: 3,
        impactTime: now + METEOR_IMPACT_DELAY_MS,
      },
    ];
  }

  /** 癒やしの雨の詠唱予約（プレイヤー・CPU共通） */
  private enqueueHealSpell(x: number, y: number, targetOwner: Owner, now: number): void {
    const warningId = `heal_warning_${targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const effectId = `heal_${targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    this.state.spellEffects = [
      ...this.state.spellEffects,
      { id: warningId, x, y, type: 'heal_warning', createdAt: now },
    ];
    this.state.pendingHealSpellCasts = [
      ...this.state.pendingHealSpellCasts,
      {
        id: effectId,
        warningId,
        x,
        y,
        targetOwner,
        healAmount: 3,
        applyTime: now + HEAL_SPELL_CAST_DELAY_MS,
      },
    ];
  }

  /** 疾風の号令の詠唱予約（プレイヤー・CPU共通） */
  private enqueueHasteSpell(x: number, y: number, targetOwner: Owner, now: number): void {
    const warningId = `haste_warning_${targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const effectId = `haste_${targetOwner}_${now}_${Math.random().toString(36).slice(2, 6)}`;
    this.state.spellEffects = [
      ...this.state.spellEffects,
      { id: warningId, x, y, type: 'haste_warning', createdAt: now },
    ];
    this.state.pendingHasteSpellCasts = [
      ...this.state.pendingHasteSpellCasts,
      {
        id: effectId,
        warningId,
        x,
        y,
        targetOwner,
        applyTime: now + HASTE_SPELL_CAST_DELAY_MS,
      },
    ];
  }

  /** プレイヤーが指定座標 (rawX, rawY) にカードをプレイする */
  public playCardAt(
    rawX: number,
    rawY?: number,
    cardIndexOverride?: number,
    now: number = Date.now()
  ): boolean {
    const cardIdx =
      cardIndexOverride !== undefined ? cardIndexOverride : this.state.selectedCardIndex;
    if (cardIdx === null || cardIdx === undefined) return false;
    const card = this.state.deckState.hand[cardIdx];
    if (!card) return false;

    const spawnX =
      card.type === 'MONSTER' ? clampPlayerSpawnX(rawX) : clampSpawnX(rawX, 15, 85);
    const spawnY = rawY !== undefined ? clampSpawnY(rawY) : 50;

    const validation = this.checkCanPlayCard(cardIdx, rawX, rawY, now);
    if (!validation.canPlay) return false;

    // 連打誤爆防止デバウンス
    this.state.playCooldownUntil = now + PLAY_CARD_COOLDOWN_MS;

    // マナ消費
    this.state.playerMana = Math.max(0, this.state.playerMana - card.manaCost);

    // コンボ更新
    const newComboCount =
      now - this.state.playerCombo.lastTime <= 2000 ? this.state.playerCombo.count + 1 : 1;
    this.state.playerCombo = { count: newComboCount, lastTime: now };

    if (card.type === 'MONSTER') {
      const spawnedUnits = createMonsterUnitsForSpawn({
        card,
        owner: 'player',
        spawnX,
        spawnY,
        comboCount: newComboCount,
        opponentSpawnTimestamps: this.state.cpuSpawnTimestamps,
        now,
      });

      this.state.playerSpawnTimestamps = [
        ...this.state.playerSpawnTimestamps.filter((s) => now - s.time <= 3000),
        { x: spawnX, y: spawnY, time: now },
      ];
      this.state.units = [...this.state.units, ...spawnedUnits];
    } else if (card.type === 'SPELL') {
      if (card.id === 'meteor') {
        this.enqueueMeteorSpell(spawnX, spawnY, 'cpu', 'meteor', now);
      } else if (card.id === 'fire_spell') {
        this.enqueueFireSpell(spawnX, spawnY, 'cpu', now);
      } else if (card.id === 'haste_spell') {
        this.enqueueHasteSpell(spawnX, spawnY, 'player', now);
      } else if (card.id === 'heal_spell') {
        this.enqueueHealSpell(spawnX, spawnY, 'player', now);
      }
    }

    // 手札補充と選択解除
    this.state.deckState = drawNextCardFromDeck(this.state.deckState, cardIdx, card);
    this.state.selectedCardIndex = null;
    this.notify();
    return true;
  }

  /** ユニットのクリックによる待機／再前進トグル（プレイヤーユニットのみ） */
  public toggleUnitHold(unitId: string, now: number = Date.now()): void {
    this.state.units = this.state.units.map((u) => {
      if (u.id === unitId && u.owner === 'player') {
        const willHold = !u.isHolding;
        if (!willHold && u.hasAmbushCharge) {
          return {
            ...u,
            isHolding: false,
            hasAmbushCharge: false,
            holdDuration: 0,
            ambushDashUntil: now + HOLD_AMBUSH_DASH_DURATION_SEC * 1000,
          };
        }
        return {
          ...u,
          isHolding: willHold,
          holdDuration: willHold ? 0 : u.holdDuration,
        };
      }
      return u;
    });
    this.notify();
  }

  /** CPU思考ロジック（手札サイクル＆戦況評価・出撃予兆） */
  private stepCpuAi(dt: number, now: number): void {
    this.state.cpuActionTimer += dt;
    if (this.state.cpuActionTimer < 1.2) return;

    const chosen = computeCpuAction(
      this.state.cpuMana,
      this.state.cpuDeckState.hand,
      this.state.units,
      this.state.cpuSpawnWarnings,
      this.state.inhibitors
    );
    if (!chosen) return;

    this.state.cpuActionTimer = 0;
    this.state.cpuMana = Math.max(0, this.state.cpuMana - chosen.card.manaCost);
    this.state.cpuDeckState = drawNextCardFromDeck(
      this.state.cpuDeckState,
      chosen.handIndex,
      chosen.card
    );

    const newComboCount =
      now - this.state.cpuCombo.lastTime <= 2000 ? this.state.cpuCombo.count + 1 : 1;
    this.state.cpuCombo = { count: newComboCount, lastTime: now };

    if (chosen.card.type === 'MONSTER') {
      const spawnY = clampSpawnY(chosen.targetY ?? chosen.targetLane ?? 50);
      const spawnX = 95;
      const warning: CpuSpawnWarning = {
        id: `warn_${now}_${Math.random()}`,
        x: spawnX,
        y: spawnY,
        targetY: spawnY,
        lane: spawnY,
        card: chosen.card,
        startTime: now,
        durationMs: 650,
        comboCount: newComboCount,
      };
      this.state.cpuSpawnWarnings = [...this.state.cpuSpawnWarnings, warning];
    } else if (chosen.card.type === 'SPELL') {
      const spellX = chosen.targetX ?? 50;
      const spellY = clampSpawnY(chosen.targetY ?? chosen.targetLane ?? 50);
      if (chosen.card.id === 'meteor') {
        this.enqueueMeteorSpell(spellX, spellY, 'player', 'cpu_meteor', now);
      } else if (chosen.card.id === 'fire_spell') {
        this.enqueueFireSpell(spellX, spellY, 'player', now);
      } else if (chosen.card.id === 'haste_spell') {
        this.enqueueHasteSpell(spellX, spellY, 'cpu', now);
      } else if (chosen.card.id === 'heal_spell') {
        this.enqueueHealSpell(spellX, spellY, 'cpu', now);
      }
    }
  }

  /**
   * 1フレーム分のゲーム進行（dt: 経過秒数, now: 現在時刻ミリ秒）
   * UIフレームワーク非依存で呼び出し可能
   */
  public tick(dt: number, now: number = Date.now()): void {
    if (this.state.gameResult !== 'playing') return;

    // 1. マナ増加（0.08秒ごとに更新）
    this.state.manaTimer += dt;
    if (this.state.manaTimer >= 0.08) {
      const deltaMana = this.state.manaRegenRate * this.state.manaTimer;
      this.state.manaTimer = 0;
      const playerMul = manaRegenMultiplier(this.state.inhibitors, 'player');
      const cpuMul = manaRegenMultiplier(this.state.inhibitors, 'cpu');
      this.state.playerMana = Math.min(MAX_MANA, this.state.playerMana + deltaMana * playerMul);
      this.state.cpuMana = Math.min(MAX_MANA, this.state.cpuMana + deltaMana * cpuMul);
    }

    // 2. CPU AI実行
    this.stepCpuAi(dt, now);

    // 3. 着弾待ちの隕石・詠唱待ちの烈火・回復・号令の解決
    const delayedSpellRes = resolveDelayedSpellQueue({
      units: this.state.units,
      pendingMeteorHits: this.state.pendingMeteorHits,
      pendingFireSpellCasts: this.state.pendingFireSpellCasts,
      activeFireSpells: this.state.activeFireSpells,
      pendingHealSpellCasts: this.state.pendingHealSpellCasts,
      pendingHasteSpellCasts: this.state.pendingHasteSpellCasts,
      spellEffects: this.state.spellEffects,
      now,
    });
    this.state.units = delayedSpellRes.units;
    this.state.pendingMeteorHits = delayedSpellRes.pendingMeteorHits;
    this.state.pendingFireSpellCasts = delayedSpellRes.pendingFireSpellCasts;
    this.state.activeFireSpells = delayedSpellRes.activeFireSpells;
    this.state.pendingHealSpellCasts = delayedSpellRes.pendingHealSpellCasts;
    this.state.pendingHasteSpellCasts = delayedSpellRes.pendingHasteSpellCasts;
    this.state.spellEffects = delayedSpellRes.spellEffects;

    // 4. CPU召喚予兆の解決（詠唱時間0.65秒経過したモンスターをスポーン）
    let spawnedCpuUnits = [] as typeof this.state.units;
    if (this.state.cpuSpawnWarnings.length > 0) {
      const stillWarnings: CpuSpawnWarning[] = [];
      const spawningWarnings: CpuSpawnWarning[] = [];
      for (const w of this.state.cpuSpawnWarnings) {
        if (now >= w.startTime + w.durationMs) {
          spawningWarnings.push(w);
        } else {
          stillWarnings.push(w);
        }
      }
      if (spawningWarnings.length > 0) {
        spawnedCpuUnits = spawningWarnings.flatMap((w) => {
          const spawnY = w.targetY ?? w.y ?? (w.lane ?? 50);
          this.state.cpuSpawnTimestamps.push({ x: 95, y: spawnY, time: now });
          return createMonsterUnitsForSpawn({
            card: w.card,
            owner: 'cpu',
            spawnX: 95,
            spawnY,
            comboCount: w.comboCount || 1,
            opponentSpawnTimestamps: this.state.playerSpawnTimestamps,
            now,
          });
        });
        this.state.cpuSpawnTimestamps = this.state.cpuSpawnTimestamps.filter(
          (s) => now - s.time <= 3000
        );
      }
      if (stillWarnings.length !== this.state.cpuSpawnWarnings.length) {
        this.state.cpuSpawnWarnings = stillWarnings;
      }
    }

    const currentUnits =
      spawnedCpuUnits.length > 0
        ? [...this.state.units, ...spawnedCpuUnits]
        : this.state.units;

    // 5. 着弾時刻に達した雷撃の解決
    const lightningRes = resolveLightningHits(
      currentUnits,
      this.state.pendingLightningHits,
      now
    );
    if (lightningRes.delayedBasePlayerDmg > 0) {
      this.state.playerHp = Math.max(
        0,
        this.state.playerHp - lightningRes.delayedBasePlayerDmg
      );
      if (this.state.playerHp === 0) this.state.gameResult = 'lose';
    }
    if (lightningRes.delayedBaseCpuDmg > 0) {
      this.state.cpuHp = Math.max(0, this.state.cpuHp - lightningRes.delayedBaseCpuDmg);
      if (this.state.cpuHp === 0) this.state.gameResult = 'win';
    }

    // 6. 烈火の呪文の延焼波解決
    const fireRes = resolveFireSpellWaves(
      lightningRes.unitsAfterHits,
      this.state.activeFireSpells,
      now
    );
    this.state.activeFireSpells = fireRes.remainingFireSpells;

    // 7. 3D箱庭カメラの覗き込みによる死角看破（SPOT!）判定
    const spotRes = resolveCameraSpot(fireRes.unitsAfterFire, this.state.camera3D, now);
    if (spotRes.newlySpottedCount > 0) {
      this.state.spottedCount += spotRes.newlySpottedCount;
    }

    // 8. 各ユニットの移動・攻撃・障害物インタラクション更新
    const moveAtkRes = updateUnitsMovementAndAttacks({
      unitsAfterSpot: spotRes.unitsAfterSpot,
      unitsAfterHits: lightningRes.unitsAfterHits,
      inhibitors: this.state.inhibitors,
      obstacles: this.state.obstacles,
      stampede: this.state.stampede,
      dt,
      now,
    });
    if (moveAtkRes.obstacleMutated) {
      this.state.obstacles = this.state.obstacles.map((o) => ({ ...o }));
    }

    // 9. smashユニット（イノシシ・ドラゴン）による前方味方の押し出し（プッシュ）解決
    const pushedUnits = resolveSmashPush(
      moveAtkRes.rawUpdatedUnits,
      lightningRes.unitsAfterHits,
      this.state.inhibitors
    );

    // 10. ユニット同士のダメージ・インヒビター被害・キル成長解決
    const combatRes = resolveCombatDamageAndInhibitors({
      updatedUnits: pushedUnits,
      attackTargets: moveAtkRes.attackTargets,
      resolvedHits: lightningRes.resolvedHits,
      inhibitors: this.state.inhibitors,
      now,
    });
    if (combatRes.nextInhibitors !== this.state.inhibitors) {
      this.state.inhibitors = combatRes.nextInhibitors;
      for (const side of combatRes.inhibitorDestroyedBy) {
        if (side === 'player') {
          this.state.playerMana = Math.min(
            MAX_MANA,
            this.state.playerMana + INHIBITOR_DESTROY_MANA_BONUS
          );
        } else {
          this.state.cpuMana = Math.min(
            MAX_MANA,
            this.state.cpuMana + INHIBITOR_DESTROY_MANA_BONUS
          );
        }
      }
    }

    // 11. 巨獣スタンピードの進行更新 & 激突判定
    const stampedeRes = updateStampede(dt, this.state.stampede, combatRes.finalUnits);
    this.state.stampede = stampedeRes.nextState;

    let unitsAfterStampede = combatRes.finalUnits;
    const newAttackEffects = [...moveAtkRes.newAttackEffects];
    if (stampedeRes.crushedUnitIds.length > 0) {
      const crushedSet = new Set(stampedeRes.crushedUnitIds);
      unitsAfterStampede = combatRes.finalUnits
        .map((u) => {
          if (crushedSet.has(u.id)) {
            newAttackEffects.push({
              id: `stampede_hit_${now}_${u.id}`,
              attackerId: 'stampede',
              fromX: u.x,
              toX: u.x,
              lane: u.lane ?? u.y,
              toLane: u.lane ?? u.y,
              fromY: u.y,
              toY: u.y,
              owner: u.owner === 'player' ? 'cpu' : 'player',
              effectType: 'base_hit',
              damage: STAMPEDE_CRUSH_DAMAGE,
              createdAt: now,
              duration: 400,
            });
            const knockback = u.owner === 'player' ? -10 : 10;
            return {
              ...u,
              hp: Math.max(0, u.hp - STAMPEDE_CRUSH_DAMAGE),
              x: Math.max(5, Math.min(95, u.x + knockback)),
              isStunnedUntil: now + 1500,
              isStunned: true,
            };
          }
          return u;
        })
        .filter((u) => u.hp > 0);
    }

    // 12. 流雲イベントの進行更新 & 雲隠れ（動的死角）判定
    const cloudRes = updateCloudEvent(dt, this.state.cloudEvent, unitsAfterStampede);
    this.state.cloudEvent = cloudRes.nextState;
    this.state.units = cloudRes.updatedUnits;

    // 13. 本拠地直接到達ダメージ反映
    if (moveAtkRes.pDamageToCpu > 0) {
      this.state.cpuHp = Math.max(0, this.state.cpuHp - moveAtkRes.pDamageToCpu);
      if (this.state.cpuHp === 0) this.state.gameResult = 'win';
    }
    if (moveAtkRes.cpuDamageToPlayer > 0) {
      this.state.playerHp = Math.max(0, this.state.playerHp - moveAtkRes.cpuDamageToPlayer);
      if (this.state.playerHp === 0) this.state.gameResult = 'lose';
    }

    // 14. エフェクト・遅延ヒットキューの更新と期限切れ掃除
    const aliveAttackEffects = this.state.attackEffects.filter(
      (e) => now - e.createdAt < e.duration + 300
    );
    this.state.attackEffects =
      newAttackEffects.length > 0
        ? [...aliveAttackEffects, ...newAttackEffects]
        : aliveAttackEffects;

    this.state.pendingLightningHits = [
      ...lightningRes.stillPendingHits,
      ...moveAtkRes.newPendingHits,
    ];

    this.state.spellEffects = this.state.spellEffects.filter(
      (e: SpellEffect) => {
        const age = now - e.createdAt;
        if (e.type === 'meteor') return age < 2400; // 2.0sアニメーション + 400ms余韻
        if (e.type === 'burn') return age < 2200;
        if (e.type === 'burn_warning') return age < FIRE_SPELL_CAST_DELAY_MS + 300;
        if (e.type === 'heal_warning') return age < HEAL_SPELL_CAST_DELAY_MS + 300;
        if (e.type === 'haste_warning') return age < HASTE_SPELL_CAST_DELAY_MS + 300;
        if (e.type === 'heal') return age < 1600;
        if (e.type === 'haste') return age < 1400;
        return age < 1200;
      }
    );

    this.notify();
  }
}
