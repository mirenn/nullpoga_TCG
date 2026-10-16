'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { styles } from './page.styles';
import './realtime-battle.css';
import { useRealtimeGame } from './useRealtimeGame';
import { GuideModal } from '../components/modals/GuideModal';
import { DesktopSidePanel } from '../components/battle/DesktopSidePanel';
import { MobileCpuHeader } from '../components/battle/MobileCpuHeader';
import { BattleField } from '../components/battle/BattleField';
import { PlayerCommandBar } from '../components/battle/PlayerCommandBar';
import { GameResultModal } from '../components/modals/GameResultModal';
import { MANA_SPEED_PRESETS } from './cards';

export default function RealtimeDemoPage() {
  const {
    playerHp,
    cpuHp,
    playerMana,
    cpuMana,
    maxMana,
    manaRegenRate,
    setManaRegenRate,
    hand,
    nextCard,
    deckCount,
    discardCount,
    cpuHand,
    cpuNextCard,
    cpuDeckCount,
    cpuSpawnWarnings,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    inhibitors,
    playerManaRegenMultiplier,
    cpuManaRegenMultiplier,
    spellEffects,
    attackEffects,
    gameResult,
    checkCanPlayCard,
    playCardAt,
    playCardAtX,
    playCardOnLane,
    resetGame,
    comboCount,
    lastComboTime,
  } = useRealtimeGame();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDesktopSidePanel, setShowDesktopSidePanel] = useState(true);
  const [showUnitRange, setShowUnitRange] = useState(false);

  // 初回マウント時に URL クエリパラメータ (?range=1 / ?range=true) または localStorage から射程表示設定を復元
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rangeParam = params.get('range') ?? params.get('showRange');
      if (rangeParam === '1' || rangeParam === 'true') {
        setShowUnitRange(true);
        window.localStorage.setItem('nullpoga_show_unit_range', 'true');
        return;
      }
      if (rangeParam === '0' || rangeParam === 'false') {
        setShowUnitRange(false);
        window.localStorage.setItem('nullpoga_show_unit_range', 'false');
        return;
      }
      const saved = window.localStorage.getItem('nullpoga_show_unit_range');
      if (saved === 'true') {
        setShowUnitRange(true);
      }
    } catch {
      // SSRやlocalStorageアクセス制限時は無視
    }
  }, []);

  const handleToggleUnitRange = useCallback(() => {
    setShowUnitRange((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('nullpoga_show_unit_range', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  
  // ドラッグ＆ドロップ用ステート
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverLaneIndex, setDragOverLaneIndex] = useState<number | null>(null);
  const [spawnRippleLane, setSpawnRippleLane] = useState<number | null>(null);

  const [displayCombo, setDisplayCombo] = useState<{ count: number; visible: boolean }>({ count: 0, visible: false });

  useEffect(() => {
    if (comboCount > 1) {
      setDisplayCombo({ count: comboCount, visible: true });
      const timer = setTimeout(() => {
        setDisplayCombo((prev) => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setDisplayCombo((prev) => ({ ...prev, visible: false }));
    }
  }, [comboCount, lastComboTime]);

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
  const handleDragEnd = useCallback(() => {
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
  }, []);

  // ブラウザ外ドロップやドラッグ中断時にも確実に状態をリセット
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      handleDragEnd();
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [handleDragEnd]);

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

  // キーボードショートカット (1〜4キーで手札選択、Escで選択解除、Rキーで射程範囲表示トグル)
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
      } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleToggleUnitRange();
      }
    },
    [hand.length, setSelectedCardIndex, handleToggleUnitRange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={styles.container} className="realtime-demo-container">
      {/* 画面内CSS (レスポンシブ & アニメーション) */}

      {/* メインゲーム領域 (100vh収容・レスポンシブ2カラム) */}
      <div style={styles.mainLayout}>
        {/* 左／中央：バトルアリーナ */}
        <div style={styles.arenaColumn} className="arena-column">
          {/* デスクトップ用アリーナヘッダーバー（左右対戦タイトル & 速度/リセット/ワイド化トグル） */}
          <div style={styles.desktopArenaHeader} className="desktop-arena-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
                ⚔️ Nullpoga RTS (左右ワイド対戦)
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                自軍(左) ➔ 敵軍(右)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* マナ速度設定 */}
              <div style={styles.manaSpeedSelector}>
                <span style={styles.manaSpeedLabel}>⚡速度:</span>
                <select
                  style={styles.manaSpeedSelect}
                  value={manaRegenRate}
                  onChange={(e) => setManaRegenRate(Number(e.target.value))}
                >
                  {MANA_SPEED_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 射程範囲表示トグルボタン (開発・検証用) */}
              <button
                type="button"
                onClick={handleToggleUnitRange}
                data-testid="toggle-unit-range-btn"
                style={{
                  ...styles.guideToggleButton,
                  backgroundColor: showUnitRange ? '#0369a1' : '#1e293b',
                  border: `1px solid ${showUnitRange ? '#38bdf8' : '#475569'}`,
                  color: showUnitRange ? '#e0f2fe' : '#94a3b8',
                  boxShadow: showUnitRange ? '0 0 8px rgba(56, 189, 248, 0.45)' : 'none',
                }}
                title="各ユニットの射程範囲表示を切り替え (ショートカット: Rキー / URL: ?range=1)"
              >
                🎯 射程表示: {showUnitRange ? 'ON' : 'OFF'}
              </button>

              {/* やり直すボタン */}
              <button
                type="button"
                onClick={handleReset}
                style={styles.resetButton}
                title="ゲームを初期状態にリセット"
              >
                🔄 やり直す
              </button>

              {/* ガイドモーダルボタン */}
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                style={styles.guideToggleButton}
                title="攻略ガイド・カード図鑑モーダルを表示"
              >
                📖 ガイド・図鑑
              </button>

              {/* サイドパネル折りたたみ / 展開トグル */}
              <button
                type="button"
                onClick={() => setShowDesktopSidePanel(!showDesktopSidePanel)}
                style={{
                  ...styles.guideToggleButton,
                  backgroundColor: showDesktopSidePanel ? '#1e293b' : '#2563eb',
                  border: `1px solid ${showDesktopSidePanel ? '#475569' : '#60a5fa'}`,
                  color: '#ffffff',
                }}
                title={showDesktopSidePanel ? 'サイドパネルを収納してフィールドを超ワイド表示' : 'サイドパネル（攻略ガイド）を表示'}
              >
                {showDesktopSidePanel ? '◀ パネル収納 (ワイド化)' : '▶ パネル表示'}
              </button>
            </div>
          </div>

          {/* 1. CPU陣地ステータスバー & コントロール (モバイル時のみアリーナ上部に表示) */}
          <MobileCpuHeader
            cpuHp={cpuHp}
            cpuMana={cpuMana}
            maxMana={maxMana}
            cpuManaRegenMultiplier={cpuManaRegenMultiplier}
            cpuHandCount={cpuHand.length}
            cpuDeckCount={cpuDeckCount}
            manaRegenRate={manaRegenRate}
            setManaRegenRate={setManaRegenRate}
            showUnitRange={showUnitRange}
            onToggleUnitRange={handleToggleUnitRange}
            onReset={handleReset}
            onOpenGuide={() => setShowGuideModal(true)}
          />

          {/* 2. オープンフィールド戦場アリーナ (flex: 1 で全画面収容) */}
          <BattleField
            units={units}
            inhibitors={inhibitors}
            spellEffects={spellEffects}
            attackEffects={attackEffects}
            cpuSpawnWarnings={cpuSpawnWarnings}
            selectedCard={selectedCard}
            selectedCardIndex={selectedCardIndex}
            activeDraggedCard={activeDraggedCard}
            draggedCardIndex={draggedCardIndex}
            isDragging={isDragging}
            dragOverLaneIndex={dragOverLaneIndex}
            spawnRippleLane={spawnRippleLane}
            playerMana={playerMana}
            playerHp={playerHp}
            cpuHp={cpuHp}
            cpuMana={cpuMana}
            showUnitRange={showUnitRange}
            checkCanPlayCard={checkCanPlayCard}
            playCardAt={playCardAt}
            playCardAtX={playCardAtX}
            playCardOnLane={playCardOnLane}
            handleLaneDragOver={handleLaneDragOver}
            handleLaneDragLeave={handleLaneDragLeave}
            handleLaneDrop={handleLaneDrop}
            setDragOverLaneIndex={setDragOverLaneIndex}
            handleDragEnd={handleDragEnd}
          />

          {/* 3. 統合プレイヤー司令バー (自軍HP & マナゲージ) & 手札ドック */}
          <PlayerCommandBar
            playerHp={playerHp}
            playerMana={playerMana}
            maxMana={maxMana}
            manaRegenMultiplier={playerManaRegenMultiplier}
            displayCombo={displayCombo}
            nextCard={nextCard}
            deckCount={deckCount}
            discardCount={discardCount}
            hand={hand}
            selectedCardIndex={selectedCardIndex}
            draggedCardIndex={draggedCardIndex}
            isDragging={isDragging}
            gameResult={gameResult}
            checkCanPlayCard={checkCanPlayCard}
            setSelectedCardIndex={setSelectedCardIndex}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
          />
        </div>

        {/* 右：攻略ガイド & カード図鑑パネル (デスクトップ専用表示・トグル可能) */}
        {showDesktopSidePanel && (
          <DesktopSidePanel
            cpuHp={cpuHp}
            cpuMana={cpuMana}
            maxMana={maxMana}
            cpuManaRegenMultiplier={cpuManaRegenMultiplier}
            cpuHand={cpuHand}
            cpuDeckCount={cpuDeckCount}
            manaRegenRate={manaRegenRate}
            setManaRegenRate={setManaRegenRate}
            showUnitRange={showUnitRange}
            onToggleUnitRange={handleToggleUnitRange}
            onReset={handleReset}
          />
        )}
      </div>

      {/* モバイル用ガイドモーダル */}
      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      {/* 勝敗オーバーレイ */}
      {gameResult !== 'playing' && (
        <GameResultModal gameResult={gameResult} onReset={handleReset} />
      )}
    </div>
  );
}
