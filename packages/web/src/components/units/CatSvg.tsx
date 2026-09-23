import React from 'react';
import { UnitSvgProps } from './types';

/**
 * ネコ（近接代表）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 尻尾ゆらゆら
 * - walking: 前脚/後脚を交互スイング、体が微妙にボブ
 * - attacking: 前脚を振り上げてひっかきモーション
 * - stunned: 全体がプルプル震え + 白フラッシュ
 */
export const CatSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const bodyColor = isPlayer ? '#94a3b8' : '#a1887f';
  const bodyDark = isPlayer ? '#64748b' : '#8d6e63';
  const earInner = '#f9a8d4';
  const nose = '#f9a8d4';
  const eye = '#1e293b';
  const eyeHighlight = '#ffffff';

  // 各パーツのCSSクラス算出
  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'cat-walk-body' : isAttacking ? 'cat-attack-body' : '';
  const frontLegLClass = isWalking
    ? 'cat-walk-front-l'
    : isAttacking
    ? 'cat-attack-paw'
    : '';
  const frontLegRClass = isWalking ? 'cat-walk-front-r' : '';
  const backLegLClass = isWalking ? 'cat-walk-back-l' : '';
  const backLegRClass = isWalking ? 'cat-walk-back-r' : '';
  const tailClass =
    state === 'idle' || isWalking ? 'cat-idle-tail' : '';

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
        {/* === 尻尾（最背面） === */}
        <g className={tailClass}>
          <path
            d="M25,24 Q30,20 29,14 Q28.5,11 26,13"
            stroke={bodyColor}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === 後脚（体の後ろ） === */}
        <g className={backLegLClass}>
          <rect x="11.5" y="27" width="3" height="5" rx="1.5" fill={bodyDark} />
        </g>
        <g className={backLegRClass}>
          <rect x="21.5" y="27" width="3" height="5" rx="1.5" fill={bodyDark} />
        </g>

        {/* === 体 === */}
        <ellipse cx="18" cy="25" rx="7" ry="5" fill={bodyColor} />

        {/* === 前脚 === */}
        <g className={frontLegLClass}>
          <rect x="13" y="28" width="3" height="5.5" rx="1.5" fill={bodyColor} />
          {/* 肉球 */}
          <circle cx="14.5" cy="33" r="1" fill={earInner} opacity="0.6" />
        </g>
        <g className={frontLegRClass}>
          <rect x="20" y="28" width="3" height="5.5" rx="1.5" fill={bodyColor} />
          <circle cx="21.5" cy="33" r="1" fill={earInner} opacity="0.6" />
        </g>

        {/* === 頭 === */}
        <circle cx="18" cy="13" r="8" fill={bodyColor} />

        {/* === 耳（外側） === */}
        <polygon points="10.5,9 13,1.5 16,8" fill={bodyColor} />
        <polygon points="20,8 23,1.5 25.5,9" fill={bodyColor} />

        {/* === 耳（内側ピンク） === */}
        <polygon points="11.5,8.5 13,3 15.2,7.8" fill={earInner} opacity="0.7" />
        <polygon points="20.8,7.8 23,3 24.5,8.5" fill={earInner} opacity="0.7" />

        {/* === 目 === */}
        <ellipse cx="14" cy="12" rx="2" ry="2.2" fill={eye} />
        <ellipse cx="22" cy="12" rx="2" ry="2.2" fill={eye} />
        {/* ハイライト */}
        <circle cx="14.7" cy="11.2" r="0.8" fill={eyeHighlight} />
        <circle cx="22.7" cy="11.2" r="0.8" fill={eyeHighlight} />

        {/* === 鼻 === */}
        <ellipse cx="18" cy="15" rx="1.2" ry="0.8" fill={nose} />

        {/* === 口 === */}
        <path
          d="M16.5,16.5 Q18,17.5 19.5,16.5"
          stroke={bodyDark}
          strokeWidth="0.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* === ひげ === */}
        <line x1="9" y1="14" x2="14" y2="14.8" stroke={bodyDark} strokeWidth="0.4" opacity="0.5" />
        <line x1="9.5" y1="15.8" x2="14" y2="15.5" stroke={bodyDark} strokeWidth="0.4" opacity="0.5" />
        <line x1="22" y1="14.8" x2="27" y2="14" stroke={bodyDark} strokeWidth="0.4" opacity="0.5" />
        <line x1="22" y1="15.5" x2="26.5" y2="15.8" stroke={bodyDark} strokeWidth="0.4" opacity="0.5" />

        {/* === 攻撃エフェクト: ひっかき線 === */}
        {isAttacking && (
          <g opacity="0.8">
            <line
              x1="8" y1="8" x2="12" y2="14"
              stroke="#facc15" strokeWidth="1.2" strokeLinecap="round"
              opacity="0.9"
            />
            <line
              x1="6" y1="10" x2="10" y2="16"
              stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round"
              opacity="0.7"
            />
            <line
              x1="10" y1="7" x2="14" y2="12"
              stroke="#fde68a" strokeWidth="0.6" strokeLinecap="round"
              opacity="0.6"
            />
          </g>
        )}
      </g>
    </svg>
  );
};

export default CatSvg;
