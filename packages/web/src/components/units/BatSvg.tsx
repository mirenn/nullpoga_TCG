import React from 'react';
import { UnitSvgProps } from './types';

/**
 * 吸血コウモリ（キル成長ユニット）SVG アニメーションコンポーネント
 *
 * 状態:
 * - idle: 浮遊ホバリングとゆったりした羽ばたき
 * - walking: 素早い羽ばたきで前進飛行
 * - attacking: 急降下して牙で噛みつく吸血モーション
 * - stunned: 共通の震え＋フラッシュ
 */
export const BatSvg: React.FC<UnitSvgProps> = ({
  state,
  isPlayer,
  size = 36,
}) => {
  // カラーパレット（プレイヤーはパープル系、CPUはクリムゾン系）
  const bodyColor = isPlayer ? '#581c87' : '#7f1d1d';
  const bodyDark = isPlayer ? '#3b0764' : '#450a0a';
  const wingColor = isPlayer ? '#7c3aed' : '#b91c1c';
  const earInner = isPlayer ? '#c084fc' : '#fca5a5';
  const eyeColor = isPlayer ? '#ef4444' : '#facc15';
  const eyeHighlight = '#ffffff';
  const fangColor = '#ffffff';

  const isWalking = state === 'walking';
  const isAttacking = state === 'attacking';
  const isStunned = state === 'stunned';

  const rootClass = isStunned ? 'unit-svg-stunned' : '';
  const bodyClass = isWalking ? 'bat-walk-body' : isAttacking ? 'bat-attack-body' : 'bat-idle-body';
  const wingLClass = isWalking ? 'bat-walk-wing-l' : isAttacking ? 'bat-attack-bite' : 'bat-idle-wing-l';
  const wingRClass = isWalking ? 'bat-walk-wing-r' : isAttacking ? 'bat-attack-bite' : 'bat-idle-wing-r';
  const biteClass = isAttacking ? 'bat-attack-bite' : '';

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
        {/* === 左翼（外側へ広がる膜羽） === */}
        <g className={wingLClass}>
          {/* 翼膜 */}
          <path
            d="M 14,18 C 11,14 6,10 2,12 C 4,16 6,19 7,23 C 9,21 11,21 14,21 Z"
            fill={wingColor}
            stroke={bodyDark}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* 翼骨 */}
          <path
            d="M 14,18 Q 8,13 2,12 M 7,16 L 7,23"
            stroke={bodyDark}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === 右翼（外側へ広がる膜羽） === */}
        <g className={wingRClass}>
          {/* 翼膜 */}
          <path
            d="M 22,18 C 25,14 30,10 34,12 C 32,16 30,19 29,23 C 27,21 25,21 22,21 Z"
            fill={wingColor}
            stroke={bodyDark}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* 翼骨 */}
          <path
            d="M 22,18 Q 28,13 34,12 M 29,16 L 29,23"
            stroke={bodyDark}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === 体（胴体） === */}
        <ellipse cx="18" cy="20" rx="5" ry="6" fill={bodyColor} stroke={bodyDark} strokeWidth="0.8" />

        {/* === 後足・小さな鉤爪 === */}
        <path d="M 16,26 L 15,28.5 M 17,26 L 17,28.5" stroke={bodyDark} strokeWidth="1" strokeLinecap="round" />
        <path d="M 19,26 L 19,28.5 M 20,26 L 21,28.5" stroke={bodyDark} strokeWidth="1" strokeLinecap="round" />

        {/* === 頭部 === */}
        <circle cx="18" cy="14" r="5" fill={bodyColor} stroke={bodyDark} strokeWidth="0.8" />

        {/* === 耳（尖った大きな耳） === */}
        {/* 左耳 */}
        <polygon points="14,12 10,4 16,8" fill={bodyColor} stroke={bodyDark} strokeWidth="0.8" />
        <polygon points="14,11 11.5,5.5 15.5,8.5" fill={earInner} />

        {/* 右耳 */}
        <polygon points="22,12 26,4 20,8" fill={bodyColor} stroke={bodyDark} strokeWidth="0.8" />
        <polygon points="22,11 24.5,5.5 20.5,8.5" fill={earInner} />

        {/* === 顔のパーツ（目・牙・口） === */}
        <g className={biteClass}>
          {/* 目 */}
          <ellipse cx="16" cy="13.5" rx="1.3" ry="1.5" fill={eyeColor} />
          <circle cx="16.4" cy="13.1" r="0.45" fill={eyeHighlight} />

          <ellipse cx="20" cy="13.5" rx="1.3" ry="1.5" fill={eyeColor} />
          <circle cx="20.4" cy="13.1" r="0.45" fill={eyeHighlight} />

          {/* 鼻 */}
          <polygon points="17.5,15.2 18.5,15.2 18,15.8" fill={bodyDark} />

          {/* 口 */}
          <path d="M 16.5,16.2 Q 18,17 19.5,16.2" stroke={bodyDark} strokeWidth="0.7" fill="none" />

          {/* 吸血牙（白い鋭い牙） */}
          <polygon points="16.6,16.2 17.2,18.2 17.6,16.2" fill={fangColor} />
          <polygon points="18.4,16.2 18.8,18.2 19.4,16.2" fill={fangColor} />
        </g>
      </g>
    </svg>
  );
};
