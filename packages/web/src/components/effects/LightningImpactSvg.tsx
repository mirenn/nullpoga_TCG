import React from 'react';

interface LightningImpactSvgProps {
  size?: number;
}

/**
 * 電撃直撃ヒット演出用 SVG コンポーネント
 * ユニットサイズ（36px）にジャストフィットし、レーン枠をはみ出さずに
 * 鋭い電撃ボルト・閃光・スパークを表現する
 */
export const LightningImpactSvg: React.FC<LightningImpactSvgProps> = ({ size = 44 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* 1. 中心スターフラッシュ（直撃瞬間の閃光） */}
      <path
        d="M 22,5 Q 22,22 5,22 Q 22,22 22,39 Q 22,22 39,22 Q 22,22 22,5 Z"
        fill="rgba(224, 242, 254, 0.75)"
      />

      {/* 2. 放射状の鋭い放電ボルト（シアン＆イエロー＆ホワイトの多層レイヤー） */}
      {/* 上方向ボルト */}
      <path
        d="M 22,21 L 24,15 L 20,10 L 23,4"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 22,21 L 24,15 L 20,10 L 23,4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 下方向ボルト */}
      <path
        d="M 22,23 L 20,29 L 24,34 L 21,40"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 22,23 L 20,29 L 24,34 L 21,40"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 左上方向ボルト */}
      <path
        d="M 21,21 L 14,17 L 18,12 L 11,8"
        fill="none"
        stroke="#facc15"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 21,21 L 14,17 L 18,12 L 11,8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 右上方向ボルト */}
      <path
        d="M 23,21 L 29,16 L 26,12 L 33,7"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 23,21 L 29,16 L 26,12 L 33,7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 左下方向ボルト */}
      <path
        d="M 21,23 L 15,27 L 17,32 L 10,36"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 21,23 L 15,27 L 17,32 L 10,36"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 右下方向ボルト */}
      <path
        d="M 23,23 L 29,27 L 26,32 L 34,36"
        fill="none"
        stroke="#facc15"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 23,23 L 29,27 L 26,32 L 34,36"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. 中央シャープ稲妻シンボル */}
      <polygon
        points="23,9 15,22 22,22 19,35 29,20 22,20"
        fill="#fef08a"
        stroke="#eab308"
        strokeWidth="0.8"
      />
      <polygon
        points="22.5,12 17,22 22,22 20,31 27,21 22,21"
        fill="#ffffff"
        opacity="0.95"
      />

      {/* 4. 周囲の放電スパーク粒子（ダイヤモンド） */}
      <polygon points="7,19 9,21 7,23 5,21" fill="#facc15" />
      <polygon points="37,18 39,20 37,22 35,20" fill="#38bdf8" />
      <polygon points="19,6 21,8 19,10 17,8" fill="#ffffff" />
      <polygon points="25,38 27,40 25,42 23,40" fill="#facc15" />
    </svg>
  );
};
