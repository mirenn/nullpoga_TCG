export type UnitAnimationState = 'idle' | 'walking' | 'attacking' | 'stunned';

export interface UnitSvgProps {
  /** アニメーション状態 */
  state: UnitAnimationState;
  /** true = プレイヤー側, false = CPU側 */
  isPlayer: boolean;
  /** SVGの描画サイズ (px) - デフォルト 36 */
  size?: number;
}
