import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 炎のドラゴン（ボス格）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 翼がゆっくり羽ばたく、体が重厚に上下
 * - walking: ドシドシと重い足取り、翼も動く
 * - attacking: 火炎ブレス（大きく口を開けて炎を吐く）
 * - stunned: プルプル震えて翼が下がる
 */
export const DragonSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 48, // ドラゴンは少し大きめ
}) => {
  // テーマカラー
  const bodyColor = isPlayer ? '#ef4444' : '#dc2626'; // 赤系
  const bellyColor = '#fcd34d'; // お腹は黄色系
  const wingColor = isPlayer ? '#7f1d1d' : '#991b1b'; // 濃い赤（翼の内側）
  const hornColor = '#fef3c7';
  const eye = '#facc15'; // 光る黄色い目

  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'dragon-walk-body' : isAttacking ? 'dragon-attack-body' : 'dragon-idle-body';
  const wingLClass = isWalking ? 'dragon-walk-wing-l' : 'dragon-idle-wing-l';
  const wingRClass = isWalking ? 'dragon-walk-wing-r' : 'dragon-idle-wing-r';
  const legLClass = isWalking ? 'dragon-walk-leg-l' : '';
  const legRClass = isWalking ? 'dragon-walk-leg-r' : '';

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
        {/* === 奥の翼 === */}
        <g className={wingRClass} style={{ transformOrigin: '16px 14px' }}>
          <path d="M16,14 L12,4 L24,8 Z" fill={wingColor} />
          <path d="M12,4 Q18,6 24,8" stroke={bodyColor} strokeWidth="1" fill="none" />
        </g>

        {/* === 奥の足 === */}
        <g className={legRClass} style={{ transformOrigin: '14px 26px' }}>
          <rect x="12" y="25" width="4" height="6" rx="1" fill={wingColor} />
          <polygon points="12,31 16,31 15,33 13,33" fill={hornColor} />
        </g>
        <g className={legRClass} style={{ transformOrigin: '22px 26px' }}>
          <rect x="20" y="25" width="4" height="6" rx="1" fill={wingColor} />
          <polygon points="20,31 24,31 23,33 21,33" fill={hornColor} />
        </g>

        {/* === しっぽ === */}
        <path d="M10,22 Q2,24 4,16" stroke={bodyColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <polygon points="2,16 6,16 4,12" fill={bodyColor} /> {/* 尻尾のトゲ */}

        {/* === 体 === */}
        <ellipse cx="18" cy="22" rx="10" ry="7" fill={bodyColor} />
        <ellipse cx="19" cy="23" rx="8" ry="5" fill={bellyColor} />

        {/* === 手前の足 === */}
        <g className={legLClass} style={{ transformOrigin: '12px 26px' }}>
          <rect x="10" y="25" width="5" height="7" rx="1" fill={bodyColor} />
          <polygon points="10,32 15,32 14,34 11,34" fill={hornColor} />
        </g>
        <g className={legLClass} style={{ transformOrigin: '20px 26px' }}>
          <rect x="18" y="25" width="5" height="7" rx="1" fill={bodyColor} />
          <polygon points="18,32 23,32 22,34 19,34" fill={hornColor} />
        </g>

        {/* === 手前の翼 === */}
        <g className={wingLClass} style={{ transformOrigin: '14px 16px' }}>
          <path d="M14,16 L8,2 L22,6 Z" fill={wingColor} />
          <path d="M8,2 Q16,4 22,6" stroke={bodyColor} strokeWidth="1.5" fill="none" />
          <path d="M8,2 L14,16 M15,4 L14,16" stroke={bodyColor} strokeWidth="0.8" fill="none" opacity="0.5" />
        </g>

        {/* === 首と頭 === */}
        <path d="M22,20 Q26,14 26,10 L32,10 L30,16 Q26,20 22,20" fill={bodyColor} />

        {/* 頭部 */}
        <rect x="25" y="6" width="9" height="6" rx="2" fill={bodyColor} />

        {/* アゴ・口元 */}
        {isAttacking ? (
          <path d="M25,12 L33,16 L31,12 Z" fill={bodyColor} /> // 口を開ける
        ) : (
          <rect x="28" y="9" width="6" height="3" rx="1" fill={bellyColor} />
        )}

        {/* ツノ */}
        <polygon points="26,6 24,1 28,5" fill={hornColor} />
        <polygon points="28,6 27,2 30,5" fill={hornColor} />

        {/* 目 */}
        {isStunned ? (
           <path d="M28,7 L30,9 M30,7 L28,9" stroke="#111" strokeWidth="0.8" strokeLinecap="round" />
        ) : (
           <polygon points="29,7 31,7 30,8" fill={eye} />
        )}

        {/* === 攻撃エフェクト: 火炎ブレス === */}
        {isAttacking && (
          <g opacity="0.9" style={{ transformOrigin: '32px 14px', animation: 'dragon-breath 0.4s ease-out forwards' }}>
             <path d="M33,14 Q40,10 46,14 Q40,18 33,14" fill="#ef4444" />
             <path d="M34,14 Q39,12 43,14 Q39,16 34,14" fill="#facc15" />
             <circle cx="44" cy="12" r="1.5" fill="#ef4444" />
             <circle cx="46" cy="16" r="1" fill="#facc15" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default DragonSvg;