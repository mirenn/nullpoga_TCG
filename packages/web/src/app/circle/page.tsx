'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useCircleGame } from './useCircleGame';
import { CircleSidePanel } from './CircleSidePanel';
import { GameResultModal } from '../../components/modals/GameResultModal';
import { UnitSvgRenderer, hasUnitSvg } from '../../components/units/UnitSvgRenderer';
import { RenderAttackEffect } from '../../components/effects/RenderAttackEffect';
import { MAX_MANA } from '../engine/engineTypes';
import { MAX_SCORE, W, BW, R, SIDE_CX, SIDE_R, SIDE_GAPS, SIDE_GAPW, SIDE_INT_X, SIDE_INT_Y, SIDE_MAIN_ANGLE, HOLE, RING, GAPS, GAPW, BUMPERS, RAILS, GRAVITY_WELLS, SPIKES, predict, OMEGA, BASE_SPEED, SPAWN, JELLYFISH_CARD_NO, JELLYFISH_HALF_WIDTH, getUnitTangentVelocity, getDepthScale, angDiff } from './circlePhysics';
import { drawNextCardFromDeck } from '../engine/deckUtils';
import { styles } from '../page.styles';
import '../realtime-battle.css';

export default function CircleModePage() {
  const {
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
  } = useCircleGame();

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Translate client coordinates to game coordinates (-BW/2..BW/2, -W/2..W/2)
    const x = ((e.clientX - rect.left) / rect.width) * BW - BW / 2;
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
              aspectRatio: `${BW} / ${W}`,
              position: 'relative',
              cursor: (draggedCardIndex !== null || selectedCardIndex !== null) ? 'crosshair' : 'default',
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`${-BW / 2} ${-W / 2} ${BW} ${W}`}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'block',
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))',
              }}
            >
              <defs>
                {/* 中心に向かって深く（遠くに）落ち込むすり鉢状の陰影グラデーション */}
                <radialGradient id="circleFunnelGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#090d16" />
                  <stop offset="10%" stopColor="#1e293b" />
                  <stop offset="24%" stopColor="#64748b" stopOpacity={0.55} />
                  <stop offset="40%" stopColor="#94a3b8" stopOpacity={0.32} />
                  <stop offset="68%" stopColor="#cbd5e1" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#eef2f7" stopOpacity={0} />
                </radialGradient>
              </defs>

              {/* 両サイド領域とメイン円のベース背景 */}
              <circle cx={-SIDE_CX} cy={0} r={SIDE_R} fill={isLight ? '#e2e8f0' : '#18202c'} />
              <circle cx={SIDE_CX} cy={0} r={SIDE_R} fill={isLight ? '#e2e8f0' : '#18202c'} />
              <circle cx={0} cy={0} r={R} fill={isLight ? '#eef2f7' : '#1c2230'} />

              {/* 両サイド領域の補助グリッド（切れ込みへの誘導ライン・同心円） */}
              {[-SIDE_CX, SIDE_CX].map((scx) => (
                <g key={`side-grid-${scx}`}>
                  <circle
                    cx={scx} cy={0} r={fmt(SIDE_R * 0.62)}
                    fill="none" stroke={dim} strokeWidth={1} strokeDasharray="4,4"
                  />
                  <line
                    x1={scx} y1={0} x2={scx > 0 ? R - 18 : -(R - 18)} y2={0}
                    stroke={dim} strokeWidth={1.2} strokeDasharray="3,3"
                  />
                </g>
              ))}

              {/* すり鉢状の深度グラデーション背景 */}
              <circle cx={0} cy={0} r={R} fill="url(#circleFunnelGrad)" />

              {/* 遠近感を表す同心円グリッド（中心に向かうほど間隔が詰まり深さを強調） */}
              {[162, 130, 100, 52, 36, 23].map((cr, idx) => (
                <circle
                  key={`depth-ring-${cr}`}
                  cx={0}
                  cy={0}
                  r={cr}
                  fill="none"
                  stroke={idx >= 3 ? 'rgba(15, 23, 42, 0.22)' : dim}
                  strokeWidth={idx >= 3 ? 1.2 : 1}
                  strokeDasharray={idx >= 3 ? '3,3' : undefined}
                />
              ))}

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
                  key={`bumper-${i}`}
                  cx={fmt(Math.cos(ba + theta) * bd)}
                  cy={fmt(Math.sin(ba + theta) * bd)}
                  r={br}
                  fill={isLight ? '#94a3b8' : '#64748b'}
                />
              ))}

              {/* Spikes (外周壁のとげ: 跳ね返るとダメージ。両サイド切れ込み上では非表示) */}
              {SPIKES.map(([sa, sw], i) => {
                const teeth = 7;
                const step = (sw * 2) / teeth;
                const d = Array.from({ length: teeth }, (_, k) => {
                  const a0 = sa - sw + k * step + theta;
                  const am = a0 + step / 2;
                  const a1 = a0 + step;
                  if (SIDE_GAPS.some((g) => Math.abs(angDiff(am, g)) < SIDE_GAPW)) return '';
                  return `M ${fmt(Math.cos(a0) * R)} ${fmt(Math.sin(a0) * R)} L ${fmt(Math.cos(am) * (R - 11))} ${fmt(Math.sin(am) * (R - 11))} L ${fmt(Math.cos(a1) * R)} ${fmt(Math.sin(a1) * R)} Z`;
                }).join(' ');
                return <path key={`spike-${i}`} d={d} fill="#dc2626" stroke="#7f1d1d" strokeWidth={1} strokeLinejoin="round" />;
              })}

              {/* 両サイド領域の外周壁と、円の端の切れ込み付き外周壁 */}
              <path
                d={`M ${fmt(SIDE_INT_X)} ${fmt(-SIDE_INT_Y)} A ${SIDE_R} ${SIDE_R} 0 ${SIDE_INT_X < SIDE_CX ? 1 : 0} 1 ${fmt(SIDE_INT_X)} ${fmt(SIDE_INT_Y)}`}
                fill="none" stroke={fg} strokeWidth={2.5}
              />
              <path
                d={`M ${fmt(-SIDE_INT_X)} ${fmt(SIDE_INT_Y)} A ${SIDE_R} ${SIDE_R} 0 ${SIDE_INT_X < SIDE_CX ? 1 : 0} 1 ${fmt(-SIDE_INT_X)} ${fmt(-SIDE_INT_Y)}`}
                fill="none" stroke={fg} strokeWidth={2.5}
              />
              {SIDE_GAPS.map((gapAngle, i) => {
                const startAngle = gapAngle + SIDE_GAPW;
                const endAngle = (i + 1 < SIDE_GAPS.length ? SIDE_GAPS[i + 1] : SIDE_GAPS[0] + Math.PI * 2) - SIDE_GAPW;
                return (
                  <path
                    key={`outer-wall-${i}`}
                    d={`M ${fmt(Math.cos(startAngle) * R)} ${fmt(Math.sin(startAngle) * R)} A ${R} ${R} 0 0 1 ${fmt(Math.cos(endAngle) * R)} ${fmt(Math.sin(endAngle) * R)}`}
                    fill="none" stroke={fg} strokeWidth={2.5} strokeLinecap="round"
                  />
                );
              })}
              {/* サイド領域の入り口にある「円の端の切れ込み」仕切り壁を強調 */}
              {[
                [SIDE_GAPW, SIDE_MAIN_ANGLE],
                [-SIDE_MAIN_ANGLE, -SIDE_GAPW],
                [Math.PI - SIDE_MAIN_ANGLE, Math.PI - SIDE_GAPW],
                [Math.PI + SIDE_GAPW, Math.PI + SIDE_MAIN_ANGLE],
              ].map(([a0, a1], idx) => (
                <path
                  key={`slit-prong-${idx}`}
                  d={`M ${fmt(Math.cos(a0) * R)} ${fmt(Math.sin(a0) * R)} A ${R} ${R} 0 0 1 ${fmt(Math.cos(a1) * R)} ${fmt(Math.sin(a1) * R)}`}
                  fill="none" stroke={fg} strokeWidth={4.5} strokeLinecap="round"
                />
              ))}

              {/* Rails (当たるとレールに沿ってスーッと進むガイドレール) */}
              {RAILS.map(([a1, d1, a2, d2], i) => {
                const x1 = fmt(Math.cos(a1 + theta) * d1);
                const y1 = fmt(Math.sin(a1 + theta) * d1);
                const x2 = fmt(Math.cos(a2 + theta) * d2);
                const y2 = fmt(Math.sin(a2 + theta) * d2);
                const mx = fmt((x1 + x2) / 2);
                const my = fmt((y1 + y2) / 2);
                const deg = fmt((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
                return (
                  <g key={`rail-${i}`}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#0ea5e9" strokeOpacity={0.2} strokeWidth={16} strokeLinecap="round"
                    />
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#0284c7" strokeWidth={6} strokeLinecap="round"
                    />
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#e0f2fe" strokeWidth={2} strokeDasharray="6,4" strokeLinecap="round"
                    />
                    <polygon
                      points="-4,-5 5,0 -4,5"
                      fill="#38bdf8"
                      transform={`translate(${mx}, ${my}) rotate(${deg})`}
                    />
                  </g>
                );
              })}

              {/* Gravity Wells (重力スイングバイを発生させる重力源) */}
              {GRAVITY_WELLS.map(([ga, gd, gr], i) => {
                const gx = fmt(Math.cos(ga + theta) * gd);
                const gy = fmt(Math.sin(ga + theta) * gd);
                return (
                  <g key={`grav-${i}`}>
                    <circle
                      cx={gx} cy={gy} r={gr}
                      fill="rgba(139, 92, 246, 0.08)"
                      stroke="#8b5cf6" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4,4"
                    />
                    <circle
                      cx={gx} cy={gy} r={fmt(gr * 0.52)}
                      fill="rgba(139, 92, 246, 0.12)"
                      stroke="#a855f7" strokeOpacity={0.35} strokeWidth={1}
                    />
                    <circle
                      cx={gx} cy={gy} r={8}
                      fill="#4c1d95" stroke="#c084fc" strokeWidth={2}
                    />
                  </g>
                );
              })}

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

              {/* 電気クラゲの進行方向(軌道の接線方向)・長方形探知範囲（中心ほど深く小さくなる遠近スケール反映） */}
              {units.filter(u => u.cardNo === JELLYFISH_CARD_NO).map(u => {
                const [tvx, tvy] = getUnitTangentVelocity(u, OMEGA);
                const deg = (Math.atan2(tvy, tvx) * 180) / Math.PI;
                const depthScale = getDepthScale(u.x, u.y);
                const col = u.owner === 'p' ? '#3b82f6' : '#ef4444';
                return (
                  <rect
                    key={`range-${u.id}`}
                    x={0}
                    y={-JELLYFISH_HALF_WIDTH}
                    width={u.range}
                    height={JELLYFISH_HALF_WIDTH * 2}
                    transform={`translate(${fmt(u.x)}, ${fmt(u.y)}) rotate(${fmt(deg)}) scale(${fmt(depthScale)})`}
                    fill={col}
                    fillOpacity={u.isEngaged ? 0.16 : 0.08}
                    stroke={col}
                    strokeOpacity={0.45}
                    strokeWidth={1.2}
                    strokeDasharray="4,3"
                  />
                );
              })}
            </svg>

            {/* Units (Overlay: 中心に近づくほど遠く深くなるよう scale と zIndex を遠近変化させる) */}
            {units.map(u => {
              const isPlayer = u.owner === 'p';
              const teamColor = isPlayer ? '#3b82f6' : '#ef4444';
              const teamBg = isPlayer ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
              const depthScale = getDepthScale(u.x, u.y);
              return (
                <div
                  key={u.id}
                  data-owner={u.owner}
                  style={{
                    position: 'absolute',
                    left: `${((u.x + BW / 2) / BW) * 100}%`,
                    top: `${((u.y + W / 2) / W) * 100}%`,
                    transform: `translate(-50%, -50%) scale(${fmt(depthScale)})`,
                    zIndex: Math.round(depthScale * 100),
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: `2px solid ${teamColor}`,
                    backgroundColor: teamBg,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  {hasUnitSvg(u.cardNo) ? (
                    <UnitSvgRenderer
                      cardNo={u.cardNo}
                      isPlayer={isPlayer}
                      state={(u.attackAnimUntil ?? 0) > Date.now() ? 'attacking' : u.isEngaged ? 'charging' : 'walking'}
                      size={26}
                    />
                  ) : (
                    <span style={{ fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>
                      {u.icon || (u.cardNo === 12 ? '🏹' : u.cardNo === 13 ? '🐕‍🦺' : '')}
                    </span>
                  )}
                  {/* HP Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      left: -1,
                      right: -1,
                      height: 4,
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, (u.hp / u.maxHp) * 100)}%`,
                        height: '100%',
                        backgroundColor: teamColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Attack Effects (電撃弾・稲妻ビーム・着弾スパーク・ダメージ数値など) */}
            {attackEffects.map(eff => (
              <RenderAttackEffect key={eff.id} effect={eff} />
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
