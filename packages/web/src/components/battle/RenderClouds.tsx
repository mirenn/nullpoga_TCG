import React from 'react';
import type { CloudEventState } from '../../app/types';

interface RenderCloudsProps {
  cloudEvent: CloudEventState;
}

/**
 * 流雲・動的死角（Drifting Clouds & Moving Fog）描画コンポーネント
 *
 * 1. 地面レイヤー（Ground Shadow）:
 *    - 背景とユニットの間に、ソフトで広大な雲の影を投射。
 *    - 影の中に入ったエリアは薄暗くなり、動的死角の範囲を視覚的に明示。
 *
 * 2. 上空レイヤー（Sky Cloud Layer）:
 *    - ユニットの上空を、立体感のあるふんわりとした巨大な雲塊が通過。
 *    - 風の微細なパーティクルとボブ（浮遊）アニメーションで奥行き感を演出。
 */
export const RenderClouds: React.FC<RenderCloudsProps> = ({ cloudEvent }) => {
  const { phase, clouds } = cloudEvent;

  if (clouds.length === 0 || phase !== 'drifting') {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes cloud-float-bob {
          0% { transform: translate(-50%, -50%) translateY(0px) scale(1); }
          50% { transform: translate(-50%, -50%) translateY(-6px) scale(1.02); }
          100% { transform: translate(-50%, -50%) translateY(0px) scale(1); }
        }
        @keyframes cloud-shadow-pulse {
          0% { opacity: 0.85; }
          50% { opacity: 1; }
          100% { opacity: 0.85; }
        }
        @keyframes wind-whisper-drift {
          0% { opacity: 0; transform: translateX(-10px); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: translateX(20px); }
        }
      `}</style>

      {/* ========================================================
          1. 地面レイヤー: 雲の落とす巨大なダークシャドウ（死角エリア）
          zIndex: 14 (背景タイルの上、ユニットの足元)
      ======================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 14,
          pointerEvents: 'none',
        }}
      >
        {clouds.map((cloud) => (
          <div
            key={`shadow_${cloud.id}`}
            style={{
              position: 'absolute',
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.radiusX * 2.2}%`,
              height: `${cloud.radiusY * 2.1}%`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center,
                rgba(15, 23, 42, ${cloud.shadowOpacity * 1.3}) 0%,
                rgba(30, 41, 59, ${cloud.shadowOpacity * 0.95}) 40%,
                rgba(51, 65, 85, ${cloud.shadowOpacity * 0.45}) 70%,
                transparent 100%)`,
              filter: 'blur(16px)',
              animation: 'cloud-shadow-pulse 4s ease-in-out infinite',
              transition: 'left 0.1s linear, top 0.1s linear',
            }}
          />
        ))}
      </div>

      {/* ========================================================
          2. 上空レイヤー: ふわふわ漂うリアルな雲塊本体
          zIndex: 42 (ユニット・弾丸の上空をゆったり覆う)
      ======================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 42,
          pointerEvents: 'none',
        }}
      >
        {clouds.map((cloud, idx) => {
          const isMain = idx === 0;
          return (
            <div
              key={`sky_${cloud.id}`}
              style={{
                position: 'absolute',
                left: `${cloud.x}%`,
                top: `${cloud.y - 4}%`, // 地面の影よりも少し上空にオフセット
                width: `${cloud.radiusX * 2.4}%`,
                height: `${cloud.radiusY * 2.2}%`,
                transform: 'translate(-50%, -50%)',
                animation: `cloud-float-bob ${isMain ? '6s' : '5s'} ease-in-out infinite`,
                opacity: cloud.opacity,
                filter: 'drop-shadow(0 20px 25px rgba(15, 23, 42, 0.25))',
                transition: 'left 0.1s linear, top 0.1s linear',
              }}
            >
              {/* もくもくした雲の多重SVGレンダリング */}
              <svg
                viewBox="0 0 300 180"
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* 雲の立体感を出すグラデーション */}
                  <linearGradient id={`cloudGrad_${cloud.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="65%" stopColor="#f1f5f9" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.75" />
                  </linearGradient>
                  {/* 雲の裏側のほのかな陰影 */}
                  <radialGradient id={`cloudShade_${cloud.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* 雲のふくらみ（複数の円の結合） */}
                <g fill={`url(#cloudGrad_${cloud.id})`}>
                  <circle cx="90" cy="110" r="55" />
                  <circle cx="150" cy="85" r="65" />
                  <circle cx="210" cy="105" r="50" />
                  <circle cx="130" cy="120" r="45" />
                  <circle cx="180" cy="125" r="40" />
                  <circle cx="70" cy="125" r="35" />
                  <circle cx="230" cy="120" r="32" />
                  <rect x="70" y="100" width="160" height="40" rx="20" />
                </g>

                {/* 内部のやわらかな陰影 */}
                <ellipse cx="150" cy="120" rx="80" ry="25" fill={`url(#cloudShade_${cloud.id})`} />

                {/* 雲の縁のハイライト（光沢感） */}
                <path
                  d="M 100 65 Q 150 40 200 65"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* 雲の周囲を舞う風の気流エフェクト */}
              <div
                style={{
                  position: 'absolute',
                  top: '20%',
                  right: '-10%',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  animation: 'wind-whisper-drift 2.5s ease-in-out infinite',
                }}
              >
                ༄
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
