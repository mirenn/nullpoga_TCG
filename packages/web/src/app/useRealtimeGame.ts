'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DemoCard, Unit, SpellEffect, AttackEffect, AttackEffectType, CpuSpawnWarning } from './types';
import {
  CARD_POOL,
  MANA_SPEED_PRESETS,
  DEFAULT_MANA_REGEN_PER_SEC,
  MOVE_SPEED_SCALE,
  PLAY_CARD_COOLDOWN_MS,
  SPAWN_MIN_SPACE,
  createDefault15Deck,
  shuffleCards,
  DeckState,
  createDeterministicDeckState,
  createRandomDeckState,
} from './cards';
import { computeCpuAction } from './cpuAi';

// re-export for external consumers
export {
  CARD_POOL,
  MANA_SPEED_PRESETS,
  DEFAULT_MANA_REGEN_PER_SEC,
  MOVE_SPEED_SCALE,
  PLAY_CARD_COOLDOWN_MS,
  SPAWN_MIN_SPACE,
  createDefault15Deck,
  shuffleCards,
  createDeterministicDeckState,
  createRandomDeckState,
};
export type { DeckState };

const INITIAL_LIFE = 20;
const INITIAL_MANA = 3;
const MAX_MANA = 10;

// 電気クラゲの雷撃飛行時間（距離に比例: 最小220ms〜最大380ms、目で弾道をしっかり追えるスピード感）
const LIGHTNING_FLIGHT_MIN_MS = 220;
const LIGHTNING_FLIGHT_MAX_MS = 380;
const LIGHTNING_MAX_RANGE = 28; // クラゲの射程（%）

/** 着弾待ちの雷撃ヒット予約 */
interface PendingLightningHit {
  id: string;
  targetId: string;       // 着弾対象ユニットID
  attackerId: string;     // 攻撃者ID（クラゲ）
  lane: number;
  damage: number;
  stunDuration: number;   // ms (1200)
  hitTime: number;        // 着弾予定時刻 (Date.now() + 飛行時間)
}

export function useRealtimeGame() {
  const [playerHp, setPlayerHp] = useState(INITIAL_LIFE);
  const [cpuHp, setCpuHp] = useState(INITIAL_LIFE);
  const [playerMana, setPlayerMana] = useState(INITIAL_MANA);
  const [cpuMana, setCpuMana] = useState(INITIAL_MANA);
  const [manaRegenRate, setManaRegenRate] = useState<number>(DEFAULT_MANA_REGEN_PER_SEC);

  // 15枚デッキ・手札・NEXT・山札・捨て札管理 (プレイヤー側)
  // SSRハイドレーションエラー防止のため初期値は固定順とし、クライアントマウント時にランダムシャッフル
  const [deckState, setDeckState] = useState<DeckState>(createDeterministicDeckState);
  const { hand, nextCard, deck, discardPile } = deckState;
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const cooldownRef = useRef<number>(0);

  // 15枚デッキ・手札・NEXT・山札・捨て札管理 (CPU側)
  const [cpuDeckState, setCpuDeckState] = useState<DeckState>(createDeterministicDeckState);
  const cpuDeckStateRef = useRef<DeckState>(cpuDeckState);
  useEffect(() => {
    cpuDeckStateRef.current = cpuDeckState;
  }, [cpuDeckState]);

  // クライアント初回マウント時にプレイヤーとCPUのデッキをランダムシャッフル
  useEffect(() => {
    setDeckState(createRandomDeckState());
    setCpuDeckState(createRandomDeckState());
  }, []);

  // CPU召喚予兆（詠唱エフェクト）
  const [cpuSpawnWarnings, setCpuSpawnWarnings] = useState<CpuSpawnWarning[]>([]);
  const cpuSpawnWarningsRef = useRef<CpuSpawnWarning[]>([]);
  useEffect(() => {
    cpuSpawnWarningsRef.current = cpuSpawnWarnings;
  }, [cpuSpawnWarnings]);

  // ユニット一覧
  const [units, setUnits] = useState<Unit[]>([]);
  const unitsRef = useRef<Unit[]>([]);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // スペルエフェクト
  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  // 攻撃エフェクト（弾道・斬撃・着弾）
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  // 電気クラゲの着弾待ち雷撃
  const [pendingLightningHits, setPendingLightningHits] = useState<PendingLightningHit[]>([]);
  const pendingHitsRef = useRef<PendingLightningHit[]>([]);
  useEffect(() => {
    pendingHitsRef.current = pendingLightningHits;
  }, [pendingLightningHits]);
  // ゲーム終了ステータス
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose'>('playing');

  // アニメーションループ用のref
  const lastTimeRef = useRef<number>(0);
  const cpuActionTimerRef = useRef<number>(0);
  const manaTimerRef = useRef<number>(0);
  const manaRegenRateRef = useRef<number>(manaRegenRate);

  // コンボ・カウンターデプロイ用
  const cpuSpawnTimestampsRef = useRef<{ lane: number; time: number }[]>([]);
  const playerSpawnTimestampsRef = useRef<{ lane: number; time: number }[]>([]);
  
  const [playerCombo, setPlayerCombo] = useState<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const playerComboRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const cpuComboRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  useEffect(() => {
    manaRegenRateRef.current = manaRegenRate;
  }, [manaRegenRate]);

  const stateRef = useRef({
    playerHp,
    cpuHp,
    playerMana,
    cpuMana,
    units,
    gameResult,
  });

  // 最新のstateをrefに同期
  useEffect(() => {
    stateRef.current = {
      playerHp,
      cpuHp,
      playerMana,
      cpuMana,
      units,
      gameResult,
    };
  }, [playerHp, cpuHp, playerMana, cpuMana, units, gameResult]);

  // カードをプレイ可能かどうかのバリデーション
  const checkCanPlayCard = useCallback(
    (cardIndex: number, laneIndex?: number): { canPlay: boolean; reason?: string } => {
      if (gameResult !== 'playing') {
        return { canPlay: false, reason: 'ゲーム終了' };
      }
      const card = hand[cardIndex];
      if (!card) {
        return { canPlay: false, reason: 'カードが存在しません' };
      }
      if (Date.now() < cooldownRef.current) {
        return { canPlay: false, reason: 'クールダウン中...' };
      }
      if (playerMana < card.manaCost) {
        return { canPlay: false, reason: `マナ不足 (⚡${card.manaCost}必要)` };
      }
      // ユニーク制限: 炎のドラゴン（cardNo: 11）は場に1体まで
      if (card.cardNo === 11) {
        const hasDragon = unitsRef.current.some(
          (u) => u.owner === 'player' && u.cardNo === 11 && u.hp > 0
        );
        if (hasDragon) {
          return { canPlay: false, reason: '炎のドラゴンは場に1体まで' };
        }
      }
      // レーン過密制限: モンスターは1レーンあたり自軍最大3体まで
      if (laneIndex !== undefined && card.type === 'MONSTER') {
        const unitsInLane = unitsRef.current.filter(
          (u) => u.owner === 'player' && u.lane === laneIndex && u.hp > 0
        );
        if (unitsInLane.length >= 3) {
          return { canPlay: false, reason: 'このレーンは上限(3体)です' };
        }

        // 出撃スペース制限: 直前の味方モンスターが出撃地点(y=95)から一定距離(SPAWN_MIN_SPACE)前進するまで待機
        // ※敵モンスターが自陣手前にいる場合は防衛・迎撃出撃のため制限せず召喚可能
        const hasBlockingAlly = unitsInLane.some(
          (u) => u.y > 95 - SPAWN_MIN_SPACE
        );
        if (hasBlockingAlly) {
          return { canPlay: false, reason: '出撃スペース不足' };
        }
      }
      return { canPlay: true };
    },
    [gameResult, hand, playerMana]
  );

  // 手札からカードをプレイした後の手札補充（NEXTカードを使用枠へ移動＋山札からNEXT補充＋捨て札リサイクル）
  const drawCardAfterPlay = useCallback((replaceIndex: number, playedCard: DemoCard) => {
    setDeckState((prev) => {
      const nextCardToPlace = prev.nextCard;
      const newHand = [...prev.hand];
      newHand[replaceIndex] = nextCardToPlace as DemoCard;

      const newDiscard = [...prev.discardPile, playedCard];
      let newDeck = [...prev.deck];
      let newNextCard: DemoCard | null = null;

      if (newDeck.length > 0) {
        newNextCard = newDeck[0];
        newDeck = newDeck.slice(1);
        return {
          hand: newHand,
          nextCard: newNextCard,
          deck: newDeck,
          discardPile: newDiscard,
        };
      } else {
        // 山札が空になったため、捨て札を再シャッフルして新しい山札へ
        const recycled = shuffleCards(newDiscard);
        newNextCard = recycled[0] || null;
        newDeck = recycled.slice(1);
        return {
          hand: newHand,
          nextCard: newNextCard,
          deck: newDeck,
          discardPile: [],
        };
      }
    });
  }, []);

  // CPUがカードをプレイした後の手札補充（NEXTカードを使用枠へ移動＋山札からNEXT補充＋捨て札リサイクル）
  const cpuDrawCardAfterPlay = useCallback((replaceIndex: number, playedCard: DemoCard) => {
    setCpuDeckState((prev) => {
      const nextCardToPlace = prev.nextCard;
      const newHand = [...prev.hand];
      newHand[replaceIndex] = nextCardToPlace as DemoCard;

      const newDiscard = [...prev.discardPile, playedCard];
      let newDeck = [...prev.deck];
      let newNextCard: DemoCard | null = null;

      if (newDeck.length > 0) {
        newNextCard = newDeck[0];
        newDeck = newDeck.slice(1);
        return {
          hand: newHand,
          nextCard: newNextCard,
          deck: newDeck,
          discardPile: newDiscard,
        };
      } else {
        const recycled = shuffleCards(newDiscard);
        newNextCard = recycled[0] || null;
        newDeck = recycled.slice(1);
        return {
          hand: newHand,
          nextCard: newNextCard,
          deck: newDeck,
          discardPile: [],
        };
      }
    });
  }, []);

  // プレイヤーがレーンを指定してカードを使用（ドラッグ＆ドロップ時はcardIndexOverrideを渡す）
  const playCardOnLane = useCallback(
    (laneIndex: number, cardIndexOverride?: number) => {
      const cardIdx = cardIndexOverride !== undefined ? cardIndexOverride : selectedCardIndex;
      if (cardIdx === null || cardIdx === undefined) return;
      const card = hand[cardIdx];
      if (!card) return;

      const validation = checkCanPlayCard(cardIdx, laneIndex);
      if (!validation.canPlay) return;

      // 連打誤爆防止デバウンス（約0.12秒）
      cooldownRef.current = Date.now() + PLAY_CARD_COOLDOWN_MS;

      // マナ消費
      setPlayerMana((m) => Math.max(0, m - card.manaCost));

      const now = Date.now();
      // コンボ判定 (Player)
      let newComboCount = 1;
      if (now - playerComboRef.current.lastTime <= 2000) {
        newComboCount = playerComboRef.current.count + 1;
      }
      const newCombo = { count: newComboCount, lastTime: now };
      playerComboRef.current = newCombo;
      setPlayerCombo(newCombo);

      if (card.type === 'MONSTER') {
        // カウンターデプロイ判定 (Player)
        let isCounterDeploy = false;
        const recentCpuSpawn = cpuSpawnTimestampsRef.current.find(
          (s) => s.lane === laneIndex && now - s.time <= 1500
        );
        if (recentCpuSpawn) {
          isCounterDeploy = true;
        }

        let comboBonusHp = 0;
        let comboBonusAtk = 0;
        if (newComboCount >= 2) comboBonusHp += 1;
        if (newComboCount >= 3) comboBonusAtk += 1;

        let counterBonusAtk = 0;
        let counterBonusInterval = 0;
        if (isCounterDeploy) {
          counterBonusAtk += 1;
          counterBonusInterval = 0.2;
        }

        // スポーン記録
        playerSpawnTimestampsRef.current.push({ lane: laneIndex, time: now });
        playerSpawnTimestampsRef.current = playerSpawnTimestampsRef.current.filter(s => now - s.time <= 3000);

        // 自陣最奥（y=95）にユニット召喚
        const newUnit: Unit = {
          id: `player_${Date.now()}_${Math.random()}`,
          cardNo: card.cardNo,
          name: card.name,
          owner: 'player',
          lane: laneIndex,
          y: 95,
          maxHp: (card.life || 1) + comboBonusHp,
          hp: (card.life || 1) + comboBonusHp,
          attack: (card.attack || 1) + comboBonusAtk + counterBonusAtk,
          speed: card.speed || 10,
          range: card.range || 3,
          attackCooldown: 0,
          attackInterval: Math.max(0.1, (card.attackInterval ?? 1.0) - counterBonusInterval),
          attackWindup: card.attackWindup ?? 0,
          isCharging: false,
          chargeStartTime: undefined,
          icon: card.icon,
          distanceTraveled: 0,
          isCounterDeploy: isCounterDeploy,
          comboCount: newComboCount > 1 ? newComboCount : undefined,
          killCount: 0,
        };
        const next = [...unitsRef.current, newUnit];
        unitsRef.current = next;
        setUnits(next);
      } else if (card.type === 'SPELL') {
        if (card.id === 'meteor') {
          // 指定レーンの中央付近（y=50±20）の敵に3ダメージ
          setSpellEffects((prev) => [
            ...prev,
            { id: `meteor_${Date.now()}`, lane: laneIndex, y: 50, type: 'meteor', createdAt: Date.now() },
          ]);
          const next = unitsRef.current
            .map((u) => {
              if (u.owner === 'cpu' && u.lane === laneIndex && Math.abs(u.y - 50) <= 20) {
                return { ...u, hp: u.hp - 3 };
              }
              return u;
            })
            .filter((u) => u.hp > 0);
          unitsRef.current = next;
          setUnits(next);
        } else if (card.id === 'fire_spell') {
          // 全敵ユニットに2ダメージ
          setSpellEffects((prev) => [
            ...prev,
            { id: `burn_${Date.now()}`, lane: -1, y: 50, type: 'burn', createdAt: Date.now() },
          ]);
          const next = unitsRef.current
            .map((u) => {
              if (u.owner === 'cpu') {
                return { ...u, hp: u.hp - 2 };
              }
              return u;
            })
            .filter((u) => u.hp > 0);
          unitsRef.current = next;
          setUnits(next);
        } else if (card.id === 'haste_spell') {
          // 味方ユニットの攻撃クールダウンをリセット
          setSpellEffects((prev) => [
            ...prev,
            { id: `haste_${Date.now()}`, lane: laneIndex, y: 75, type: 'haste', createdAt: Date.now() },
          ]);
          const next = unitsRef.current.map((u) => {
            if (u.owner === 'player' && u.lane === laneIndex) {
              return { ...u, attackCooldown: 0 };
            }
            return u;
          });
          unitsRef.current = next;
          setUnits(next);
        } else if (card.id === 'heal_spell') {
          // 指定レーンの味方に3回復
          setSpellEffects((prev) => [
            ...prev,
            { id: `heal_${Date.now()}`, lane: laneIndex, y: 50, type: 'heal', createdAt: Date.now() },
          ]);
          const next = unitsRef.current.map((u) => {
            if (u.owner === 'player' && u.lane === laneIndex) {
              return { ...u, hp: Math.min(u.hp + 3, u.maxHp) };
            }
            return u;
          });
          unitsRef.current = next;
          setUnits(next);
        }
      }

      // 手札の補充と選択解除
      drawCardAfterPlay(cardIdx, card);
      setSelectedCardIndex(null);
    },
    [selectedCardIndex, hand, checkCanPlayCard, drawCardAfterPlay]
  );

  // CPU思考ロジック（手札サイクル＆戦況評価・出撃予兆）
  const handleCpuAi = useCallback((dt: number) => {
    cpuActionTimerRef.current += dt;
    // 約1.2秒ごとにCPUが手札と戦況を評価
    if (cpuActionTimerRef.current < 1.2) return;

    const currentCpuMana = stateRef.current.cpuMana;
    const cpuHand = cpuDeckStateRef.current.hand;

    const chosen = computeCpuAction(
      currentCpuMana,
      cpuHand,
      unitsRef.current,
      cpuSpawnWarningsRef.current
    );

    if (!chosen) return;

    // タイマーをリセット
    cpuActionTimerRef.current = 0;

    // 1. マナ消費
    setCpuMana((m) => Math.max(0, m - chosen.card.manaCost));

    // 2. CPU手札を補充
    cpuDrawCardAfterPlay(chosen.handIndex, chosen.card);

    // 3. アクション実行
    const now = Date.now();
    let newComboCount = 1;
    if (now - cpuComboRef.current.lastTime <= 2000) {
      newComboCount = cpuComboRef.current.count + 1;
    }
    cpuComboRef.current = { count: newComboCount, lastTime: now };

    if (chosen.card.type === 'MONSTER' && chosen.targetLane !== undefined) {
      // 召喚予兆（0.65秒の詠唱インジケーター）
      const warning: CpuSpawnWarning = {
        id: `warn_${Date.now()}_${Math.random()}`,
        lane: chosen.targetLane,
        card: chosen.card,
        startTime: Date.now(),
        durationMs: 650,
        comboCount: newComboCount,
      };
      setCpuSpawnWarnings((prev) => [...prev, warning]);
    } else if (chosen.card.type === 'SPELL') {
      const laneIndex = chosen.targetLane ?? 0;
      if (chosen.card.id === 'meteor') {
        // 隕石落下（指定レーンの中央付近（y=50±20）のプレイヤーユニットに3ダメージ）
        setSpellEffects((prev) => [
          ...prev,
          { id: `cpu_meteor_${Date.now()}`, lane: laneIndex, y: 50, type: 'meteor', createdAt: Date.now() },
        ]);
        const next = unitsRef.current
          .map((u) => {
            if (u.owner === 'player' && u.lane === laneIndex && Math.abs(u.y - 50) <= 20) {
              return { ...u, hp: u.hp - 3 };
            }
            return u;
          })
          .filter((u) => u.hp > 0);
        unitsRef.current = next;
        setUnits(next);
      } else if (chosen.card.id === 'fire_spell') {
        // 烈火の呪文（全プレイヤーユニットに2ダメージ）
        setSpellEffects((prev) => [
          ...prev,
          { id: `cpu_burn_${Date.now()}`, lane: -1, y: 50, type: 'burn', createdAt: Date.now() },
        ]);
        const next = unitsRef.current
          .map((u) => {
            if (u.owner === 'player') {
              return { ...u, hp: u.hp - 2 };
            }
            return u;
          })
          .filter((u) => u.hp > 0);
        unitsRef.current = next;
        setUnits(next);
      } else if (chosen.card.id === 'haste_spell') {
        // 疾風の号令（指定レーンのCPUユニットのクールダウンリセット）
        setSpellEffects((prev) => [
          ...prev,
          { id: `cpu_haste_${Date.now()}`, lane: laneIndex, y: 25, type: 'haste', createdAt: Date.now() },
        ]);
        const next = unitsRef.current.map((u) => {
          if (u.owner === 'cpu' && u.lane === laneIndex) {
            return { ...u, attackCooldown: 0 };
          }
          return u;
        });
        unitsRef.current = next;
        setUnits(next);
      } else if (chosen.card.id === 'heal_spell') {
        // 癒やしの雨（指定レーンのCPUユニットHP3回復）
        setSpellEffects((prev) => [
          ...prev,
          { id: `cpu_heal_${Date.now()}`, lane: laneIndex, y: 25, type: 'heal', createdAt: Date.now() },
        ]);
        const next = unitsRef.current.map((u) => {
          if (u.owner === 'cpu' && u.lane === laneIndex) {
            return { ...u, hp: Math.min(u.hp + 3, u.maxHp) };
          }
          return u;
        });
        unitsRef.current = next;
        setUnits(next);
      }
    }
  }, [cpuDrawCardAfterPlay]);

  // メインゲームループ（毎フレーム実行）
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // 最大0.1秒クリップ
      lastTimeRef.current = timestamp;

      if (stateRef.current.gameResult === 'playing') {
        // 1. マナ増加（0.08秒ごとに更新して再レンダリング頻度を安定化）
        manaTimerRef.current += dt;
        if (manaTimerRef.current >= 0.08) {
          const deltaMana = manaRegenRateRef.current * manaTimerRef.current;
          manaTimerRef.current = 0;
          setPlayerMana((m) => Math.min(MAX_MANA, m + deltaMana));
          setCpuMana((m) => Math.min(MAX_MANA, m + deltaMana));
        }

        // 2. CPU AI実行
        handleCpuAi(dt);

        // 3. ユニット更新＆エフェクト・着弾計算
        const now = Date.now();

        // CPU召喚予兆の解決（詠唱時間0.65秒経過したモンスターをフィールドにスポーン）
        const currentWarnings = cpuSpawnWarningsRef.current;
        let spawnedCpuUnits: Unit[] = [];
        if (currentWarnings.length > 0) {
          const stillWarnings: CpuSpawnWarning[] = [];
          const spawningWarnings: CpuSpawnWarning[] = [];
          for (const w of currentWarnings) {
            if (now >= w.startTime + w.durationMs) {
              spawningWarnings.push(w);
            } else {
              stillWarnings.push(w);
            }
          }
          if (spawningWarnings.length > 0) {
            spawnedCpuUnits = spawningWarnings.map((w) => {
              // カウンターデプロイ判定 (CPU)
              let isCounterDeploy = false;
              const recentPlayerSpawn = playerSpawnTimestampsRef.current.find(
                (s) => s.lane === w.lane && now - s.time <= 1500
              );
              if (recentPlayerSpawn) {
                isCounterDeploy = true;
              }

              const comboCount = w.comboCount || 1;
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

              // スポーン記録
              cpuSpawnTimestampsRef.current.push({ lane: w.lane, time: now });
              
              return {
                id: `cpu_${Date.now()}_${Math.random()}`,
                cardNo: w.card.cardNo,
                name: w.card.name,
                owner: 'cpu' as const,
                lane: w.lane,
                y: 5, // CPU最奥からスタート
                maxHp: (w.card.life || 1) + comboBonusHp,
                hp: (w.card.life || 1) + comboBonusHp,
                attack: (w.card.attack || 1) + comboBonusAtk + counterBonusAtk,
                speed: w.card.speed || 10,
                range: w.card.range || 3,
                attackCooldown: 0,
                attackInterval: Math.max(0.1, (w.card.attackInterval ?? 1.0) - counterBonusInterval),
                attackWindup: w.card.attackWindup ?? 0,
                isCharging: false,
                chargeStartTime: undefined,
                icon: w.card.icon,
                distanceTraveled: 0,
                isCounterDeploy: isCounterDeploy,
                comboCount: comboCount > 1 ? comboCount : undefined,
                killCount: 0,
              };
            });
            // クリーンアップ
            cpuSpawnTimestampsRef.current = cpuSpawnTimestampsRef.current.filter(s => now - s.time <= 3000);
          }
          if (stillWarnings.length !== currentWarnings.length) {
            cpuSpawnWarningsRef.current = stillWarnings;
            setCpuSpawnWarnings(stillWarnings);
          }
        }

        const currentUnits = spawnedCpuUnits.length > 0
          ? [...unitsRef.current, ...spawnedCpuUnits]
          : unitsRef.current;
        const currentPendingHits = pendingHitsRef.current;

        // A. 着弾時刻に達した雷撃の解決
        const stillPendingHits: PendingLightningHit[] = [];
        const resolvedHits: PendingLightningHit[] = [];
        for (const hit of currentPendingHits) {
          if (now >= hit.hitTime) {
            resolvedHits.push(hit);
          } else {
            stillPendingHits.push(hit);
          }
        }

        // 着弾による本拠地ダメージ適用
        let delayedBaseCpuDmg = 0;
        let delayedBasePlayerDmg = 0;
        for (const hit of resolvedHits) {
          if (hit.targetId === 'cpu') {
            delayedBaseCpuDmg += hit.damage;
          } else if (hit.targetId === 'player') {
            delayedBasePlayerDmg += hit.damage;
          }
        }
        if (delayedBasePlayerDmg > 0) {
          setPlayerHp((h) => {
            const next = Math.max(0, h - delayedBasePlayerDmg);
            if (next === 0) setGameResult('lose');
            return next;
          });
        }
        if (delayedBaseCpuDmg > 0) {
          setCpuHp((h) => {
            const next = Math.max(0, h - delayedBaseCpuDmg);
            if (next === 0) setGameResult('win');
            return next;
          });
        }

        // B. 着弾によるユニットダメージ＆スタン適用
        const unitsAfterHits = currentUnits
          .map((unit) => {
            let hp = unit.hp;
            let stunnedUntil = unit.isStunnedUntil;
            for (const hit of resolvedHits) {
              if (hit.targetId === unit.id && hp > 0) {
                hp -= hit.damage;
                stunnedUntil = now + hit.stunDuration;
              }
            }
            if (hp !== unit.hp || stunnedUntil !== unit.isStunnedUntil) {
              const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
              return { ...unit, hp, isStunnedUntil: stunnedUntil, isStunned: isUnitStunned };
            }
            return unit;
          })
          .filter((u) => u.hp > 0);

        // C. 各ユニットの移動・攻撃・クールダウン更新
        const newAttackEffects: AttackEffect[] = [];
        const newPendingHits: PendingLightningHit[] = [];
        let pDamageToCpu = 0;
        let cpuDamageToPlayer = 0;

        const updatedUnits = unitsAfterHits.map((unit) => {
          const isStunned = unit.isStunnedUntil && unit.isStunnedUntil > now;
          let cooldown = Math.max(0, unit.attackCooldown - dt);
          let y = unit.y;
          let distance = unit.distanceTraveled || 0;
          let attack = unit.cardNo === 2
            ? 1 + Math.min(4, Math.floor(distance / 20))
            : unit.attack;
          let lastAttack = unit.lastAttackEffectTime;

          if (isStunned) {
            return {
              ...unit,
              attackCooldown: cooldown,
              isCharging: false,
              chargeStartTime: undefined,
              isStunned: true,
            };
          }

          // 同一レーン内の対向敵を探す
          const enemiesInLane = unitsAfterHits.filter(
            (u) => u.lane === unit.lane && u.owner !== unit.owner && u.hp > 0
          );

          // 進行方向の前方にいる最も近い敵を探す
          let targetEnemy: Unit | null = null;
          let minDistance = 999;
          enemiesInLane.forEach((enemy) => {
            const dist = unit.owner === 'player' ? unit.y - enemy.y : enemy.y - unit.y;
            if (dist >= -2 && dist < minDistance) {
              minDistance = Math.max(0, dist);
              targetEnemy = enemy;
            }
          });

          // 同一レーン内の前方にいる味方を探す（追い越し防止）
          const alliesInLane = unitsAfterHits.filter(
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

          // 敵が射程内にいる場合：停止して攻撃
          if (targetEnemy && minDistance <= unit.range) {
            const windup = unit.attackWindup || 0;
            let isCharging = unit.isCharging || false;
            let chargeStartTime = unit.chargeStartTime;

            if (cooldown <= 0) {
              if (windup > 0 && !isCharging) {
                // AAチャージモーション開始
                isCharging = true;
                chargeStartTime = now;
              } else {
                const chargeElapsed = isCharging && chargeStartTime ? (now - chargeStartTime) / 1000 : 0;
                if (windup === 0 || chargeElapsed >= windup) {
                  // チャージ完了 -> 従来の攻撃・弾発射モーションへ移行
                  isCharging = false;
                  chargeStartTime = undefined;
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
                    id: `atk_${now}_${Math.random().toString(36).substring(2, 7)}`,
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
                      id: `lhit_${now}_${Math.random().toString(36).substring(2, 7)}`,
                      targetId: (targetEnemy as Unit).id,
                      attackerId: unit.id,
                      lane: unit.lane,
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
            return {
              ...unit,
              attackCooldown: cooldown,
              lastAttackEffectTime: lastAttack,
              isCharging,
              chargeStartTime,
            };
          }

          // 敵陣最奥に到達しているか？
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
                id: `atk_base_${now}_${Math.random().toString(36).substring(2, 7)}`,
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

              if (unit.cardNo === 6 && baseFlightMs) {
                newPendingHits.push({
                  id: `lhit_base_${now}_${Math.random().toString(36).substring(2, 7)}`,
                  targetId: unit.owner === 'player' ? 'cpu' : 'player',
                  attackerId: unit.id,
                  lane: unit.lane,
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

              return { ...unit, hp: 0, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
            }
            return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
          }

          // 忍びアサシン（cardNo: 8）：同一レーンに対向敵がいない場合は移動速度が3倍（超高速疾走）
          const isSprinting = unit.cardNo === 8 && enemiesInLane.length === 0;

          // 移動計算
          const currentSpeed = isSprinting ? unit.speed * 3 : unit.speed;
          const moveDelta = currentSpeed * MOVE_SPEED_SCALE * dt;
          if (unit.owner === 'player') {
            let maxYMove = y - moveDelta;
            if (targetEnemy) {
              const enemyWall = (targetEnemy as Unit).y + 7.5;
              maxYMove = Math.max(maxYMove, enemyWall);
            }
            if (targetAlly) {
              const allyWall = (targetAlly as Unit).y + 8.0;
              maxYMove = Math.max(maxYMove, allyWall);
            }
            y = Math.max(5, maxYMove);
          } else {
            let maxYMove = y + moveDelta;
            if (targetEnemy) {
              const enemyWall = (targetEnemy as Unit).y - 7.5;
              maxYMove = Math.min(maxYMove, enemyWall);
            }
            if (targetAlly) {
              const allyWall = (targetAlly as Unit).y - 8.0;
              maxYMove = Math.min(maxYMove, allyWall);
            }
            y = Math.min(95, maxYMove);
          }
          distance += moveDelta;

          if (unit.cardNo === 2) {
            const bonus = Math.min(4, Math.floor(distance / 20));
            attack = 1 + bonus;
          }

          return {
            ...unit,
            y,
            attack,
            distanceTraveled: distance,
            attackCooldown: cooldown,
            isCharging: false,
            chargeStartTime: undefined,
            isSprinting,
          };
        });

        // D. ユニット同士の近接攻撃解決（通常ユニット用）
        // 撃破（ラストヒット）を達成した攻撃者IDを記録
        const killCountMap = new Map<string, number>();

        const unitsAfterDamage = updatedUnits.map((unit) => {
          let currentHp = unit.hp;
          let stunnedUntil = unit.isStunnedUntil;
          let y = unit.y;

          updatedUnits.forEach((attacker) => {
            if (
              attacker.lane === unit.lane &&
              attacker.owner !== unit.owner &&
              attacker.lastAttackEffectTime === now
            ) {
              if (attacker.cardNo === 6) return; // クラゲは遅延着弾なのでスキップ

              const dist = attacker.owner === 'player' ? attacker.y - unit.y : unit.y - attacker.y;
              if (dist >= -2 && dist <= attacker.range + 2) {
                const hadHp = currentHp > 0;
                currentHp -= attacker.attack;
                if (hadHp && currentHp <= 0) {
                  // attacker が unit にとどめを刺した！
                  killCountMap.set(attacker.id, (killCountMap.get(attacker.id) || 0) + 1);
                }

                if (attacker.cardNo === 7) {
                  const pushBackAmount = 8 + Math.random() * 2;
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
          return { ...unit, hp: currentHp, y, isStunnedUntil: stunnedUntil, isStunned: isUnitStunned };
        });

        // 生存ユニットにキルボーナス（ステータス向上）を適用
        const finalUnits = unitsAfterDamage
          .filter((u) => u.hp > 0)
          .map((unit) => {
            const kills = killCountMap.get(unit.id) || 0;
            if (kills > 0) {
              const newKillCount = (unit.killCount || 0) + kills;
              // 吸血コウモリ（cardNo: 9）：相手ユニットにとどめを刺した時に吸血成長（攻撃力+1、最大HP+1、HP+1）
              if (unit.cardNo === 9) {
                const bonusAtk = kills * 1;
                const bonusHp = kills * 1;
                const nextMaxHp = unit.maxHp + bonusHp;
                const nextHp = Math.min(nextMaxHp, unit.hp + bonusHp);
                return {
                  ...unit,
                  killCount: newKillCount,
                  attack: unit.attack + bonusAtk,
                  maxHp: nextMaxHp,
                  hp: nextHp,
                  lastKillTime: now,
                };
              }
              return {
                ...unit,
                killCount: newKillCount,
                lastKillTime: now,
              };
            }
            return unit;
          });

        // E. 状態の一括反映
        unitsRef.current = finalUnits;
        setUnits(finalUnits);

        if (pDamageToCpu > 0) {
          setCpuHp((h) => {
            const next = Math.max(0, h - pDamageToCpu);
            if (next === 0) setGameResult('win');
            return next;
          });
        }
        if (cpuDamageToPlayer > 0) {
          setPlayerHp((h) => {
            const next = Math.max(0, h - cpuDamageToPlayer);
            if (next === 0) setGameResult('lose');
            return next;
          });
        }

        // 攻撃エフェクトの反映とクリーンアップ（duration+300ms経過で消去）
        setAttackEffects((prev) => {
          const alive = prev.filter((e) => now - e.createdAt < e.duration + 300);
          return newAttackEffects.length > 0 ? [...alive, ...newAttackEffects] : alive;
        });

        // 着弾待ち雷撃のキュー更新
        const nextPendingHits = [...stillPendingHits, ...newPendingHits];
        pendingHitsRef.current = nextPendingHits;
        setPendingLightningHits(nextPendingHits);

        // スペルエフェクトの掃除（1秒以上経過したものを除去）
        setSpellEffects((prev) => prev.filter((e) => now - e.createdAt < 1000));
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [handleCpuAi]);

  // リセット
  const resetGame = useCallback(() => {
    setPlayerHp(INITIAL_LIFE);
    setCpuHp(INITIAL_LIFE);
    setPlayerMana(INITIAL_MANA);
    setCpuMana(INITIAL_MANA);
    setUnits([]);
    unitsRef.current = [];
    setSpellEffects([]);
    setAttackEffects([]);
    setPendingLightningHits([]);
    pendingHitsRef.current = [];
    setGameResult('playing');
    setSelectedCardIndex(null);
    cooldownRef.current = 0;
    setDeckState(createRandomDeckState());
    setCpuDeckState(createRandomDeckState());
    setCpuSpawnWarnings([]);
    cpuSpawnWarningsRef.current = [];
    cpuSpawnTimestampsRef.current = [];
    playerSpawnTimestampsRef.current = [];
    playerComboRef.current = { count: 0, lastTime: 0 };
    cpuComboRef.current = { count: 0, lastTime: 0 };
    setPlayerCombo({ count: 0, lastTime: 0 });
  }, []);

  return {
    playerHp,
    cpuHp,
    playerMana,
    cpuMana,
    maxMana: MAX_MANA,
    manaRegenRate,
    setManaRegenRate,
    hand,
    nextCard,
    deckCount: deck.length,
    discardCount: discardPile.length,
    cpuHand: cpuDeckState.hand,
    cpuNextCard: cpuDeckState.nextCard,
    cpuDeckCount: cpuDeckState.deck.length,
    cpuDiscardCount: cpuDeckState.discardPile.length,
    cpuSpawnWarnings,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    attackEffects,
    gameResult,
    checkCanPlayCard,
    playCardOnLane,
    resetGame,
    comboCount: playerCombo.count,
    lastComboTime: playerCombo.lastTime,
  };
}
