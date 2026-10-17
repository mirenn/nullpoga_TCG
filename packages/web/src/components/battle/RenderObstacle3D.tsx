import React from 'react';
import {
  FieldObstacle,
  Camera3DState,
} from '../../app/obstacles';

interface RenderObstacleGroundProps {
  obstacle: FieldObstacle;
  isHighlightedForAmbush?: boolean;
}

type VoxelMaterial =
  | 'trunk'
  | 'stumpTop'
  | 'leaf'
  | 'leafDark'
  | 'bush'
  | 'stone'
  | 'stoneDark'
  | 'moss'
  | 'crystal'
  | 'dirt';

interface VoxelBoxDef {
  /** 中心Xオフセット (px) */
  ox: number;
  /** 中心Yオフセット (px) */
  oy: number;
  /** 地面からの底面Z高さ (px: 0が地面) */
  oz: number;
  /** X幅 (px) */
  w: number;
  /** Y奥行 (px) */
  d: number;
  /** Z高さ (px: 地面から垂直に立ち上がる高さ) */
  h: number;
  /** ブロック素材 */
  mat: VoxelMaterial;
}

interface MaterialColors {
  topBg: string;
  frontBg: string;
  sideBg: string;
  border: string;
  bgSize?: string;
}

function getVoxelMaterialStyle(mat: VoxelMaterial): MaterialColors {
  switch (mat) {
    case 'trunk':
      return {
        topBg:
          'repeating-radial-gradient(circle at 50% 50%, #d6b388 0px, #d6b388 3px, #8c5832 3px, #8c5832 5px)',
        frontBg:
          'repeating-linear-gradient(90deg, #5c3a21 0px, #5c3a21 4px, #472b16 4px, #472b16 8px, #6e472b 8px, #6e472b 12px)',
        sideBg:
          'repeating-linear-gradient(90deg, #3e2513 0px, #3e2513 4px, #2d1a0c 4px, #2d1a0c 8px, #4a2e19 8px, #4a2e19 12px)',
        border: '1px solid rgba(28, 16, 8, 0.85)',
      };
    case 'stumpTop':
      return {
        topBg:
          'repeating-radial-gradient(circle at 50% 50%, #e6c89c 0px, #e6c89c 3px, #9c6639 3px, #9c6639 5px, #5c3a21 5px, #5c3a21 7px)',
        frontBg:
          'repeating-linear-gradient(90deg, #5c3a21 0px, #5c3a21 4px, #422713 4px, #422713 8px)',
        sideBg:
          'repeating-linear-gradient(90deg, #3e2513 0px, #3e2513 4px, #29170a 4px, #29170a 8px)',
        border: '1px solid rgba(28, 16, 8, 0.9)',
      };
    case 'leaf':
      return {
        topBg:
          'conic-gradient(#22c55e 25%, #16a34a 0 50%, #4ade80 0 75%, #15803d 0)',
        frontBg:
          'conic-gradient(#16a34a 25%, #15803d 0 50%, #22c55e 0 75%, #14532d 0)',
        sideBg:
          'conic-gradient(#14532d 25%, #064e3b 0 50%, #15803d 0 75%, #052e16 0)',
        border: '1px solid rgba(5, 46, 22, 0.8)',
        bgSize: '10px 10px',
      };
    case 'leafDark':
      return {
        topBg:
          'conic-gradient(#16a34a 25%, #15803d 0 50%, #22c55e 0 75%, #14532d 0)',
        frontBg:
          'conic-gradient(#15803d 25%, #14532d 0 50%, #166534 0 75%, #064e3b 0)',
        sideBg:
          'conic-gradient(#064e3b 25%, #052e16 0 50%, #14532d 0 75%, #022c22 0)',
        border: '1px solid rgba(2, 44, 34, 0.85)',
        bgSize: '10px 10px',
      };
    case 'bush':
      return {
        topBg:
          'conic-gradient(#4ade80 25%, #22c55e 0 50%, #16a34a 0 75%, #86efac 0)',
        frontBg:
          'conic-gradient(#22c55e 25%, #15803d 0 50%, #16a34a 0 75%, #14532d 0)',
        sideBg:
          'conic-gradient(#15803d 25%, #064e3b 0 50%, #14532d 0 75%, #052e16 0)',
        border: '1px solid rgba(5, 46, 22, 0.85)',
        bgSize: '8px 8px',
      };
    case 'stone':
      return {
        topBg:
          'conic-gradient(#94a3b8 25%, #cbd5e1 0 50%, #64748b 0 75%, #94a3b8 0)',
        frontBg:
          'conic-gradient(#64748b 25%, #475569 0 50%, #94a3b8 0 75%, #334155 0)',
        sideBg:
          'conic-gradient(#334155 25%, #1e293b 0 50%, #475569 0 75%, #0f172a 0)',
        border: '1px solid rgba(15, 23, 42, 0.85)',
        bgSize: '12px 12px',
      };
    case 'stoneDark':
      return {
        topBg:
          'conic-gradient(#64748b 25%, #475569 0 50%, #94a3b8 0 75%, #334155 0)',
        frontBg:
          'conic-gradient(#475569 25%, #334155 0 50%, #1e293b 0 75%, #0f172a 0)',
        sideBg:
          'conic-gradient(#1e293b 25%, #0f172a 0 50%, #334155 0 75%, #020617 0)',
        border: '1px solid rgba(2, 6, 23, 0.9)',
        bgSize: '10px 10px',
      };
    case 'moss':
      return {
        topBg:
          'conic-gradient(#22c55e 25%, #15803d 0 50%, #4ade80 0 75%, #166534 0)',
        frontBg:
          'linear-gradient(180deg, #16a34a 0%, #15803d 45%, #475569 45%, #334155 100%)',
        sideBg:
          'linear-gradient(180deg, #15803d 0%, #14532d 45%, #334155 45%, #1e293b 100%)',
        border: '1px solid rgba(15, 23, 42, 0.8)',
        bgSize: '8px 8px',
      };
    case 'crystal':
      return {
        topBg:
          'conic-gradient(#e0f2fe 25%, #67e8f9 0 50%, #38bdf8 0 75%, #bae6fd 0)',
        frontBg:
          'linear-gradient(180deg, #67e8f9 0%, #22d3ee 40%, #0284c7 100%)',
        sideBg:
          'linear-gradient(180deg, #0ea5e9 0%, #0369a1 50%, #0c4a6e 100%)',
        border: '1px solid rgba(186, 230, 253, 0.75)',
        bgSize: '8px 8px',
      };
    case 'dirt':
    default:
      return {
        topBg:
          'conic-gradient(#15803d 25%, #166534 0 50%, #14532d 0 75%, #16a34a 0)',
        frontBg:
          'linear-gradient(180deg, #15803d 0%, #15803d 35%, #5c3a21 35%, #3e2513 100%)',
        sideBg:
          'linear-gradient(180deg, #14532d 0%, #14532d 35%, #472b16 35%, #29170a 100%)',
        border: '1px solid rgba(20, 83, 45, 0.7)',
        bgSize: '12px 12px',
      };
  }
}

/**
 * 単一の3Dボクセル直方体（CSS preserve-3d による上面・前面・背面・左面・右面の5面体）
 * 地面 (z=0) から +Z 方向（画面手前・上空）へ垂直に立ち上がる。
 */
function VoxelBox({
  box,
  opacity = 1,
  highlightGlow = false,
}: {
  box: VoxelBoxDef;
  opacity?: number;
  highlightGlow?: boolean;
}) {
  const { ox, oy, oz, w, d, h, mat } = box;
  const style = getVoxelMaterialStyle(mat);
  const glowShadow = highlightGlow
    ? '0 0 10px rgba(250, 204, 21, 0.65)'
    : mat === 'crystal'
    ? '0 0 10px rgba(56, 189, 248, 0.55)'
    : undefined;

  return (
    <React.Fragment>
      {/* 1. 上面 (Top Face: z = oz + h) */}
      <div
        style={{
          position: 'absolute',
          left: `${ox - w / 2}px`,
          top: `${oy - d / 2}px`,
          width: `${w}px`,
          height: `${d}px`,
          backgroundImage: style.topBg,
          backgroundSize: style.bgSize,
          border: style.border,
          opacity,
          boxShadow: glowShadow,
          transform: `translateZ(${oz + h}px)`,
          backfaceVisibility: 'visible',
        }}
      />

      {/* 2. 前面 (Front Face: y = oy + d/2, z = oz .. oz + h) */}
      <div
        style={{
          position: 'absolute',
          left: `${ox - w / 2}px`,
          top: `${oy + d / 2 - h}px`,
          width: `${w}px`,
          height: `${h}px`,
          backgroundImage: style.frontBg,
          backgroundSize: style.bgSize,
          border: style.border,
          opacity,
          transformOrigin: '50% 100%',
          transform: `translateZ(${oz}px) rotateX(-90deg)`,
          backfaceVisibility: 'visible',
        }}
      />

      {/* 3. 背面 (Back Face: y = oy - d/2, z = oz .. oz + h) */}
      <div
        style={{
          position: 'absolute',
          left: `${ox - w / 2}px`,
          top: `${oy - d / 2 - h}px`,
          width: `${w}px`,
          height: `${h}px`,
          backgroundImage: style.sideBg,
          backgroundSize: style.bgSize,
          border: style.border,
          opacity,
          transformOrigin: '50% 100%',
          transform: `translateZ(${oz}px) rotateX(-90deg)`,
          backfaceVisibility: 'visible',
        }}
      />

      {/* 4. 左側面 (Left Face: x = ox - w/2, z = oz .. oz + h) */}
      <div
        style={{
          position: 'absolute',
          left: `${ox - w / 2 - d / 2}px`,
          top: `${oy - h}px`,
          width: `${d}px`,
          height: `${h}px`,
          backgroundImage: style.sideBg,
          backgroundSize: style.bgSize,
          border: style.border,
          opacity,
          transformOrigin: '50% 100%',
          transform: `translateZ(${oz}px) rotateZ(90deg) rotateX(-90deg)`,
          backfaceVisibility: 'visible',
        }}
      />

      {/* 5. 右側面 (Right Face: x = ox + w/2, z = oz .. oz + h) */}
      <div
        style={{
          position: 'absolute',
          left: `${ox + w / 2 - d / 2}px`,
          top: `${oy - h}px`,
          width: `${d}px`,
          height: `${h}px`,
          backgroundImage: style.frontBg,
          backgroundSize: style.bgSize,
          border: style.border,
          opacity,
          transformOrigin: '50% 100%',
          transform: `translateZ(${oz}px) rotateZ(90deg) rotateX(-90deg)`,
          backfaceVisibility: 'visible',
        }}
      />
    </React.Fragment>
  );
}

/**
 * 遮蔽物の地面土台＆根元・切り株レイヤー（zIndex: 5, preserve-3d）
 * - 生存中は地面の草ブロック土台＋木の幹の根元が地面から生える
 * - 破壊後は立体的なボクセル切り株・砕けた岩ブロックが地面に残る
 */
export function RenderObstacleGround({
  obstacle,
  isHighlightedForAmbush = false,
}: RenderObstacleGroundProps) {
  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';
  const isDestroyed = Boolean(obstacle.isDestroyed);

  // 地面のベースブロック＆破壊時の切り株・瓦礫ボクセル定義
  const groundBlocks: VoxelBoxDef[] = isDestroyed
    ? isForest
      ? [
          // 折れた大木のボクセル切り株 (年輪が見える上面)
          { ox: 0, oy: 0, oz: 0, w: 18, d: 18, h: 12, mat: 'stumpTop' },
          // 左の小さな切り株
          { ox: -26, oy: 6, oz: 0, w: 12, d: 12, h: 8, mat: 'stumpTop' },
          // 飛び散った木片・葉のミニキューブ
          { ox: 22, oy: 10, oz: 0, w: 9, d: 9, h: 6, mat: 'trunk' },
          { ox: -14, oy: 16, oz: 0, w: 10, d: 10, h: 6, mat: 'leafDark' },
          { ox: 16, oy: -12, oz: 0, w: 10, d: 10, h: 5, mat: 'leaf' },
        ]
      : [
          // 粉砕された岩・結晶の瓦礫ボクセルキューブ
          { ox: -18, oy: 4, oz: 0, w: 16, d: 14, h: 9, mat: 'stoneDark' },
          { ox: 8, oy: 8, oz: 0, w: 18, d: 16, h: 10, mat: 'stone' },
          { ox: 24, oy: -4, oz: 0, w: 12, d: 12, h: 7, mat: 'stoneDark' },
          { ox: -6, oy: -10, oz: 0, w: 12, d: 10, h: 6, mat: isRock ? 'stone' : 'crystal' },
        ]
    : isForest
    ? [
        // 地面から垂直に立ち上がる大木の幹（下部〜中間）
        { ox: 0, oy: -2, oz: 0, w: 16, d: 16, h: 30, mat: 'trunk' },
        // 張り出した根っこブロック
        { ox: -11, oy: 2, oz: 0, w: 8, d: 10, h: 8, mat: 'trunk' },
        { ox: 11, oy: 2, oz: 0, w: 8, d: 10, h: 7, mat: 'trunk' },
        // 左の副木の幹
        { ox: -28, oy: 6, oz: 0, w: 10, d: 10, h: 20, mat: 'trunk' },
      ]
    : [
        // 岩・結晶の地面基礎ブロック
        { ox: 0, oy: 0, oz: 0, w: 36, d: 26, h: 12, mat: 'stoneDark' },
      ];

  return (
    <div
      data-obstacle-ground-id={obstacle.id}
      data-destroyed={isDestroyed ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${obstacle.x}%`,
        top: `${obstacle.y}%`,
        width: '0px',
        height: '0px',
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* 地面に落ちる四角いボクセル影プレート */}
      <div
        style={{
          position: 'absolute',
          left: '-52px',
          top: '-30px',
          width: '104px',
          height: '60px',
          backgroundColor: isDestroyed
            ? 'rgba(2, 6, 23, 0.45)'
            : 'rgba(2, 6, 23, 0.72)',
          border:
            !isDestroyed && isHighlightedForAmbush
              ? '2px dashed rgba(74, 222, 128, 0.9)'
              : '1px solid rgba(15, 23, 42, 0.5)',
          boxShadow:
            !isDestroyed && isHighlightedForAmbush
              ? '0 0 18px rgba(74, 222, 128, 0.5)'
              : '0 6px 14px rgba(0, 0, 0, 0.65)',
          transform: 'translateZ(1px)',
        }}
      />

      {/* 立体ボクセルブロック群（斜めアイソメ角度を少しつけて常に3面が見えるようにする） */}
      <div
        style={{
          position: ' absolute' as 'absolute',
          left: 0,
          top: 0,
          transformStyle: 'preserve-3d',
          transform: 'rotateX(14deg) rotateZ(-10deg)',
        }}
      >
        {groundBlocks.map((b, i) => (
          <VoxelBox key={i} box={b} />
        ))}
      </div>

      {/* 自陣側の奇襲ボーナスガイド（モンスターカードを構えている時のみ表示） */}
      {!isDestroyed && isHighlightedForAmbush && (
        <div
          style={{
            position: 'absolute',
            left: '0px',
            top: '36px',
            transform: 'translate(-50%, 0) translateZ(8px)',
            backgroundColor: 'rgba(20, 83, 45, 0.92)',
            color: '#dcfce7',
            fontSize: '8.5px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '3px',
            border: '1px solid #4ade80',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          🌲 奇襲出撃 (+1⚔️)
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
 * マインクラフト風の3Dボクセル（低ポリブロック）として地面から垂直に生える
 * 「大木（Tree）」「茂み（Bush）」「巨岩（Rock）」「結晶岩（Crystal）」オブジェクト
 */
export function RenderObstacleCanopy({
  obstacle,
  camera,
  hasHiddenEnemy,
  peekProgress,
}: RenderObstacleCanopyProps) {
  // 破壊された障害物は切り株・瓦礫のみ（RenderObstacleGround側）になる
  if (obstacle.isDestroyed) {
    return null;
  }

  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';

  // 覗き込み時はボクセルの葉や上部ブロックを半透明にして裏側のユニットを透視可能にする
  // ※ CSS preserve-3d が親の opacity でフラット化されないよう、各 VoxelBox の面に直接渡す！
  const peekFade = Math.max(0.32, 1 - Math.min(1, peekProgress) * 0.58);

  const maxHp = obstacle.maxHp ?? 80;
  const currentHp = obstacle.hp ?? maxHp;
  const isDamaged = currentHp < maxHp;
  const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
  const isRecentlyHit = Boolean(
    obstacle.lastHitTime && Date.now() - obstacle.lastHitTime < 260
  );

  // 2D平面モード時でも3Dブロックの立体面（上面・前面・側面）がしっかり見えるようベース角度を付与
  const baseTiltX = camera.is3DMode ? 14 : 30;
  const hitScale = isRecentlyHit ? 'scale3d(0.92, 0.92, 0.92)' : '';

  // 種別ごとの3Dボクセルブロック構成（地面 z=0 から上空 z=66px まで積み上がる）
  const voxelBlocks: VoxelBoxDef[] = isForest
    ? [
        // 1. 中央の大木（Minecraft オークの木スタイル：幹の上に2段の葉ブロック層）
        { ox: 0, oy: -2, oz: 24, w: 50, d: 38, h: 18, mat: 'leaf' },
        { ox: 0, oy: -2, oz: 42, w: 34, d: 26, h: 14, mat: 'leaf' },
        { ox: 0, oy: -2, oz: 56, w: 18, d: 16, h: 9, mat: 'bush' },

        // 2. 左側の副木＆こんもりした茂み（Bush）ブロック（地面から直接生える）
        { ox: -30, oy: 6, oz: 16, w: 28, d: 24, h: 16, mat: 'leafDark' },
        { ox: -30, oy: 6, oz: 32, w: 18, d: 16, h: 10, mat: 'leaf' },
        // 地面から生える茂み（ブッシュ）
        { ox: -38, oy: 14, oz: 0, w: 22, d: 18, h: 14, mat: 'bush' },

        // 3. 右側の地面から生える大きな茂み（ブッシュ・草むら）ブロック群
        { ox: 30, oy: 8, oz: 0, w: 28, d: 22, h: 16, mat: 'bush' },
        { ox: 30, oy: 8, oz: 16, w: 18, d: 14, h: 10, mat: 'leaf' },
        { ox: 14, oy: 14, oz: 0, w: 20, d: 16, h: 12, mat: 'leafDark' },
      ]
    : isRock
    ? [
        // 1. 中央にそびえ立つメインの角張った巨岩ピラー（3段ステップ）
        { ox: 2, oy: -2, oz: 0, w: 36, d: 28, h: 28, mat: 'stone' },
        { ox: 2, oy: -2, oz: 28, w: 26, d: 20, h: 18, mat: 'stone' },
        { ox: 0, oy: -2, oz: 46, w: 16, d: 14, h: 12, mat: 'stone' },

        // 2. 左側の苔むした中岩ブロック（地面から生える）
        { ox: -24, oy: 6, oz: 0, w: 26, d: 22, h: 22, mat: 'stoneDark' },
        { ox: -24, oy: 6, oz: 22, w: 20, d: 16, h: 6, mat: 'moss' },

        // 3. 右側のゴツゴツした岩塊と手前の小岩ブロック
        { ox: 26, oy: 6, oz: 0, w: 24, d: 20, h: 18, mat: 'stoneDark' },
        { ox: -6, oy: 14, oz: 0, w: 20, d: 14, h: 12, mat: 'stone' },
      ]
    : [
        // 茂み（ブッシュ）から突き出すマイクラ風クリスタル鉱石ブロック群
        // 地面を覆う深い茂みブロック
        { ox: -26, oy: 6, oz: 0, w: 26, d: 22, h: 16, mat: 'bush' },
        { ox: 26, oy: 6, oz: 0, w: 26, d: 22, h: 16, mat: 'bush' },
        { ox: 0, oy: 12, oz: 0, w: 28, d: 18, h: 12, mat: 'leafDark' },

        // 中央＆左右にそびえる角柱クリスタルブロック
        { ox: 0, oy: -2, oz: 0, w: 22, d: 20, h: 36, mat: 'crystal' },
        { ox: 0, oy: -2, oz: 36, w: 14, d: 14, h: 16, mat: 'crystal' },
        { ox: -16, oy: -4, oz: 0, w: 14, d: 14, h: 26, mat: 'crystal' },
        { ox: 16, oy: -4, oz: 0, w: 14, d: 14, h: 28, mat: 'crystal' },
      ];

  return (
    <div
      data-obstacle-canopy-id={obstacle.id}
      data-has-hidden-enemy={hasHiddenEnemy ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${obstacle.x}%`,
        top: `${obstacle.y}%`,
        width: '0px',
        height: '0px',
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        zIndex: 28,
      }}
    >
      {/* 3Dボクセル構造体本体（地面座標に固定され、真上に立体ブロックとして伸びる） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${baseTiltX}deg) rotateZ(-10deg) ${hitScale}`,
          transition: 'transform 0.12s ease-out',
        }}
      >
        {voxelBlocks.map((b, idx) => (
          <VoxelBox
            key={idx}
            box={b}
            opacity={peekFade}
            highlightGlow={hasHiddenEnemy && idx === 0}
          />
        ))}
      </div>

      {/* イノシシやドラゴンに激突されてHPが減っている時の3D耐久バー */}
      {isDamaged && (
        <div
          style={{
            position: 'absolute',
            left: '0px',
            top: '-38px',
            transform: 'translate(-50%, -50%) translateZ(68px)',
            width: '48px',
            height: '6px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(248, 250, 252, 0.7)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${hpRatio * 100}%`,
              height: '100%',
              backgroundColor: hpRatio > 0.5 ? '#22c55e' : '#f97316',
              transition: 'width 0.15s ease-out',
            }}
          />
        </div>
      )}

      {/* 死角に敵が潜んでいる時の「ガサガサ…」気配アラート */}
      {hasHiddenEnemy && (
        <div
          style={{
            position: 'absolute',
            left: '0px',
            top: '-46px',
            transform: 'translate(-50%, -50%) translateZ(72px)',
            backgroundColor: 'rgba(202, 138, 4, 0.95)',
            color: '#fefce8',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1.5px 7px',
            borderRadius: '4px',
            border: '1px solid #fde047',
            boxShadow: '0 0 12px rgba(250, 204, 21, 0.9)',
            whiteSpace: 'nowrap',
            animation: 'fire-preview-dot-pulse 0.8s infinite ease-in-out',
          }}
        >
          🍃 死角に気配…!
        </div>
      )}
    </div>
  );
}
