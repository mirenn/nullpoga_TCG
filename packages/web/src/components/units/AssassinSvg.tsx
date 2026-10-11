import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 忍びアサシン（奇襲・スプリットプッシャー）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 佇まい、マフラーが微風に揺れる
 * - walking: 前傾姿勢の超低空ニンジャ走り
 * - charging: 刀の柄に手をかけ、影のオーラを纏って居合い抜刀のタメ
 * - attacking: 閃光の一閃！刀を振り抜く居合い斬撃
 * - stunned: 共通の震え＋白フラッシュ
 */
export const AssassinSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const suitColor = isPlayer ? '#1e293b' : '#3f1515'; // 忍装束
  const suitDark = isPlayer ? '#0f172a' : '#270808';
  const headbandColor = isPlayer ? '#38bdf8' : '#ef4444'; // 額当てバンド
  const metalPlate = '#cbd5e1'; // 額当て金属
  const eyeColor = isPlayer ? '#00f0ff' : '#facc15'; // 光る眼光
  const bladeColor = '#e2e8f0'; // 刀身
  const bladeGlow = isPlayer ? '#38bdf8' : '#f43f5e';
  const scarfColor = isPlayer ? '#0284c7' : '#b91c1c'; // なびくマフラー

  const isWalking = state === 'walking';
  const isCharging = state === 'charging';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking
    ? 'assassin-walk-body'
    : isCharging
    ? 'assassin-charge-body'
    : isAttacking
    ? 'assassin-attack-body'
    : 'assassin-idle-body';
  const scarfClass = isWalking ? 'assassin-walk-scarf' : 'assassin-idle-scarf';
  const legLClass = isWalking ? 'assassin-walk-leg-l' : '';
  const legRClass = isWalking ? 'assassin-walk-leg-r' : '';
  const bladeClass = isCharging
    ? 'assassin-charge-blade'
    : isAttacking
    ? 'assassin-attack-slash'
    : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      className={rootClass}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* チャージ・攻撃時のオーラグロー */}
        <filter id={`assassin-glow-${isPlayer ? 'p' : 'c'}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className={bodyClass}>
        {/* === チャージ時の影のオーラ === */}
        {isCharging && (
          <g className="assassin-charge-aura" filter={`url(#assassin-glow-${isPlayer ? 'p' : 'c'})`}>
            <ellipse cx="18" cy="30" rx="14" ry="4" fill="none" stroke={bladeGlow} strokeWidth="1.2" opacity="0.8" />
            <path d="M7,28 Q18,22 29,28" stroke={bladeGlow} strokeWidth="1" fill="none" opacity="0.6" />
            <line x1="12" y1="26" x2="10" y2="20" stroke={bladeGlow} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            <line x1="24" y1="26" x2="26" y2="20" stroke={bladeGlow} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          </g>
        )}

        {/* === なびくマフラー（背面） === */}
        <g className={scarfClass} style={{ transformOrigin: '15px 16px' }}>
          <path
            d="M14,16 Q8,15 3,20 Q6,23 12,19"
            fill={scarfColor}
            opacity="0.9"
          />
        </g>

        {/* === 奥の足 === */}
        <g className={legRClass} style={{ transformOrigin: '21px 25px' }}>
          <rect x="20" y="24" width="3" height="7" rx="1.5" fill={suitDark} />
        </g>

        {/* === 体（忍装束） === */}
        <path d="M13,16 L23,16 L24,25 L12,25 Z" fill={suitColor} />
        {/* 帯（ベルト） */}
        <rect x="12" y="22" width="12" height="2" fill={scarfColor} />

        {/* === 手前の足 === */}
        <g className={legLClass} style={{ transformOrigin: '15px 25px' }}>
          <rect x="13" y="24" width="3.5" height="8" rx="1.75" fill={suitColor} />
        </g>

        {/* === 刀 / クナイ（抜刀・納刀） === */}
        <g className={bladeClass} style={{ transformOrigin: '21px 19px' }}>
          {isAttacking ? (
            // 攻撃時: 刀身が前方に光の軌跡とともに突き出される
            <g filter={`url(#assassin-glow-${isPlayer ? 'p' : 'c'})`}>
              <path d="M21,19 L33,14 L32,16 L21,20 Z" fill={bladeColor} />
              <line x1="21" y1="19" x2="34" y2="13" stroke={bladeGlow} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ) : isCharging ? (
            // チャージ時: 刀の柄に手を当て光が収束
            <g>
              <rect x="18" y="16" width="7" height="2" rx="1" fill={bladeColor} stroke={bladeGlow} strokeWidth="0.8" />
              <circle cx="25" cy="17" r="1.5" fill={bladeGlow} />
            </g>
          ) : (
            // 通常時: 背中の忍刀
            <line x1="11" y1="11" x2="24" y2="24" stroke={bladeColor} strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
          )}
        </g>

        {/* === 頭部（覆面忍者） === */}
        <circle cx="18" cy="13" r="6" fill={suitColor} />

        {/* 額当て（鉢金） */}
        <rect x="13" y="9" width="10" height="2.5" rx="0.5" fill={headbandColor} />
        <rect x="15" y="9.2" width="6" height="2" rx="0.5" fill={metalPlate} />

        {/* 覆面の隙間から覗く鋭い眼光 */}
        <polygon points="14,13 18,14 18,12" fill={eyeColor} />
        <polygon points="22,13 18,14 18,12" fill={eyeColor} />
        <circle cx="15.5" cy="13" r="0.7" fill="#ffffff" />
        <circle cx="20.5" cy="13" r="0.7" fill="#ffffff" />
      </g>
    </svg>
  );
};

export default AssassinSvg;
