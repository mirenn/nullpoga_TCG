import React from 'react';
import { Unit } from '../../app/types';
import { UnitAnimationState, UnitSvgProps } from './types';
import { MouseSvg } from './MouseSvg';
import { ShibaSvg } from './ShibaSvg';
import { CatSvg } from './CatSvg';
import { TurtleSvg } from './TurtleSvg';
import { JellyfishSvg } from './JellyfishSvg';
import { BoarSvg } from './BoarSvg';
import { AssassinSvg } from './AssassinSvg';
import { DragonSvg } from './DragonSvg';
import { BatSvg } from './BatSvg';
import './unit-animations.css';

export { getAttackAnimDuration, deriveAnimationState } from './animationLogic';

const CUSTOM_SVG_CARD_NOS = new Set([1, 2, 3, 5, 6, 7, 8, 9, 11]);

/** 指定された cardNo が専用SVGコンポーネントを持っているか判定 */
export function hasUnitSvg(cardNo: number): boolean {
  return CUSTOM_SVG_CARD_NOS.has(cardNo);
}

/**
 * cardNo に対応する SVG コンポーネントを返すディスパッチャ。
 * SVG が未実装のカードの場合は null を返す（呼び出し側で絵文字フォールバック）。
 */
export const UnitSvgRenderer = React.memo(function UnitSvgRenderer({
  cardNo,
  ...svgProps
}: { cardNo: number } & UnitSvgProps): React.ReactElement | null {
  switch (cardNo) {
    case 1:
      return <MouseSvg {...svgProps} />;
    case 2:
      return <ShibaSvg {...svgProps} />;
    case 3:
      return <CatSvg {...svgProps} />;
    case 5:
      return <TurtleSvg {...svgProps} />;
    case 6:
      return <JellyfishSvg {...svgProps} />;
    case 7:
      return <BoarSvg {...svgProps} />;
    case 8:
      return <AssassinSvg {...svgProps} />;
    case 9:
      return <BatSvg {...svgProps} />;
    case 11:
      return <DragonSvg {...svgProps} />;
    default:
      return null;
  }
});

