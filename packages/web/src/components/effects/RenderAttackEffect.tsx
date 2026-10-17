import React from 'react';
import type { AttackEffect } from '../../app/types';
import { LightningImpactSvg } from './LightningImpactSvg';

// ドラゴンの火柱: 柱同士の横間隔(%)と、ドラゴン側から順に噴き上がる時間差(ms)
const FIRE_PILLAR_SPACING_X = 5;
const FIRE_PILLAR_STAGGER_MS = 70;

export const RenderAttackEffect = React.memo(function RenderAttackEffect({ effect }: { effect: AttackEffect }) {
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
      {/* 1. 炎のドラゴン（ドラゴンの足元から前方へ順番に噴き上がる火柱） */}
      {effect.effectType === 'fireball' && (() => {
        const dirSign = effect.toX >= effect.fromX ? 1 : -1;
        const reach = Math.abs(effect.toX - effect.fromX);
        const pillarCount = Math.max(2, Math.ceil(reach / FIRE_PILLAR_SPACING_X));
        const stepX = reach / pillarCount;
        return (
          <>
            {Array.from({ length: pillarCount }, (_, i) => {
              const px = effect.fromX + dirSign * stepX * (i + 1);
              const delayMs = i * FIRE_PILLAR_STAGGER_MS;
              return (
                <div
                  key={`dragon_pillar_${i}`}
                  style={{
                    position: 'absolute',
                    left: `${px}%`,
                    top: `${effect.fromY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${Math.max(3.5, stepX * 1.1)}%`,
                    height: '18%',
                    pointerEvents: 'none',
                    zIndex: 36,
                  }}
                >
                  {/* 地面の噴出孔光輪 */}
                  <div
                    className="fire-ground-vent"
                    style={{
                      animation: 'fire-ground-vent-pulse 0.95s ease-out forwards',
                      animationDelay: `${delayMs}ms`,
                    }}
                  />
                  {/* 吹き上がる火柱本体 */}
                  <div
                    className="fire-pillar-body"
                    style={{
                      animation: 'fire-pillar-erupt 0.85s cubic-bezier(0.12, 0.9, 0.25, 1) forwards',
                      animationDelay: `${delayMs}ms`,
                    }}
                  >
                    <div className="fire-pillar-inner-core" />
                  </div>
                </div>
              );
            })}

            {/* 発射元（ドラゴンの口元）の炎熱オーラ */}
            <div
              style={{
                position: 'absolute',
                top: `${effect.fromY}%`,
                left: fromLeft,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 37,
              }}
            >
              <div className="fireball-glow">
                <span style={{ fontSize: '26px', display: 'block', textShadow: '0 0 10px #f97316' }}>
                  🔥
                </span>
              </div>
            </div>
          </>
        );
      })()}

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
              <span style={{ fontSize: '22px', display: 'block', textShadow: '0 0 10px #38bdf8' }}>
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

      {/* 3. キャラクター固有の近接攻撃エフェクト */}
      {/* ネコ: 猫パンチ・鋭い爪痕スワイプ */}
      {effect.effectType === 'claw' && (
        <div
          className="melee-claw-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '32px', display: 'block', textShadow: '0 0 10px #f59e0b' }}>
            🐾⚡
          </span>
        </div>
      )}

      {/* ネズミ: 飛びつき素早い噛みつきバイト */}
      {effect.effectType === 'bite' && (
        <div
          className="melee-bite-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '28px', display: 'block', textShadow: '0 0 8px #facc15' }}>
            ✨🦷
          </span>
        </div>
      )}

      {/* 柴犬: 突進バイト＆牙タックル */}
      {effect.effectType === 'tackle' && (
        <div
          className="melee-tackle-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '30px', display: 'block', textShadow: '0 0 10px #ea580c' }}>
            💥🐕
          </span>
        </div>
      )}

      {/* イノシシ: 猛烈かち上げ土煙＆ヘッドバット */}
      {effect.effectType === 'headbutt' && (
        <div
          className="melee-headbutt-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '34px', display: 'block', textShadow: '0 0 14px #ea580c' }}>
            💥🐗
          </span>
        </div>
      )}

      {/* 忍びアサシン: 居合い一閃抜刀斬り光 */}
      {effect.effectType === 'shadow_slash' && (
        <div
          className="melee-shadow-slash-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '32px', display: 'block', textShadow: '0 0 14px #00f0ff' }}>
            ⚡🗡️
          </span>
        </div>
      )}

      {/* 吸血コウモリ: 牙の吸血バイト＆ブラッドスプラッシュ */}
      {effect.effectType === 'blood_bite' && (
        <div
          className="melee-blood-bite-effect"
          style={{
            position: 'absolute',
            top: `${effect.toY}%`,
            left: targetLeft,
            pointerEvents: 'none',
            zIndex: 36,
          }}
        >
          <span style={{ fontSize: '30px', display: 'block', textShadow: '0 0 12px #dc2626' }}>
            🩸🦇
          </span>
        </div>
      )}

      {/* 森の狩人: 矢の飛翔 ＆ 着弾ヒットフラッシュ */}
      {effect.effectType === 'arrow' && (() => {
        const dx = effect.toX - effect.fromX;
        const dy = effect.toY - effect.fromY;
        const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        const arrowFlight = effect.flightDuration ?? 180;
        return (
          <>
            <div
              className="arrow-projectile"
              style={{
                '--from-y': `${effect.fromY}%`,
                '--to-y': `${effect.toY}%`,
                '--from-x': fromLeft,
                '--to-x': targetLeft,
                '--flight-duration': `${arrowFlight}ms`,
                '--arrow-angle': `${angleDeg}deg`,
              } as React.CSSProperties}
            >
              <svg width="26" height="10" viewBox="0 0 26 10" fill="none">
                <line x1="2" y1="5" x2="20" y2="5" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="19,1 25,5 19,9" fill="#f8fafc" />
                <line x1="2" y1="2" x2="6" y2="5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="8" x2="6" y2="5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div
              className="arrow-impact-effect"
              style={{
                top: `${effect.toY}%`,
                left: targetLeft,
                '--impact-delay': `${arrowFlight}ms`,
              } as React.CSSProperties}
            >
              <span style={{ fontSize: '24px', display: 'block', textShadow: '0 0 10px #eab308' }}>
                💥
              </span>
            </div>
          </>
        );
      })()}

      {/* 忍びアサシン: 手裏剣の高速回転飛翔 ＆ 着弾鋭利スラッシュ */}
      {effect.effectType === 'shuriken' && (() => {
        const shurikenFlight = effect.flightDuration ?? 160;
        return (
          <>
            <div
              className="shuriken-projectile"
              style={{
                '--from-y': `${effect.fromY}%`,
                '--to-y': `${effect.toY}%`,
                '--from-x': fromLeft,
                '--to-x': targetLeft,
                '--flight-duration': `${shurikenFlight}ms`,
              } as React.CSSProperties}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* 4枚刃の鋭利な手裏剣 */}
                <path
                  d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
                  fill="#e2e8f0"
                  stroke="#0284c7"
                  strokeWidth="1.2"
                />
                <path
                  d="M12 5 L13.5 10.5 L19 12 L13.5 13.5 L12 19 L10.5 13.5 L5 12 L10.5 10.5 Z"
                  fill="#38bdf8"
                  opacity="0.8"
                />
                <circle cx="12" cy="12" r="2.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
              </svg>
            </div>
            <div
              className="shuriken-impact-effect"
              style={{
                top: `${effect.toY}%`,
                left: targetLeft,
                '--impact-delay': `${shurikenFlight}ms`,
              } as React.CSSProperties}
            >
              <span style={{ fontSize: '26px', display: 'block', textShadow: '0 0 12px #00f0ff' }}>
                ⚡🗡️
              </span>
            </div>
          </>
        );
      })()}

      {/* 共通近接スラッシュ（フォールバック） */}
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
});

