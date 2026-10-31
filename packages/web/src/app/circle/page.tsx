'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useCircleGame } from './useCircleGame';
import { CircleSidePanel } from './CircleSidePanel';
import { GameResultModal } from '../../components/modals/GameResultModal';
import { UnitSvgRenderer, hasUnitSvg } from '../../components/units/UnitSvgRenderer';
import { MAX_MANA } from '../engine/engineTypes';
import { MAX_SCORE, W, R, HOLE, RING, GAPS, GAPW, BUMPERS, predict, OMEGA, BASE_SPEED, SPAWN } from './circlePhysics';
import { drawNextCardFromDeck } from '../engine/deckUtils';
import { styles } from '../page.styles';

export default function CircleModePage() {
  const {
    units,
    score,
    theta,
    playerMana,
    playerDeck,
    setPlayerDeck,
    setPlayerMana,
    spawnUnit,
    gameResult,
    resetGame,
  } = useCircleGame();

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Translate client coordinates to game coordinates (-W/2 to W/2)
    const x = ((e.clientX - rect.left) / rect.width) * W - W / 2;
    const y = ((e.clientY - rect.top) / rect.height) * W - W / 2;
    setMousePos([x, y]);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  const handlePointerUp = useCallback(() => {
    const cardIndex = draggedCardIndex !== null ? draggedCardIndex : selectedCardIndex;
    if (cardIndex !== null && mousePos && gameResult === 'playing') {
      const card = playerDeck.hand[cardIndex];
      if (card && playerMana >= card.manaCost) {
        spawnUnit('p', card.cardNo, mousePos[0], mousePos[1]);
        setPlayerMana(m => m - card.manaCost);
        setPlayerDeck(d => drawNextCardFromDeck(d, cardIndex, card));
      }
    }
    setDraggedCardIndex(null);
    setSelectedCardIndex(null);
  }, [draggedCardIndex, selectedCardIndex, mousePos, gameResult, playerDeck, playerMana, spawnUnit, setPlayerMana, setPlayerDeck]);

  const checkCanPlayCard = useCallback((idx: number) => {
    const card = playerDeck.hand[idx];
    if (!card) return { canPlay: false, reason: 'No card' };
    if (playerMana < card.manaCost) return { canPlay: false, reason: 'Not enough mana' };
    return { canPlay: true };
  }, [playerDeck, playerMana]);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDraggedCardIndex(idx);
  }, []);

  // Keyboard shortcut [1] - [4] for card selection, Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardIndex(null);
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) {
        const idx = num - 1;
        if (idx < playerDeck.hand.length) {
          const card = playerDeck.hand[idx];
          if (card && playerMana >= card.manaCost) {
            setSelectedCardIndex((prev) => (prev === idx ? null : idx));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerDeck.hand, playerMana]);

  const prediction = useMemo(() => {
    const cardIndex = draggedCardIndex !== null ? draggedCardIndex : selectedCardIndex;
    if (cardIndex !== null && mousePos) {
      const card = playerDeck.hand[cardIndex];
      if (card) {
        const speed = (card.speed || 10) / 10 * BASE_SPEED;
        return predict(SPAWN.p[0], SPAWN.p[1], mousePos[0], mousePos[1], speed, theta, OMEGA);
      }
    }
    return null;
  }, [draggedCardIndex, selectedCardIndex, mousePos, playerDeck, theta]);

  // SVG Render styles
  const isLight = true; // Use light mode colors for simplicity
  const fg = isLight ? '#334155' : '#cbd5e1';
  const dim = isLight ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.08)';
  const fmt = (n: number) => Math.round(n * 100) / 100;

  return (
    <div style={{ ...styles.container, touchAction: 'none', position: 'relative', padding: '6px 12px' }}>
      {/* 左上タイトル（左右の余白に逃がす） */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#64748b',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <span>🔄</span> Circle Mode <span style={{ fontSize: '0.7rem', color: '#475569' }}>(Experimental)</span>
      </div>

      {/* Main Board & Side Panel Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          padding: '2px 0',
        }}
      >
        {/* 円盤ボードエリア */}
        <div
          style={{
            flex: 1,
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handlePointerUp}
            style={{
              height: '100%',
              maxHeight: '100%',
              maxWidth: '100%',
              aspectRatio: '1 / 1',
              position: 'relative',
              cursor: (draggedCardIndex !== null || selectedCardIndex !== null) ? 'crosshair' : 'default',
            }}
          >
            {/* 円の外側（四隅）でも真横方向などを狙えるよう、イベントは四角い外枠で受け、円の見た目はこの内側に分ける */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: isLight ? '#eef2f7' : '#1c2230',
                borderRadius: '50%',
                border: `2px solid ${fg}`,
                boxSizing: 'border-box',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              }}
            />
            <svg
              width="100%"
              height="100%"
              viewBox={`${-W / 2} ${-W / 2} ${W} ${W}`}
              style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }}
            >
              {/* Board Rotational Lines */}
              {Array.from({ length: 12 }).map((_, i) => {
                const a = theta + (i * Math.PI) / 6;
                return (
                  <line
                    key={i}
                    x1={0} y1={0}
                    x2={fmt(Math.cos(a) * R)} y2={fmt(Math.sin(a) * R)}
                    stroke={dim} strokeWidth={1}
                  />
                );
              })}

              {/* Gaps / Rings */}
              {GAPS.map((gapAngle, i) => {
                const startAngle = gapAngle + GAPW + theta;
                const endAngle = (i + 1 < GAPS.length ? GAPS[i + 1] : GAPS[0] + Math.PI * 2) - GAPW + theta;
                const path = `M ${fmt(Math.cos(startAngle) * RING)} ${fmt(Math.sin(startAngle) * RING)} A ${RING} ${RING} 0 0 1 ${fmt(Math.cos(endAngle) * RING)} ${fmt(Math.sin(endAngle) * RING)}`;
                return (
                  <path key={i} d={path} fill="none" stroke={fg} strokeWidth={5} strokeLinecap="round" />
                );
              })}

              {/* Bumpers */}
              {BUMPERS.map(([ba, bd, br], i) => (
                <circle
                  key={i}
                  cx={fmt(Math.cos(ba + theta) * bd)}
                  cy={fmt(Math.sin(ba + theta) * bd)}
                  r={br}
                  fill={isLight ? '#94a3b8' : '#64748b'}
                />
              ))}

              {/* Center Hole */}
              <circle cx={0} cy={0} r={HOLE} fill="#000" />

              {/* Spawns */}
              <circle cx={SPAWN.p[0]} cy={SPAWN.p[1]} r={9} fill="#3b82f6" opacity={0.35} />
              <circle cx={SPAWN.c[0]} cy={SPAWN.c[1]} r={9} fill="#ef4444" opacity={0.35} />

              {/* Prediction Line */}
              {prediction && (
                <polyline
                  points={prediction.pts.map(p => `${p[0]},${p[1]}`).join(' ')}
                  fill="none"
                  stroke={prediction.hit ? '#22c55e' : 'rgba(0,0,0,0.4)'}
                  strokeWidth={2}
                  strokeDasharray="4,5"
                />
              )}
            </svg>

            {/* Units (Overlay) */}
            {units.map(u => (
              <div
                key={u.id}
                style={{
                  position: 'absolute',
                  left: `${((u.x + W / 2) / W) * 100}%`,
                  top: `${((u.y + W / 2) / W) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 28,
                  height: 28,
                  pointerEvents: 'none',
                }}
              >
                {hasUnitSvg(u.cardNo) ? (
                  <UnitSvgRenderer
                    cardNo={u.cardNo}
                    isPlayer={u.owner === 'p'}
                    state={u.isEngaged ? 'attacking' : 'walking'}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: u.owner === 'p' ? '#3b82f6' : '#ef4444', borderRadius: '50%' }} />
                )}
                {/* HP Bar */}
                <div style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 3, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <div style={{ width: `${(u.hp / u.maxHp) * 100}%`, height: '100%', backgroundColor: '#22c55e' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右サイドパネル (手札・マナ・NEXT・スコア) */}
        <CircleSidePanel
          score={score}
          maxScore={MAX_SCORE}
          playerMana={playerMana}
          maxMana={MAX_MANA}
          deckCount={playerDeck.deck.length}
          nextCard={playerDeck.nextCard}
          hand={playerDeck.hand}
          selectedCardIndex={selectedCardIndex}
          draggedCardIndex={draggedCardIndex}
          gameResult={gameResult}
          checkCanPlayCard={checkCanPlayCard}
          setSelectedCardIndex={setSelectedCardIndex}
          handleDragStart={handleDragStart}
          handleDragEnd={() => setDraggedCardIndex(null)}
          handleCardPointerDown={(idx) => setSelectedCardIndex(idx)}
        />
      </div>

      {gameResult !== 'playing' && (
        <GameResultModal
          gameResult={gameResult === 'win' ? 'win' : 'lose'}
          onReset={resetGame}
        />
      )}
    </div>
  );
}
