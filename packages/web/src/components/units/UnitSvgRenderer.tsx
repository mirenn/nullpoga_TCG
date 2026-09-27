import React from 'react';
import { Unit } from '../../app/types';
import { UnitAnimationState, UnitSvgProps } from './types';
import { CatSvg } from './CatSvg';
import { JellyfishSvg } from './JellyfishSvg';
import { BoarSvg } from './BoarSvg';
import './unit-animations.css';

/**
 * Unit の状態から UnitAnimationState を算出する
 */
export function deriveAnimationState(unit: Unit): UnitAnimationState {
  if (unit.isStunned) return 'stunned';
  if (
    unit.lastAttackEffectTime &&
    Date.now() - unit.lastAttackEffectTime < 240
  ) {
    return 'attacking';
  }
  if (unit.speed > 0) return 'walking';
  return 'idle';
}

/**
 * cardNo に対応する SVG コンポーネントを返すディスパッチャ。
 * SVG が未実装のカードの場合は null を返す（呼び出し側で絵文字フォールバック）。
 */
export function UnitSvgRenderer({
  cardNo,
  ...svgProps
}: { cardNo: number } & UnitSvgProps): React.ReactElement | null {
  switch (cardNo) {
    case 3:
      return <CatSvg {...svgProps} />;
    case 6:
      return <JellyfishSvg {...svgProps} />;
    case 7:
      return <BoarSvg {...svgProps} />;
    default:
      return null;
  }
}
