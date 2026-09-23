import React from 'react';
import { UnitSvgProps } from './types';

/**
 * イノシシ（ノックバック代表）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 荒い鼻息や呼吸に合わせた上下動
 * - walking: 前傾姿勢での猛突進ダッシュ（四肢の前後スイングと上下バウンド）
 * - attacking: 立派な牙で相手をガツンとかち上げる豪快なヘッドバットタックル
 * - stunned: プルプル震えとコミカルに目が回る表現
 */
export const BoarSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // テーマカラー
  const bodyColor = isPlayer ? '#78716c' : '#854d0e'; // プレイヤーはグレー系、CPUは茶色系
  const bodyDark = isPlayer ? '#57534e' : '#713f12';
  const tuskColor = '#fef3c7';
  const eyeColor = '#1e293b';
  const eyeHighlight = '#ffffff';
  const snoutColor = '#fbcfe8';

  // 各パーツのCSSクラス算出
  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'boar-walk-body' : isAttacking ? 'boar-attack-body' : 'boar-idle-body';
  const frontLegLClass = isWalking ? 'boar-walk-leg-f-l' : '';
  const frontLegRClass = isWalking ? 'boar-walk-leg-f-r' : '';
  const backLegLClass = isWalking ? 'boar-walk-leg-b-l' : '';
  const backLegRClass = isWalking ? 'boar-walk-leg-b-r' : '';
  const eyeClass = isStunned ? 'boar-stunned-eye' : '';

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
        {/* === 後脚（体の後ろ） === */}
        <g className={backLegLClass}>
          <rect x="8" y="24" width="4" height="8" rx="2" fill={bodyDark} />
        </g>
        <g className={backLegRClass}>
          <rect x="14" y="24" width="4" height="8" rx="2" fill={bodyDark} />
        </g>

        {/* === 尻尾 === */}
        <path
          d="M7,16 Q3,13 4,9"
          stroke={bodyDark}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* === 体（ずんぐりむっくり） === */}
        <ellipse cx="16" cy="18" rx="11" ry="9" fill={bodyColor} />

        {/* 背中の毛 */}
        <path
          d="M7,12 Q12,8 18,10 Q22,8 26,13"
          stroke={bodyDark}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* === 前脚 === */}
        <g className={frontLegLClass}>
          <rect x="18" y="24" width="4" height="8" rx="2" fill={bodyColor} />
        </g>
        <g className={frontLegRClass}>
          <rect x="24" y="24" width="4" height="8" rx="2" fill={bodyColor} />
        </g>

        {/* === 頭 === */}
        <circle cx="25" cy="16" r="7" fill={bodyColor} />

        {/* === 耳 === */}
        <polygon points="21,10 24,5 26,10" fill={bodyColor} />

        {/* === 鼻（スナウト） === */}
        <ellipse cx="32" cy="16" rx="4" ry="3" fill={snoutColor} />
        {/* 鼻の穴 */}
        <ellipse cx="33" cy="15.5" rx="0.8" ry="1.2" fill={bodyDark} />
        <ellipse cx="31" cy="15.5" rx="0.8" ry="1.2" fill={bodyDark} />

        {/* === 牙 === */}
        <path d="M29,18 Q32,22 34,17" stroke={tuskColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M27,19 Q29,22 31,18" stroke={tuskColor} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* === 目 === */}
        {isStunned ? (
          <g className={eyeClass}>
            {/* バツ印の目 */}
            <path d="M22,12 L26,16 M26,12 L22,16" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <circle cx="24" cy="13" r="1.5" fill={eyeColor} />
            <circle cx="24.5" cy="12.5" r="0.5" fill={eyeHighlight} />
            {/* 怒り眉毛 */}
            {(isAttacking || isWalking) && (
              <line x1="22" y1="11" x2="26" y2="12" stroke={eyeColor} strokeWidth="1" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* === 攻撃エフェクト: ヘッドバットの衝撃波 === */}
        {isAttacking && (
          <g opacity="0.8">
            <path d="M34,10 Q38,16 34,22" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
            <path d="M36,8 Q41,16 36,24" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {/* === 歩行時エフェクト: 砂埃 === */}
        {isWalking && (
          <g opacity="0.6">
            <circle cx="4" cy="32" r="2" fill="#d6d3d1" />
            <circle cx="8" cy="30" r="1.5" fill="#d6d3d1" />
            <circle cx="1" cy="28" r="1" fill="#d6d3d1" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default BoarSvg;
