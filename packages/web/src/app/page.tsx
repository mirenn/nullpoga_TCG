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
    spellEffects,
    attackEffects,
    gameResult,
    checkCanPlayCard,
    playCardOnLane,
    resetGame,
    comboCount,
    lastComboTime,
  } = useRealtimeGame();

  const [showGuideModal, setShowGuideModal] = useState(false);
  
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

      {/* メインゲーム領域 (100vh収容・レスポンシブ2カラム) */}
      <div style={styles.mainLayout}>
        {/* 左／中央：バトルアリーナ */}
        <div style={styles.arenaColumn} className="arena-column">
          {/* 1. CPU陣地ステータスバー & コントロール (モバイル時のみアリーナ上部に表示、デスクトップは右パネルに集約) */}
          <MobileCpuHeader
            cpuHp={cpuHp}
            cpuMana={cpuMana}
            maxMana={maxMana}
            cpuHandCount={cpuHand.length}
            cpuDeckCount={cpuDeckCount}
            manaRegenRate={manaRegenRate}
            setManaRegenRate={setManaRegenRate}
            onReset={handleReset}
            onOpenGuide={() => setShowGuideModal(true)}
          />

          {/* 2. 5レーン戦場フィールド (flex: 1 で全画面収容) */}
          <BattleField
            units={units}
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
            checkCanPlayCard={checkCanPlayCard}
            playCardOnLane={playCardOnLane}
            handleLaneDragOver={handleLaneDragOver}
            handleLaneDragLeave={handleLaneDragLeave}
            handleLaneDrop={handleLaneDrop}
            setDragOverLaneIndex={setDragOverLaneIndex}
          />

          {/* 3. 統合プレイヤー司令バー (自軍HP & マナゲージ) & 手札ドック */}
          <PlayerCommandBar
            playerHp={playerHp}
            playerMana={playerMana}
            maxMana={maxMana}
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

        {/* 右：攻略ガイド & カード図鑑パネル (デスクトップ専用表示) */}
        <DesktopSidePanel
          cpuHp={cpuHp}
          cpuMana={cpuMana}
          maxMana={maxMana}
          cpuHand={cpuHand}
          cpuDeckCount={cpuDeckCount}
          manaRegenRate={manaRegenRate}
          setManaRegenRate={setManaRegenRate}
          onReset={handleReset}
        />
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
