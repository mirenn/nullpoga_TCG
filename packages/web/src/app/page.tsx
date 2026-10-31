'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { clampSpawnX, clampSpawnY, clampPlayerSpawnX } from './board';

export default function RealtimeDemoPage() {
  const {
    playerHp,
    cpuHp,
    playerScore,
    cpuScore,
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
    obstacles,
    cloudEvent,
    camera3D,
    setCamera3D,
    resetCamera3D,
    spottedCount,
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
    toggleUnitHold,
    onProfilerRender,
  } = useRealtimeGame();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDesktopSidePanel, setShowDesktopSidePanel] = useState(true);
  const [showUnitRange, setShowUnitRange] = useState(false);

  // iPad等のタブレット端末では、初期表示時にサイドパネルを収納し、GPU発熱を抑える2D平面モードをデフォルト化
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.innerWidth < 1280 || (window.innerWidth <= 1366 && navigator.maxTouchPoints > 1))
    ) {
      setShowDesktopSidePanel(false);
      setCamera3D((prev) => ({ ...prev, is3DMode: false }));
    }
  }, [setCamera3D]);

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

  const handleOpenGuide = useCallback(() => {
    setShowGuideModal(true);
  }, []);
  
  // ドラッグ＆ドロップ用ステート (HTML5 D&D & タッチPointer共通)
  const battleFieldRef = useRef<HTMLDivElement>(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverLaneIndex, setDragOverLaneIndex] = useState<number | null>(null);
  const [spawnRippleLane, setSpawnRippleLane] = useState<number | null>(null);
  const [touchDragPos, setTouchDragPos] = useState<{ clientX: number; clientY: number } | null>(null);
  const [externalHoverPos, setExternalHoverPos] = useState<{ x: number; y: number } | null>(null);

  const pointerDragStateRef = useRef<{
    pointerId: number;
    pointerType: string;
    cardIdx: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);
  const ignoreNextCardClickRef = useRef<boolean>(false);

  const selectedCard = selectedCardIndex !== null ? hand[selectedCardIndex] : null;
  const activeDraggedCard = draggedCardIndex !== null ? hand[draggedCardIndex] : null;

  // ゲームリセット（D&D状態もクリア）
  const handleReset = useCallback(() => {
    pointerDragStateRef.current = null;
    ignoreNextCardClickRef.current = false;
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
    setSpawnRippleLane(null);
    setTouchDragPos(null);
    setExternalHoverPos(null);
    resetGame();
  }, [resetGame]);

  // タッチデバイス・ポインター用ドラッグ開始
  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const validation = checkCanPlayCard(idx);
      if (!validation.canPlay || gameResult !== 'playing') return;

      pointerDragStateRef.current = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        cardIdx: idx,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
      };
    },
    [checkCanPlayCard, gameResult]
  );

  // カードクリック時の選択トグル（タッチ操作やポインタードラッグ直後の重複発火を防止）
  const handleCardClick = useCallback(
    (idx: number) => {
      if (ignoreNextCardClickRef.current) {
        ignoreNextCardClickRef.current = false;
        return;
      }
      setSelectedCardIndex((prev) => (prev === idx ? null : idx));
    },
    [setSelectedCardIndex]
  );

  // ウィンドウ全体でタッチ・ポインタードラッグをスムーズに追従・出撃判定
  useEffect(() => {
    let lastDragUpdateMs = 0;

    const onPointerMove = (e: PointerEvent) => {
      const state = pointerDragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      // 8px以上の移動でドラッグ状態へ移行
      if (!state.hasMoved && Math.hypot(dx, dy) > 8) {
        state.hasMoved = true;
        setDraggedCardIndex(state.cardIdx);
        setIsDragging(true);
      }

      if (state.hasMoved) {
        // iPadの120Hzポインターイベントで毎フレームReact全体が再コミット(68+ commits/sec)するのを防ぐため約30fps(32ms)にスロットリング
        const now = performance.now();
        if (now - lastDragUpdateMs < 32) return;
        lastDragUpdateMs = now;

        setTouchDragPos({ clientX: e.clientX, clientY: e.clientY });

        if (battleFieldRef.current) {
          const rect = battleFieldRef.current.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            const rawX = ((e.clientX - rect.left) / rect.width) * 100;
            const rawY = ((e.clientY - rect.top) / rect.height) * 100;
            setExternalHoverPos({
              x: clampSpawnX(rawX),
              y: clampSpawnY(rawY),
            });
          } else {
            setExternalHoverPos(null);
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const state = pointerDragStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;

      if (state.hasMoved) {
        // ポインタードラッグ完了直後の click イベント誤爆を抑止
        ignoreNextCardClickRef.current = true;
        setTimeout(() => {
          ignoreNextCardClickRef.current = false;
        }, 300);

        // ドラッグして戦場上で指/マウスを離した ➔ 出撃実行！
        if (battleFieldRef.current) {
          const rect = battleFieldRef.current.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            const rawX = ((e.clientX - rect.left) / rect.width) * 100;
            const rawY = ((e.clientY - rect.top) / rect.height) * 100;
            const card = hand[state.cardIdx];
            if (card) {
              const x = card.type === 'MONSTER'
                ? clampPlayerSpawnX(rawX)
                : clampSpawnX(rawX, 15, 85);
              const y = clampSpawnY(rawY);
              const validation = checkCanPlayCard(state.cardIdx, rawX, y);
              if (validation.canPlay) {
                if (playCardAt) {
                  playCardAt(x, y, state.cardIdx);
                } else if (playCardAtX) {
                  playCardAtX(x, state.cardIdx);
                }
              }
            }
          }
        }
      } else if (state.pointerType !== 'mouse') {
        // タッチデバイスで移動距離がわずかなタップ操作 ➔ 選択切り替え（直後の合成clickは抑止）
        ignoreNextCardClickRef.current = true;
        setTimeout(() => {
          ignoreNextCardClickRef.current = false;
        }, 350);
        const idx = state.cardIdx;
        setSelectedCardIndex((prev) => (prev === idx ? null : idx));
      }

      pointerDragStateRef.current = null;
      setDraggedCardIndex(null);
      setIsDragging(false);
      setTouchDragPos(null);
      setExternalHoverPos(null);
    };

    const onPointerCancel = (e: PointerEvent) => {
      const state = pointerDragStateRef.current;
      if (state && e.pointerId === state.pointerId) {
        pointerDragStateRef.current = null;
        setDraggedCardIndex(null);
        setIsDragging(false);
        setTouchDragPos(null);
        setExternalHoverPos(null);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [hand, checkCanPlayCard, playCardAt, playCardAtX, setSelectedCardIndex]);

  // ドラッグ開始 (HTML5 Drag & Drop)
  const handleDragStart = useCallback(
    (e: React.DragEvent, idx: number) => {
      // タッチ操作中（touch / pen）に長押し等でブラウザのネイティブD&Dが発火した場合は抑止し、ポインター追従ドラッグを継続
      if (pointerDragStateRef.current && pointerDragStateRef.current.pointerType !== 'mouse') {
        e.preventDefault();
        return;
      }
      const validation = checkCanPlayCard(idx);
      if (!validation.canPlay || gameResult !== 'playing') {
        e.preventDefault();
        return;
      }
      // マウスでネイティブHTML5 D&Dが開始された場合は、直後に発火する pointercancel でドラッグ状態がリセットされないよう pointerDragStateRef を解除
      pointerDragStateRef.current = null;
      setTouchDragPos(null);
      setExternalHoverPos(null);
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'copyMove';
      setDraggedCardIndex(idx);
      setIsDragging(true);
    },
    [checkCanPlayCard, gameResult]
  );

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    pointerDragStateRef.current = null;
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
    setTouchDragPos(null);
    setExternalHoverPos(null);
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
    <React.Profiler id="RealtimeDemoPage" onRender={onProfilerRender}>
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
                  suppressHydrationWarning
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

              {/* Circle Mode Button */}
              <a
                href="/circle"
                style={{
                  ...styles.guideToggleButton,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="円形モードを遊ぶ"
              >
                ⭕ 円形モード
              </a>

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
            cpuMana={Math.floor(cpuMana * 10) / 10}
            maxMana={maxMana}
            cpuManaRegenMultiplier={cpuManaRegenMultiplier}
            cpuHandCount={cpuHand.length}
            cpuDeckCount={cpuDeckCount}
            manaRegenRate={manaRegenRate}
            setManaRegenRate={setManaRegenRate}
            showUnitRange={showUnitRange}
            onToggleUnitRange={handleToggleUnitRange}
            onReset={handleReset}
            onOpenGuide={handleOpenGuide}
          />

          {/* 2. オープンフィールド戦場アリーナ (flex: 1 で全画面収容) */}
          <BattleField
            containerRef={battleFieldRef}
            externalHoverPos={externalHoverPos}
            hand={hand}
            units={units}
            inhibitors={inhibitors}
            obstacles={obstacles}
            cloudEvent={cloudEvent}
            camera3D={camera3D}
            setCamera3D={setCamera3D}
            resetCamera3D={resetCamera3D}
            spottedCount={spottedCount}
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
            playerMana={Math.floor(playerMana * 10) / 10}
            playerHp={playerHp}
            cpuHp={cpuHp}
            playerScore={playerScore}
            cpuScore={cpuScore}
            cpuMana={Math.floor(cpuMana * 10) / 10}
            showUnitRange={showUnitRange}
            checkCanPlayCard={checkCanPlayCard}
            playCardAt={playCardAt}
            playCardAtX={playCardAtX}
            playCardOnLane={playCardOnLane}
            toggleUnitHold={toggleUnitHold}
            handleLaneDragOver={handleLaneDragOver}
            handleLaneDragLeave={handleLaneDragLeave}
            handleLaneDrop={handleLaneDrop}
            setDragOverLaneIndex={setDragOverLaneIndex}
            handleDragEnd={handleDragEnd}
          />

          {/* 3. 統合プレイヤー司令バー (自軍HP & マナゲージ) & 手札ドック */}
          <PlayerCommandBar
            playerHp={playerHp}
            playerMana={Math.floor(playerMana * 10) / 10}
            maxMana={maxMana}
            manaRegenMultiplier={playerManaRegenMultiplier}
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
            handleCardPointerDown={handleCardPointerDown}
            handleCardClick={handleCardClick}
          />
        </div>

        {/* 右：攻略ガイド & カード図鑑パネル (デスクトップ専用表示・トグル可能) */}
        {showDesktopSidePanel && (
          <DesktopSidePanel
            cpuHp={cpuHp}
            cpuMana={Math.floor(cpuMana * 10) / 10}
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

      {/* タッチドラッグ中の指追従フローティングカードゴースト */}
      {isDragging && touchDragPos && activeDraggedCard && (
        <div
          style={{
            position: 'fixed',
            left: touchDragPos.clientX,
            top: touchDragPos.clientY,
            transform: 'translate(-50%, -85%) scale(1.08)',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 12px 30px rgba(0,0,0,0.7), 0 0 20px rgba(56, 189, 248, 0.6)',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            border: '2px solid #38bdf8',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            width: '74px',
            height: '92px',
            boxSizing: 'border-box',
            opacity: 0.95,
            transition: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: '#60a5fa', fontWeight: 'bold' }}>
            <span>⚡{activeDraggedCard.manaCost}</span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>{activeDraggedCard.type === 'SPELL' ? '✨呪文' : '⚔️'}</span>
          </div>
          <span style={{ fontSize: '28px', lineHeight: 1.1 }}>{activeDraggedCard.icon}</span>
          <span style={{ fontSize: '10.5px', color: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '64px' }}>
            {activeDraggedCard.name}
          </span>
        </div>
      )}

      {/* モバイル用ガイドモーダル */}
      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      {/* 勝敗オーバーレイ */}
      {gameResult !== 'playing' && (
        <GameResultModal gameResult={gameResult} onReset={handleReset} />
      )}
      </div>
    </React.Profiler>
  );
}
