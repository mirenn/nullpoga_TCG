'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    speed: 8, // 高速ダッシュ型アタッカー（旧16から調整）
    range: 9, // 近接接触
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
    speed: 5, // 標準歩兵ペース（旧10から調整）
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
    speed: 5, // じっくり前進（旧10から調整）
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
    speed: 2.5, // 重装タンク歩行（旧4から調整）
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
    speed: 3.5, // 後方支援ペース
    range: 28, // 長距離放電（旧12から大幅拡大：遠くから雷撃）
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
    speed: 7, // 突破突進（旧13から調整）
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
    speed: 3.5, // 重量級ボス
    range: 32, // 長距離火炎ブレス（旧15から大幅拡大）
    effectDesc: '遠距離から強烈な火炎ブレスを浴びせ、大ダメージを与える。',
    icon: '🐉',
  },
  {
    id: 'haste_spell',
    cardNo: 102,
    name: '疾風の号令',
    type: 'SPELL',
    manaCost: 1,
    effectDesc: '指定レーンの味方の攻撃クールダウンをリセットし、即座に攻撃させる（AAキャンセル）。',
    icon: '💨',
  },
  {
    id: 'heal_spell',
    cardNo: 103,
    name: '癒やしの雨',
    type: 'SPELL',
    manaCost: 3,
    effectDesc: '指定したレーンの味方ユニットすべてのHPを3回復する。',
    icon: '🌧️',
  },
  {
    id: 'meteor',
    cardNo: 101,
    name: '隕石落下',
    type: 'SPELL',
    manaCost: 3,
    effectDesc: '指定したレーンに隕石を落とし、範囲内の敵に3ダメージ。',
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

export const DEFAULT_MANA_REGEN_PER_SEC = 0.40; // 推奨標準：約2.5秒で1マナ（クラロワ風バランス）
export const MOVE_SPEED_SCALE = 1.0; // ユニット移動速度の全体スケーラー（調整用）
export const PLAY_CARD_COOLDOWN_MS = 120; // カード使用時の誤爆・連打防止デバウンス（約0.12秒）
export const SPAWN_MIN_SPACE = 8.0; // 召喚時の最小専有空間（%単位：味方の前進待ちスペース）
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

export const createDefault15Deck = (): DemoCard[] => {
  const cardMap: Record<string, DemoCard> = {};
  CARD_POOL.forEach((c) => {
    cardMap[c.id] = c;
  });
  return [
    cardMap['mouse'], cardMap['haste_spell'],
    cardMap['cat'], cardMap['cat'],
    cardMap['shiba'], cardMap['shiba'],
    cardMap['turtle'], cardMap['heal_spell'],
    cardMap['jellyfish'], cardMap['jellyfish'],
    cardMap['boar'], cardMap['boar'],
    cardMap['dragon'],
    cardMap['meteor'],
    cardMap['fire_spell'],
  ].filter(Boolean);
};

export const shuffleCards = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

interface DeckState {
  hand: DemoCard[];
  nextCard: DemoCard | null;
  deck: DemoCard[];
  discardPile: DemoCard[];
}

const initDeckState = (): DeckState => {
  const shuffled = shuffleCards(createDefault15Deck());
  const initialHand = shuffled.slice(0, 4);
  const next = shuffled[4] || null;
  const initialDrawPile = shuffled.slice(5);
  return {
    hand: initialHand,
    nextCard: next,
    deck: initialDrawPile,
    discardPile: [],
  };
};

export function useRealtimeGame() {
  const [playerHp, setPlayerHp] = useState(INITIAL_LIFE);
  const [cpuHp, setCpuHp] = useState(INITIAL_LIFE);
  const [playerMana, setPlayerMana] = useState(INITIAL_MANA);
  const [cpuMana, setCpuMana] = useState(INITIAL_MANA);
  const [manaRegenRate, setManaRegenRate] = useState<number>(DEFAULT_MANA_REGEN_PER_SEC);

  // 15枚デッキ・手札・NEXT・山札・捨て札管理
  const [deckState, setDeckState] = useState<DeckState>(initDeckState);
  const { hand, nextCard, deck, discardPile } = deckState;
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const cooldownRef = useRef<number>(0);

  // ユニット一覧
  const [units, setUnits] = useState<Unit[]>([]);
  // スペルエフェクト
  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  // 攻撃エフェクト（弾道・斬撃・着弾）
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  // 電気クラゲの着弾待ち雷撃
  const [pendingLightningHits, setPendingLightningHits] = useState<PendingLightningHit[]>([]);
  // ゲーム終了ステータス
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose'>('playing');

  // アニメーションループ用のref
  const lastTimeRef = useRef<number>(0);
  const cpuActionTimerRef = useRef<number>(0);
  const manaTimerRef = useRef<number>(0);
  const manaRegenRateRef = useRef<number>(manaRegenRate);

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
        const hasDragon = stateRef.current.units.some(
          (u) => u.owner === 'player' && u.cardNo === 11 && u.hp > 0
        );
        if (hasDragon) {
          return { canPlay: false, reason: '炎のドラゴンは場に1体まで' };
        }
      }
      // レーン過密制限: モンスターは1レーンあたり自軍最大3体まで
      if (laneIndex !== undefined && card.type === 'MONSTER') {
        const unitsInLane = stateRef.current.units.filter(
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

      if (card.type === 'MONSTER') {
        // 自陣最奥（y=95）にユニット召喚
        const newUnit: Unit = {
          id: `player_${Date.now()}_${Math.random()}`,
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
        setUnits((prev) => [...prev, newUnit]);
      } else if (card.type === 'SPELL') {
        if (card.id === 'meteor') {
          // 指定レーンの敵に3ダメージ
          setSpellEffects((prev) => [
            ...prev,
            { id: `meteor_${Date.now()}`, lane: laneIndex, y: 50, type: 'meteor', createdAt: Date.now() },
          ]);
          setUnits((prev) =>
            prev
              .map((u) => {
                if (u.owner === 'cpu' && u.lane === laneIndex) {
                  return { ...u, hp: u.hp - 3 };
                }
                return u;
              })
              .filter((u) => u.hp > 0)
          );
        } else if (card.id === 'fire_spell') {
          // 全敵ユニットに2ダメージ
          setSpellEffects((prev) => [
            ...prev,
            { id: `burn_${Date.now()}`, lane: -1, y: 50, type: 'burn', createdAt: Date.now() },
          ]);
          setUnits((prev) =>
            prev
              .map((u) => {
                if (u.owner === 'cpu') {
                  return { ...u, hp: u.hp - 2 };
                }
                return u;
              })
              .filter((u) => u.hp > 0)
          );
        } else if (card.id === 'haste_spell') {
          // 味方ユニットの攻撃クールダウンをリセット
          setSpellEffects((prev) => [
            ...prev,
            { id: `haste_${Date.now()}`, lane: laneIndex, y: 75, type: 'haste', createdAt: Date.now() },
          ]);
          setUnits((prev) =>
            prev.map((u) => {
              if (u.owner === 'player' && u.lane === laneIndex) {
                return { ...u, attackCooldown: 0 };
              }
              return u;
            })
          );
        } else if (card.id === 'heal_spell') {
          // 指定レーンの味方に3回復
          setSpellEffects((prev) => [
            ...prev,
            { id: `heal_${Date.now()}`, lane: laneIndex, y: 50, type: 'heal', createdAt: Date.now() },
          ]);
          setUnits((prev) =>
            prev.map((u) => {
              if (u.owner === 'player' && u.lane === laneIndex) {
                return { ...u, hp: Math.min(u.hp + 3, u.maxHp) };
              }
              return u;
            })
          );
        }
      }

      // 手札の補充と選択解除
      drawCardAfterPlay(cardIdx, card);
      setSelectedCardIndex(null);
    },
    [selectedCardIndex, hand, checkCanPlayCard, drawCardAfterPlay]
  );

  // CPU思考ロジック
  const handleCpuAi = useCallback((dt: number) => {
    cpuActionTimerRef.current += dt;
    // 2.5秒ごとにCPUが召喚を検討
    if (cpuActionTimerRef.current >= 2.5) {
      cpuActionTimerRef.current = 0;
      const currentCpuMana = stateRef.current.cpuMana;
      if (currentCpuMana < 1) return;

      // 召喚可能なモンスターカードをフィルタ
      const availableCards = CARD_POOL.filter(
        (c) => c.type === 'MONSTER' && c.manaCost <= currentCpuMana
      );
      if (availableCards.length === 0) return;

      const chosenCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      // ユニーク制限: 炎のドラゴン（cardNo: 11）はCPU側も場に1体まで
      if (chosenCard.cardNo === 11) {
        const hasDragon = stateRef.current.units.some(
          (u) => u.owner === 'cpu' && u.cardNo === 11 && u.hp > 0
        );
        if (hasDragon) return;
      }

      // 出撃可能なレーンをフィルタ（味方3体未満 かつ 出撃スペース y >= 5 + SPAWN_MIN_SPACE が空いているレーン）
      const validLanes = [0, 1, 2, 3, 4].filter((lane) => {
        const cpuUnitsInLane = stateRef.current.units.filter(
          (u) => u.owner === 'cpu' && u.lane === lane && u.hp > 0
        );
        if (cpuUnitsInLane.length >= 3) return false;
        const hasBlockingAlly = cpuUnitsInLane.some((u) => u.y < 5 + SPAWN_MIN_SPACE);
        return !hasBlockingAlly;
      });
      if (validLanes.length === 0) return;

      // プレイヤーユニットが多く攻めてきているレーンを優先、または出撃可能レーンから選択
      const lanePlayerCounts = [0, 0, 0, 0, 0];
      stateRef.current.units.forEach((u) => {
        if (u.owner === 'player' && u.hp > 0) lanePlayerCounts[u.lane]++;
      });

      const candidateLanes = [...validLanes].sort(
        (a, b) => lanePlayerCounts[b] - lanePlayerCounts[a]
      );
      const chosenLane =
        Math.random() < 0.65
          ? candidateLanes[0]
          : validLanes[Math.floor(Math.random() * validLanes.length)];

      setCpuMana((m) => Math.max(0, m - chosenCard.manaCost));
      const cpuUnit: Unit = {
        id: `cpu_${Date.now()}_${Math.random()}`,
        cardNo: chosenCard.cardNo,
        name: chosenCard.name,
        owner: 'cpu',
        lane: chosenLane,
        y: 5, // CPU最奥からスタート
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
      setUnits((prev) => [...prev, cpuUnit]);
    }
  }, []);

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

        // 3. ユニット更新
        const now = Date.now();
        const newAttackEffects: AttackEffect[] = [];
        const newPendingHits: PendingLightningHit[] = [];

        setUnits((prevUnits) => {
          let pDamageToCpu = 0;
          let cpuDamageToPlayer = 0;

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

            // 同一レーン内の対向敵を探す
            const enemiesInLane = prevUnits.filter(
              (u) => u.lane === unit.lane && u.owner !== unit.owner && u.hp > 0
            );

            // 進行方向の前方にいる最も近い敵を探す
            let targetEnemy: Unit | null = null;
            let minDistance = 999;

            enemiesInLane.forEach((enemy) => {
              const dist = unit.owner === 'player' ? unit.y - enemy.y : enemy.y - unit.y;
              // わずかな重なり（-2%まで）も含めて正面交戦対象とする
              if (dist >= -2 && dist < minDistance) {
                minDistance = Math.max(0, dist);
                targetEnemy = enemy;
              }
            });

            // 同一レーン内の前方にいる味方を探す（追い越し防止）
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

            // 敵が射程内にいる場合：停止して攻撃
            if (targetEnemy && minDistance <= unit.range) {
              if (cooldown <= 0) {
                cooldown = unit.attackInterval;
                lastAttack = now;

                // 攻撃種別に応じたエフェクト種別と継続時間を設定
                let effectType: AttackEffectType = 'slash';
                let duration = 300;
                let flightMs: number | undefined;

                if (unit.cardNo === 11) {
                  // 炎のドラゴン: 長距離火炎ブレス
                  effectType = 'fireball';
                  duration = 550;
                } else if (unit.cardNo === 6) {
                  // 電気クラゲ: 電撃弾プロジェクタイル飛行 ＆ 着弾放電スパーク
                  effectType = 'lightning';
                  const distRatio = Math.min(1, minDistance / LIGHTNING_MAX_RANGE);
                  flightMs = Math.round(LIGHTNING_FLIGHT_MIN_MS + distRatio * (LIGHTNING_FLIGHT_MAX_MS - LIGHTNING_FLIGHT_MIN_MS));
                  duration = flightMs + 450; // 飛行時間 + 着弾余韻
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

                // 電気クラゲ: ダメージ+スタンは着弾時に遅延適用
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
              return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
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

                // 本拠地に攻撃したユニットは消滅する (HPを0にする)
                return { ...unit, hp: 0, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
              }
              return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
            }

            // 移動計算（すれ違い防止＆味方追い越し防止の物理壁）
            const moveDelta = unit.speed * MOVE_SPEED_SCALE * dt;
            if (unit.owner === 'player') {
              // プレイヤーユニットは上向き（y減少）
              let maxYMove = y - moveDelta;
              // 敵の接触限界（敵の8%手前）
              if (targetEnemy) {
                const enemyWall = (targetEnemy as Unit).y + 7.5;
                maxYMove = Math.max(maxYMove, enemyWall);
              }
              // 前方の味方の接触限界（味方の8%手前で追従）
              if (targetAlly) {
                const allyWall = (targetAlly as Unit).y + 8.0;
                maxYMove = Math.max(maxYMove, allyWall);
              }
              y = Math.max(5, maxYMove);
            } else {
              // CPUユニットは下向き（y増加）
              let maxYMove = y + moveDelta;
              // 敵の接触限界（敵の8%手前）
              if (targetEnemy) {
                const enemyWall = (targetEnemy as Unit).y - 7.5;
                maxYMove = Math.min(maxYMove, enemyWall);
              }
              // 前方の味方の接触限界（味方の8%手前で追従）
              if (targetAlly) {
                const allyWall = (targetAlly as Unit).y - 8.0;
                maxYMove = Math.min(maxYMove, allyWall);
              }
              y = Math.min(95, maxYMove);
            }
            distance += moveDelta;

            // 柴犬ラン丸の特性：移動距離に応じて攻撃力UP（20%進むごとに+1、最大+4）
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
            };
          });

          // ユニット同士の攻撃解決（ダメージ反映とスタン付与）
          const finalUnits = updated.map((unit) => {
            let hp = unit.hp;
            let stunnedUntil = unit.isStunnedUntil;
            let y = unit.y;

            // このユニットを攻撃している敵をすべて探す
            updated.forEach((attacker) => {
              if (
                attacker.lane === unit.lane &&
                attacker.owner !== unit.owner &&
                attacker.lastAttackEffectTime === now
              ) {
                // 電気クラゲ(cardNo:6)はダメージ+スタンを着弾時に遅延適用するのでスキップ
                if (attacker.cardNo === 6) return;

                const dist = attacker.owner === 'player' ? attacker.y - unit.y : unit.y - attacker.y;
                if (dist >= -2 && dist <= attacker.range + 2) {
                  hp -= attacker.attack;

                  // イノシシ (cardNo: 7) のノックバック効果
                  if (attacker.cardNo === 7) {
                    const pushBackAmount = 8 + Math.random() * 2; // 8%〜10%
                    if (attacker.owner === 'player') {
                      // プレイヤー攻撃時は敵を奥（y減少方向だが、CPUベースはy=5なのでyを減らす）
                      y = Math.max(5, y - pushBackAmount);
                    } else {
                      // CPU攻撃時は敵を手前（y増加方向、プレイヤーベースはy=95なのでyを増やす）
                      y = Math.min(95, y + pushBackAmount);
                    }
                    // ノックバック時0.3秒スタン
                    stunnedUntil = now + 300;
                  }
                }
              }
            });

            const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
            return { ...unit, hp, y, isStunnedUntil: stunnedUntil, isStunned: isUnitStunned };
          });

          // 拠点ダメージ反映
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

          // HPが0以下のユニットを退場
          return finalUnits.filter((u) => u.hp > 0);
        });

        // 攻撃エフェクトの反映とクリーンアップ（duration+300ms経過で消去）
        if (newAttackEffects.length > 0) {
          setAttackEffects((prev) => [...prev, ...newAttackEffects]);
        }
        setAttackEffects((prev) => prev.filter((e) => now - e.createdAt < e.duration + 300));

        // 電気クラゲの着弾予約をキューに追加
        if (newPendingHits.length > 0) {
          setPendingLightningHits((prev) => [...prev, ...newPendingHits]);
        }

        // 着弾時刻に達した雷撃を解決（ダメージ+スタン適用）
        setPendingLightningHits((prev) => {
          const stillPending: PendingLightningHit[] = [];
          const resolvedHits: PendingLightningHit[] = [];

          for (const hit of prev) {
            if (now >= hit.hitTime) {
              resolvedHits.push(hit);
            } else {
              stillPending.push(hit);
            }
          }

          // 着弾したヒットをユニットに反映
          if (resolvedHits.length > 0) {
            setUnits((prevUnits) => {
              return prevUnits.map((unit) => {
                let hp = unit.hp;
                let stunnedUntil = unit.isStunnedUntil;

                for (const hit of resolvedHits) {
                  if (hit.targetId === unit.id && unit.hp > 0) {
                    hp -= hit.damage;
                    stunnedUntil = now + hit.stunDuration;
                  }
                }

                if (hp !== unit.hp || stunnedUntil !== unit.isStunnedUntil) {
                  const isUnitStunned = Boolean(stunnedUntil && stunnedUntil > now);
                  return { ...unit, hp, isStunnedUntil: stunnedUntil, isStunned: isUnitStunned };
                }
                return unit;
              }).filter((u) => u.hp > 0);
            });

            // 本拠地への遅延ダメージ適用
            let pDmg = 0;
            let cpuDmg = 0;
            for (const hit of resolvedHits) {
              if (hit.targetId === 'cpu') {
                cpuDmg += hit.damage;
              } else if (hit.targetId === 'player') {
                pDmg += hit.damage;
              }
            }
            if (pDmg > 0) {
              setPlayerHp((h) => {
                const next = Math.max(0, h - pDmg);
                if (next === 0) setGameResult('lose');
                return next;
              });
            }
            if (cpuDmg > 0) {
              setCpuHp((h) => {
                const next = Math.max(0, h - cpuDmg);
                if (next === 0) setGameResult('win');
                return next;
              });
            }
          }

          return stillPending;
        });

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
    setSpellEffects([]);
    setAttackEffects([]);
    setPendingLightningHits([]);
    setGameResult('playing');
    setSelectedCardIndex(null);
    cooldownRef.current = 0;
    setDeckState(initDeckState());
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
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    attackEffects,
    gameResult,
    checkCanPlayCard,
    playCardOnLane,
    resetGame,
  };
}
