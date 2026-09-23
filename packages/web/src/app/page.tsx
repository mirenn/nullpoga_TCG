'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRealtimeGame, CARD_POOL, MANA_SPEED_PRESETS } from './useRealtimeGame';
import { Unit, AttackEffect } from './types';
import { UnitSvgRenderer, deriveAnimationState } from '../components/units/UnitSvgRenderer';

export default function RealtimeDemoPage() {
  const {
    playerHp,
    cpuHp,
    playerMana,
    maxMana,
    manaRegenRate,
    setManaRegenRate,
    hand,
    nextCard,
    deckCount,
    discardCount,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    attackEffects,
    gameResult,
    checkCanPlayCard,
    playCardOnLane,
    resetGame,
  } = useRealtimeGame();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tips' | 'catalog'>('tips');

  // ドラッグ＆ドロップ用ステート
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverLaneIndex, setDragOverLaneIndex] = useState<number | null>(null);
  const [spawnRippleLane, setSpawnRippleLane] = useState<number | null>(null);

  const selectedCard = selectedCardIndex !== null ? hand[selectedCardIndex] : null;
  const activeDraggedCard = draggedCardIndex !== null ? hand[draggedCardIndex] : null;

  // ゲームリセット（D&D状態もクリア）
  const handleReset = useCallback(() => {
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
    setSpawnRippleLane(null);
    resetGame();
  }, [resetGame]);

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    const validation = checkCanPlayCard(idx);
    if (!validation.canPlay) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedCardIndex(idx);
    setIsDragging(true);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
  };

  // レーン上のドラッグオーバー
  const handleLaneDragOver = (e: React.DragEvent, laneIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverLaneIndex !== laneIndex) {
      setDragOverLaneIndex(laneIndex);
    }
  };

  // レーンから離脱
  const handleLaneDragLeave = (e: React.DragEvent, laneIndex: number) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverLaneIndex === laneIndex) {
        setDragOverLaneIndex(null);
      }
    }
  };

  // レーンへのドロップ
  const handleLaneDrop = (e: React.DragEvent, laneIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const cardIdx = data !== '' ? parseInt(data, 10) : draggedCardIndex;
    if (cardIdx !== null && cardIdx !== undefined && !isNaN(cardIdx)) {
      const validation = checkCanPlayCard(cardIdx, laneIndex);
      if (validation.canPlay) {
        playCardOnLane(laneIndex, cardIdx);
        setSpawnRippleLane(laneIndex);
        setTimeout(() => setSpawnRippleLane(null), 400);
      }
    }
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
  };

  // キーボードショートカット (1〜4キーで手札選択、Escで選択解除)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // フォーム入力中の誤爆を防止
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < hand.length) {
          setSelectedCardIndex((prev) => (prev === index ? null : index));
        }
      } else if (e.key === 'Escape') {
        setSelectedCardIndex(null);
      }
    },
    [hand.length, setSelectedCardIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={styles.container} className="realtime-demo-container">
      {/* 画面内CSS (レスポンシブ & アニメーション) */}
      <style>{`
        .realtime-demo-container {
          box-sizing: border-box;
        }

        /* ユニット攻撃時の一瞬の踏み込みバンプ */
        @keyframes unit-attack-player {
          0% { transform: translateY(0); }
          35% { transform: translateY(-8px) scale(1.1); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes unit-attack-cpu {
          0% { transform: translateY(0); }
          35% { transform: translateY(8px) scale(1.1); }
          100% { transform: translateY(0) scale(1); }
        }
        .unit-attacking-player {
          animation: unit-attack-player 0.22s ease-out;
        }
        .unit-attacking-cpu {
          animation: unit-attack-cpu 0.22s ease-out;
        }

        /* 炎のドラゴン: 火炎弾グロー */
        .fireball-glow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: radial-gradient(circle, #ea580c 0%, rgba(239, 68, 68, 0.7) 60%, transparent 100%);
          box-shadow: 0 0 18px #f97316, 0 0 32px #ea580c;
        }

        /* 炎のドラゴン: 着弾火炎大爆発 */
        @keyframes fireball-impact-anim {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          35% {
            transform: translate(-50%, -50%) scale(1.7);
            opacity: 1;
            filter: drop-shadow(0 0 20px #f97316);
          }
          70% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0;
          }
        }
        .fireball-impact-effect {
          animation: fireball-impact-anim 0.42s ease-out forwards;
        }
        @keyframes shockwave-pulse-orange {
          0% {
            width: 12px;
            height: 12px;
            opacity: 1;
            border-width: 3px;
          }
          100% {
            width: 72px;
            height: 72px;
            opacity: 0;
            border-width: 1px;
          }
        }
        .shockwave-ring-orange {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid #ea580c;
          box-shadow: 0 0 16px #f97316;
          pointer-events: none;
          animation: shockwave-pulse-orange 0.4s ease-out forwards;
        }

        /* 電気クラゲ: 放電電撃弾グロー */
        .lightning-glow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: radial-gradient(circle, #38bdf8 0%, rgba(2, 132, 199, 0.6) 60%, transparent 100%);
          box-shadow: 0 0 16px #38bdf8, 0 0 28px #0284c7;
        }

        /* 電気クラゲ: 放電電撃ビームライン（クラゲから標的へ走る極太の稲妻） */
        @keyframes lightning-beam-flicker {
          0% { opacity: 0; transform: translateX(-50%) scaleX(0.4); }
          15% { opacity: 1; transform: translateX(-50%) scaleX(1.6); }
          35% { opacity: 0.7; transform: translateX(-50%) scaleX(1.0); }
          55% { opacity: 1; transform: translateX(-50%) scaleX(2.0); }
          80% { opacity: 0.8; transform: translateX(-50%) scaleX(1.3); }
          100% { opacity: 0; transform: translateX(-50%) scaleX(0.2); }
        }
        .lightning-beam-line {
          position: absolute;
          left: 50%;
          width: 8px;
          background: linear-gradient(to bottom, #ffffff, #38bdf8 30%, #e0f2fe 50%, #0284c7 70%, #ffffff);
          box-shadow: 0 0 14px #38bdf8, 0 0 28px #0284c7, 0 0 42px #ffffff;
          border-radius: 4px;
          pointer-events: none;
          z-index: 35;
          animation: lightning-beam-flicker 0.48s ease-out forwards;
        }

        /* 炎のドラゴン: 火炎ブレス流線（口から標的へ噴射される火炎） */
        @keyframes fire-stream-flicker {
          0% { opacity: 0; transform: translateX(-50%) scaleX(0.3); }
          20% { opacity: 1; transform: translateX(-50%) scaleX(1.5); }
          50% { opacity: 0.85; transform: translateX(-50%) scaleX(1.1); }
          75% { opacity: 1; transform: translateX(-50%) scaleX(1.8); }
          100% { opacity: 0; transform: translateX(-50%) scaleX(0.2); }
        }
        .fire-breath-stream {
          position: absolute;
          left: 50%;
          width: 12px;
          background: linear-gradient(to bottom, #fef08a, #f97316 25%, #ea580c 50%, #dc2626 75%, #fef08a);
          box-shadow: 0 0 16px #f97316, 0 0 32px #ea580c, 0 0 48px #fef08a;
          border-radius: 6px;
          pointer-events: none;
          z-index: 35;
          animation: fire-stream-flicker 0.5s ease-out forwards;
        }

        /* 電気クラゲ: 着弾地点のバチバチ放電スパーク */
        @keyframes lightning-impact-anim {
          0% {
            transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            opacity: 0;
          }
          20% {
            transform: translate(-50%, -50%) scale(1.6) rotate(-20deg);
            opacity: 1;
            filter: drop-shadow(0 0 20px #38bdf8);
          }
          50% {
            transform: translate(-50%, -50%) scale(2.0) rotate(15deg);
            opacity: 1;
            filter: drop-shadow(0 0 28px #eab308);
          }
          80% {
            transform: translate(-50%, -50%) scale(1.7) rotate(-10deg);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.4) rotate(30deg);
            opacity: 0;
          }
        }
        .lightning-impact-effect {
          animation: lightning-impact-anim 0.5s ease-out forwards;
        }
        @keyframes shockwave-pulse-cyan {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
            border-width: 4px;
          }
          100% {
            width: 72px;
            height: 72px;
            opacity: 0;
            border-width: 1px;
          }
        }
        .shockwave-ring-cyan {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 3px solid #38bdf8;
          box-shadow: 0 0 16px #38bdf8;
          pointer-events: none;
          animation: shockwave-pulse-cyan 0.45s ease-out forwards;
        }

        /* 近接攻撃: 斬撃・爪痕・打撃 */
        @keyframes melee-slash-anim {
          0% {
            transform: translate(-50%, -50%) scale(0.5) rotate(-25deg);
            opacity: 0.2;
          }
          35% {
            transform: translate(-50%, -50%) scale(1.5) rotate(10deg);
            opacity: 1;
            filter: drop-shadow(0 0 10px #f59e0b);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8) rotate(35deg);
            opacity: 0;
          }
        }
        .melee-slash-effect {
          animation: melee-slash-anim 0.22s ease-out forwards;
        }

        /* 拠点ヒット衝撃 */
        @keyframes base-hit-anim {
          0% {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 1;
            filter: drop-shadow(0 0 14px #ef4444);
          }
          100% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0;
          }
        }
        .base-hit-effect {
          animation: base-hit-anim 0.28s ease-out forwards;
        }

        /* 着弾時のダメージ数値ポップアップ */
        @keyframes damage-popup-anim {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.6);
          }
          25% {
            opacity: 1;
            transform: translate(-50%, -16px) scale(1.35);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -28px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -40px) scale(0.8);
          }
        }
        .damage-popup-text {
          animation: damage-popup-anim 0.48s ease-out forwards;
          color: #ff3344;
          font-weight: 900;
          font-size: 16px;
          text-shadow: 0 0 4px #000, 0 0 8px #7f1d1d, 1px 1px 2px #000;
          letter-spacing: -0.5px;
        }
        @media (max-width: 959px) {
          .desktop-side-panel {
            display: none !important;
          }
          .mobile-guide-btn {
            display: inline-flex !important;
          }
          .mobile-cpu-header {
            display: flex !important;
          }
        }
        @media (min-width: 960px) {
          .desktop-side-panel {
            display: flex !important;
          }
          .mobile-guide-btn {
            display: none !important;
          }
          .mobile-cpu-header {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .mana-speed-label-full {
            display: none !important;
          }
          .mana-speed-label-short {
            display: inline !important;
          }
          .btn-text-desktop {
            display: none !important;
          }
          .btn-text-mobile {
            display: inline !important;
          }
        }
        @media (min-width: 641px) {
          .mana-speed-label-short {
            display: none !important;
          }
          .btn-text-mobile {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .card-name {
            font-size: 11px !important;
            max-width: 52px !important;
          }
          .card-icon {
            font-size: 17px !important;
          }
          .card-desc-snippet {
            display: none !important;
          }
          .card-speed-badge {
            display: none !important;
          }
          .next-card-slot {
            width: 48px !important;
            padding: 3px 1px !important;
          }
          .next-card-name {
            display: none !important;
          }
          .next-card-icon {
            font-size: 16px !important;
          }
        }
        @media (max-height: 520px) {
          .realtime-demo-container {
            overflow-y: auto !important;
            height: auto !important;
            min-height: 100vh !important;
          }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 16px rgba(59, 130, 246, 0.85); }
        }
        @keyframes pulseSummonBadge {
          0%, 100% { transform: translate(-50%, 0) scale(1); opacity: 0.95; }
          50% { transform: translate(-50%, 0) scale(1.05); opacity: 1; }
        }
      `}</style>

      {/* メインゲーム領域 (100vh収容・レスポンシブ2カラム) */}
      <div style={styles.mainLayout}>
        {/* 左／中央：バトルアリーナ */}
        <div style={styles.arenaColumn} className="arena-column">
          {/* 1. CPU陣地ステータスバー & コントロール (モバイル時のみアリーナ上部に表示、デスクトップは右パネルに集約) */}
          <div style={styles.cpuHeader} className="mobile-cpu-header">
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>🤖 相手（CPU）</span>
              <div style={styles.hpBarBg}>
                <div
                  style={{
                    ...styles.hpBarFillCpu,
                    width: `${Math.max(0, (cpuHp / 20) * 100)}%`,
                  }}
                />
                <span style={styles.hpText}>{cpuHp} / 20 HP</span>
              </div>
            </div>

            {/* ゲーム操作コントロール (速度・リセット・モバイルガイド) */}
            <div style={styles.cpuHeaderControls}>
              {/* マナ回復速度セレクター */}
              <div style={styles.manaSpeedSelector} title="マナ回復速度を調整">
                <span style={styles.manaSpeedLabel} className="mana-speed-label-full">⚡速度:</span>
                <span style={styles.manaSpeedLabel} className="mana-speed-label-short">⚡</span>
                <select
                  value={manaRegenRate}
                  onChange={(e) => setManaRegenRate(parseFloat(e.target.value))}
                  style={styles.manaSpeedSelect}
                >
                  {MANA_SPEED_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowGuideModal(true)}
                style={styles.guideToggleButton}
                className="mobile-guide-btn"
                title="検証ガイド・カード図鑑を表示"
              >
                <span className="btn-text-desktop">💡 ガイド・図鑑</span>
                <span className="btn-text-mobile">💡</span>
              </button>

              <button onClick={handleReset} style={styles.resetButton} title="ゲームを最初からやり直す">
                <span className="btn-text-desktop">🔄 やり直す</span>
                <span className="btn-text-mobile">🔄</span>
              </button>
            </div>
          </div>

          {/* 2. 5レーン戦場フィールド (flex: 1 で全画面収容) */}
          <div style={styles.fieldGrid}>
            {[0, 1, 2, 3, 4].map((laneIndex) => {
              const laneUnits = units.filter((u) => u.lane === laneIndex);
              const laneSpells = spellEffects.filter(
                (e) => e.lane === laneIndex || e.lane === -1
              );
              const laneAttackEffects = attackEffects.filter((e) => e.lane === laneIndex);
              const activeCard = isDragging ? activeDraggedCard : selectedCard;
              const activeCardIdx = isDragging ? draggedCardIndex : selectedCardIndex;
              const laneValidation = activeCard && activeCardIdx !== null
                ? checkCanPlayCard(activeCardIdx, laneIndex)
                : { canPlay: true };
              const isBlocked = !laneValidation.canPlay;

              const canAfford = selectedCard && playerMana >= selectedCard.manaCost;
              const isHoveredDrop = isDragging && dragOverLaneIndex === laneIndex;
              const isDroppableTarget = isDragging && activeDraggedCard && playerMana >= activeDraggedCard.manaCost && !isBlocked;
              const isRippling = spawnRippleLane === laneIndex;

              return (
                <div
                  key={laneIndex}
                  onClick={() => playCardOnLane(laneIndex)}
                  onDragOver={(e) => handleLaneDragOver(e, laneIndex)}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (dragOverLaneIndex !== laneIndex) setDragOverLaneIndex(laneIndex);
                  }}
                  onDragLeave={(e) => handleLaneDragLeave(e, laneIndex)}
                  onDrop={(e) => handleLaneDrop(e, laneIndex)}
                  style={{
                    ...styles.lane,
                    backgroundColor: isHoveredDrop
                      ? isBlocked
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'rgba(30, 58, 138, 0.45)'
                      : isDroppableTarget
                      ? 'rgba(30, 58, 138, 0.16)'
                      : selectedCard && canAfford && !isBlocked
                      ? 'rgba(30, 58, 138, 0.28)'
                      : selectedCard && isBlocked
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(15, 23, 42, 0.85)',
                    borderColor: isHoveredDrop
                      ? isBlocked
                        ? '#ef4444'
                        : '#60a5fa'
                      : isDroppableTarget
                      ? 'rgba(96, 165, 250, 0.65)'
                      : selectedCard && canAfford && !isBlocked
                      ? '#3b82f6'
                      : selectedCard && isBlocked
                      ? 'rgba(239, 68, 68, 0.5)'
                      : '#334155',
                    borderStyle: isDroppableTarget && !isHoveredDrop ? 'dashed' : 'solid',
                    borderWidth: isHoveredDrop ? '2px' : '1px',
                    cursor: isHoveredDrop && isBlocked
                      ? 'not-allowed'
                      : isDroppableTarget
                      ? 'copy'
                      : selectedCard && canAfford && !isBlocked
                      ? 'pointer'
                      : 'default',
                    boxShadow: isHoveredDrop
                      ? isBlocked
                        ? 'inset 0 0 24px rgba(239, 68, 68, 0.5), 0 0 16px rgba(239, 68, 68, 0.4)'
                        : 'inset 0 0 24px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.4)'
                      : isRippling
                      ? 'inset 0 0 24px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.4)'
                      : selectedCard && canAfford && !isBlocked
                      ? 'inset 0 0 16px rgba(59, 130, 246, 0.25)'
                      : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {/* レーン番号（上部） */}
                  <div style={styles.laneNumberTop}>L{laneIndex + 1}</div>

                  {/* レーン中央ガイドライン */}
                  <div style={styles.laneTrackLine} />

                  {/* レーン上のユニット描画 */}
                  {laneUnits.map((unit) => (
                    <RenderUnit key={unit.id} unit={unit} />
                  ))}

                  {/* スペル演出 */}
                  {laneSpells.map((spell) => (
                    <div
                      key={spell.id}
                      style={{
                        ...styles.spellBlast,
                        top: `${spell.y}%`,
                      }}
                    >
                      {spell.type === 'meteor' ? '💥 隕石着弾!!' : '🔥 烈火!!'}
                    </div>
                  ))}

                  {/* 攻撃エフェクト（弾道・斬撃・着弾・ダメージポップアップ） */}
                  {laneAttackEffects.map((effect) => (
                    <RenderAttackEffect key={effect.id} effect={effect} />
                  ))}

                  {/* ドラッグ＆ドロップ時のターゲットガイド */}
                  {isHoveredDrop && activeDraggedCard && (
                    <div
                      style={{
                        ...styles.summonGuideBadge,
                        backgroundColor: isBlocked
                          ? '#ef4444'
                          : activeDraggedCard.type === 'SPELL'
                          ? '#ea580c'
                          : '#2563eb',
                        boxShadow: isBlocked
                          ? '0 0 14px rgba(239, 68, 68, 0.9)'
                          : activeDraggedCard.type === 'SPELL'
                          ? '0 0 14px rgba(234, 88, 12, 0.9)'
                          : '0 0 14px rgba(37, 99, 235, 0.9)',
                      }}
                    >
                      {isBlocked
                        ? `🚫 ${laneValidation.reason}`
                        : activeDraggedCard.type === 'SPELL'
                        ? '✨ ドロップ発動'
                        : '🎯 ドロップ出撃'}
                    </div>
                  )}

                  {/* 他のレーンのドロップヒント（ドラッグ中） */}
                  {isDroppableTarget && !isHoveredDrop && (
                    <div style={styles.dropZoneHint}>
                      ⬇️ ここに配置
                    </div>
                  )}

                  {/* クリック選択時の出撃ガイド（ドラッグしていない時のみ） */}
                  {!isDragging && selectedCard && canAfford && (
                    <div
                      style={{
                        ...styles.summonGuideBadge,
                        backgroundColor: isBlocked ? '#ef4444' : '#2563eb',
                      }}
                    >
                      {isBlocked ? `🚫 ${laneValidation.reason}` : '▲ 出撃'}
                    </div>
                  )}

                  {/* レーン番号（下部） */}
                  <div style={styles.laneNumberBottom}>L{laneIndex + 1}</div>
                </div>
              );
            })}
          </div>

          {/* 3. 統合プレイヤー司令バー (自軍HP & マナゲージ) */}
          <div style={styles.playerCommandBar}>
            {/* 自軍HP */}
            <div style={styles.playerHpSection}>
              <span style={styles.playerName}>🛡️ 自軍</span>
              <div style={styles.hpBarBg}>
                <div
                  style={{
                    ...styles.hpBarFillPlayer,
                    width: `${Math.max(0, (playerHp / 20) * 100)}%`,
                  }}
                />
                <span style={styles.hpText}>{playerHp} / 20 HP</span>
              </div>
            </div>

            {/* マナゲージ */}
            <div style={styles.playerManaSection}>
              <div style={styles.manaInfo}>
                <span style={styles.manaTitle}>⚡ マナ</span>
                <span style={styles.manaCount}>
                  <strong>{playerMana.toFixed(1)}</strong> / {maxMana}
                </span>
              </div>
              <div style={styles.manaBarBg}>
                <div
                  style={{
                    ...styles.manaBarFill,
                    width: `${(playerMana / maxMana) * 100}%`,
                  }}
                />
                <div style={styles.manaTicks}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tick) => (
                    <div key={tick} style={styles.manaTick} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. 手札カードリスト & NEXTドック */}
          <div style={styles.dockContainer} className="dock-container">
            {/* NEXTカードスロット */}
            <div
              style={styles.nextCardSlot}
              className="next-card-slot"
              title={nextCard ? `次に引くカード: ${nextCard.name} (⚡${nextCard.manaCost})` : '山札なし'}
            >
              <div style={styles.nextBadge}>NEXT</div>
              {nextCard ? (
                <div style={styles.nextCardInner}>
                  <div style={styles.nextCardCostBadge}>
                    ⚡{nextCard.manaCost}
                  </div>
                  <span style={styles.nextCardIcon} className="next-card-icon">{nextCard.icon}</span>
                  <div style={styles.nextCardName} className="next-card-name">{nextCard.name}</div>
                </div>
              ) : (
                <div style={styles.nextCardEmpty}>-</div>
              )}
              <div style={styles.deckCountBadge} title={`山札: 残り${deckCount}枚 / 捨て札: ${discardCount}枚`}>
                🎴{deckCount}/15
              </div>
            </div>

            {/* 4枚の手札グリッド */}
            <div style={styles.handGrid} className="hand-grid">
              {hand.map((card, idx) => {
                const isSelected = selectedCardIndex === idx;
                const isBeingDragged = isDragging && draggedCardIndex === idx;
                const validation = checkCanPlayCard(idx);
                const canPlay = validation.canPlay;

                return (
                  <div
                    key={`${card.id}_${idx}`}
                    draggable={canPlay && gameResult === 'playing'}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCardIndex(null);
                      } else {
                        setSelectedCardIndex(idx);
                      }
                    }}
                    title={canPlay ? 'ドラッグ＆ドロップ または クリックで配置' : validation.reason}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardSelected : {}),
                      opacity: isBeingDragged ? 0.35 : canPlay ? 1 : 0.45,
                      borderStyle: isBeingDragged ? 'dashed' : 'solid',
                      borderColor: isSelected
                        ? '#3b82f6'
                        : !canPlay && validation.reason?.includes('ドラゴン')
                        ? '#ef4444'
                        : card.type === 'SPELL'
                        ? '#f97316'
                        : '#475569',
                      cursor: canPlay ? (isDragging ? 'grabbing' : 'grab') : 'not-allowed',
                      transform: isBeingDragged
                        ? 'scale(0.95)'
                        : isSelected
                        ? 'translateY(-3px)'
                        : 'none',
                      boxShadow: isBeingDragged
                        ? 'none'
                        : isSelected
                        ? '0 4px 12px rgba(59, 130, 246, 0.5)'
                        : 'none',
                    }}
                    className="card-item"
                  >
                    {/* カード上部：コスト・タイプ・ショートカットキー */}
                    <div style={styles.cardHeader}>
                      <span
                        style={{
                          ...styles.cardCostBadge,
                          backgroundColor: card.type === 'SPELL' ? '#c2410c' : '#1d4ed8',
                        }}
                      >
                        ⚡{card.manaCost}
                      </span>
                      {!canPlay && validation.reason?.includes('ドラゴン') && (
                        <span style={styles.cardLockBadge}>1体限</span>
                      )}
                      <span style={styles.cardKeyBadge}>[{idx + 1}]</span>
                    </div>

                    {/* カード本体：アイコン & 名前 */}
                    <div style={styles.cardCenter}>
                      <span style={styles.cardIcon} className="card-icon">{card.icon}</span>
                      <div style={styles.cardName} className="card-name">{card.name}</div>
                    </div>

                    {/* カード下部：攻防ステータス / スペル表記 */}
                    <div style={styles.cardFooter}>
                      {card.type === 'MONSTER' ? (
                        <div style={styles.cardStats}>
                          <span style={styles.cardAtk} title="攻撃力">⚔️{card.attack}</span>
                          <span style={styles.cardHp} title="HP">❤️{card.life}</span>
                          <span style={styles.cardSpeed} className="card-speed-badge" title="移動速度">🏃{card.speed}</span>
                        </div>
                      ) : (
                        <div style={styles.cardStats}>
                          <span style={styles.cardSpellTag}>✨呪文</span>
                          <span style={styles.cardSpellScope}>
                            {card.id === 'fire_spell' ? '全体2' : '単体4'}
                          </span>
                        </div>
                      )}
                      <div style={styles.cardDescSnippet} className="card-desc-snippet" title={card.effectDesc}>
                        {card.effectDesc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右：検証ガイド & カード戦術パネル (デスクトップ横並び表示) */}
        <div style={styles.sidePanel} className="desktop-side-panel">
          {/* パネル上部タイトル */}
          <div style={styles.sidePanelTitleRow}>
            <span style={styles.sidePanelTitle}>Nullpoga RTS</span>
            <span style={styles.sidePanelBadge}>5レーン検証</span>
          </div>

          {/* 対戦相手（CPU）ステータス ＆ バトル操作カード */}
          <div style={styles.sideBattleCard}>
            <div style={styles.sideCpuStatusRow}>
              <div style={styles.sideCpuInfo}>
                <span style={styles.sideCpuName}>🤖 相手 (CPU)</span>
                <div style={styles.sideHpBarBg}>
                  <div
                    style={{
                      ...styles.hpBarFillCpu,
                      width: `${Math.max(0, (cpuHp / 20) * 100)}%`,
                    }}
                  />
                  <span style={styles.hpText}>{cpuHp} / 20 HP</span>
                </div>
              </div>
            </div>

            <div style={styles.sideControlRow}>
              {/* マナ回復速度セレクター */}
              <div style={styles.manaSpeedSelector} title="マナ回復速度を調整">
                <span style={styles.manaSpeedLabel} className="mana-speed-label-full">⚡速度:</span>
                <span style={styles.manaSpeedLabel} className="mana-speed-label-short">⚡</span>
                <select
                  value={manaRegenRate}
                  onChange={(e) => setManaRegenRate(parseFloat(e.target.value))}
                  style={styles.manaSpeedSelect}
                >
                  {MANA_SPEED_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={handleReset} style={styles.resetButton} title="ゲームを最初からやり直す">
                <span className="btn-text-desktop">🔄 やり直す</span>
                <span className="btn-text-mobile">🔄</span>
              </button>
            </div>
          </div>

          <div style={styles.sidePanelHeader}>
            <button
              onClick={() => setActiveTab('tips')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'tips' ? styles.tabButtonActive : {}),
              }}
            >
              💡 戦術・検証ポイント
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
              }}
            >
              🃏 カード図鑑 ({CARD_POOL.length})
            </button>
          </div>

          <div style={styles.sidePanelContent}>
            {activeTab === 'tips' ? (
              <div style={styles.tipsSection}>
                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐢 隊列と前線維持</div>
                  <div style={styles.tipText}>
                    耐久7の<strong>亀吉</strong>を壁にし、後ろから<strong>猫</strong>や<strong>クラゲ</strong>を流すと前線が崩れません。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐭 逆サイド奇襲</div>
                  <div style={styles.tipText}>
                    敵が1つのレーンに集中した隙に、空いた逆端レーンへ足の速い<strong>ネズミ</strong>（速度16）を走らせて拠点を削りましょう。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐕 柴犬ラン丸の長距離突破</div>
                  <div style={styles.tipText}>
                    前進距離に応じて攻撃力が<strong>最大+4</strong>まで上昇！自陣最奥から走らせるほど敵拠点到達時の破壊力が増します。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐗 イノシシの突進突破</div>
                  <div style={styles.tipText}>
                    コスト3で攻撃3/HP4/速度7の突進アタッカー。手薄なレーンを一気に押し込みます。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>☄️ 迎撃スペルの使いどころ</div>
                  <div style={styles.tipText}>
                    迫る敵の群れには<strong>烈火の呪文</strong>（全体2ダメ）、高HPのドラゴンや密集部隊には<strong>隕石落下</strong>（単一レーン4ダメ）で迎撃しましょう。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🎴 15枚デッキ＆NEXTサイクル</div>
                  <div style={styles.tipText}>
                    手札4枚と<strong>NEXT（次弾）</strong>でテンポよく回転！山札（計15枚）が切れると捨て札が再シャッフルされリサイクルされます。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🛡️ 出撃バリデーション（戦略制約）</div>
                  <div style={styles.tipText}>
                    ・<strong>1レーン最大3体</strong>：過密レーンには召喚不可<br/>
                    ・<strong>ドラゴン場に1体限</strong>：強力ボスの連続出し制限<br/>
                    ・<strong>連打防止0.4s</strong>：落ち着いた操作テンポ
                  </div>
                </div>

                <div style={styles.shortcutGuide}>
                  <strong>🎮 操作方法：</strong>
                  <span>・カードをレーンにドラッグ＆ドロップして出撃</span>
                  <span>・カードをクリック後、レーンをクリックで配置</span>
                  <span>・キー [1]〜[4] で選択 / [Esc] で解除</span>
                </div>
              </div>
            ) : (
              <div style={styles.catalogList}>
                {CARD_POOL.map((c) => (
                  <div key={c.id} style={styles.catalogItem}>
                    <div style={styles.catalogItemIcon}>{c.icon}</div>
                    <div style={styles.catalogItemInfo}>
                      <div style={styles.catalogItemTop}>
                        <span style={styles.catalogItemName}>{c.name}</span>
                        <span style={styles.catalogItemCost}>⚡{c.manaCost}</span>
                      </div>
                      <div style={styles.catalogItemStats}>
                        {c.type === 'MONSTER' ? (
                          <>
                            <span>⚔️ {c.attack}</span>
                            <span>❤️ {c.life}</span>
                            <span>🏃 {c.speed}</span>
                            <span>🎯 {c.range}%</span>
                          </>
                        ) : (
                          <span style={{ color: '#f97316' }}>スペル（呪文）</span>
                        )}
                      </div>
                      <div style={styles.catalogItemDesc}>{c.effectDesc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* モバイル・小画面用ガイドモーダル */}
      {showGuideModal && (
        <div style={styles.overlay} onClick={() => setShowGuideModal(false)}>
          <div style={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.guideModalHeader}>
              <div style={styles.sidePanelHeader}>
                <button
                  onClick={() => setActiveTab('tips')}
                  style={{
                    ...styles.tabButton,
                    ...(activeTab === 'tips' ? styles.tabButtonActive : {}),
                  }}
                >
                  💡 戦術ポイント
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    ...styles.tabButton,
                    ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
                  }}
                >
                  🃏 全カード図鑑 ({CARD_POOL.length})
                </button>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                style={styles.guideModalCloseBtn}
                title="閉じる"
              >
                ✕
              </button>
            </div>
            <div style={styles.guideModalBody}>
              {activeTab === 'tips' ? (
                <div style={styles.tipsSection}>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐢 隊列と前線維持</div>
                    <div style={styles.tipText}>
                      亀吉で耐えて後ろから猫やクラゲで支援する隊列戦闘の感触をお試しください。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐭 逆サイド奇襲</div>
                    <div style={styles.tipText}>
                      敵の攻めを見て反対側の空きレーンにネズミを流す奇襲戦術が有効です。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐕 柴犬の長距離バフ</div>
                    <div style={styles.tipText}>
                      走るほど攻撃力が上がる柴犬ラン丸で敵本拠地の一撃粉砕を狙えます。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>☄️ 迎撃スペル</div>
                    <div style={styles.tipText}>
                      迫る群れを隕石落下や烈火の呪文で一掃できます。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🎴 15枚デッキ＆NEXTサイクル</div>
                    <div style={styles.tipText}>
                      手札4枚＋NEXT1枚の合計15枚デッキ。使い切ると自動リサイクル！
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🛡️ 出撃バリデーション</div>
                    <div style={styles.tipText}>
                      1レーン最大3体、前の味方が少し前進するまでの出撃スペース確保、ドラゴン1体限定、連打誤爆防止（約0.12秒）の制限があります。
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.catalogList}>
                  {CARD_POOL.map((c) => (
                    <div key={c.id} style={styles.catalogItem}>
                      <span style={{ fontSize: '20px' }}>{c.icon}</span>
                      <div style={{ flex: 1, fontSize: '12px' }}>
                        <div style={styles.catalogItemTop}>
                          <strong>{c.name}</strong>
                          <span style={styles.catalogItemCost}>⚡{c.manaCost}</span>
                        </div>
                        {c.type === 'MONSTER' && (
                          <div style={styles.catalogItemStats}>
                            <span>⚔️ {c.attack}</span>
                            <span>❤️ {c.life}</span>
                            <span>🏃 {c.speed}</span>
                            <span>🎯 {c.range}%</span>
                          </div>
                        )}
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                          {c.effectDesc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 勝敗オーバーレイ */}
      {gameResult !== 'playing' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2
              style={{
                ...styles.modalTitle,
                color: gameResult === 'win' ? '#16a34a' : '#dc2626',
              }}
            >
              {gameResult === 'win' ? '🎉 VICTORY! 勝利！' : '💀 DEFEAT... 敗北'}
            </h2>
            <p style={styles.modalMessage}>
              {gameResult === 'win'
                ? '敵の本拠地を攻め落としました！独立レーンでの進軍と押し引きの感触はいかがでしたか？'
                : '自陣の防衛が破られました。防衛ユニットのタイミングや迎撃スペルの使い方がポイントです。'}
            </p>
            <button onClick={handleReset} style={styles.modalButton}>
              もう一度遊ぶ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ユニット描画サブコンポーネント
function RenderUnit({ unit }: { unit: Unit }) {
  const isPlayer = unit.owner === 'player';
  const isStunned = Boolean(unit.isStunned);
  const hasBuff = unit.cardNo === 2 && (unit.attack || 0) > 1; // 柴犬バフ
  const isAttacking = unit.lastAttackEffectTime && (Date.now() - unit.lastAttackEffectTime < 240);
  const attackClass = isAttacking
    ? (isPlayer ? 'unit-attacking-player' : 'unit-attacking-cpu')
    : '';

  // SVG アニメーション状態を算出
  const animState = deriveAnimationState(unit);
  const svgElement = UnitSvgRenderer({
    cardNo: unit.cardNo,
    state: animState,
    isPlayer,
    size: 36,
  });
  const hasSvg = svgElement !== null;

  return (
    <div
      style={{
        ...styles.unitWrapper,
        top: `${unit.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* HPバー */}
      <div style={styles.unitHpBarBg}>
        <div
          style={{
            ...styles.unitHpBarFill,
            width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
            backgroundColor: isPlayer ? '#22c55e' : '#ef4444',
          }}
        />
      </div>

      {/* ユニット本体アイコン */}
      <div
        className={attackClass}
        style={{
          ...styles.unitBody,
          borderColor: isPlayer ? '#3b82f6' : '#ef4444',
          backgroundColor: isPlayer ? '#1e293b' : '#2d1515',
          boxShadow: isStunned
            ? '0 0 10px #eab308'
            : isPlayer
            ? '0 2px 6px rgba(59, 130, 246, 0.4)'
            : '0 2px 6px rgba(239, 68, 68, 0.4)',
          // SVG の尻尾・触手がはみ出せるように
          overflow: hasSvg ? 'visible' : undefined,
        }}
      >
        {/* SVG コンポーネント or 絵文字フォールバック */}
        {svgElement ?? <span style={styles.unitIconText}>{unit.icon}</span>}

        {/* 状態異常・バフ表示 */}
        {isStunned && <span style={styles.statusStun}>⚡麻痺</span>}
        {hasBuff && <span style={styles.statusBuff}>⚔️+{unit.attack - 1}</span>}
      </div>

      {/* 攻撃力 / HP バッジ */}
      <div style={styles.unitBadges}>
        <span style={styles.unitAtkBadge}>{unit.attack}</span>
        <span style={styles.unitHpBadge}>{unit.hp}</span>
      </div>
    </div>
  );
}


// 攻撃エフェクト（電撃ビーム・火炎ブレス・着弾放電スパーク・火炎爆発・ダメージポップアップ）描画サブコンポーネント
function RenderAttackEffect({ effect }: { effect: AttackEffect }) {
  const now = Date.now();
  const elapsed = now - effect.createdAt;
  const showDamage = elapsed >= 120;

  // ビーム・流線用の垂直範囲
  const minY = Math.min(effect.fromY, effect.toY);
  const heightY = Math.max(5, Math.abs(effect.toY - effect.fromY));

  return (
    <>
      {/* 1. 炎のドラゴン（長距離火炎ブレス流線 ＆ 着弾大爆発） */}
      {effect.effectType === 'fireball' && (
        <>
          {/* ドラゴンから標的へ噴射される火炎ブレスの流線 */}
          <div
            className="fire-breath-stream"
            style={{
              top: `${minY}%`,
              height: `${heightY}%`,
            }}
          />

          {/* 発射元（ドラゴンの口元）の炎熱オーラ */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.fromY}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 36,
            }}
          >
            <div className="fireball-glow">
              <span style={{ fontSize: '26px', display: 'block', filter: 'drop-shadow(0 0 10px #f97316)' }}>
                🔥
              </span>
            </div>
          </div>

          {/* 着弾地点の火炎大爆発＆衝撃波リング */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.toY}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 38,
            }}
          >
            <div className="shockwave-ring-orange" />
            <div className="fireball-impact-effect">
              <span style={{ fontSize: '36px', display: 'block', filter: 'drop-shadow(0 0 16px #ea580c)' }}>
                💥🔥
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2. 電気クラゲ（長距離放電電撃ビーム ＆ 着弾バチバチ放電スパーク） */}
      {effect.effectType === 'lightning' && (
        <>
          {/* クラゲから標的へ垂直に走る極太の放電稲妻ビーム */}
          <div
            className="lightning-beam-line"
            style={{
              top: `${minY}%`,
              height: `${heightY}%`,
            }}
          />

          {/* 発射元（クラゲ自身）の放電スパーク */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.fromY}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 36,
            }}
          >
            <div className="lightning-glow">
              <span style={{ fontSize: '22px', display: 'block', filter: 'drop-shadow(0 0 10px #38bdf8)' }}>
                ⚡
              </span>
            </div>
          </div>

          {/* 着弾地点のバチバチ放電スパーク ＆ シアン衝撃波リング */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.toY}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 39,
            }}
          >
            <div className="shockwave-ring-cyan" />
            <div className="lightning-impact-effect">
              <span style={{ fontSize: '32px', display: 'block', textShadow: '0 0 16px #38bdf8, 0 0 28px #eab308' }}>
                ⚡💥⚡
              </span>
            </div>
          </div>
        </>
      )}

      {/* 3. 近接攻撃（斬撃・爪痕・打撃） */}
      {effect.effectType === 'slash' && (
        <div
          className="melee-slash-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: '50%',
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '28px', display: 'block' }}>⚔️</span>
        </div>
      )}

      {/* 4. 拠点攻撃（直撃衝撃波） */}
      {effect.effectType === 'base_hit' && (
        <div
          className="base-hit-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: '50%',
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '30px', display: 'block' }}>💥</span>
        </div>
      )}

      {/* 5. 着弾時のダメージ数値ポップアップ */}
      {showDamage && (
        <div
          className="damage-popup-text"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: '50%',
            pointerEvents: 'none',
            zIndex: 42,
          }}
        >
          -{effect.damage}
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    maxHeight: '100dvh',
    overflow: 'hidden',
    backgroundColor: '#0b1120',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  manaSpeedSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '2px 6px',
  },
  manaSpeedLabel: {
    fontSize: '11px',
    color: '#60a5fa',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  manaSpeedSelect: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 4px',
    cursor: 'pointer',
    outline: 'none',
  },
  guideToggleButton: {
    backgroundColor: '#1e3a8a',
    color: '#bfdbfe',
    border: '1px solid #3b82f6',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  resetButton: {
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  mainLayout: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '1160px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  arenaColumn: {
    flex: 1,
    minHeight: 0,
    maxWidth: '780px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '6px 10px',
    border: '1px solid #1f2937',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
  },
  cpuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '32px',
    flexShrink: 0,
    paddingBottom: '3px',
    borderBottom: '1px solid #1f2937',
    width: '100%',
    boxSizing: 'border-box',
  },
  cpuHeaderControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
  },
  hpBarBg: {
    flex: 1,
    maxWidth: '130px',
    minWidth: '50px',
    height: '15px',
    backgroundColor: '#030712',
    borderRadius: '7px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #374151',
  },
  hpBarFillCpu: {
    height: '100%',
    backgroundColor: '#ef4444',
    transition: 'width 0.2s',
  },
  hpBarFillPlayer: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.2s',
  },
  hpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '0 1px 2px #000',
    whiteSpace: 'nowrap',
  },
  fieldGrid: {
    flex: 1,
    minHeight: '180px',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    position: 'relative',
    margin: '4px 0',
  },
  lane: {
    borderRadius: '6px',
    border: '1px solid #334155',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background-color 0.12s, border-color 0.12s',
  },
  laneNumberTop: {
    fontSize: '10px',
    color: '#475569',
    fontWeight: 'bold',
    marginTop: '2px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  laneNumberBottom: {
    fontSize: '10px',
    color: '#475569',
    fontWeight: 'bold',
    marginBottom: '2px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  laneTrackLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '1px',
    borderLeft: '1px dashed rgba(255,255,255,0.06)',
    pointerEvents: 'none',
  },
  summonGuideBadge: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
    pointerEvents: 'none',
    zIndex: 15,
    animation: 'pulseSummonBadge 0.8s infinite ease-in-out',
    boxShadow: '0 0 10px rgba(37,99,235,0.7)',
    whiteSpace: 'nowrap',
  },
  dropZoneHint: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px dashed rgba(96, 165, 250, 0.8)',
    color: '#93c5fd',
    fontSize: '9px',
    padding: '2px 5px',
    borderRadius: '3px',
    fontWeight: 'bold',
    pointerEvents: 'none',
    zIndex: 14,
    whiteSpace: 'nowrap',
  },
  unitWrapper: {
    position: 'absolute',
    left: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
    willChange: 'top',
  },
  unitHpBarBg: {
    width: '28px',
    height: '4px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '2px',
  },
  unitHpBarFill: {
    height: '100%',
    transition: 'width 0.1s',
  },
  unitBody: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unitIconText: {
    fontSize: '19px',
    lineHeight: 1,
  },
  statusStun: {
    position: 'absolute',
    top: '-11px',
    fontSize: '8px',
    backgroundColor: '#eab308',
    color: '#000',
    padding: '1px 3px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  statusBuff: {
    position: 'absolute',
    bottom: '-9px',
    fontSize: '8px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '1px 3px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  unitBadges: {
    display: 'flex',
    gap: '3px',
    marginTop: '2px',
  },
  unitAtkBadge: {
    fontSize: '9px',
    backgroundColor: '#f59e0b',
    color: '#000',
    fontWeight: 'bold',
    padding: '0 3px',
    borderRadius: '2px',
    lineHeight: '13px',
  },
  unitHpBadge: {
    fontSize: '9px',
    backgroundColor: '#22c55e',
    color: '#000',
    fontWeight: 'bold',
    padding: '0 3px',
    borderRadius: '2px',
    lineHeight: '13px',
  },
  spellBlast: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    zIndex: 20,
    boxShadow: '0 0 15px #ef4444',
    whiteSpace: 'nowrap',
  },
  playerCommandBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '30px',
    flexShrink: 0,
    gap: '8px',
    padding: '3px 8px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1px solid #1e293b',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '6px',
  },
  playerHpSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: '1 1 42%',
    minWidth: 0,
  },
  playerManaSection: {
    flex: '1 1 58%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
    maxWidth: '300px',
  },
  manaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    flexShrink: 0,
  },
  manaTitle: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  manaCount: {
    color: '#60a5fa',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  manaBarBg: {
    flex: 1,
    minWidth: '50px',
    height: '14px',
    backgroundColor: '#030712',
    borderRadius: '7px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #2563eb',
  },
  manaBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
    transition: 'width 0.08s linear',
  },
  manaTicks: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    padding: '0 10%',
  },
  manaTick: {
    width: '1px',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dockContainer: {
    height: '100px',
    flexShrink: 0,
    display: 'flex',
    gap: '6px',
    alignItems: 'stretch',
    width: '100%',
    boxSizing: 'border-box',
  },
  nextCardSlot: {
    width: '64px',
    flexShrink: 0,
    backgroundColor: '#090d16',
    borderRadius: '6px',
    border: '1px dashed #334155',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 2px',
    boxSizing: 'border-box',
    position: 'relative',
    userSelect: 'none',
  },
  nextBadge: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: '0.5px',
    backgroundColor: '#1e293b',
    padding: '1px 4px',
    borderRadius: '3px',
    lineHeight: 1,
  },
  nextCardInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    width: '100%',
  },
  nextCardCostBadge: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#1e40af',
    padding: '1px 4px',
    borderRadius: '3px',
    lineHeight: 1,
  },
  nextCardIcon: {
    fontSize: '18px',
    lineHeight: 1.1,
  },
  nextCardName: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '56px',
    textAlign: 'center',
  },
  nextCardEmpty: {
    color: '#475569',
    fontSize: '14px',
  },
  deckCountBadge: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#60a5fa',
    backgroundColor: '#172554',
    padding: '1px 4px',
    borderRadius: '3px',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  cardLockBadge: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#dc2626',
    padding: '0 3px',
    borderRadius: '2px',
    lineHeight: '12px',
  },
  handGrid: {
    height: '100%',
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1.5px solid #334155',
    padding: '5px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    touchAction: 'manipulation',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
    transform: 'translateY(-3px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    lineHeight: 1,
  },
  cardCostBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  cardKeyBadge: {
    fontSize: '9px',
    color: '#64748b',
    fontWeight: 'bold',
  },
  cardCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    margin: '1px 0',
  },
  cardIcon: {
    fontSize: '19px',
  },
  cardName: {
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '75px',
  },
  cardFooter: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
  },
  cardStats: {
    display: 'flex',
    gap: '5px',
    fontSize: '10px',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  cardSpellTag: {
    fontSize: '9px',
    color: '#fb923c',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  cardSpellScope: {
    fontSize: '9px',
    color: '#fdba74',
    lineHeight: 1,
  },
  cardAtk: {
    color: '#f59e0b',
  },
  cardHp: {
    color: '#22c55e',
  },
  cardSpeed: {
    color: '#38bdf8',
  },
  cardDescSnippet: {
    fontSize: '9px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    textAlign: 'center',
    opacity: 0.85,
  },
  sidePanel: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '10px',
    border: '1px solid #1f2937',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    minHeight: 0,
  },
  sidePanelTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid #1f2937',
    flexShrink: 0,
  },
  sidePanelTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#f8fafc',
    letterSpacing: '-0.3px',
  },
  sidePanelBadge: {
    backgroundColor: '#1d4ed8',
    color: '#dbeafe',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  sideBattleCard: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #1e293b',
    padding: '8px 10px',
    marginBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexShrink: 0,
  },
  sideCpuStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sideCpuInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: '8px',
  },
  sideCpuName: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
  },
  sideHpBarBg: {
    flex: 1,
    maxWidth: '160px',
    minWidth: '70px',
    height: '16px',
    backgroundColor: '#030712',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #374151',
  },
  sideControlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    width: '100%',
    paddingTop: '2px',
  },
  sidePanelHeader: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
    borderBottom: '1px solid #1f2937',
    paddingBottom: '6px',
    flexShrink: 0,
  },
  tabButton: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '5px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
    color: '#60a5fa',
  },
  sidePanelContent: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    minHeight: 0,
  },
  tipsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tipBox: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '8px 10px',
    border: '1px solid #1e293b',
  },
  tipTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#93c5fd',
    marginBottom: '3px',
  },
  tipText: {
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  shortcutGuide: {
    backgroundColor: '#1e293b',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
  },
  catalogList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  catalogItem: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '6px 8px',
    border: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  catalogItemIcon: {
    fontSize: '22px',
    width: '28px',
    textAlign: 'center',
    flexShrink: 0,
  },
  catalogItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  catalogItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogItemName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  catalogItemCost: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  catalogItemStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: '#94a3b8',
    margin: '2px 0',
  },
  catalogItemDesc: {
    fontSize: '10px',
    color: '#64748b',
    lineHeight: '1.3',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(3px)',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '420px',
    textAlign: 'center',
    border: '1px solid #475569',
    boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  modalMessage: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  modalButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  guideModal: {
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '14px',
    maxWidth: '440px',
    width: '92%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #374151',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
  },
  guideModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px',
  },
  guideModalCloseBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  guideModalBody: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: 0,
  },
};
