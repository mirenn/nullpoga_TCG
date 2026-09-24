'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DemoCard, Unit, SpellEffect, AttackEffect, AttackEffectType } from './types';
import { GameEngine, CARD_POOL, MANA_SPEED_PRESETS, DEFAULT_MANA_REGEN_PER_SEC, PLAY_CARD_COOLDOWN_MS, SPAWN_MIN_SPACE } from '../game/engine';

export { CARD_POOL, MANA_SPEED_PRESETS };

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

const createDefault15Deck = (): DemoCard[] => {
  const cardMap = CARD_POOL.reduce((acc, card) => {
    acc[card.id] = card;
    return acc;
  }, {} as Record<string, DemoCard>);

  return [
    cardMap['mouse'], cardMap['mouse'],
    cardMap['cat'], cardMap['cat'],
    cardMap['shiba'], cardMap['shiba'],
    cardMap['turtle'], cardMap['turtle'],
    cardMap['jellyfish'], cardMap['jellyfish'],
    cardMap['boar'], cardMap['boar'],
    cardMap['dragon'],
    cardMap['meteor'],
    cardMap['fire_spell'],
  ].filter(Boolean);
};

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
  const [engine] = useState(() => new GameEngine());

  const [playerHp, setPlayerHp] = useState(20);
  const [cpuHp, setCpuHp] = useState(20);
  const [playerMana, setPlayerMana] = useState(3);
  const [cpuMana, setCpuMana] = useState(3);
  const maxMana = engine.maxMana;
  const [manaRegenRate, setManaRegenRate] = useState<number>(DEFAULT_MANA_REGEN_PER_SEC);

  const [deckState, setDeckState] = useState<DeckState>(initDeckState);
  const { hand, nextCard, deck, discardPile } = deckState;
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);

  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lose' | null>('playing');

  const lastTimeRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);

  const syncStateFromEngine = useCallback(() => {
    setPlayerHp(engine.state.playerHp);
    setCpuHp(engine.state.cpuHp);
    setPlayerMana(engine.state.playerMana);
    setCpuMana(engine.state.cpuMana);
    setUnits([...engine.state.units]);
    setSpellEffects([...engine.state.spellEffects]);
    setAttackEffects([...engine.state.attackEffects]);

    if (engine.state.gameResult === 'player_win') {
      setGameResult('win');
    } else if (engine.state.gameResult === 'cpu_win') {
      setGameResult('lose');
    } else if (engine.state.gameResult === 'playing') {
      setGameResult('playing');
    } else {
      setGameResult(null);
    }
  }, [engine]);

  useEffect(() => {
    engine.manaRegenRate = manaRegenRate;
  }, [manaRegenRate, engine]);

  const resetGame = useCallback(() => {
    engine.reset();
    engine.manaRegenRate = manaRegenRate;
    setSelectedCardIndex(null);
    cooldownRef.current = 0;
    lastTimeRef.current = 0;
    setDeckState(initDeckState());
    syncStateFromEngine();
  }, [engine, manaRegenRate, syncStateFromEngine]);

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const newShuffledDeck = shuffleCards(newDiscard);
        if (newShuffledDeck.length > 0) {
          newNextCard = newShuffledDeck[0];
          newDeck = newShuffledDeck.slice(1);
        }
        return {
          hand: newHand,
          nextCard: newNextCard,
          deck: newDeck,
          discardPile: [],
        };
      }
    });
  }, []);

  const checkCanPlayCard = useCallback(
    (cardIndex: number, laneIndex?: number): { canPlay: boolean; reason?: string } => {
      if (engine.state.gameResult !== 'playing') {
        return { canPlay: false, reason: 'ゲーム終了' };
      }
      const card = hand[cardIndex];
      if (!card) {
        return { canPlay: false, reason: 'カードが存在しません' };
      }
      if (Date.now() < cooldownRef.current) {
        return { canPlay: false, reason: 'クールダウン中...' };
      }
      if (engine.state.playerMana < card.manaCost) {
        return { canPlay: false, reason: `マナ不足 (⚡${card.manaCost}必要)` };
      }
      if (card.cardNo === 11) {
        const hasDragon = engine.state.units.some(
          (u) => u.owner === 'player' && u.cardNo === 11 && u.hp > 0
        );
        if (hasDragon) return { canPlay: false, reason: 'ドラゴンは場に1体まで' };
      }

      if (laneIndex !== undefined && card.type === 'MONSTER') {
        const playerUnitsInLane = engine.state.units.filter(
          (u) => u.owner === 'player' && u.lane === laneIndex && u.hp > 0
        );
        if (playerUnitsInLane.length >= 3) return { canPlay: false, reason: 'Lane full' };

        const hasBlockingAlly = playerUnitsInLane.some((u) => u.y > 95 - SPAWN_MIN_SPACE);
        if (hasBlockingAlly) return { canPlay: false, reason: 'Spawn area blocked' };
      }

      return { canPlay: true };
    },
    [engine, hand]
  );

  const playCardOnLane = useCallback(
    (laneIndex: number, cardIndexOverride?: number) => {
      const cardIdx = cardIndexOverride !== undefined ? cardIndexOverride : selectedCardIndex;
      if (cardIdx === null || cardIdx === undefined) return;
      const card = hand[cardIdx];
      if (!card) return;

      const validation = checkCanPlayCard(cardIdx, laneIndex);
      if (!validation.canPlay) return;

      cooldownRef.current = Date.now() + PLAY_CARD_COOLDOWN_MS;

      const success = engine.playCardOnLane(card, laneIndex);

      if (success) {
        setPlayerMana(engine.state.playerMana);
        drawCardAfterPlay(cardIdx, card);
        setSelectedCardIndex(null);
        syncStateFromEngine();
      }
    },
    [checkCanPlayCard, engine, hand, selectedCardIndex, syncStateFromEngine, drawCardAfterPlay]
  );

  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      engine.update(dt);

      syncStateFromEngine();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [engine, syncStateFromEngine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardIndex(null);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (hand[idx]) setSelectedCardIndex(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hand]);

  return {
    playerHp,
    cpuHp,
    playerMana,
    cpuMana,
    maxMana,
    manaRegenRate,
    setManaRegenRate,
    hand,
    nextCard,
    deckCount: deckState.deck.length,
    discardCount: deckState.discardPile.length,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    attackEffects,
    gameResult: gameResult,
    checkCanPlayCard,
    playCardOnLane,
    resetGame,
  };
}
