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
 * 遮蔽物の地面ベース層（木の根元と下草・岩盤の土台・茂みの根・破壊後の切り株や瓦礫）
 * ユニットより下（zIndex: 5）に描画される
 */
export function RenderObstacleGround({
  obstacle,
  isHighlightedForAmbush = false,
}: RenderObstacleGroundProps) {
  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';
  const isDestroyed = Boolean(obstacle.isDestroyed);

  return (
    <div
      data-obstacle-ground-id={obstacle.id}
      data-destroyed={isDestroyed ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${obstacle.x}%`,
        top: `${obstacle.y}%`,
        width: `${obstacle.radiusX * 2.1}%`,
        height: `${obstacle.radiusY * 2.1}%`,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border:
          !isDestroyed && isHighlightedForAmbush
            ? '1.5px dashed rgba(74, 222, 128, 0.85)'
            : 'none',
        boxShadow:
          !isDestroyed && isHighlightedForAmbush
            ? '0 0 18px rgba(74, 222, 128, 0.35), inset 0 0 14px rgba(34, 197, 94, 0.25)'
            : 'none',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <svg
        viewBox="0 0 160 110"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* 地面の自然な落ち影 */}
        <ellipse
          cx="80"
          cy="62"
          rx={isDestroyed ? '58' : '68'}
          ry={isDestroyed ? '32' : '38'}
          fill="rgba(2, 6, 23, 0.65)"
        />

        {isDestroyed ? (
          isForest ? (
            /* === 破壊後：折れた切り株・木片・散乱した葉 === */
            <g opacity="0.88">
              <ellipse cx="80" cy="60" rx="52" ry="26" fill="rgba(20, 83, 45, 0.28)" />
              {/* 散らばった葉と木片 */}
              <ellipse cx="42" cy="66" rx="8" ry="4" fill="#15803d" transform="rotate(-18 42 66)" />
              <ellipse cx="118" cy="54" rx="9" ry="4.5" fill="#166534" transform="rotate(22 118 54)" />
              <ellipse cx="62" cy="76" rx="7" ry="3.5" fill="#14532d" />
              <polygon points="102,70 114,66 110,73 98,74" fill="#78350f" />
              <polygon points="48,48 58,45 55,51" fill="#92400e" />
              {/* 左の小さな切り株 */}
              <path d="M46,62 L50,48 L64,48 L68,62 Z" fill="#5c3a21" />
              <ellipse cx="57" cy="48" rx="7" ry="3.5" fill="#d6b388" stroke="#5c3a21" strokeWidth="1.5" />
              {/* 中央の大きな折れた切り株 */}
              <path
                d="M64,68 L69,46 L75,50 L81,43 L88,49 L93,45 L98,68 Q81,74 64,68 Z"
                fill="#4a2e19"
                stroke="#29180c"
                strokeWidth="1.5"
              />
              <ellipse cx="81" cy="48" rx="12" ry="5.5" fill="#e2c499" stroke="#5c3a21" strokeWidth="1.5" />
              <ellipse cx="81" cy="48" rx="7" ry="3" fill="none" stroke="#b08968" strokeWidth="1" />
              <ellipse cx="81" cy="48" rx="3" ry="1.3" fill="#8c6239" />
            </g>
          ) : (
            /* === 破壊後：粉砕された岩・結晶の瓦礫 === */
            <g opacity="0.85">
              <ellipse cx="80" cy="60" rx="54" ry="27" fill="rgba(30, 41, 59, 0.45)" />
              {/* 地面の亀裂 */}
              <path
                d="M45,58 L68,62 L85,54 L112,64 M68,62 L76,75"
                stroke="#0f172a"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* 砕けた岩の破片群 */}
              <polygon points="46,64 56,50 68,56 64,68" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
              <polygon points="56,50 68,56 62,48" fill="#94a3b8" />
              <polygon points="75,68 84,52 98,57 94,70" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
              <polygon points="84,52 98,57 90,49" fill="#64748b" />
              <polygon points="102,62 112,53 120,61 114,67" fill="#475569" stroke="#1e293b" strokeWidth="1.2" />
              <polygon points="58,72 65,66 72,71 67,76" fill="#64748b" />
            </g>
          )
        ) : isForest ? (
          /* === 生存中（森・木・茂みの根元）：苔むした地面と太い幹・下草 === */
          <g>
            {/* 苔・下草のベースパッチ */}
            <path
              d="M22,60 Q28,36 58,34 Q82,28 110,36 Q138,42 136,62 Q132,82 98,86 Q64,90 36,80 Q18,74 22,60 Z"
              fill="rgba(20, 83, 45, 0.48)"
            />
            <ellipse cx="80" cy="58" rx="48" ry="24" fill="rgba(6, 78, 59, 0.55)" />

            {/* 根元の低木・草むら（覗き込んだ時にも見える下草） */}
            <path
              d="M32,64 Q26,52 35,55 Q34,44 43,53 Q49,45 50,58 Z"
              fill="#14532d"
            />
            <path
              d="M108,62 Q112,48 119,55 Q124,46 128,57 Q135,51 130,64 Z"
              fill="#14532d"
            />

            {/* 左の副木の幹と根 */}
            <path
              d="M46,66 Q52,54 53,36 L63,36 Q64,54 70,66 Q58,63 46,66 Z"
              fill="#4a2e19"
              stroke="#29180c"
              strokeWidth="1.2"
            />
            {/* 中央の大木の太い幹と張り出した根 */}
            <path
              d="M64,72 Q73,56 74,30 L90,30 Q91,56 102,72 L93,74 Q84,65 82,66 Q78,66 71,74 Z"
              fill="#5c3a21"
              stroke="#29180c"
              strokeWidth="1.5"
            />
            {/* 幹の樹皮ハイライト */}
            <path
              d="M77,34 Q77,50 73,66 M84,36 Q85,50 88,64"
              stroke="#7c5032"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* 根元の小草 */}
            <path
              d="M60,72 Q63,62 67,69 Q71,61 74,71 Z"
              fill="#15803d"
            />
            <path
              d="M88,71 Q92,62 96,69 Q100,63 103,72 Z"
              fill="#16a34a"
            />
          </g>
        ) : isRock ? (
          /* === 生存中（巨岩の土台）：岩盤と周囲の小石・苔 === */
          <g>
            <path
              d="M20,62 Q30,38 62,35 Q96,32 124,42 Q142,52 134,68 Q122,84 84,86 Q42,86 24,74 Q16,68 20,62 Z"
              fill="rgba(30, 41, 59, 0.55)"
            />
            {/* 地面に埋まった岩盤ベース */}
            <polygon
              points="34,66 48,46 82,42 116,48 128,64 110,76 54,76"
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            <polygon points="26,68 34,58 44,63 38,72" fill="#475569" />
            <polygon points="120,68 128,58 136,65 130,72" fill="#334155" />
          </g>
        ) : (
          /* === 生存中（茂み＋結晶岩の土台） === */
          <g>
            <path
              d="M22,60 Q32,36 64,34 Q96,32 126,42 Q140,54 132,70 Q118,84 80,86 Q42,86 24,72 Z"
              fill="rgba(14, 116, 144, 0.36)"
            />
            <ellipse cx="80" cy="60" rx="48" ry="23" fill="rgba(6, 78, 59, 0.45)" />
            <polygon points="48,66 62,48 98,48 112,66 88,74 62,74" fill="#164e63" />
          </g>
        )}
      </svg>

      {/* 自陣側の奇襲ボーナスガイド（カードを構えている時のみ表示） */}
      {!isDestroyed && isHighlightedForAmbush && (
        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(20, 83, 45, 0.92)',
            color: '#dcfce7',
            fontSize: '8.5px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid #4ade80',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.65)',
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
 * 立体遮蔽物の「メイングラフィック（生い茂る木々・茂み・ゴツゴツした巨岩・結晶叢）」レイヤー
 * UIの丸いプレート表示を廃止し、フィールド上のオブジェクトとしてSVGイラストを描画する。
 */
export function RenderObstacleCanopy({
  obstacle,
  camera,
  hasHiddenEnemy,
  peekProgress,
}: RenderObstacleCanopyProps) {
  // 障害物が破壊された場合、天蓋（木の上部や巨岩塊）は吹き飛んで切り株・瓦礫のみになる
  if (obstacle.isDestroyed) {
    return null;
  }

  const proj = computeCanopyProjection(obstacle, camera);
  const isForest = obstacle.kind === 'forest';
  const isRock = obstacle.kind === 'rock';

  // 視差が大きくなりすぎても根元から不自然に分離しないようマイルドに補正した表示座標
  const visualX = obstacle.x + proj.shiftXPercent * 0.55;
  const visualY = obstacle.y + proj.shiftYPercent * 0.55;

  // 覗き込みが進むと葉や岩が半透明になり、下に隠れているユニットが透けて見える
  const peekFade = Math.max(0.38, 1 - Math.min(1, peekProgress) * 0.52);

  const maxHp = obstacle.maxHp ?? 80;
  const currentHp = obstacle.hp ?? maxHp;
  const isDamaged = currentHp < maxHp;
  const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
  const isRecentlyHit = Boolean(
    obstacle.lastHitTime && Date.now() - obstacle.lastHitTime < 260
  );

  return (
    <div
      data-obstacle-canopy-id={obstacle.id}
      data-has-hidden-enemy={hasHiddenEnemy ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: `${visualX}%`,
        top: `${visualY}%`,
        width: `${obstacle.radiusX * 2.15}%`,
        height: `${obstacle.radiusY * 2.25}%`,
        transform: `translate(-50%, -54%) translateZ(${Math.round(obstacle.heightZ * 0.35)}px) ${
          isRecentlyHit ? 'scale(0.93)' : 'scale(1)'
        }`,
        opacity: peekFade,
        pointerEvents: 'none',
        zIndex: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.14s ease-out, transform 0.1s ease-out',
        filter: isRecentlyHit
          ? 'brightness(1.5) drop-shadow(0 0 12px rgba(248, 113, 113, 0.9))'
          : hasHiddenEnemy
          ? 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 10px rgba(250, 204, 21, 0.75))'
          : 'drop-shadow(0 12px 18px rgba(0, 0, 0, 0.82))',
      }}
    >
      {/* イノシシやドラゴンに激突されてHPが減っている時の耐久バー */}
      {isDamaged && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '48px',
            height: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.6)',
            borderRadius: '999px',
            overflow: 'hidden',
            zIndex: 32,
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

      {isForest ? (
        /* =========================================================
         * 🌲 木・森・茂み（Bush & Trees）の有機的SVGグラフィック
         * ========================================================= */
        <svg
          viewBox="0 0 160 120"
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <radialGradient id={`GradLeafMain_${obstacle.id}`} cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="45%" stopColor="#16a34a" />
              <stop offset="85%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>
            <radialGradient id={`GradLeafSub_${obstacle.id}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="55%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>
            <radialGradient id={`GradBush_${obstacle.id}`} cx="40%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="35%" stopColor="#22c55e" />
              <stop offset="80%" stopColor="#166534" />
              <stop offset="100%" stopColor="#052e16" />
            </radialGradient>
          </defs>

          {/* 背面の濃い茂みシルエット（奥行き感） */}
          <circle cx="38" cy="68" r="24" fill="#064e3b" />
          <circle cx="122" cy="66" r="25" fill="#064e3b" />
          <circle cx="80" cy="52" r="34" fill="#052e16" />

          {/* チラッと見える木の幹・枝（樹冠と地面をつなぐ立体パーツ） */}
          <path
            d="M49,92 L52,66 L58,66 L61,92 Z"
            fill="#4a2e19"
          />
          <path
            d="M72,96 L76,58 L88,58 L92,96 Z"
            fill="#5c3a21"
          />
          <path
            d="M102,90 L105,68 L111,68 L114,90 Z"
            fill="#3e2723"
          />

          {/* 左側の木・茂みクラスター */}
          <g>
            <circle cx="34" cy="66" r="20" fill={`url(#GradLeafSub_${obstacle.id})`} />
            <circle cx="52" cy="56" r="23" fill={`url(#GradLeafSub_${obstacle.id})`} />
            <circle cx="42" cy="48" r="18" fill={`url(#GradLeafMain_${obstacle.id})`} />
            {/* 葉のハイライト */}
            <ellipse cx="38" cy="41" rx="9" ry="5" fill="#86efac" opacity="0.45" transform="rotate(-12 38 41)" />
          </g>

          {/* 右側の木・茂みクラスター */}
          <g>
            <circle cx="126" cy="66" r="21" fill={`url(#GradLeafSub_${obstacle.id})`} />
            <circle cx="108" cy="55" r="24" fill={`url(#GradLeafSub_${obstacle.id})`} />
            <circle cx="116" cy="47" r="18" fill={`url(#GradLeafMain_${obstacle.id})`} />
            <ellipse cx="112" cy="40" rx="9" ry="5" fill="#86efac" opacity="0.4" transform="rotate(10 112 40)" />
          </g>

          {/* 中央メインの大樹の樹冠（モコモコした多層リーフ） */}
          <g>
            <circle cx="66" cy="54" r="26" fill={`url(#GradLeafMain_${obstacle.id})`} />
            <circle cx="94" cy="54" r="26" fill={`url(#GradLeafMain_${obstacle.id})`} />
            <circle cx="80" cy="36" r="27" fill={`url(#GradLeafMain_${obstacle.id})`} />
            {/* 樹冠頂部の太陽光ハイライト */}
            <ellipse cx="74" cy="24" rx="14" ry="7" fill="#bbf7d0" opacity="0.45" transform="rotate(-8 74 24)" />
            <circle cx="60" cy="42" r="8" fill="#4ade80" opacity="0.35" />
            <circle cx="96" cy="40" r="9" fill="#4ade80" opacity="0.3" />
          </g>

          {/* 手前下部のこんもりした「茂み（ブッシュ・草むら）」レイヤー */}
          <g>
            {/* 左手前の茂み */}
            <path
              d="M16,84 Q14,66 28,66 Q34,54 48,60 Q60,56 64,70 Q70,74 66,85 Q42,90 16,84 Z"
              fill={`url(#GradBush_${obstacle.id})`}
              stroke="#052e16"
              strokeWidth="1.2"
            />
            {/* 右手前の茂み */}
            <path
              d="M92,84 Q90,70 98,64 Q108,54 122,60 Q136,56 142,70 Q148,78 140,86 Q116,90 92,84 Z"
              fill={`url(#GradBush_${obstacle.id})`}
              stroke="#052e16"
              strokeWidth="1.2"
            />
            {/* 中央手前の茂み（ブッシュ） */}
            <path
              d="M52,88 Q50,72 62,68 Q72,56 86,62 Q98,58 104,70 Q112,78 106,88 Q80,94 52,88 Z"
              fill={`url(#GradBush_${obstacle.id})`}
              stroke="#052e16"
              strokeWidth="1.4"
            />

            {/* 草の穂先ディテールと木の実・小花アクセント */}
            <path
              d="M28,76 L24,67 L32,73 L33,64 L38,73"
              stroke="#86efac"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M72,80 L69,70 L76,76 L79,67 L84,76"
              stroke="#86efac"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M116,77 L114,68 L120,74 L124,66 L127,75"
              stroke="#86efac"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 茂みの赤い木の実・白い小花 */}
            <circle cx="44" cy="72" r="2.3" fill="#f87171" />
            <circle cx="49" cy="76" r="2" fill="#ef4444" />
            <circle cx="92" cy="74" r="2.3" fill="#fef08a" />
            <circle cx="122" cy="72" r="2.2" fill="#f87171" />
          </g>
        </svg>
      ) : isRock ? (
        /* =========================================================
         * 🪨 巨岩・岩場（Jagged 3D Boulders & Moss）のSVGグラフィック
         * ========================================================= */
        <svg
          viewBox="0 0 160 120"
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* 奥の暗い岩峰 */}
          <polygon
            points="24,84 36,42 58,34 74,50 68,84"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          <polygon
            points="92,84 104,38 128,44 140,68 134,84"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* 左の中岩（多面体シェーディング） */}
          <g>
            {/* ベース面 */}
            <polygon
              points="16,86 26,52 50,44 68,62 62,88"
              fill="#475569"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* 上部ハイライト面 */}
            <polygon points="26,52 50,44 56,60 32,64" fill="#94a3b8" />
            {/* 右側面シャドウ */}
            <polygon points="50,44 68,62 62,88 46,88 56,60" fill="#334155" />
          </g>

          {/* 右の中岩（多面体シェーディング） */}
          <g>
            <polygon
              points="96,88 106,48 130,42 146,66 138,88"
              fill="#475569"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <polygon points="106,48 130,42 126,60 104,64" fill="#94a3b8" />
            <polygon points="130,42 146,66 138,88 118,88 126,60" fill="#1e293b" />
          </g>

          {/* 中央メインのそびえ立つ巨岩（立体ファセット） */}
          <g>
            <polygon
              points="46,90 56,34 78,20 104,30 116,64 108,92"
              fill="#64748b"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* 左上の明るい受光面 */}
            <polygon points="56,34 78,20 84,46 60,56" fill="#cbd5e1" />
            {/* 中央正面の中間面 */}
            <polygon points="60,56 84,46 92,74 54,88 46,90" fill="#64748b" />
            {/* 右側の深い陰影面 */}
            <polygon points="78,20 104,30 116,64 108,92 86,92 92,74 84,46" fill="#334155" />
            {/* 岩の稜線ハイライトと亀裂 */}
            <polyline
              points="56,34 78,20 84,46 92,74"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="1.4"
               opacity="0.7"
            />
            <polyline
              points="72,38 66,52 74,64"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 岩の隙間に生える苔・小さな茂み */}
          <path
            d="M54,48 Q62,40 70,46 Q78,42 82,50 Q68,54 54,48 Z"
            fill="#16a34a"
            opacity="0.85"
          />
          <path
            d="M36,88 Q38,76 48,80 Q54,73 62,82 Q68,78 72,89 Z"
            fill="#15803d"
          />
          <path
            d="M94,90 Q98,78 106,83 Q112,76 120,85 L124,90 Z"
            fill="#166534"
          />
          {/* 手前の小石 */}
          <polygon points="28,90 34,80 46,83 42,92" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.2" />
          <polygon points="112,92 118,81 130,84 126,93" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />
        </svg>
      ) : (
        /* =========================================================
         * 🌿💎 深い茂みと蒼晶の岩叢（Mystic Bush & Crystal Crag）のSVGグラフィック
         * ========================================================= */
        <svg
          viewBox="0 0 160 120"
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <linearGradient id={`GradCrystal_${obstacle.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <radialGradient id={`GradMysticBush_${obstacle.id}`} cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>
          </defs>

          {/* 背面の深い茂み（ブッシュ） */}
          <circle cx="42" cy="64" r="24" fill="#064e3b" />
          <circle cx="118" cy="64" r="24" fill="#064e3b" />
          <circle cx="80" cy="56" r="30" fill="#115e59" />

          {/* 左に突き出す結晶柱 */}
          <polygon
            points="44,80 34,36 48,24 62,42 58,80"
            fill={`url(#GradCrystal_${obstacle.id})`}
            stroke="#0c4a6e"
            strokeWidth="1.4"
          />
          <polygon points="34,36 48,24 52,52 40,60" fill="#bae6fd" opacity="0.65" />

          {/* 右に突き出す結晶柱 */}
          <polygon
            points="100,80 104,40 120,26 128,44 116,80"
            fill={`url(#GradCrystal_${obstacle.id})`}
            stroke="#0c4a6e"
            strokeWidth="1.4"
          />
          <polygon points="104,40 120,26 116,54 102,60" fill="#bae6fd" opacity="0.6" />

          {/* 中央の大結晶クラスター */}
          <polygon
            points="66,84 62,28 80,12 98,28 94,84"
            fill={`url(#GradCrystal_${obstacle.id})`}
            stroke="#082f49"
            strokeWidth="1.6"
          />
          <polygon points="62,28 80,12 82,56 66,68" fill="#e0f2fe" opacity="0.7" />
          <polygon points="80,12 98,28 94,84 80,84" fill="#0369a1" opacity="0.75" />

          {/* 結晶の根元を覆う豊かな茂み（ブッシュ・草むら） */}
          <path
            d="M16,86 Q14,66 30,64 Q42,52 58,62 Q76,50 94,62 Q112,50 128,62 Q144,64 142,86 Q80,96 16,86 Z"
            fill={`url(#GradMysticBush_${obstacle.id})`}
            stroke="#042f2e"
            strokeWidth="1.5"
          />
          {/* 茂みの草の葉ディテール */}
          <path
            d="M34,78 L30,68 L38,74 L41,65 L46,75 M74,82 L71,70 L79,77 L83,67 L88,78 M112,78 L110,68 L117,74 L122,66 L125,76"
            stroke="#99f6e4"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 発光する胞子・光の粒 */}
          <circle cx="52" cy="72" r="2.2" fill="#38bdf8" />
          <circle cx="96" cy="74" r="2.4" fill="#7dd3fc" />
          <circle cx="78" cy="64" r="2" fill="#e0f2fe" />
        </svg>
      )}

      {/* 死角に敵が潜んでいる時の「ガサガサ…」気配アラート */}
      {hasHiddenEnemy && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
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
          🍃 死角に気配…!
        </div>
      )}
    </div>
  );
}
