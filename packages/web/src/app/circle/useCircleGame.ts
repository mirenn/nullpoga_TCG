import { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_POOL, createRandomDeckState, DeckState, DEFAULT_MANA_REGEN_PER_SEC } from '../cards';
import { INITIAL_MANA, MAX_MANA } from '../engine/engineTypes';
import { drawNextCardFromDeck } from '../engine/deckUtils';
import { CircleUnit, OMEGA, SPAWN, stepPhysics, BASE_SPEED, MAX_SCORE } from './circlePhysics';
import { computeCpuLaunchAngle } from './circleCpu';

const MONSTER_CARDS = CARD_POOL.filter((c) => c.type === 'MONSTER');

function createMonsterOnlyDeckState(): DeckState {
  const ds = createRandomDeckState();
  const filterSpells = (cards: any[]) => cards.filter(c => c.type === 'MONSTER').map(c => MONSTER_CARDS.find(m => m.cardNo === c.cardNo) || MONSTER_CARDS[0]);
  return {
    deck: filterSpells(ds.deck),
    hand: filterSpells(ds.hand),
    discardPile: filterSpells(ds.discardPile),
    nextCard: ds.nextCard?.type === 'MONSTER' ? ds.nextCard : MONSTER_CARDS[0],
  };
}

export function useCircleGame() {
  const [units, setUnits] = useState<CircleUnit[]>([]);
  const [score, setScore] = useState({ p: 0, c: 0 });
  const [theta, setTheta] = useState(0);
  const [playerMana, setPlayerMana] = useState(INITIAL_MANA);
  const [cpuMana, setCpuMana] = useState(INITIAL_MANA);
  const [playerDeck, setPlayerDeck] = useState(createMonsterOnlyDeckState);
  const [cpuDeck, setCpuDeck] = useState(createMonsterOnlyDeckState);
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose'>('playing');

  const lastTimeRef = useRef(Date.now());
  const unitsRef = useRef<CircleUnit[]>([]);
  const thetaRef = useRef(0);
  const scoreRef = useRef({ p: 0, c: 0 });

  const resetGame = useCallback(() => {
    setUnits([]);
    setScore({ p: 0, c: 0 });
    setTheta(0);
    setPlayerMana(INITIAL_MANA);
    setCpuMana(INITIAL_MANA);
    setPlayerDeck(createMonsterOnlyDeckState());
    setCpuDeck(createMonsterOnlyDeckState());
    setGameResult('playing');

    unitsRef.current = [];
    thetaRef.current = 0;
    scoreRef.current = { p: 0, c: 0 };
    lastTimeRef.current = Date.now();
  }, []);

  const spawnUnit = useCallback((owner: 'p' | 'c', cardNo: number, tx: number, ty: number) => {
    const card = MONSTER_CARDS.find(c => c.cardNo === cardNo) || MONSTER_CARDS[0];
    const [sx, sy] = SPAWN[owner];
    const l = Math.hypot(tx - sx, ty - sy) || 1;
    // speed 10 means 10% of field per sec in normal game. In circle (radius 195), let's scale it.
    const speed = (card.speed || 10) / 10 * BASE_SPEED;

    const newUnit: CircleUnit = {
      id: Math.random().toString(36).substring(2, 9),
      owner,
      x: sx,
      y: sy,
      vx: ((tx - sx) / l) * speed,
      vy: ((ty - sy) / l) * speed,
      t: 0,
      cardNo,
      hp: card.life || 1,
      maxHp: card.life || 1,
      attack: card.attack || 1,
      attackInterval: card.attackInterval || 1,
      attackCooldown: 0,
      speed,
      range: (card.range || 10) * 4, // scale range appropriately
      isEngaged: false,
    };
    unitsRef.current.push(newUnit);
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
      setCpuMana(prev => Math.min(MAX_MANA, prev + DEFAULT_MANA_REGEN_PER_SEC * dt));

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
          if (a.owner !== b.owner) {
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < a.range && dist < minDist) {
              minDist = dist;
              nearestEnemy = b;
            }
          }
        }

        if (nearestEnemy) {
          a.isEngaged = true;
          a.attackCooldown -= dt;
          if (a.attackCooldown <= 0) {
            nearestEnemy.hp -= a.attack;
            a.attackCooldown = a.attackInterval;
          }
        } else {
          a.isEngaged = false;
        }
      }

      // Remove dead
      const aliveUnits = nextUnits.filter(u => u.hp > 0);
      unitsRef.current = aliveUnits;

      setUnits([...aliveUnits]);
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
      setCpuMana(currentMana => {
        let newMana = currentMana;
        setCpuDeck(currentDeck => {
          const hand = currentDeck.hand;
          if (hand.length === 0) return currentDeck;

          // Pick random card
          const idx = Math.floor(Math.random() * hand.length);
          const cardToPlay = hand[idx];

          if (cardToPlay && newMana >= cardToPlay.manaCost) {
            newMana -= cardToPlay.manaCost;

            // speed is needed for launch angle computation
            const speed = (cardToPlay.speed || 10) / 10 * BASE_SPEED;
            const [tx, ty] = computeCpuLaunchAngle(speed, thetaRef.current, OMEGA);

            spawnUnit('c', cardToPlay.cardNo, tx, ty);
            return drawNextCardFromDeck(currentDeck, idx, cardToPlay);
          }
          return currentDeck;
        });
        return newMana;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [gameResult, spawnUnit]);

  return {
    units,
    score,
    theta,
    playerMana,
    cpuMana,
    playerDeck,
    setPlayerDeck,
    setPlayerMana,
    spawnUnit,
    gameResult,
    resetGame,
  };
}
