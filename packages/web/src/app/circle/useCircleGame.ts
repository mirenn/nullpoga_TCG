import { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_POOL, createDefault15Deck, shuffleCards, DeckState, DEFAULT_MANA_REGEN_PER_SEC } from '../cards';
import { INITIAL_MANA, MAX_MANA } from '../engine/engineTypes';
import { drawNextCardFromDeck } from '../engine/deckUtils';
import type { AttackEffect, AttackEffectType } from '../types';
import { CircleUnit, OMEGA, SPAWN, W, stepPhysics, isInAttackRange, BASE_SPEED, MAX_SCORE, createCircleUnitsForSpawn } from './circlePhysics';
import { computeCpuLaunchAngle } from './circleCpu';

function createCircleAttackEffect(a: CircleUnit, target: CircleUnit, distPx: number, now: number): AttackEffect {
  const toPct = (v: number) => ((v + W / 2) / W) * 100;
  let effectType: AttackEffectType = 'slash';
  let duration = 350;
  let flightDuration: number | undefined;

  if (a.cardNo === 6) {
    effectType = 'lightning';
    const distRatio = Math.min(1, distPx / (a.range || 112));
    flightDuration = Math.round(220 + distRatio * 160);
    duration = flightDuration + 450;
  } else if (a.cardNo === 11) {
    effectType = 'fireball';
    duration = 1350;
  } else if (a.cardNo === 1) {
    effectType = 'bite';
  } else if (a.cardNo === 2) {
    effectType = 'tackle';
  } else if (a.cardNo === 3) {
    effectType = 'claw';
  } else if (a.cardNo === 7) {
    effectType = 'headbutt';
  } else if (a.cardNo === 8) {
    effectType = 'shuriken';
    flightDuration = 160;
    duration = 480;
  } else if (a.cardNo === 9) {
    effectType = 'blood_bite';
  } else if (a.cardNo === 12) {
    effectType = 'arrow';
    flightDuration = 180;
    duration = 480;
  } else if (a.cardNo === 13) {
    effectType = 'bite';
  }

  return {
    id: `fx_${now}_${a.id}_${Math.random().toString(36).slice(2, 6)}`,
    attackerId: a.id,
    fromX: toPct(a.x),
    fromY: toPct(a.y),
    toX: toPct(target.x),
    toY: toPct(target.y),
    owner: a.owner === 'p' ? 'player' : 'cpu',
    effectType,
    damage: a.attack,
    createdAt: now,
    duration,
    flightDuration,
  };
}

function createMonsterOnlyDeckState(shuffle = false): DeckState {
  const monsterCards = createDefault15Deck().filter((c) => c.type === 'MONSTER');
  const cards = shuffle ? shuffleCards(monsterCards) : monsterCards;
  return { hand: cards.slice(0, 4), nextCard: cards[4] ?? null, deck: cards.slice(5), discardPile: [] };
}

export function useCircleGame() {
  const [units, setUnits] = useState<CircleUnit[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [score, setScore] = useState({ p: 0, c: 0 });
  const [theta, setTheta] = useState(0);
  const [playerMana, setPlayerMana] = useState(INITIAL_MANA);
  const [playerDeck, setPlayerDeck] = useState(() => createMonsterOnlyDeckState(false));
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose'>('playing');

  const lastTimeRef = useRef(Date.now());
  const unitsRef = useRef<CircleUnit[]>([]);
  const attackEffectsRef = useRef<AttackEffect[]>([]);
  const thetaRef = useRef(0);
  const scoreRef = useRef({ p: 0, c: 0 });
  // CPUのマナ・山札は画面に出さないのでrefで持つ（state updater内の副作用はStrictModeで二重実行されるため）
  const cpuManaRef = useRef(INITIAL_MANA);
  const cpuDeckRef = useRef<DeckState>(createMonsterOnlyDeckState(false));

  // クライアント初回マウント時にデッキをランダムシャッフル（SSRハイドレーション不一致を防止）
  useEffect(() => {
    setPlayerDeck(createMonsterOnlyDeckState(true));
    cpuDeckRef.current = createMonsterOnlyDeckState(true);
  }, []);

  const resetGame = useCallback(() => {
    setUnits([]);
    setAttackEffects([]);
    setScore({ p: 0, c: 0 });
    setTheta(0);
    setPlayerMana(INITIAL_MANA);
    setPlayerDeck(createMonsterOnlyDeckState(true));
    setGameResult('playing');
    cpuManaRef.current = INITIAL_MANA;
    cpuDeckRef.current = createMonsterOnlyDeckState(true);

    unitsRef.current = [];
    attackEffectsRef.current = [];
    thetaRef.current = 0;
    scoreRef.current = { p: 0, c: 0 };
    lastTimeRef.current = Date.now();
  }, []);

  const spawnUnit = useCallback((owner: 'p' | 'c', cardNo: number, tx: number, ty: number) => {
    const newUnits = createCircleUnitsForSpawn(owner, cardNo, tx, ty);
    unitsRef.current.push(...newUnits);
  }, []);

  // Game Loop
  useEffect(() => {
    if (gameResult !== 'playing') return;

    let frameId: number;

    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      thetaRef.current = (thetaRef.current + OMEGA * dt) % (Math.PI * 2);

      // Mana regen
      setPlayerMana(prev => Math.min(MAX_MANA, prev + DEFAULT_MANA_REGEN_PER_SEC * dt));
      cpuManaRef.current = Math.min(MAX_MANA, cpuManaRef.current + DEFAULT_MANA_REGEN_PER_SEC * dt);

      // Physics & Combat
      let currentUnits = unitsRef.current;

      // Update physics
      const nextUnits: CircleUnit[] = [];
      for (const u of currentUnits) {
        const res = stepPhysics(u, dt, thetaRef.current, OMEGA);
        if (res === 'hole') {
          scoreRef.current[u.owner]++;
        } else if (res !== 'dead') {
          nextUnits.push(u);
        }
      }

      // Combat logic
      for (const a of nextUnits) {
        let nearestEnemy: CircleUnit | null = null;
        let minDist = Infinity;

        for (const b of nextUnits) {
          if (a.owner !== b.owner && isInAttackRange(a, b)) {
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < minDist) {
              minDist = dist;
              nearestEnemy = b;
            }
          }
        }

        if (nearestEnemy) {
          a.isEngaged = true;
          a.attackCooldown -= dt;
          if (a.attackCooldown <= 0 && a.attack > 0) {
            nearestEnemy.hp -= a.attack;
            a.attackCooldown = a.attackInterval;
            a.attackAnimUntil = now + 450;
            attackEffectsRef.current.push(createCircleAttackEffect(a, nearestEnemy, minDist, now));
          }
        } else {
          a.isEngaged = false;
        }
      }

      // Remove dead & expired attack effects
      const aliveUnits = nextUnits.filter(u => u.hp > 0);
      unitsRef.current = aliveUnits;
      attackEffectsRef.current = attackEffectsRef.current.filter(fx => now - fx.createdAt < fx.duration);

      setUnits([...aliveUnits]);
      setAttackEffects([...attackEffectsRef.current]);
      setTheta(thetaRef.current);

      if (scoreRef.current.p !== score.p || scoreRef.current.c !== score.c) {
        setScore({ ...scoreRef.current });
        if (scoreRef.current.p >= MAX_SCORE) {
          setGameResult('win');
        } else if (scoreRef.current.c >= MAX_SCORE) {
          setGameResult('lose');
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [gameResult, score.p, score.c]);

  // CPU logic
  useEffect(() => {
    if (gameResult !== 'playing') return;

    const interval = setInterval(() => {
      const deck = cpuDeckRef.current;
      const idx = Math.floor(Math.random() * deck.hand.length);
      const cardToPlay = deck.hand[idx];
      if (!cardToPlay || cpuManaRef.current < cardToPlay.manaCost) return;

      cpuManaRef.current -= cardToPlay.manaCost;
      const speed = (cardToPlay.speed || 10) / 10 * BASE_SPEED;
      const [tx, ty] = computeCpuLaunchAngle(speed, thetaRef.current, OMEGA);
      spawnUnit('c', cardToPlay.cardNo, tx, ty);
      cpuDeckRef.current = drawNextCardFromDeck(deck, idx, cardToPlay);
    }, 1500);

    return () => clearInterval(interval);
  }, [gameResult, spawnUnit]);

  return {
    units,
    attackEffects,
    score,
    theta,
    playerMana,
    playerDeck,
    setPlayerDeck,
    setPlayerMana,
    spawnUnit,
    gameResult,
    resetGame,
  };
}
