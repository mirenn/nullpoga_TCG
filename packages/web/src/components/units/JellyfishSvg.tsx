import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 電気クラゲ（遠距離代表）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle / walking: 傘がフワフワ伸縮、触手ゆらゆら、全体フワフワ浮遊
 * - attacking: 傘をキュッと縮め、触手を広げ、放電ジグザグが光る
 * - stunned: ビリビリ感電痙攣 + 黄色グロー
 */
export const JellyfishSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const bellColor = isPlayer
    ? 'rgba(96, 165, 250, 0.75)'   // 半透明ブルー
    : 'rgba(192, 132, 252, 0.75)'; // 半透明パープル
  const bellStroke = isPlayer ? '#3b82f6' : '#a855f7';
  const bellHighlight = isPlayer
    ? 'rgba(191, 219, 254, 0.6)'
    : 'rgba(233, 213, 255, 0.6)';
  const tentacleColor = isPlayer
    ? 'rgba(96, 165, 250, 0.5)'
    : 'rgba(192, 132, 252, 0.5)';
  const tentacleStroke = isPlayer ? '#60a5fa' : '#c084fc';
  const eyeColor = '#1e293b';
  const zapColor = '#facc15';
  const zapGlow = '#eab308';

  // 状態判定
  const isSwimming = state === 'idle' || state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = [
    isStunned ? 'unit-svg-stunned' : '',
    isStunned ? 'jelly-stunned-glow' : '',
  ].filter(Boolean).join(' ');

  const floatClass = isSwimming ? 'jelly-swim-float' : '';
  const bellClass = isSwimming
    ? 'jelly-swim-bell'
    : isAttacking
    ? 'jelly-attack-bell'
    : '';
  const tentacleBaseClass = isSwimming
    ? 'jelly-swim-tentacle'
    : isAttacking
    ? 'jelly-attack-tentacles'
    : '';

  // 触手パス（5本）
  const tentacles = [
    { x: 10, d: 'M10,19 C8,23 12,26 10,30 C9,32 9.5,34 9.5,34', delay: 'd1' },
    { x: 14.5, d: 'M14.5,19 C13,23 16,27 14.5,31 C14,33 14,34.5 14,34.5', delay: 'd2' },
    { x: 18, d: 'M18,19 C16.5,23 19.5,27 18,31 C17.5,33 18,35 18,35', delay: 'd3' },
    { x: 21.5, d: 'M21.5,19 C23,23 20,27 21.5,31 C22,33 22,34.5 22,34.5', delay: 'd4' },
    { x: 26, d: 'M26,19 C28,23 24,26 26,30 C27,32 26.5,34 26.5,34', delay: 'd1' },
  ];

  // 放電ジグザグパス（攻撃時のみ表示）
  const zapPaths = [
    'M8,20 L10,23 L7,25 L10,28 L8,31',
    'M28,20 L26,23 L29,25 L26,28 L28,31',
    'M13,22 L14,25 L12,27',
    'M23,22 L22,25 L24,27',
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      className={rootClass}
      style={{ overflow: 'visible' }}
    >
      {/* SVG フィルタ: 放電グロー */}
      <defs>
        <filter id="zap-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 傘のグラデーション */}
        <radialGradient id={`bell-grad-${isPlayer ? 'p' : 'c'}`} cx="50%" cy="30%">
          <stop offset="0%" stopColor={bellHighlight} />
          <stop offset="100%" stopColor={bellColor} />
        </radialGradient>
      </defs>

      <g className={floatClass}>
        {/* === 触手（傘の後ろ） === */}
        <g className={tentacleBaseClass}>
          {tentacles.map((t, i) => (
            <path
              key={i}
              d={t.d}
              stroke={tentacleStroke}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={
                isSwimming
                  ? `jelly-swim-tentacle jelly-swim-tentacle-${t.delay}`
                  : ''
              }
              opacity="0.7"
            />
          ))}
        </g>

        {/* === 傘（ベル） === */}
        <g className={bellClass}>
          {/* メインの傘ドーム */}
          <path
            d="M5,19 Q5,3 18,3 Q31,3 31,19 Z"
            fill={`url(#bell-grad-${isPlayer ? 'p' : 'c'})`}
            stroke={bellStroke}
            strokeWidth="0.8"
          />
          {/* 傘の下端スカラップ（波形） */}
          <path
            d="M5,19 Q8,21 11,19 Q14.5,21 18,19 Q21.5,21 25,19 Q28,21 31,19"
            stroke={bellStroke}
            strokeWidth="0.6"
            fill="none"
            opacity="0.6"
          />
          {/* 傘の光沢ハイライト */}
          <ellipse
            cx="14" cy="9" rx="4" ry="3"
            fill="white" opacity="0.15"
          />
        </g>

        {/* === 目 === */}
        <ellipse cx="14" cy="13" rx="1.8" ry="2" fill={eyeColor} />
        <ellipse cx="22" cy="13" rx="1.8" ry="2" fill={eyeColor} />
        {/* ハイライト */}
        <circle cx="14.6" cy="12.3" r="0.7" fill="white" />
        <circle cx="22.6" cy="12.3" r="0.7" fill="white" />

        {/* === 口（小さなカーブ） === */}
        <path
          d="M16.5,16 Q18,17 19.5,16"
          stroke={bellStroke}
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />

        {/* === 放電エフェクト（攻撃時のみ） === */}
        {isAttacking && (
          <g className="jelly-attack-zap" filter="url(#zap-glow)">
            {zapPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke={zapColor}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* 中央放電スパーク */}
            <circle cx="18" cy="24" r="2" fill={zapColor} opacity="0.6" />
            <circle cx="18" cy="24" r="4" fill="none" stroke={zapGlow} strokeWidth="0.8" opacity="0.4" />
          </g>
        )}

        {/* === スタン時: 感電マーク === */}
        {isStunned && (
          <g opacity="0.9">
            <text x="4" y="8" fontSize="6" fill={zapColor}>⚡</text>
            <text x="26" y="8" fontSize="6" fill={zapColor}>⚡</text>
          </g>
        )}
      </g>
    </svg>
  );
};

export default JellyfishSvg;
