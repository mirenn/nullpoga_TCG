'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { manaRegenMultiplier } from './inhibitors';
import { Camera3DState } from './obstacles';
import {
  MAX_MANA,
  RealtimeGameEngine,
  RealtimeGameState,
  validateCanPlayCard,
} from './engine';
import { usePerfTelemetry } from './usePerfTelemetry';

// re-export for external consumers & tests
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
  RealtimeGameEngine,
};
export type { DeckState, RealtimeGameState };

/**
 * 純粋TypeScriptゲームエンジン (RealtimeGameEngine) をReact UIへ接続する軽量アダプターフック。
 * ゲーム進行・物理衝突・AI・スペル解決などのロジックはすべて `src/app/engine/` 側で
 * React非依存の純粋なデータ処理として実行される。
 */
export function useRealtimeGame() {
  const engineRef = useRef<RealtimeGameEngine | null>(null);
  if (!engineRef.current) {
    // SSRハイドレーションエラー防止のため初期値は固定順デッキで生成
    engineRef.current = new RealtimeGameEngine(false);
  }
  const engine = engineRef.current;

  const [state, setState] = useState<RealtimeGameState>(() => engine.state);
  const lastTimeRef = useRef<number>(0);

  const { recordRaf, recordEngineTick, onProfilerRender } = usePerfTelemetry({
    unitsCount: state.units.length,
    is3DMode: state.camera3D.is3DMode,
    gameResult: state.gameResult,
  });

  // エンジンの状態更新をReact Stateへ同期
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setState(engine.state);
    });
    // クライアント初回マウント時にプレイヤーとCPUのデッキをランダムシャッフル
    engine.randomizeDecks();
    return unsubscribe;
  }, [engine]);

  // メインゲームループ（iPad Proの120Hz ProMotion等での過剰な再レンダリング＆発熱を防ぐため約30fps=32ms間隔に制限）
  useEffect(() => {
    let animId: number;
    const MIN_TICK_INTERVAL_MS = 32; // ~30fps

    const gameLoop = (timestamp: number) => {
      recordRaf(timestamp);
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const elapsedMs = timestamp - lastTimeRef.current;
      if (elapsedMs >= MIN_TICK_INTERVAL_MS) {
        const dt = Math.min(elapsedMs / 1000, 0.1);
        lastTimeRef.current = timestamp;
        const t0 = performance.now();
        engine.tick(dt, Date.now());
        const t1 = performance.now();
        recordEngineTick(t1 - t0);
      }
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [engine, recordRaf, recordEngineTick]);

  const setManaRegenRate = useCallback(
    (updater: number | ((prev: number) => number)) => {
      engine.setManaRegenRate(updater);
    },
    [engine]
  );

  const setSelectedCardIndex = useCallback(
    (updater: number | null | ((prev: number | null) => number | null)) => {
      engine.setSelectedCardIndex(updater);
    },
    [engine]
  );

  const setCamera3D = useCallback(
    (updater: Camera3DState | ((prev: Camera3DState) => Camera3DState)) => {
      engine.setCamera3D(updater);
    },
    [engine]
  );

  const resetCamera3D = useCallback(() => {
    engine.resetCamera3D();
  }, [engine]);

  const checkCanPlayCard = useCallback(
    (cardIndex: number, spawnX?: number, spawnY?: number) => {
      return validateCanPlayCard(engine.state, cardIndex, spawnX, spawnY, Date.now());
    },
    [engine]
  );

  const playCardAt = useCallback(
    (rawX: number, rawY?: number, cardIndexOverride?: number) => {
      engine.playCardAt(rawX, rawY, cardIndexOverride, Date.now());
    },
    [engine]
  );

  const playCardAtX = useCallback(
    (rawX: number, cardIndexOverride?: number) => {
      engine.playCardAt(rawX, undefined, cardIndexOverride, Date.now());
    },
    [engine]
  );

  const playCardOnLane = useCallback(
    (laneOrX: number, cardIndexOverride?: number) => {
      const targetX = laneOrX <= 8 ? 10 + laneOrX * 10 : laneOrX;
      engine.playCardAt(targetX, undefined, cardIndexOverride, Date.now());
    },
    [engine]
  );

  const toggleUnitHold = useCallback(
    (unitId: string) => {
      engine.toggleUnitHold(unitId, Date.now());
    },
    [engine]
  );

  const resetGame = useCallback(() => {
    lastTimeRef.current = 0;
    engine.reset(true);
  }, [engine]);

  return {
    playerHp: state.playerHp,
    cpuHp: state.cpuHp,
    playerScore: state.playerScore,
    cpuScore: state.cpuScore,
    playerMana: state.playerMana,
    cpuMana: state.cpuMana,
    maxMana: MAX_MANA,
    manaRegenRate: state.manaRegenRate,
    setManaRegenRate,
    hand: state.deckState.hand,
    nextCard: state.deckState.nextCard,
    deckCount: state.deckState.deck.length,
    discardCount: state.deckState.discardPile.length,
    cpuHand: state.cpuDeckState.hand,
    cpuNextCard: state.cpuDeckState.nextCard,
    cpuDeckCount: state.cpuDeckState.deck.length,
    cpuDiscardCount: state.cpuDeckState.discardPile.length,
    cpuSpawnWarnings: state.cpuSpawnWarnings,
    selectedCardIndex: state.selectedCardIndex,
    setSelectedCardIndex,
    units: state.units,
    inhibitors: state.inhibitors,
    obstacles: state.obstacles,
    cloudEvent: state.cloudEvent,
    camera3D: state.camera3D,
    setCamera3D,
    resetCamera3D,
    spottedCount: state.spottedCount,
    playerManaRegenMultiplier: manaRegenMultiplier(state.inhibitors, 'player'),
    cpuManaRegenMultiplier: manaRegenMultiplier(state.inhibitors, 'cpu'),
    spellEffects: state.spellEffects,
    attackEffects: state.attackEffects,
    gameResult: state.gameResult,
    checkCanPlayCard,
    playCardAt,
    playCardAtX,
    playCardOnLane,
    resetGame,
    toggleUnitHold,
    onProfilerRender,
  };
}
