'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DemoCard, Unit, SpellEffect } from './types';

export const CARD_POOL: DemoCard[] = [
  {
    id: 'mouse',
    cardNo: 1,
    name: 'ネズミ',
    type: 'MONSTER',
    manaCost: 1,
    attack: 1,
    life: 1,
    speed: 16, // 速い
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
    speed: 10,
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
    speed: 10,
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
    speed: 4, // 非常に遅い
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
    speed: 8,
    range: 12, // やや遠距離
    effectDesc: '攻撃時、相手ユニットを1.2秒間スタン（麻痺）させる。',
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
    speed: 13,
    range: 9,
    effectDesc: '素早い突進力と高い火力を併せ持つ突破ユニット。',
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
    speed: 7,
    range: 15, // 遠距離ブレス
    effectDesc: '圧倒的なHPと火力を誇る前線の切り込み隊長。',
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

export const DEFAULT_MANA_REGEN_PER_SEC = 0.40; // 推奨標準：約2.5秒で1マナ（クラロワ風バランス）
const INITIAL_LIFE = 20;
const INITIAL_MANA = 3;
const MAX_MANA = 10;

export function useRealtimeGame() {
  const [playerHp, setPlayerHp] = useState(INITIAL_LIFE);
  const [cpuHp, setCpuHp] = useState(INITIAL_LIFE);
  const [playerMana, setPlayerMana] = useState(INITIAL_MANA);
  const [cpuMana, setCpuMana] = useState(INITIAL_MANA);
  const [manaRegenRate, setManaRegenRate] = useState<number>(DEFAULT_MANA_REGEN_PER_SEC);

  // 手札（4枚）
  const [hand, setHand] = useState<DemoCard[]>(() => [
    CARD_POOL[0], // ネズミ
    CARD_POOL[1], // ネコ
    CARD_POOL[2], // 柴犬
    CARD_POOL[3], // 亀
  ]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // ユニット一覧
  const [units, setUnits] = useState<Unit[]>([]);
  // スペルエフェクト
  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  // ゲーム終了ステータス
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose'>('playing');

  // アニメーションループ用のref
  const lastTimeRef = useRef<number>(performance.now());
  const cpuActionTimerRef = useRef<number>(0);
  const manaTimerRef = useRef<number>(0);
  const manaRegenRateRef = useRef<number>(manaRegenRate);
  manaRegenRateRef.current = manaRegenRate;

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

  // デッキから手札を補充
  const drawCard = useCallback((replaceIndex: number) => {
    const randomCard = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    setHand((prev) => {
      const next = [...prev];
      next[replaceIndex] = randomCard;
      return next;
    });
  }, []);

  // プレイヤーがレーンを指定してカードを使用（ドラッグ＆ドロップ時はcardIndexOverrideを渡す）
  const playCardOnLane = useCallback(
    (laneIndex: number, cardIndexOverride?: number) => {
      const cardIdx = cardIndexOverride !== undefined ? cardIndexOverride : selectedCardIndex;
      if (cardIdx === null || cardIdx === undefined) return;
      const card = hand[cardIdx];
      if (!card || playerMana < card.manaCost || gameResult !== 'playing') return;

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
          // 指定レーンの敵に4ダメージ
          setSpellEffects((prev) => [
            ...prev,
            { id: `meteor_${Date.now()}`, lane: laneIndex, y: 50, type: 'meteor', createdAt: Date.now() },
          ]);
          setUnits((prev) =>
            prev
              .map((u) => {
                if (u.owner === 'cpu' && u.lane === laneIndex) {
                  return { ...u, hp: u.hp - 4 };
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
        }
      }

      // 手札の補充と選択解除
      drawCard(cardIdx);
      setSelectedCardIndex(null);
    },
    [selectedCardIndex, hand, playerMana, gameResult, drawCard]
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
      // プレイヤーユニットが多く攻めてきているレーン、またはランダムなレーンを選択
      const laneCounts = [0, 0, 0, 0, 0];
      stateRef.current.units.forEach((u) => {
        if (u.owner === 'player') laneCounts[u.lane]++;
      });
      // プレイヤーがいるレーンを優先、いなければランダム
      const candidateLanes = laneCounts
        .map((count, idx) => ({ count, idx }))
        .sort((a, b) => b.count - a.count);
      const chosenLane = Math.random() < 0.6 ? candidateLanes[0].idx : Math.floor(Math.random() * 5);

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
        setUnits((prevUnits) => {
          let pDamageToCpu = 0;
          let cpuDamageToPlayer = 0;

          const updated = prevUnits.map((unit) => {
            const isStunned = unit.isStunnedUntil && unit.isStunnedUntil > now;
            let cooldown = Math.max(0, unit.attackCooldown - dt);
            let y = unit.y;
            let attack = unit.attack;
            let distance = unit.distanceTraveled || 0;
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
              }
              return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
            }

            // 敵陣最奥に到達しているか？
            const isAtBase = unit.owner === 'player' ? y <= 6 : y >= 94;
            if (isAtBase) {
              if (cooldown <= 0) {
                cooldown = unit.attackInterval;
                lastAttack = now;
                if (unit.owner === 'player') {
                  pDamageToCpu += attack;
                } else {
                  cpuDamageToPlayer += attack;
                }
              }
              return { ...unit, attackCooldown: cooldown, lastAttackEffectTime: lastAttack };
            }

            // 移動計算（すれ違い防止＆味方追い越し防止の物理壁）
            const moveDelta = unit.speed * dt;
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

            // このユニットを攻撃している敵をすべて探す
            updated.forEach((attacker) => {
              if (
                attacker.lane === unit.lane &&
                attacker.owner !== unit.owner &&
                attacker.lastAttackEffectTime === now
              ) {
                const dist = attacker.owner === 'player' ? attacker.y - unit.y : unit.y - attacker.y;
                if (dist >= -2 && dist <= attacker.range + 2) {
                  hp -= attacker.attack;
                  // 電気クラゲのスタン効果
                  if (attacker.cardNo === 6) {
                    stunnedUntil = now + 1200;
                  }
                }
              }
            });

            return { ...unit, hp, isStunnedUntil: stunnedUntil };
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
    setGameResult('playing');
    setSelectedCardIndex(null);
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
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    gameResult,
    playCardOnLane,
    resetGame,
  };
}
