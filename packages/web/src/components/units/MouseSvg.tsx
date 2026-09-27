import React from 'react';
import { UnitSvgProps } from './types';

/**
 * ネズミ（高速ダッシュアタッカー）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 尻尾が小刻みに揺れる
 * - walking: 足を素早く回転/スイングし、体が前傾姿勢で小刻みに上下
 * - attacking: 素早く噛みつき（前にシュバッと出る）
 * - stunned: プルプル震え + 白フラッシュ
 */
export const MouseSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const bodyColor = isPlayer ? '#cbd5e1' : '#d6d3d1'; // ネズミっぽいグレー/茶グレー
  const bodyDark = isPlayer ? '#94a3b8' : '#a8a29e';
  const earInner = '#fbcfe8';
  const eye = '#0f172a';
  const nose = '#0f172a';
  const tail = '#f43f5e'; // ピンクのしっぽ

  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'mouse-walk-body' : isAttacking ? 'mouse-attack-body' : 'mouse-idle-body';
  const legClass = isWalking ? 'mouse-walk-legs' : '';
  const tailClass = isWalking ? 'mouse-walk-tail' : 'mouse-idle-tail';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      className={rootClass}
      style={{ overflow: 'visible' }}
    >
      <g className={bodyClass}>
        {/* === 尻尾 === */}
        <g className={tailClass}>
          <path
            d="M8,22 Q2,24 5,17 Q7,12 3,10"
            stroke={tail}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === 足 (奥) === */}
        <g className={legClass}>
          <rect x="13" y="27" width="2" height="4" rx="1" fill={bodyDark} />
          <rect x="23" y="27" width="2" height="4" rx="1" fill={bodyDark} />
        </g>

        {/* === 体 === */}
        {/* 少し細長い楕円 */}
        <ellipse cx="18" cy="23" rx="10" ry="6" fill={bodyColor} />

        {/* === 足 (手前) === */}
        <g className={legClass} style={{ animationDelay: '0.1s' }}>
          <rect x="11" y="28" width="2" height="4" rx="1" fill={bodyColor} />
          <rect x="21" y="28" width="2" height="4" rx="1" fill={bodyColor} />
        </g>

        {/* === 頭 === */}
        <ellipse cx="26" cy="21" rx="6" ry="5" fill={bodyColor} />

        {/* 鼻先（とがっている） */}
        <polygon points="26,17 34,22 26,25" fill={bodyColor} />
        <circle cx="34" cy="22" r="1.5" fill={nose} />

        {/* === 耳 === */}
        {/* 奥の耳 */}
        <circle cx="23" cy="15" r="4" fill={bodyDark} />
        <circle cx="23" cy="15" r="2.5" fill={earInner} />

        {/* 手前の耳 */}
        <circle cx="21" cy="17" r="4.5" fill={bodyColor} />
        <circle cx="21" cy="17" r="2.5" fill={earInner} />

        {/* === 目 === */}
        <circle cx="28" cy="19" r="1.5" fill={eye} />

        {/* === ひげ === */}
        <line x1="30" y1="23" x2="35" y2="25" stroke={bodyDark} strokeWidth="0.5" />
        <line x1="30" y1="24" x2="35" y2="28" stroke={bodyDark} strokeWidth="0.5" />

        {/* === 攻撃エフェクト: 噛みつき === */}
        {isAttacking && (
          <g opacity="0.8">
            <path d="M35,18 L38,20 L35,22" stroke="#facc15" strokeWidth="1.5" fill="none" />
            <path d="M36,16 L40,19 L36,21" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.6" />
          </g>
        )}

        {/* 歩行時の砂埃 */}
        {isWalking && (
          <g opacity="0.5">
            <circle cx="5" cy="30" r="1.5" fill="#94a3b8" />
            <circle cx="2" cy="28" r="1" fill="#94a3b8" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default MouseSvg;
