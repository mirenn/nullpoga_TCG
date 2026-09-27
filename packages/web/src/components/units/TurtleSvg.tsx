import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 亀吉（タンク）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 頭が少しだけ出たり入ったり、ゆっくり呼吸
 * - walking: ゆっくりと重い足取り（足がゆっくり前後に動く、体もゆっくり揺れる）
 * - attacking: 頭突き（または噛みつき）
 * - stunned: 甲羅にこもって震える
 */
export const TurtleSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const shellPrimary = isPlayer ? '#166534' : '#065f46'; // 濃い緑
  const shellSecondary = isPlayer ? '#22c55e' : '#10b981'; // 明るい緑
  const skinColor = isPlayer ? '#86efac' : '#6ee7b7'; // 薄い緑
  const darkSkin = isPlayer ? '#4ade80' : '#34d399';
  const eye = '#022c22';

  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'turtle-walk-body' : isAttacking ? 'turtle-attack-body' : 'turtle-idle-body';
  const headClass = isStunned ? 'turtle-stunned-head' : isWalking ? 'turtle-walk-head' : '';
  const legLClass = isWalking ? 'turtle-walk-leg-l' : isStunned ? 'turtle-stunned-leg' : '';
  const legRClass = isWalking ? 'turtle-walk-leg-r' : isStunned ? 'turtle-stunned-leg' : '';

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
        {/* === 後脚 === */}
        <g className={legLClass} style={{ transformOrigin: '9px 24px' }}>
          <rect x="7" y="24" width="4" height="6" rx="2" fill={darkSkin} />
        </g>
        <g className={legRClass} style={{ transformOrigin: '15px 24px' }}>
          <rect x="13" y="24" width="4" height="6" rx="2" fill={darkSkin} />
        </g>

        {/* === しっぽ === */}
        <path d="M6,22 L2,24 L6,25 Z" fill={skinColor} />

        {/* === 頭 === */}
        <g className={headClass}>
          {/* 首 */}
          <rect x="25" y="19" width="6" height="5" fill={skinColor} />
          {/* 頭本体 */}
          <ellipse cx="30" cy="20" rx="4" ry="3.5" fill={skinColor} />
          {/* 目 */}
          {!isStunned && <circle cx="31" cy="19" r="1" fill={eye} />}
          {/* 口 */}
          {!isStunned && <path d="M29,22 Q31,22.5 33,22" stroke={eye} strokeWidth="0.5" fill="none" />}
        </g>

        {/* === 甲羅 === */}
        {/* 甲羅ベース（半円） */}
        <path d="M5,24 A 10,8 0 0,1 27,24 Z" fill={shellPrimary} />
        {/* 甲羅の模様 */}
        <path d="M11,24 L13,18 L19,18 L21,24 Z" fill={shellSecondary} />
        <path d="M7,24 L9,20 L12,24 Z" fill={shellSecondary} opacity="0.8" />
        <path d="M25,24 L23,20 L20,24 Z" fill={shellSecondary} opacity="0.8" />
        {/* 甲羅の縁 */}
        <rect x="3" y="23" width="26" height="3" rx="1.5" fill={shellPrimary} filter="brightness(0.8)" />

        {/* === 前脚 === */}
        <g className={legLClass} style={{ transformOrigin: '19px 24px' }}>
          <rect x="17" y="24" width="4" height="6" rx="2" fill={skinColor} />
        </g>
        <g className={legRClass} style={{ transformOrigin: '25px 24px' }}>
          <rect x="23" y="24" width="4" height="6" rx="2" fill={skinColor} />
        </g>

        {/* === 攻撃エフェクト: 頭突き === */}
        {isAttacking && (
          <g opacity="0.8">
             <circle cx="35" cy="20" r="3" fill="none" stroke="#facc15" strokeWidth="1.5" opacity="0.8" />
             <path d="M35,16 Q38,20 35,24" stroke="#fbbf24" strokeWidth="1" fill="none" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default TurtleSvg;