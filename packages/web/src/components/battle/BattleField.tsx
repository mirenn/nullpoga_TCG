import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Unit, SpellEffect, AttackEffect, CpuSpawnWarning, DemoCard, Inhibitor } from '../../app/types';
import { styles } from '../../app/page.styles';
import { RenderUnit } from '../units/RenderUnit';
import { RenderAttackEffect } from '../effects/RenderAttackEffect';
import { RenderInhibitor } from './RenderInhibitor';
import { RenderObstacleGround, RenderObstacleCanopy } from './RenderObstacle3D';
import {
  clampSpawnX,
  clampPlayerSpawnX,
  clampSpawnY,
  getSpawnDepthRole,
  isWithinCollisionY,
  SPELL_RADIUS,
  FIRE_SPELL_HALF_WIDTH_X,
  FIRE_SPELL_SPREAD_SPEED_Y,
  generateFirePillars,
  isWithinFireSpellColumn,
  isWithinMeteorRange,
  computeUnitRangeZone,
  SPAWN_X_MIN,
  SPAWN_X_MAX,
  PLAYER_SPAWN_X_MIN,
  PLAYER_SPAWN_X_MAX,
  PLAYER_DEFAULT_SPAWN_X,
} from '../../app/board';
import {
  FIELD_OBSTACLES,
  DEFAULT_CAMERA_3D,
  FieldObstacle,
  Camera3DState,
  clampCameraPanX,
  clampCameraPanY,
  clampCameraZoom,
  isStealthCapableCard,
  isPointInObstacleFootprint,
  findPlayerAmbushObstacle,
  computePeekRevealProgress,
  isPointOccludedByObstacle,
  evaluateUnitStealthAndSpot,
} from '../../app/obstacles';
import { SPAWN_MIN_SPACE } from '../../app/cards';

export interface BattleFieldProps {
  units: Unit[];
  inhibitors: Inhibitor[];
  obstacles?: FieldObstacle[];
  camera3D?: Camera3DState;
  setCamera3D?: (updater: Camera3DState | ((prev: Camera3DState) => Camera3DState)) => void;
  resetCamera3D?: () => void;
  spottedCount?: number;
  spellEffects: SpellEffect[];
  attackEffects: AttackEffect[];
  cpuSpawnWarnings: CpuSpawnWarning[];
  selectedCard: DemoCard | null;
  selectedCardIndex: number | null;
  activeDraggedCard: DemoCard | null;
  draggedCardIndex: number | null;
  isDragging: boolean;
  playerMana: number;
  checkCanPlayCard: (idx: number, spawnX?: number, spawnY?: number) => { canPlay: boolean; reason?: string };
  playCardAt?: (spawnX: number, spawnY: number, cardIndexOverride?: number) => void;
  playCardAtX?: (spawnX: number, cardIndexOverride?: number) => void;
  playerHp?: number;
  cpuHp?: number;
  cpuMana?: number;
  showUnitRange?: boolean;
  playCardOnLane?: (laneIndex: number, cardIndexOverride?: number) => void;
  toggleUnitHold?: (unitId: string) => void;
  dragOverLaneIndex?: number | null;
  spawnRippleLane?: number | null;
  handleLaneDragOver?: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDragLeave?: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDrop?: (e: React.DragEvent, laneIndex: number) => void;
  setDragOverLaneIndex?: (laneIndex: number | null) => void;
  handleDragEnd?: () => void;
}

export function BattleField({
  units,
  inhibitors,
  obstacles = FIELD_OBSTACLES,
  camera3D: externalCamera3D,
  setCamera3D: externalSetCamera3D,
  resetCamera3D: externalResetCamera3D,
  spottedCount = 0,
  spellEffects,
  attackEffects,
  cpuSpawnWarnings,
  selectedCard,
  selectedCardIndex,
  activeDraggedCard,
  draggedCardIndex,
  isDragging,
  playerMana,
  playerHp,
  cpuHp,
  cpuMana,
  showUnitRange = false,
  checkCanPlayCard,
  playCardAt,
  playCardAtX,
  toggleUnitHold,
  handleDragEnd,
}: BattleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(null);

  // フォールバック用のローカルカメラState
  const [localCamera, setLocalCamera] = useState<Camera3DState>(DEFAULT_CAMERA_3D);
  const camera = externalCamera3D ?? localCamera;
  const updateCamera = externalSetCamera3D ?? setLocalCamera;

  // ミドルドラッグ（または右ドラッグ）によるカメラ平行移動の状態管理
  const [isPanningCamera, setIsPanningCamera] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number } | null>(null);
  const didPanDuringPressRef = useRef<boolean>(false);

  const handleResetCamera = useCallback(() => {
    if (externalResetCamera3D) {
      externalResetCamera3D();
    } else {
      updateCamera((prev) => ({ ...DEFAULT_CAMERA_3D, is3DMode: prev.is3DMode }));
    }
  }, [externalResetCamera3D, updateCamera]);

  const handleToggle3DMode = useCallback(() => {
    updateCamera((prev) => ({
      ...prev,
      is3DMode: !prev.is3DMode,
    }));
  }, [updateCamera]);

  // 3DCCソフト風ミドルマウスボタン押し込み（button===1）または右ボタン（button===2）で平行移動開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1 || e.button === 2 || (e.button === 0 && (e.altKey || e.shiftKey))) {
        e.preventDefault();
        setIsPanningCamera(true);
        didPanDuringPressRef.current = false;
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          startPanX: camera.panX,
          startPanY: camera.panY,
        };
      }
    },
    [camera.panX, camera.panY]
  );

  // ウィンドウ全体でミドルドラッグ移動＆ボタン解放を追跡（フィールド外にカーソルが出ても滑らかに追従）
  useEffect(() => {
    if (!isPanningCamera) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      const panStart = panStartRef.current;
      if (!panStart) return;
      const dx = e.clientX - panStart.clientX;
      const dy = e.clientY - panStart.clientY;
      if (Math.hypot(dx, dy) > 3) {
        didPanDuringPressRef.current = true;
      }
      const nextPanX = clampCameraPanX(panStart.startPanX + dx);
      const nextPanY = clampCameraPanY(panStart.startPanY + dy);
      updateCamera((prev) => ({
        ...prev,
        panX: nextPanX,
        panY: nextPanY,
      }));
    };

    const onWindowMouseUp = () => {
      setIsPanningCamera(false);
      panStartRef.current = null;
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isPanningCamera, updateCamera]);

  // マウスホイールによる3D箱庭ズームイン・ズームアウト
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      updateCamera((prev) => ({
        ...prev,
        zoom: clampCameraZoom(prev.zoom + zoomDelta),
      }));
    },
    [updateCamera]
  );

  // マウス/タッチ座標からフィールドの横パーセント (SPAWN_X_MIN〜SPAWN_X_MAX) を算出
  const calculateXPercent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 25;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 25;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    return clampSpawnX(rawPct);
  }, []);

  // マウス/タッチ座標からフィールドの縦パーセント (12〜88%) を算出
  const calculateYPercent = useCallback((clientY: number): number => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.height <= 0) return 50;
    const rawPct = ((clientY - rect.top) / rect.height) * 100;
    return clampSpawnY(rawPct);
  }, []);

  const triggerRipple = (x: number, y: number) => {
    setRipplePos({ x, y });
    setTimeout(() => setRipplePos(null), 500);
  };

  const executePlay = useCallback(
    (rawX: number, rawY: number, cardIdx: number, card: DemoCard) => {
      const x = card.type === 'MONSTER'
        ? clampPlayerSpawnX(rawX)
        : clampSpawnX(rawX, 15, 85);
      const y = clampSpawnY(rawY);
      const validation = checkCanPlayCard(cardIdx, rawX, y);
      if (validation.canPlay) {
        if (playCardAt) {
          playCardAt(x, y, cardIdx);
        } else if (playCardAtX) {
          playCardAtX(x, cardIdx);
        }
        triggerRipple(x, y);
      }
    },
    [checkCanPlayCard, playCardAt, playCardAtX]
  );

  // ホバー追従 (X, Y)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningCamera) return;
    const x = calculateXPercent(e.clientX);
    const y = calculateYPercent(e.clientY);
    setHoverPos({ x, y });
  };

  const handlePointerLeave = () => {
    setHoverPos(null);
  };

  // フィールドクリック時の出撃
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isPanningCamera || didPanDuringPressRef.current) {
      didPanDuringPressRef.current = false;
      return;
    }
    if (selectedCardIndex === null || !selectedCard) return;
    const x = calculateXPercent(e.clientX);
    const y = calculateYPercent(e.clientY);
    executePlay(x, y, selectedCardIndex, selectedCard);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const x = calculateXPercent(e.clientX);
    const y = calculateYPercent(e.clientY);
    setHoverPos({ x, y });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setHoverPos(null);
    }
  };

  // ドロップ時の出撃
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const cardIdx = data !== '' ? parseInt(data, 10) : draggedCardIndex;
    if (cardIdx !== null && cardIdx !== undefined && !isNaN(cardIdx)) {
      const card = isDragging ? activeDraggedCard : selectedCard;
      if (card) {
        const x = calculateXPercent(e.clientX);
        const y = calculateYPercent(e.clientY);
        executePlay(x, y, cardIdx, card);
      }
    }
    setHoverPos(null);
    if (handleDragEnd) {
      handleDragEnd();
    }
  };

  const activeCard = isDragging ? activeDraggedCard : selectedCard;
  const activeCardIdx = isDragging ? draggedCardIndex : selectedCardIndex;
  const hoverX = hoverPos?.x ?? null;
  const hoverY = hoverPos?.y ?? null;
  const rawTargetX = hoverX ?? (activeCard?.type === 'SPELL' ? 50 : PLAYER_DEFAULT_SPAWN_X);
  const rawTargetY = hoverY ?? 50;

  const currentTargetX = activeCard?.type === 'MONSTER'
    ? (hoverX !== null ? clampPlayerSpawnX(hoverX) : PLAYER_DEFAULT_SPAWN_X)
    : clampSpawnX(rawTargetX, 15, 85);
  const currentTargetY = clampSpawnY(rawTargetY);

  const depthRole = getSpawnDepthRole(currentTargetX);
  const targetAmbushObstacle =
    activeCard?.type === 'MONSTER'
      ? findPlayerAmbushObstacle(currentTargetX, currentTargetY, obstacles)
      : null;

  const validation = activeCard && activeCardIdx !== null
    ? checkCanPlayCard(activeCardIdx, rawTargetX, currentTargetY)
    : { canPlay: true };
  const canAfford = activeCard ? playerMana >= activeCard.manaCost : false;
  const isTargetBlocked = !validation.canPlay;
  const isSpaceBlocked = isTargetBlocked && validation.reason === '出撃スペース不足';

  // いずれかの遮蔽物の死角に未発見の敵隠密ユニットまたは召喚予兆が潜んでいるか集計
  const hasAnyHiddenEnemy = obstacles.some((obs) => {
    const hiddenUnit = units.some(
      (u) =>
        u.owner === 'cpu' &&
        !u.isSpotted &&
        isStealthCapableCard(u.cardNo) &&
        isPointOccludedByObstacle(u.x, u.y, obs, camera)
    );
    const hiddenWarning = cpuSpawnWarnings.some(
      (w) =>
        isStealthCapableCard(w.card.cardNo) &&
        isPointOccludedByObstacle(w.x ?? 95, w.y ?? 50, obs, camera)
    );
    return hiddenUnit || hiddenWarning;
  });

  const isCameraMoved = Math.abs(camera.panX) > 2 || Math.abs(camera.panY) > 2 || Math.abs(camera.zoom - 1) > 0.02;

  // カメラの平行移動に伴う少しの角度変化（覗き込みチルト）
  const effectiveTiltX = camera.is3DMode ? camera.tiltDeg - camera.panY * 0.035 : 0;
  const effectiveTiltY = camera.is3DMode ? camera.panX * 0.04 : 0;

  return (
    <div
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        // 右ドラッグでもカメラ移動できるようにコンテキストメニューを抑止
        e.preventDefault();
      }}
      style={{
        flex: 1,
        minHeight: '340px',
        position: 'relative',
        margin: '6px 0',
        borderRadius: '12px',
        border: '1px solid #334155',
        backgroundColor: '#050811',
        backgroundImage:
          'radial-gradient(circle at 50% 40%, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 1) 100%)',
        overflow: 'hidden',
        userSelect: 'none',
        perspective: camera.is3DMode ? '1100px' : undefined,
        cursor: isPanningCamera
          ? 'grabbing'
          : activeCard
          ? validation.canPlay
            ? 'crosshair'
            : 'not-allowed'
          : 'grab',
      }}
    >
      {/* 3D箱庭カメラ操作HUDバー（上部中央オーバーレイ） */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '6px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          border: hasAnyHiddenEnemy
            ? '1px solid rgba(250, 204, 21, 0.85)'
            : '1px solid rgba(71, 85, 105, 0.75)',
          borderRadius: '999px',
          padding: '3px 10px',
          boxShadow: hasAnyHiddenEnemy
            ? '0 4px 14px rgba(250, 204, 21, 0.35)'
            : '0 4px 12px rgba(0, 0, 0, 0.65)',
          fontSize: '10px',
          color: '#e2e8f0',
          whiteSpace: 'nowrap',
        }}
      >
        <button
          type="button"
          onClick={handleToggle3DMode}
          style={{
            backgroundColor: camera.is3DMode ? '#0284c7' : '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          title="3D箱庭パースペクティブ表示のON/OFF"
        >
          {camera.is3DMode ? '🧊 3D箱庭ON' : '🗺️ 2D平面'}
        </button>

        <span style={{ color: '#94a3b8', fontSize: '9.5px' }}>
          🖱️中ボタンドラッグ(または右ドラッグ): <b>平行移動・死角覗き込み</b>
        </span>

        {/* トラックパッド環境等でもワンクリックで死角を覗き込めるクイック覗き込みボタン */}
        <button
          type="button"
          onClick={() =>
            updateCamera((prev) => ({
              ...prev,
              panX: prev.panX === -95 ? 95 : -95,
              panY: prev.panY === -55 ? 55 : -55,
            }))
          }
          style={{
            backgroundColor: hasAnyHiddenEnemy ? '#ca8a04' : '#1e293b',
            color: '#fefce8',
            border: '1px solid rgba(250, 204, 21, 0.6)',
            borderRadius: '999px',
            padding: '2px 7px',
            fontSize: '9.5px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          title="カメラ角度をずらして遮蔽物の死角を覗き込む"
        >
          👁️ 死角を覗く
        </button>

        {isCameraMoved && (
          <button
            type="button"
            onClick={handleResetCamera}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #64748b',
              borderRadius: '999px',
              padding: '2px 7px',
              fontSize: '9.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            title="カメラ位置・ズームを初期位置へ戻す"
          >
            🎯 視点リセット ({camera.panX},{camera.panY} / {Math.round(camera.zoom * 100)}%)
          </button>
        )}

        {spottedCount > 0 && (
          <span
            style={{
              backgroundColor: 'rgba(202, 138, 4, 0.25)',
              border: '1px solid #facc15',
              color: '#fde047',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '9.5px',
              fontWeight: 'bold',
            }}
          >
            👁️ 看破: {spottedCount}
          </span>
        )}
      </div>

      {/* 3D箱庭ボード本体（perspective内で平行移動・ズーム・チルトが適用される盤面） */}
      <div
        ref={containerRef}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'absolute',
          inset: camera.is3DMode ? '14px 18px 18px 18px' : '0',
          borderRadius: '10px',
          border: '2px solid #475569',
          backgroundColor: '#0a0f1d',
          backgroundImage: `
            radial-gradient(ellipse at 25% 50%, rgba(30, 58, 138, 0.18) 0%, transparent 60%),
            radial-gradient(ellipse at 75% 50%, rgba(153, 27, 27, 0.16) 0%, transparent 60%),
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 24px 24px, 24px 24px',
          transform: `translate3d(${camera.panX}px, ${camera.panY}px, 0px) scale(${camera.zoom}) rotateX(${effectiveTiltX.toFixed(2)}deg) rotateY(${effectiveTiltY.toFixed(2)}deg)`,
          transformStyle: 'preserve-3d',
          transition: isPanningCamera ? 'none' : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: camera.is3DMode
            ? activeCard
              ? '0 14px 0 #1e293b, 0 22px 36px rgba(0, 0, 0, 0.85), inset 0 0 24px rgba(59, 130, 246, 0.25)'
              : '0 14px 0 #1e293b, 0 22px 36px rgba(0, 0, 0, 0.85), inset 0 0 14px rgba(0, 0, 0, 0.6)'
            : activeCard
            ? 'inset 0 0 24px rgba(59, 130, 246, 0.25), 0 0 16px rgba(15, 23, 42, 0.9)'
            : 'inset 0 0 14px rgba(0, 0, 0, 0.6)',
        }}
        data-field="battle-arena"
      >
      {/* 互換用レーンスロット（旧テスト・セレクタ対応） */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
        const slotX = 10 + idx * 10;
        return (
          <div
            key={`compat_lane_${idx}`}
            data-lane-index={idx}
            style={{
              position: 'absolute',
              left: `${slotX - 5}%`,
              width: '10%',
              top: 0,
              bottom: 0,
              opacity: 0,
            }}
          />
        );
      })}

      {/* 1. フィールド背景ガイドライン (左右対戦形式) */}
      {/* 自軍ベースライン (左端 x=5%) */}
      <div
        style={{
          position: 'absolute',
          left: '5%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(59, 130, 246, 0.35)',
          borderRight: '1px dashed rgba(59, 130, 246, 0.55)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '6px',
            padding: '2px 7px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 'bold' }}>🛡️ 自軍</span>
          {playerHp !== undefined && (
            <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>❤️{playerHp}</span>
          )}
          <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold' }}>⚡{playerMana.toFixed(1)}</span>
        </div>
      </div>

      {/* 中央境界ライン (x=50%) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(148, 163, 184, 0.2)',
          borderRight: '1px dashed rgba(148, 163, 184, 0.35)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            fontSize: '9px',
            color: 'rgba(148, 163, 184, 0.45)',
            letterSpacing: '2px',
            fontWeight: 'bold',
          }}
        >
          MIDLINE
        </span>
      </div>

      {/* 敵陣ベースライン (右端 x=95%) */}
      <div
        style={{
          position: 'absolute',
          left: '95%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(239, 68, 68, 0.35)',
          borderLeft: '1px dashed rgba(239, 68, 68, 0.55)',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '6px',
            padding: '2px 7px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}
        >
          {cpuMana !== undefined && (
            <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 'bold' }}>⚡{cpuMana.toFixed(1)}</span>
          )}
          {cpuHp !== undefined && (
            <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 'bold' }}>❤️{cpuHp}</span>
          )}
          <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 'bold' }}>🤖 敵軍</span>
        </div>
      </div>

      {/* 3本の水平レーン進軍ガイドライン（TOP=20%, MID=50%, BOT=80%） */}
      {[
        { key: 'TOP LANE', y: 20 },
        { key: 'MID LANE', y: 50 },
        { key: 'BOT LANE', y: 80 },
      ].map((lane) => (
        <div
          key={lane.key}
          style={{
            position: 'absolute',
            top: `${lane.y}%`,
            left: 0,
            right: 0,
            height: '1px',
            borderTop: '1px dashed rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '8px',
              top: '-11px',
              fontSize: '8px',
              color: 'rgba(148, 163, 184, 0.35)',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
            }}
          >
            {lane.key}
          </span>
        </div>
      ))}

      {/* 2. インヒビター（6基: 左3基・右3基） */}
      {inhibitors.map((inhib) => (
        <RenderInhibitor key={inhib.id} inhibitor={inhib} />
      ))}

      {/* 2.5. 立体遮蔽物の地面ベース層（幹・岩の根元・奇襲エリアサークル） */}
      {obstacles.map((obs) => (
        <RenderObstacleGround
          key={`ground_${obs.id}`}
          obstacle={obs}
          isHighlightedForAmbush={
            Boolean(activeCard && activeCard.type === 'MONSTER' && obs.side !== 'cpu')
          }
        />
      ))}

      {/* 3. CPU召喚予兆（詠唱魔方陣・右端x=95%付近に表示。死角の小型ユニット予兆は覗き込むまで隠れる） */}
      {cpuSpawnWarnings.map((w) => {
        const wx = w.x ?? 95;
        const wy = w.y ?? 50;
        const isWarningConcealed =
          isStealthCapableCard(w.card.cardNo) &&
          obstacles.some((obs) => isPointOccludedByObstacle(wx, wy, obs, camera));

        return (
          <div
            key={w.id}
            style={{
              ...styles.cpuSpawnCircle,
              left: `${wx}%`,
              top: `${wy}%`,
              transform: 'translate(-50%, -50%)',
              opacity: isWarningConcealed ? 0.1 : 1,
              filter: isWarningConcealed ? 'blur(2px)' : undefined,
              transition: 'opacity 0.18s ease-out',
            }}
            className="cpu-spawn-pulse"
            title={isWarningConcealed ? '遮蔽物の死角に隠れた召喚予兆' : `相手の召喚予告: ${w.card.name}`}
          >
            <div style={styles.cpuSpawnRing} />
            <span style={styles.cpuSpawnIcon}>{w.card.icon}</span>
            <div style={styles.cpuSpawnBadge}>召喚予兆</div>
          </div>
        );
      })}

      {/* 4. フィールド上のユニット描画 & 射程範囲可視化 */}
      {units.map((unit) => {
        const stealthEval = evaluateUnitStealthAndSpot(unit, camera, obstacles);
        const isUnitConcealed = stealthEval.isConcealed;

        const isFireTargeted =
          activeCard?.id === 'fire_spell' &&
          unit.owner === 'cpu' &&
          isWithinFireSpellColumn(unit.x, currentTargetX);
        const isMeteorTargeted =
          activeCard?.id === 'meteor' &&
          unit.owner === 'cpu' &&
          isWithinMeteorRange(unit.x, unit.y, currentTargetX, currentTargetY);

        const isPlayer = unit.owner === 'player';
        const isShieldUnit = unit.attack === 0;
        const isCircularUnit = Boolean(unit.isCircularRange || unit.cardNo === 8);
        const rangeZone = showUnitRange && !isUnitConcealed && !isCircularUnit
          ? computeUnitRangeZone(unit.x, unit.y, unit.range, unit.owner)
          : null;
        const hitZone =
          rangeZone && unit.hitRange !== undefined && unit.hitRange < unit.range
            ? computeUnitRangeZone(unit.x, unit.y, unit.hitRange, unit.owner)
            : null;

        // 陣営・役割ごとの射程カラー
        const rangeAccentColor = isShieldUnit
          ? '#10b981'
          : isPlayer
          ? '#38bdf8'
          : '#f43f5e';
        const rangeFillGradient = isShieldUnit
          ? isPlayer
            ? 'linear-gradient(to right, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.18))'
            : 'linear-gradient(to left, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.18))'
          : isPlayer
          ? 'linear-gradient(to right, rgba(56, 189, 248, 0.05), rgba(56, 189, 248, 0.22))'
          : 'linear-gradient(to left, rgba(244, 63, 94, 0.05), rgba(244, 63, 94, 0.22))';
        const rangeBorderSubtle = isShieldUnit
          ? 'rgba(16, 185, 129, 0.4)'
          : isPlayer
          ? 'rgba(56, 189, 248, 0.45)'
          : 'rgba(244, 63, 94, 0.45)';

        return (
          <React.Fragment key={unit.id}>
            {/* 円形全方位探知ユニット（忍者など）の射程サークル */}
            {showUnitRange && !isUnitConcealed && isCircularUnit && (
              <div
                data-unit-range-id={unit.id}
                data-unit-range={unit.range}
                data-unit-owner={unit.owner}
                style={{
                  position: 'absolute',
                  top: `${unit.y}%`,
                  left: `${unit.x}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${unit.range * 2}%`,
                  height: `${unit.range * 2}%`,
                  borderRadius: '50%',
                  background: isPlayer
                    ? 'radial-gradient(circle, rgba(0, 240, 255, 0.05) 0%, rgba(0, 240, 255, 0.22) 100%)'
                    : 'radial-gradient(circle, rgba(244, 63, 94, 0.05) 0%, rgba(244, 63, 94, 0.22) 100%)',
                  border: isPlayer ? '2px dashed #00f0ff' : '2px dashed #f43f5e',
                  boxShadow: isPlayer
                    ? '0 0 16px rgba(0, 240, 255, 0.4), inset 0 0 12px rgba(0, 240, 255, 0.2)'
                    : '0 0 16px rgba(244, 63, 94, 0.4), inset 0 0 12px rgba(244, 63, 94, 0.2)',
                  pointerEvents: 'none',
                  zIndex: 6,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '12px',
                    fontSize: '8.5px',
                    fontWeight: 'bold',
                    color: '#f8fafc',
                    backgroundColor: isPlayer ? 'rgba(12, 74, 110, 0.92)' : 'rgba(136, 19, 55, 0.92)',
                    border: isPlayer ? '1px solid #00f0ff' : '1px solid #f43f5e',
                    borderRadius: '3px',
                    padding: '0 4px',
                    lineHeight: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🎯円形探知 {unit.range}%
                </span>
              </div>
            )}

            {/* 各ユニットの射程範囲 (X軸: 前方unit.range%, Y軸: 交戦幅±ENGAGE_HALF_WIDTH_Y%) */}
            {rangeZone && rangeZone.width > 0 && (
              <div
                data-unit-range-id={unit.id}
                data-unit-range={unit.range}
                data-unit-owner={unit.owner}
                style={{
                  position: 'absolute',
                  left: `${rangeZone.left}%`,
                  top: `${rangeZone.top}%`,
                  width: `${rangeZone.width}%`,
                  height: `${rangeZone.height}%`,
                  background: rangeFillGradient,
                  borderTop: `1px dashed ${rangeBorderSubtle}`,
                  borderBottom: `1px dashed ${rangeBorderSubtle}`,
                  borderRight: isPlayer ? `2px solid ${rangeAccentColor}` : 'none',
                  borderLeft: !isPlayer ? `2px solid ${rangeAccentColor}` : 'none',
                  borderRadius: isPlayer ? '0 6px 6px 0' : '6px 0 0 6px',
                  boxShadow: isPlayer
                    ? `inset -6px 0 12px -6px ${rangeAccentColor}`
                    : `inset 6px 0 12px -6px ${rangeAccentColor}`,
                  pointerEvents: 'none',
                  zIndex: 6,
                }}
              >
                {/* 中心軸の射程レーザーガイドライン */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    height: '1px',
                    borderTop: `1px dotted ${rangeAccentColor}`,
                    opacity: 0.75,
                  }}
                />
                {/* 先端の射程距離バッジ */}
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: isPlayer ? '3px' : undefined,
                    left: !isPlayer ? '3px' : undefined,
                    fontSize: '8.5px',
                    fontWeight: 'bold',
                    color: '#f8fafc',
                    backgroundColor: isShieldUnit
                      ? 'rgba(6, 95, 70, 0.88)'
                      : isPlayer
                      ? 'rgba(12, 74, 110, 0.88)'
                      : 'rgba(136, 19, 55, 0.88)',
                    border: `1px solid ${rangeAccentColor}`,
                    borderRadius: '3px',
                    padding: '0px 4px',
                    lineHeight: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isShieldUnit
                    ? `🛡️${unit.range}%`
                    : hitZone
                    ? `👁探知${unit.range}%`
                    : `🎯${unit.range}%`}
                </span>
              </div>
            )}
            {/* 実ヒット距離(hitRange)が探知距離より短いユニットは、内側に命中範囲を重ねて表示 */}
            {hitZone && hitZone.width > 0 && (
              <div
                data-unit-hit-range-id={unit.id}
                data-unit-hit-range={unit.hitRange}
                style={{
                  position: 'absolute',
                  left: `${hitZone.left}%`,
                  top: `${hitZone.top}%`,
                  width: `${hitZone.width}%`,
                  height: `${hitZone.height}%`,
                  background: isPlayer
                    ? 'linear-gradient(to right, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.38))'
                    : 'linear-gradient(to left, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.38))',
                  borderRight: isPlayer ? '2px solid #f97316' : 'none',
                  borderLeft: !isPlayer ? '2px solid #f97316' : 'none',
                  borderRadius: isPlayer ? '0 6px 6px 0' : '6px 0 0 6px',
                  pointerEvents: 'none',
                  zIndex: 7,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: isPlayer ? '3px' : undefined,
                    left: !isPlayer ? '3px' : undefined,
                    fontSize: '8.5px',
                    fontWeight: 'bold',
                    color: '#fff7ed',
                    backgroundColor: 'rgba(124, 45, 18, 0.92)',
                    border: '1px solid #f97316',
                    borderRadius: '3px',
                    padding: '0px 4px',
                    lineHeight: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🔥命中{unit.hitRange}%
                </span>
              </div>
            )}

            <RenderUnit
              unit={unit}
              isConcealed={isUnitConcealed}
              onToggleHold={
                selectedCardIndex === null && !isDragging ? toggleUnitHold : undefined
              }
              isBlockingSpawn={
                isSpaceBlocked &&
                unit.owner === 'player' &&
                isWithinCollisionY(unit.y, currentTargetY) &&
                Math.abs(unit.x - currentTargetX) < SPAWN_MIN_SPACE
              }
            />
            {/* 烈火の呪文: 縦一列ターゲットロックオン表示 */}
            {isFireTargeted && (
              <div
                style={{
                  position: 'absolute',
                  left: `${unit.x}%`,
                  top: `${unit.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  border: '2px solid #ef4444',
                  boxShadow: '0 0 14px #f97316, inset 0 0 8px #ef4444',
                  pointerEvents: 'none',
                  zIndex: 26,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  🔥 範囲内
                </span>
              </div>
            )}
            {/* 隕石: 範囲内ターゲット表示 */}
            {isMeteorTargeted && (
              <div
                style={{
                  position: 'absolute',
                  left: `${unit.x}%`,
                  top: `${unit.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '2px solid #f97316',
                  boxShadow: '0 0 10px #f97316',
                  pointerEvents: 'none',
                  zIndex: 26,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ☄️ 範囲内
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* 4.5. 立体遮蔽物の「上空キャノピー（樹冠・岩の天蓋）」レイヤー（カメラ移動で視差シフトし、裏側を覗き込める！） */}
      {obstacles.map((obs) => {
        const hasHiddenUnit = units.some(
          (u) =>
            u.owner === 'cpu' &&
            !u.isSpotted &&
            isStealthCapableCard(u.cardNo) &&
            isPointOccludedByObstacle(u.x, u.y, obs, camera)
        );
        const hasHiddenWarning = cpuSpawnWarnings.some(
          (w) =>
            isStealthCapableCard(w.card.cardNo) &&
            isPointOccludedByObstacle(w.x ?? 95, w.y ?? 50, obs, camera)
        );
        const peekProgress = computePeekRevealProgress(obs.x, obs.y, obs, camera);
        return (
          <RenderObstacleCanopy
            key={`canopy_${obs.id}`}
            obstacle={obs}
            camera={camera}
            hasHiddenEnemy={hasHiddenUnit || hasHiddenWarning}
            peekProgress={peekProgress}
          />
        );
      })}

      {/* 5. スペル演出 */}
      {spellEffects.map((spell) => {
        if (spell.type === 'meteor') {
          return (
            <div
              key={spell.id}
              style={{
                position: 'absolute',
                top: `${spell.y}%`,
                left: `${spell.x}%`,
                transform: 'translate(-50%, -50%)',
                width: `${SPELL_RADIUS * 2}%`,
                height: `${SPELL_RADIUS * 2}%`,
                pointerEvents: 'none',
                zIndex: 30,
              }}
            >
              {/* 予告円 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(239, 68, 68, 0.3)',
                  border: '2px solid rgba(239, 68, 68, 0.8)',
                  borderRadius: '50%',
                  animation: 'meteor-indicator-anim 1s ease-out forwards',
                }}
              />
              {/* 降ってくる隕石 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '34px',
                  animation: 'meteor-falling-anim 1s ease-in forwards',
                  zIndex: 31,
                }}
              >
                ☄️
              </div>
              {/* 爆発 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '42px',
                  animation: 'meteor-explosion-anim 1s ease-out forwards',
                  zIndex: 32,
                }}
              >
                💥
              </div>
            </div>
          );
        }

        // 烈火の呪文: ドロップ地点起点で上下に火柱が順番に吹き上がる演出
        if (spell.type === 'burn') {
          const originY = spell.originY ?? spell.y ?? 50;
          const pillars = generateFirePillars(originY);
          const upDurationSec = (originY / FIRE_SPELL_SPREAD_SPEED_Y).toFixed(2);
          const downDurationSec = ((100 - originY) / FIRE_SPELL_SPREAD_SPEED_Y).toFixed(2);

          return (
            <div
              key={spell.id}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${spell.x}%`,
                width: `${FIRE_SPELL_HALF_WIDTH_X * 2}%`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 35,
              }}
            >
              {/* 1. 起点から上方向への地割れマグマライン */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: `${100 - originY}%`,
                  left: '50%',
                  width: '6px',
                  transform: 'translateX(-50%)',
                  transformOrigin: 'bottom',
                  background: 'linear-gradient(to top, rgba(254, 240, 138, 0.95), rgba(249, 115, 22, 0.9), rgba(239, 68, 68, 0.5))',
                  boxShadow: '0 0 16px #f97316, 0 0 28px #ef4444',
                  animation: `fire-fissure-expand-up ${upDurationSec}s ease-out forwards`,
                  pointerEvents: 'none',
                  zIndex: 34,
                }}
              />

              {/* 2. 起点から下方向への地割れマグマライン */}
              <div
                style={{
                  position: 'absolute',
                  top: `${originY}%`,
                  bottom: 0,
                  left: '50%',
                  width: '6px',
                  transform: 'translateX(-50%)',
                  transformOrigin: 'top',
                  background: 'linear-gradient(to bottom, rgba(254, 240, 138, 0.95), rgba(249, 115, 22, 0.9), rgba(239, 68, 68, 0.5))',
                  boxShadow: '0 0 16px #f97316, 0 0 28px #ef4444',
                  animation: `fire-fissure-expand-down ${downDurationSec}s ease-out forwards`,
                  pointerEvents: 'none',
                  zIndex: 34,
                }}
              />

              {/* 3. 起点から上下へ順番に吹き上がる炎の柱たち */}
              {pillars.map((p) => {
                const heightPercent = p.isOrigin ? 18 : 15;
                return (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      top: `${p.y}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      height: `${heightPercent}%`,
                      pointerEvents: 'none',
                      zIndex: p.isOrigin ? 40 : 36,
                    }}
                  >
                    {/* 地面のマグマ噴出孔光輪 */}
                    <div
                      className="fire-ground-vent"
                      style={{
                        animation: 'fire-ground-vent-pulse 0.95s ease-out forwards',
                        animationDelay: `${p.delayMs}ms`,
                      }}
                    />

                    {/* 吹き上がる火柱本体 */}
                    <div
                      className="fire-pillar-body"
                      style={{
                        animation: 'fire-pillar-erupt 0.85s cubic-bezier(0.12, 0.9, 0.25, 1) forwards',
                        animationDelay: `${p.delayMs}ms`,
                        transform: p.isOrigin ? 'translate(-50%, -50%) scale(1.15)' : undefined,
                      }}
                    >
                      {/* 高温の白熱芯 */}
                      <div className="fire-pillar-inner-core" />
                      {/* 火柱頂点/内部の炎 */}
                      <div
                        style={{
                          fontSize: p.isOrigin ? '28px' : '22px',
                          filter: 'drop-shadow(0 0 12px #f97316)',
                          zIndex: 2,
                        }}
                      >
                        🔥
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 4. 起点(originY)の着弾テキスト・バースト */}
              <div
                style={{
                  position: 'absolute',
                  top: `${originY}%`,
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'fire-origin-burst 1.2s ease-out forwards',
                  zIndex: 42,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '38px', filter: 'drop-shadow(0 0 20px #f97316)' }}>💥🔥</div>
                <div
                  style={{
                    backgroundColor: 'rgba(185, 28, 28, 0.95)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    border: '1px solid #fca5a5',
                    boxShadow: '0 0 18px #ef4444',
                    whiteSpace: 'nowrap',
                    marginTop: '-4px',
                  }}
                >
                  🔥 業火噴出!! 💥
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={spell.id}
            style={{
              ...styles.spellBlast,
              left: `${spell.x}%`,
              top: `${spell.y}%`,
              transform: 'translate(-50%, -50%)',
              ...(spell.type === 'haste' ? styles.spellHaste : {}),
              ...(spell.type === 'heal' ? styles.spellHeal : {}),
              animation: spell.type === 'haste'
                ? 'haste-spell-anim 0.6s ease-out forwards'
                : spell.type === 'heal'
                ? 'heal-spell-anim 1s ease-out forwards'
                : undefined,
              pointerEvents: 'none',
              zIndex: 35,
            }}
          >
            {spell.type === 'haste'
              ? '💨 疾風!!'
              : '🌧️ 癒やし!!'}
          </div>
        );
      })}

      {/* 6. 攻撃エフェクト（弾道・斬撃・着弾・ダメージポップアップ） */}
      {attackEffects.map((effect) => (
        <RenderAttackEffect key={effect.id} effect={effect} />
      ))}

      {/* 7. 出撃波紋エフェクト */}
      {ripplePos !== null && (
        <div
          style={{
            position: 'absolute',
            top: `${ripplePos.y}%`,
            left: `${ripplePos.x}%`,
            transform: 'translate(-50%, -50%)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px solid #38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.25)',
            pointerEvents: 'none',
            zIndex: 25,
            animation: 'shockwavePing 0.5s ease-out forwards',
          }}
        />
      )}

      {/* 8. 自陣出撃ゾーン（左半面: 後衛〜前衛の奥行き領域可視化） */}
      {activeCard && activeCard.type === 'MONSTER' && (
        <div
          style={{
            position: 'absolute',
            left: `${PLAYER_SPAWN_X_MIN}%`,
            width: `${PLAYER_SPAWN_X_MAX - PLAYER_SPAWN_X_MIN}%`,
            top: '8%',
            bottom: '8%',
            backgroundColor: 'rgba(30, 58, 138, 0.08)',
            border: '1px dashed rgba(59, 130, 246, 0.45)',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 12,
            overflow: 'hidden',
          }}
        >
          {/* 後衛・中衛境界線 (x=18%) */}
          <div
            style={{
              position: 'absolute',
              left: `${((18 - PLAYER_SPAWN_X_MIN) / (PLAYER_SPAWN_X_MAX - PLAYER_SPAWN_X_MIN)) * 100}%`,
              top: 0,
              bottom: 0,
              borderLeft: '1px dotted rgba(59, 130, 246, 0.3)',
            }}
          />
          {/* 中衛・前衛境界線 (x=33%) */}
          <div
            style={{
              position: 'absolute',
              left: `${((33 - PLAYER_SPAWN_X_MIN) / (PLAYER_SPAWN_X_MAX - PLAYER_SPAWN_X_MIN)) * 100}%`,
              top: 0,
              bottom: 0,
              borderLeft: '1px dotted rgba(59, 130, 246, 0.3)',
            }}
          />

          {/* ゾーンラベル表示 */}
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              fontSize: '8.5px',
              color: 'rgba(147, 197, 253, 0.8)',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            🏹 後衛 (REAR)
          </div>
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: `${((25 - PLAYER_SPAWN_X_MIN) / (PLAYER_SPAWN_X_MAX - PLAYER_SPAWN_X_MIN)) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: '8.5px',
              color: 'rgba(147, 197, 253, 0.8)',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            🛡️ 中衛 (MID)
          </div>
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              fontSize: '8.5px',
              color: 'rgba(147, 197, 253, 0.8)',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            ⚔️ 前衛 (VANGUARD)
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '8px',
              fontSize: '8px',
              color: 'rgba(147, 197, 253, 0.55)',
              fontWeight: 'bold',
            }}
          >
            DEPLOY ZONE (自陣・クリック/ドロップで出撃)
          </div>
        </div>
      )}

      {/* 9. 照準カーソル / 出撃プレビュー（ホバー・ドラッグ追従：X/Y両軸クロスヘア） */}
      {hoverX !== null && hoverY !== null && activeCard && (
        <>
          {/* 烈火の呪文: 縦一列プレビュー帯（ドロップ起点から上下へ火柱が順次吹き上がる） */}
          {activeCard.id === 'fire_spell' && (() => {
            const previewPillars = generateFirePillars(currentTargetY);
            return (
              <>
                {/* 縦一列の延焼予測エリア */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${currentTargetX}%`,
                    width: `${FIRE_SPELL_HALF_WIDTH_X * 2}%`,
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(to right, rgba(239,68,68,0.18), rgba(249,115,22,0.38), rgba(239,68,68,0.18))',
                    borderLeft: '2px dashed #f97316',
                    borderRight: '2px dashed #f97316',
                    pointerEvents: 'none',
                    zIndex: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    animation: 'fire-column-pulse 1.2s infinite ease-in-out',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'rgba(234, 88, 12, 0.95)',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid #fed7aa',
                      boxShadow: '0 0 10px rgba(249,115,22,0.8)',
                      whiteSpace: 'nowrap',
                      animation: 'fire-preview-arrow-up 0.9s infinite ease-in-out',
                    }}
                  >
                    🔥 上方へ火柱が順次噴出 ⬆️
                  </div>

                  {/* 火柱が吹き上がる予想ポイントのガイド */}
                  {previewPillars.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        position: 'absolute',
                        top: `${p.y}%`,
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: p.isOrigin ? '18px' : '14px',
                        opacity: 0.65,
                        animation: 'fire-preview-dot-pulse 1.0s infinite ease-in-out',
                        animationDelay: `${p.delayMs}ms`,
                        pointerEvents: 'none',
                      }}
                    >
                      {p.isOrigin ? '🎯' : '🔥'}
                    </div>
                  ))}

                  <div
                    style={{
                      backgroundColor: 'rgba(234, 88, 12, 0.95)',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid #fed7aa',
                      boxShadow: '0 0 10px rgba(249,115,22,0.8)',
                      whiteSpace: 'nowrap',
                      animation: 'fire-preview-arrow-down 0.9s infinite ease-in-out',
                    }}
                  >
                    🔥 下方へ火柱が順次噴出 ⬇️
                  </div>
                </div>

                {/* ドロップ起点マーカー (ここから上下に順次火柱噴出) */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${currentTargetX}%`,
                    top: `${currentTargetY}%`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #fef08a',
                      backgroundColor: 'rgba(249, 115, 22, 0.45)',
                      boxShadow: '0 0 18px #f97316, inset 0 0 10px #ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    🔥
                  </div>
                  <div
                    style={{
                      marginTop: '2px',
                      backgroundColor: 'rgba(185, 28, 28, 0.95)',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      border: '1px solid #fca5a5',
                      boxShadow: '0 0 10px rgba(239,68,68,0.8)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🎯 火柱噴出の起点 (上下へ順次3ダメージ)
                  </div>
                </div>
              </>
            );
          })()}

          {/* 隕石: 範囲円プレビュー */}
          {activeCard.id === 'meteor' && (
            <div
              style={{
                position: 'absolute',
                top: `${currentTargetY}%`,
                left: `${currentTargetX}%`,
                transform: 'translate(-50%, -50%)',
                width: `${SPELL_RADIUS * 2}%`,
                height: `${SPELL_RADIUS * 2}%`,
                borderRadius: '50%',
                border: '2px dashed #ea580c',
                backgroundColor: 'rgba(234, 88, 12, 0.15)',
                boxShadow: '0 0 16px rgba(234, 88, 12, 0.4)',
                pointerEvents: 'none',
                zIndex: 19,
              }}
            />
          )}

          {/* モンスター出撃プレビュー時の射程範囲表示 (showUnitRange有効時) */}
          {showUnitRange && activeCard.type === 'MONSTER' && (() => {
            const previewRange = activeCard.range ?? 8;
            const isCircular = Boolean(activeCard.isCircularRange || activeCard.cardNo === 8);
            const isShield = (activeCard.attack ?? 0) === 0;
            const previewColor = isTargetBlocked
              ? '#ef4444'
              : isCircular
              ? '#00f0ff'
              : isShield
              ? '#10b981'
              : '#38bdf8';

            if (isCircular) {
              return (
                <div
                  data-spawn-circular-preview={previewRange}
                  style={{
                    position: 'absolute',
                    top: `${currentTargetY}%`,
                    left: `${currentTargetX}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${previewRange * 2}%`,
                    height: `${previewRange * 2}%`,
                    borderRadius: '50%',
                    background: isTargetBlocked
                      ? 'radial-gradient(circle, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.28) 100%)'
                      : 'radial-gradient(circle, rgba(0, 240, 255, 0.06) 0%, rgba(0, 240, 255, 0.28) 100%)',
                    border: `2px dashed ${previewColor}`,
                    boxShadow: `0 0 16px ${previewColor}`,
                    pointerEvents: 'none',
                    zIndex: 19,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '12px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: `1px solid ${previewColor}`,
                      borderRadius: '3px',
                      padding: '0px 4px',
                      lineHeight: '13px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🎯円形探知 {previewRange}%
                  </span>
                </div>
              );
            }

            const previewZone = computeUnitRangeZone(currentTargetX, currentTargetY, previewRange, 'player');
            return (
              <>
              <div
                data-spawn-range-preview={previewRange}
                style={{
                  position: 'absolute',
                  left: `${previewZone.left}%`,
                  top: `${previewZone.top}%`,
                  width: `${previewZone.width}%`,
                  height: `${previewZone.height}%`,
                  background: isTargetBlocked
                    ? 'linear-gradient(to right, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.2))'
                    : isShield
                    ? 'linear-gradient(to right, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.24))'
                    : 'linear-gradient(to right, rgba(56, 189, 248, 0.08), rgba(56, 189, 248, 0.26))',
                  borderTop: `1.5px dashed ${previewColor}`,
                  borderBottom: `1.5px dashed ${previewColor}`,
                  borderRight: `2.5px solid ${previewColor}`,
                  borderRadius: '0 6px 6px 0',
                  pointerEvents: 'none',
                  zIndex: 19,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '4px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: `1px solid ${previewColor}`,
                    borderRadius: '3px',
                    padding: '0px 4px',
                    lineHeight: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isShield ? `🛡️射程 ${previewRange}%` : `🎯射程 ${previewRange}%`}
                </span>
              </div>
              {/* 実ヒット距離(hitRange)が探知距離より短いカードは、内側に命中範囲を重ねて表示 */}
              {activeCard.hitRange !== undefined && activeCard.hitRange < previewRange && (() => {
                const hitZone = computeUnitRangeZone(currentTargetX, currentTargetY, activeCard.hitRange, 'player');
                return (
                  <div
                    data-spawn-hit-range-preview={activeCard.hitRange}
                    style={{
                      position: 'absolute',
                      left: `${hitZone.left}%`,
                      top: `${hitZone.top}%`,
                      width: `${hitZone.width}%`,
                      height: `${hitZone.height}%`,
                      background: 'linear-gradient(to right, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.35))',
                      borderRight: '2.5px solid #f97316',
                      borderRadius: '0 6px 6px 0',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: '#fff7ed',
                        backgroundColor: 'rgba(124, 45, 18, 0.92)',
                        border: '1px solid #f97316',
                        borderRadius: '3px',
                        padding: '0px 4px',
                        lineHeight: '13px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🔥命中 {activeCard.hitRange}%
                    </span>
                  </div>
                );
              })()}
              </>
            );
          })()}

          {/* 垂直照準ライン (X座標 / 前後・奥行き) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${currentTargetX}%`,
              width: '1px',
              transform: 'translateX(-50%)',
              backgroundColor: isTargetBlocked
                ? 'rgba(239, 68, 68, 0.65)'
                : activeCard.id === 'fire_spell'
                ? 'rgba(249, 115, 22, 0.8)'
                : 'rgba(56, 189, 248, 0.65)',
              boxShadow: isTargetBlocked
                ? '0 0 8px rgba(239, 68, 68, 0.8)'
                : activeCard.id === 'fire_spell'
                ? '0 0 10px rgba(249, 115, 22, 0.9)'
                : '0 0 8px rgba(56, 189, 248, 0.8)',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />

          {/* 水平照準ライン (Y座標 / レーン) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${currentTargetY}%`,
              height: '1px',
              transform: 'translateY(-50%)',
              backgroundColor: isTargetBlocked
                ? 'rgba(239, 68, 68, 0.45)'
                : 'rgba(56, 189, 248, 0.45)',
              borderBottom: `1px dashed ${isTargetBlocked ? 'rgba(239, 68, 68, 0.8)' : 'rgba(56, 189, 248, 0.8)'}`,
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />

          {/* 出撃位置の照準ターゲットサークル (X, Y) */}
          <div
            style={{
              position: 'absolute',
              top: `${currentTargetY}%`,
              left: `${currentTargetX}%`,
              transform: 'translate(-50%, -50%)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: `2px solid ${isTargetBlocked ? '#ef4444' : '#38bdf8'}`,
              backgroundColor: isTargetBlocked
                ? 'rgba(239, 68, 68, 0.25)'
                : 'rgba(56, 189, 248, 0.25)',
              boxShadow: isTargetBlocked
                ? '0 0 16px rgba(239, 68, 68, 0.8)'
                : '0 0 16px rgba(56, 189, 248, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 22,
            }}
          >
            <span style={{ fontSize: '18px' }}>{activeCard.icon}</span>
          </div>

          {/* ガイドバッジ（出撃可能 / 理由表示 ＆ 奥行きロール [前衛/中衛/後衛] / 奇襲出撃ボーナス） */}
          <div
            style={{
              position: 'absolute',
              top: currentTargetY > 70 ? `${currentTargetY - 8}%` : `${currentTargetY + 8}%`,
              left: `${currentTargetX}%`,
              transform: 'translateX(-50%)',
              backgroundColor: isTargetBlocked
                ? isSpaceBlocked
                  ? '#ea580c'
                  : '#ef4444'
                : activeCard.type === 'SPELL'
                ? '#8b5cf6'
                : targetAmbushObstacle
                ? '#15803d'
                : '#2563eb',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
              pointerEvents: 'none',
              zIndex: 25,
              whiteSpace: 'nowrap',
            }}
          >
            {isTargetBlocked
              ? `🚫 ${validation.reason}`
              : isDragging
              ? activeCard.id === 'fire_spell'
                ? '🔥 ドロップで縦一列業火！'
                : activeCard.id === 'meteor'
                ? '☄️ ドロップで範囲隕石！'
                : activeCard.type === 'SPELL'
                ? '✨ ドロップ発動'
                : targetAmbushObstacle
                ? `🌲 奇襲ドロップ出撃 (${targetAmbushObstacle.name}: 攻撃力+1)`
                : `🎯 ドロップ出撃 [${depthRole.label}]`
              : activeCard.id === 'fire_spell'
              ? '🔥 クリックで縦一列業火！'
              : activeCard.id === 'meteor'
              ? '☄️ クリックで範囲隕石！'
              : activeCard.type === 'SPELL'
              ? '✨ クリック発動'
              : targetAmbushObstacle
              ? `🌲 奇襲クリック出撃 (${targetAmbushObstacle.name}: 攻撃力+1)`
              : `🎯 クリック出撃 [${depthRole.label}]`}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
