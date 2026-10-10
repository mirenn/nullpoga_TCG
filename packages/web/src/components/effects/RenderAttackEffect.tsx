import React from 'react';
import type { AttackEffect } from '../../app/types';
import { LightningImpactSvg } from './LightningImpactSvg';

export function RenderAttackEffect({ effect }: { effect: AttackEffect }) {
  // 飛行時間（プロジェクタイルの場合はその時間、即時攻撃なら0ms）
  const flightTime = effect.flightDuration ?? (effect.effectType === 'lightning' ? 280 : 0);

  // ビーム・流線用の水平範囲（横長フィールド用）
  const minX = Math.min(effect.fromX, effect.toX);
  const widthX = Math.max(5, Math.abs(effect.toX - effect.fromX));
  const beamTop = `${(effect.fromY + effect.toY) / 2}%`;

  const fromLeft = `${effect.fromX}%`;
  const targetLeft = `${effect.toX}%`;

  return (
    <>
      {/* 1. 炎のドラゴン（長距離火炎ブレス流線 ＆ 着弾大爆発） */}
      {effect.effectType === 'fireball' && (
        <>
          {/* ドラゴンから標的へ噴射される火炎ブレスの流線 (横方向) */}
          <div
            className="fire-breath-stream"
            style={{
              position: 'absolute',
              left: `${minX}%`,
              width: `${widthX}%`,
              top: beamTop,
              height: '14px',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(to right, #fef08a, #f97316 25%, #ea580c 50%, #dc2626 75%, #fef08a)',
              boxShadow: '0 0 16px #f97316, 0 0 32px #ea580c, 0 0 48px #fef08a',
              borderRadius: '7px',
              pointerEvents: 'none',
              zIndex: 35,
              animation: 'fire-stream-flicker 0.5s ease-out forwards',
            }}
          />

          {/* 発射元（ドラゴンの口元）の炎熱オーラ */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.fromY}%`,
              left: fromLeft,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 36,
            }}
          >
            <div className="fireball-glow">
              <span style={{ fontSize: '26px', display: 'block', filter: 'drop-shadow(0 0 10px #f97316)' }}>
                🔥
              </span>
            </div>
          </div>

          {/* 着弾地点の火炎大爆発＆衝撃波リング */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.toY}%`,
              left: targetLeft,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 38,
            }}
          >
            <div className="shockwave-ring-orange" />
            <div className="fireball-impact-effect">
              <span style={{ fontSize: '36px', display: 'block', filter: 'drop-shadow(0 0 16px #ea580c)' }}>
                💥🔥
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2. 電気クラゲ（電撃弾の高速飛翔 ＆ 着弾バチバチ放電スパーク） */}
      {effect.effectType === 'lightning' && (
        <>
          {/* 発射元（クラゲ自身）の放電スパーク（発射時に手元でピカッと光る） */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.fromY}%`,
              left: fromLeft,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 36,
            }}
          >
            <div className="lightning-glow">
              <span style={{ fontSize: '22px', display: 'block', filter: 'drop-shadow(0 0 10px #38bdf8)' }}>
                ⚡
              </span>
            </div>
          </div>

          {/* クラゲから相手へ高速飛翔する電撃弾（オーブ） - CSS keyframesで完全GPU補間 */}
          <div
            className="lightning-projectile-orb"
            style={{
              '--from-y': `${effect.fromY}%`,
              '--to-y': `${effect.toY}%`,
              '--from-x': fromLeft,
              '--to-x': targetLeft,
              '--flight-duration': `${flightTime}ms`,
            } as React.CSSProperties}
          >
            <span className="lightning-orb-spark">⚡</span>
          </div>

          {/* クラゲから標的へ一瞬走る稲妻放電ライン（着弾時刻に発火） */}
          <div
            className="lightning-beam-line"
            style={{
              position: 'absolute',
              left: `${minX}%`,
              width: `${widthX}%`,
              top: beamTop,
              height: '3px',
              transform: 'translateY(-50%)',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 12px #38bdf8, 0 0 24px #0ea5e9',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 37,
              '--impact-delay': `${flightTime}ms`,
            } as React.CSSProperties}
          />

          {/* 着弾地点のバチバチ放電スパーク ＆ シアン衝撃波リング（着弾時刻に発火） */}
          <div
            style={{
              position: 'absolute',
              top: `${effect.toY}%`,
              left: targetLeft,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 39,
              '--impact-delay': `${flightTime}ms`,
            } as React.CSSProperties}
          >
            <div className="shockwave-ring-cyan" />
            <div className="lightning-impact-effect">
              <LightningImpactSvg size={44} />
            </div>
          </div>
        </>
      )}

      {/* 3. 近接攻撃（斬撃・爪痕・打撃） */}
      {effect.effectType === 'slash' && (
        <div
          className="melee-slash-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '28px', display: 'block' }}>⚔️</span>
        </div>
      )}

      {/* 4. 拠点攻撃（直撃衝撃波） */}
      {effect.effectType === 'base_hit' && (
        <div
          className="base-hit-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '30px', display: 'block' }}>💥</span>
        </div>
      )}

      {/* 5. 着弾時のダメージ数値ポップアップ（着弾時刻に発火） */}
      <div
        className="damage-popup-text"
        style={{
          position: 'absolute',
          top: `${effect.toY}%`,
          left: targetLeft,
          pointerEvents: 'none',
          zIndex: 42,
          '--impact-delay': `${flightTime}ms`,
        } as React.CSSProperties}
      >
        -{effect.damage}
      </div>
    </>
  );
}
