import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 柴犬ラン丸（バフアタッカー）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 尻尾を元気よく振る、少し息づかい（上下）
 * - walking: テクテク歩き（四肢をスイング）、尻尾振り
 * - attacking: 飛びかかり
 * - stunned: 震え、目を回す
 */
export const ShibaSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  // 柴犬といえば茶色（赤柴）と白
  const primaryColor = isPlayer ? '#d97706' : '#b45309';
  const secondaryColor = '#fef3c7'; // お腹や顔の下半分の白
  const darkColor = isPlayer ? '#b45309' : '#92400e';
  const nose = '#0f172a';
  const eye = '#0f172a';

  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'shiba-walk-body' : isAttacking ? 'shiba-attack-body' : 'shiba-idle-body';
  const frontLegLClass = isWalking ? 'shiba-walk-leg-f-l' : '';
  const frontLegRClass = isWalking ? 'shiba-walk-leg-f-r' : '';
  const backLegLClass = isWalking ? 'shiba-walk-leg-b-l' : '';
  const backLegRClass = isWalking ? 'shiba-walk-leg-b-r' : '';
  const tailClass = isWalking ? 'shiba-walk-tail' : 'shiba-idle-tail';

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
        {/* === 尻尾 (くるんとしている) === */}
        <g className={tailClass} style={{ transformOrigin: '8px 14px' }}>
          <path
            d="M8,14 Q3,10 6,6 Q10,4 10,8 Q10,12 8,14"
            fill={primaryColor}
            stroke={darkColor}
            strokeWidth="0.5"
          />
        </g>

        {/* === 後脚 (奥) === */}
        <g className={backLegRClass} style={{ transformOrigin: '12px 24px' }}>
          <rect x="11" y="24" width="3" height="7" rx="1.5" fill={darkColor} />
          <rect x="11" y="28" width="3" height="3" rx="1.5" fill={secondaryColor} />
        </g>

        {/* === 前脚 (奥) === */}
        <g className={frontLegRClass} style={{ transformOrigin: '21px 24px' }}>
          <rect x="20" y="24" width="3" height="7" rx="1.5" fill={darkColor} />
          <rect x="20" y="28" width="3" height="3" rx="1.5" fill={secondaryColor} />
        </g>

        {/* === 体 === */}
        <path d="M8,14 Q8,26 16,26 L22,26 Q26,26 26,18 L26,14 Q17,10 8,14 Z" fill={primaryColor} />
        {/* お腹の白 */}
        <path d="M10,21 Q16,27 22,25 L24,20 Q16,16 10,21 Z" fill={secondaryColor} />

        {/* === 後脚 (手前) === */}
        <g className={backLegLClass} style={{ transformOrigin: '10px 24px' }}>
          <rect x="9" y="24" width="3.5" height="8" rx="1.75" fill={primaryColor} />
          <rect x="9" y="29" width="3.5" height="3" rx="1.5" fill={secondaryColor} />
        </g>

        {/* === 前脚 (手前) === */}
        <g className={frontLegLClass} style={{ transformOrigin: '23px 24px' }}>
          <rect x="22" y="24" width="3.5" height="8" rx="1.75" fill={primaryColor} />
          <rect x="22" y="29" width="3.5" height="3" rx="1.5" fill={secondaryColor} />
        </g>

        {/* === 頭 === */}
        <circle cx="25" cy="14" r="6" fill={primaryColor} />
        {/* 顔の下半分の白 */}
        <path d="M19,14 Q25,14 31,14 A6,6 0 0,1 19,14 Z" fill={secondaryColor} />

        {/* === 耳 === */}
        {/* 奥 */}
        <polygon points="26,8 29,3 30,9" fill={darkColor} />
        {/* 手前 */}
        <polygon points="22,9 21,3 25,7" fill={primaryColor} />
        <polygon points="22.5,8 22,4 24,7" fill={secondaryColor} />

        {/* === 目 === */}
        {isStunned ? (
           <path d="M23,10 L25,12 M25,10 L23,12 M27,10 L29,12 M29,10 L27,12" stroke={eye} strokeWidth="1" strokeLinecap="round" />
        ) : (
          <g>
            <circle cx="24" cy="11" r="1" fill={eye} />
            <circle cx="28" cy="11" r="1" fill={eye} />
            {/* まろ眉 */}
            <ellipse cx="24" cy="8.5" rx="1" ry="0.5" fill={secondaryColor} />
            <ellipse cx="28" cy="8.5" rx="1" ry="0.5" fill={secondaryColor} />
          </g>
        )}

        {/* === 鼻とマズル === */}
        <path d="M26,14 Q29,14 31,16 Q31,18 28,18 Q25,18 26,14" fill={secondaryColor} />
        <circle cx="30.5" cy="15.5" r="1" fill={nose} />

        {/* === 口 === */}
        <path d="M28,17 Q30,19 31,17" stroke={nose} strokeWidth="0.5" fill="none" />

        {/* === 攻撃エフェクト: 飛びかかり衝撃 === */}
        {isAttacking && (
          <g opacity="0.8">
             <path d="M30,12 Q36,16 30,20" stroke="#facc15" strokeWidth="1.5" fill="none" />
             <path d="M32,10 Q38,16 32,22" stroke="#fbbf24" strokeWidth="1" fill="none" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default ShibaSvg;