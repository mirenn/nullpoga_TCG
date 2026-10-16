import React from 'react';
import {
  FieldObstacle,
  Camera3DState,
  computeCanopyProjection,
} from '../../app/obstacles';

interface RenderObstacleGroundProps {
  obstacle: FieldObstacle;
  isHighlightedForAmbush?: boolean;
}

/**
 * 遮蔽物の地面ベース層（幹・岩の根元・奇襲エリアサークル）
 * ユニットより下（zIndex: 5）に描画される
 */
export function RenderObstacleGround({
  obstacle,
  isHighlightedForAmbush = false,
}: RenderObstacleGroundProps) {
  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';

  const borderColor = isHighlightedForAmbush
    ? 'rgba(74, 222, 128, 0.9)'
    : isForest
    ? 'rgba(34, 197, 94, 0.38)'
    : isRock
    ? 'rgba(148, 163, 184, 0.38)'
    : 'rgba(56, 189, 248, 0.38)';

  const groundBg = isForest
    ? 'radial-gradient(ellipse at center, rgba(20, 83, 45, 0.55) 0%, rgba(6, 78, 59, 0.25) 65%, transparent 100%)'
    : isRock
    ? 'radial-gradient(ellipse at center, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.28) 65%, transparent 100%)'
    : 'radial-gradient(ellipse at center, rgba(14, 116, 144, 0.55) 0%, rgba(15, 23, 42, 0.25) 65%, transparent 100%)';

  return (
    <div
      data-obstacle-ground-id={obstacle.id}
      style={{
        position: 'absolute',
        left: `${obstacle.x}%`,
        top: `${obstacle.y}%`,
        width: `${obstacle.radiusX * 2}%`,
        height: `${obstacle.radiusY * 2}%`,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: groundBg,
        border: `1.5px dashed ${borderColor}`,
        boxShadow: isHighlightedForAmbush
          ? '0 0 18px rgba(74, 222, 128, 0.55), inset 0 0 14px rgba(34, 197, 94, 0.35)'
          : 'inset 0 0 16px rgba(0, 0, 0, 0.65)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* 根元の幹・岩柱シルエット（カメラを動かして傘がズレた時に見える地面側の支柱） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '28px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: isForest
            ? 'rgba(63, 46, 33, 0.85)'
            : isRock
            ? 'rgba(30, 41, 59, 0.9)'
            : 'rgba(8, 145, 178, 0.75)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {isForest ? '🪵' : isRock ? '🪨' : '💎'}
      </div>

      {/* 自陣側の奇襲ボーナスガイド */}
      {isHighlightedForAmbush && (
        <div
          style={{
            position: 'absolute',
            bottom: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(21, 128, 61, 0.92)',
            color: '#dcfce7',
            fontSize: '8.5px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid #86efac',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        >
          🌲 奇襲出撃エリア (攻撃力+1)
        </div>
      )}
    </div>
  );
}

interface RenderObstacleCanopyProps {
  obstacle: FieldObstacle;
  camera: Camera3DState;
  /** この遮蔽物の死角に未発見の敵隠密ユニットまたは召喚予兆が潜んでいるか */
  hasHiddenEnemy: boolean;
  /** カメラの平行移動でこの遮蔽物の裏側を覗き込み中か (0.0〜1.0+) */
  peekProgress: number;
}

/**
 * 立体遮蔽物の「上空キャノピー（樹冠・岩の天蓋・結晶傘）」レイヤー
 * ユニットより上（zIndex: 28）に描画され、カメラの平行移動 (panX, panY) に応じて
 * パララックス（視差）シフトすることで「覗き込み」を実現する。
 */
export function RenderObstacleCanopy({
  obstacle,
  camera,
  hasHiddenEnemy,
  peekProgress,
}: RenderObstacleCanopyProps) {
  const proj = computeCanopyProjection(obstacle, camera);
  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';

  // 覗き込みが進むと天蓋が少しずつ半透明になり、裏側がさらに見やすくなる
  const peekFade = Math.max(0.42, 1 - Math.min(1, peekProgress) * 0.48);

  const canopyGradient = isForest
    ? 'radial-gradient(circle at 38% 35%, rgba(34, 197, 94, 0.96) 0%, rgba(21, 128, 61, 0.94) 52%, rgba(20, 83, 45, 0.92) 85%, rgba(6, 78, 59, 0.75) 100%)'
    : isRock
    ? 'radial-gradient(circle at 35% 30%, rgba(100, 116, 139, 0.96) 0%, rgba(51, 65, 85, 0.95) 55%, rgba(30, 41, 59, 0.94) 88%, rgba(15, 23, 42, 0.8) 100%)'
    : 'radial-gradient(circle at 40% 35%, rgba(56, 189, 248, 0.94) 0%, rgba(14, 116, 144, 0.93) 55%, rgba(22, 78, 99, 0.92) 88%, rgba(8, 51, 68, 0.8) 100%)';

  const borderGlow = hasHiddenEnemy
    ? '2px solid rgba(250, 204, 21, 0.9)'
    : isForest
    ? '1.5px solid rgba(134, 239, 172, 0.55)'
    : isRock
    ? '1.5px solid rgba(203, 213, 225, 0.45)'
    : '1.5px solid rgba(125, 211, 252, 0.55)';

  return (
    <div
      data-obstacle-canopy-id={obstacle.id}
      data-has-hidden-enemy={hasHiddenEnemy ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${proj.canopyX}%`,
        top: `${proj.canopyY}%`,
        width: `${obstacle.radiusX * 1.95}%`,
        height: `${obstacle.radiusY * 1.95}%`,
        transform: `translate(-50%, -50%) translateZ(${Math.round(obstacle.heightZ * 0.45)}px)`,
        borderRadius: isRock ? '38% 46% 42% 40%' : '50%',
        background: canopyGradient,
        border: borderGlow,
        opacity: peekFade,
        boxShadow: hasHiddenEnemy
          ? '0 14px 28px rgba(0, 0, 0, 0.85), 0 0 18px rgba(250, 204, 21, 0.65), inset 0 3px 10px rgba(255,255,255,0.28)'
          : '0 16px 28px rgba(0, 0, 0, 0.82), inset 0 4px 12px rgba(255,255,255,0.22)',
        pointerEvents: 'none',
        zIndex: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.12s ease-out',
      }}
    >
      {/* 立体ディテールアイコン */}
      <div
        style={{
          fontSize: '20px',
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.65))',
          lineHeight: 1,
        }}
      >
        {isForest ? '🌲🌳🌲' : isRock ? '⛰️🪨' : '💎✨'}
      </div>

      {/* 遮蔽物名ラベル */}
      <span
        style={{
          marginTop: '2px',
          fontSize: '8.5px',
          fontWeight: 'bold',
          color: 'rgba(248, 250, 252, 0.92)',
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          padding: '1px 5px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          letterSpacing: '0.3px',
        }}
      >
        {obstacle.name}
      </span>

      {/* 死角に敵が潜んでいる時の「ガサガサ…」気配アラート */}
      {hasHiddenEnemy && (
        <div
          style={{
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(202, 138, 4, 0.95)',
            color: '#fefce8',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1.5px 7px',
            borderRadius: '999px',
            border: '1px solid #fde047',
            boxShadow: '0 0 12px rgba(250, 204, 21, 0.9)',
            whiteSpace: 'nowrap',
            animation: 'fire-preview-dot-pulse 0.8s infinite ease-in-out',
          }}
        >
          🍃 死角に気配…! (中ドラッグで覗き込み)
        </div>
      )}
    </div>
  );
}
