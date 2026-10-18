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
export const RenderClouds: React.FC<RenderCloudsProps> = React.memo(
  function RenderClouds({ cloudEvent }) {
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
            0% { transform: translate(-50%, -50%) translateY(0px); }
            50% { transform: translate(-50%, -50%) translateY(-5px); }
            100% { transform: translate(-50%, -50%) translateY(0px); }
          }
          @keyframes cloud-shadow-pulse {
            0% { opacity: 0.88; }
            50% { opacity: 0.96; }
            100% { opacity: 0.88; }
          }
          @keyframes wind-whisper-drift {
            0% { opacity: 0; transform: translateX(-10px); }
            50% { opacity: 0.6; }
            100% { opacity: 0; transform: translateX(20px); }
          }
          .arena-2d-mode .cloud-shadow-item,
          .arena-2d-mode .cloud-sky-item,
          .arena-2d-mode .cloud-wind-item {
            animation: none !important;
          }
          @media (any-pointer: coarse), (pointer: coarse) {
            .cloud-shadow-item,
            .cloud-sky-item,
            .cloud-wind-item {
              animation: none !important;
            }
          }
        `}</style>

        {/* ========================================================
            1. 地面レイヤー: 雲の落とすソフトな影（動的死角エリア）
            zIndex: 14 (背景タイルの上、ユニットの足元)
            ※ iPad Safari等でのGPU発熱原因となる大面積 filter: blur() を廃止し、
               多段 radial-gradient のみで滑らかなソフトシャドウを表現
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
              className="cloud-shadow-item"
              style={{
                position: 'absolute',
                left: `${cloud.x.toFixed(1)}%`,
                top: `${cloud.y}%`,
                width: `${cloud.radiusX * 2.0 * cloud.scale}%`,
                height: `${cloud.radiusY * 2.0 * cloud.scale}%`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(ellipse at center,
                  rgba(15, 23, 42, ${cloud.shadowOpacity * 1.0}) 0%,
                  rgba(30, 41, 59, ${cloud.shadowOpacity * 0.75}) 40%,
                  rgba(51, 65, 85, ${cloud.shadowOpacity * 0.3}) 70%,
                  rgba(51, 65, 85, 0) 100%)`,
                animation: 'cloud-shadow-pulse 5s ease-in-out infinite',
              }}
            />
          ))}
        </div>

        {/* ========================================================
            2. 上空レイヤー: ふわふわ漂う自然な雲塊本体
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
                className="cloud-sky-item"
                style={{
                  position: 'absolute',
                  left: `${cloud.x.toFixed(1)}%`,
                  top: `${cloud.y - 2}%`, // 地面の影よりも少し上空にオフセット
                  width: `${cloud.radiusX * 2.0 * cloud.scale}%`,
                  height: `${cloud.radiusY * 2.0 * cloud.scale}%`,
                  transform: 'translate(-50%, -50%)',
                  animation: `cloud-float-bob ${isMain ? '7s' : '6s'} ease-in-out infinite`,
                  opacity: cloud.opacity,
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
                  className="cloud-wind-item"
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
  },
  (prev, next) => {
    if (prev.cloudEvent.phase !== 'drifting' && next.cloudEvent.phase !== 'drifting') {
      return true;
    }
    if (prev.cloudEvent.phase !== next.cloudEvent.phase) return false;
    if (prev.cloudEvent.clouds.length !== next.cloudEvent.clouds.length) return false;
    return prev.cloudEvent.clouds.every(
      (c, i) => c.x.toFixed(1) === next.cloudEvent.clouds[i]?.x.toFixed(1)
    );
  }
);


