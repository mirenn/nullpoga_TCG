import type { Unit } from '../../app/types';
import type { UnitAnimationState } from './types';

/**
 * ユニットごとの攻撃アニメーション持続時間 (ms)
 */
export function getAttackAnimDuration(cardNo: number): number {
  if (cardNo === 11) return 480; // ドラゴン（火炎ブレス放射）
  if (cardNo === 7) return 380; // イノシシ（豪快かち上げ）
  if (cardNo === 8) return 320; // アサシン（抜刀一閃）
  if (cardNo === 2) return 320; // 柴犬（突撃バイト）
  return 300; // その他通常
}

/**
 * Unit の状態から UnitAnimationState を算出する
 */
export function deriveAnimationState(unit: Unit): UnitAnimationState {
  if (unit.isStunned) return 'stunned';
  if (unit.isCharging) return 'charging';
  if (unit.lastAttackEffectTime) {
    const animDuration = getAttackAnimDuration(unit.cardNo);
    if (Date.now() - unit.lastAttackEffectTime < animDuration) {
      return 'attacking';
    }
  }
  if (unit.speed > 0) return 'walking';
  return 'idle';
}
