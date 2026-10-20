import React from 'react';
import type { StampedeState } from '../../app/types';
import { isStampedeApproaching, getStampedeBeastY } from '../../app/stampede';

interface RenderStampedeProps {
  stampede: StampedeState;
}

/**
 * 巨獣スタンピード回廊（フィールド内描画）
 *
 * 【設計意図】
 * 画面中央の視界を遮る大きな警告ウィンドウは表示せず、
 * 上部HUDのドラゴンタイマーと、地面のうっすらとした痕跡・危険帯ラインのみで
 * 控えめに状況を伝達する。
 * 突進スピードは4.5秒とゆっくり重厚に駆け抜ける。
 */
export const RenderStampede: React.FC<RenderStampedeProps> = React.memo(
  function RenderStampede({ stampede }) {
    const { phase, zoneXMin, zoneXMax, rushProgress, beasts } = stampede;
    const widthPercent = zoneXMax - zoneXMin;

    const isWarning = phase === 'warning';
    const isRush = phase === 'rush';
    const isCooldown = phase === 'cooldown';
    const isApproaching = isStampedeApproaching(stampede);

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${zoneXMin}%`,
          width: `${widthPercent}%`,
          pointerEvents: 'none',
          zIndex: isRush ? 35 : 15,
        }}
      >
        {/* 1. 通常時 & 地鳴り接近時の獣道（スタンピード回廊の痕跡） */}
        {phase === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isApproaching
                ? 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.04) 25%, rgba(245, 158, 11, 0.08) 50%, rgba(245, 158, 11, 0.04) 75%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(180, 83, 9, 0.03) 25%, rgba(180, 83, 9, 0.06) 50%, rgba(180, 83, 9, 0.03) 75%, transparent 100%)',
              borderLeft: isApproaching ? '1px dashed rgba(245, 158, 11, 0.45)' : '1px dashed rgba(217, 119, 6, 0.2)',
              borderRight: isApproaching ? '1px dashed rgba(245, 158, 11, 0.45)' : '1px dashed rgba(217, 119, 6, 0.2)',
              transition: 'background 0.5s ease, border-color 0.5s ease',
            }}
          >
            {/* 足跡の痕跡アイコン（地面にうっすらと配置） */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: isApproaching ? 0.25 : 0.12,
                fontSize: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '48px',
                alignItems: 'center',
                transition: 'opacity 0.4s ease',
              }}
            >
              <span>🐾</span>
              <span>🐾</span>
              <span>🐾</span>
            </div>
          </div>
        )}

        {/* 2. 警報フェーズ (WARNING) : 控えめな赤い危険境界ライン（中央ウィンドウは出さない） */}
        {isWarning && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(239, 68, 68, 0.07)',
              borderLeft: '2px dashed rgba(239, 68, 68, 0.65)',
              borderRight: '2px dashed rgba(239, 68, 68, 0.65)',
              boxShadow: 'inset 0 0 16px rgba(239, 68, 68, 0.15)',
              animation: 'stampede-warning-pulse 0.6s ease-in-out infinite alternate',
            }}
          />
        )}

        {/* 3. 突進フェーズ (RUSH) : ゆったり駆け抜ける巨獣たち */}
        {isRush && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.12) 0%, rgba(234, 88, 12, 0.2) 50%, rgba(180, 83, 9, 0.12) 100%)',
              borderLeft: '1.5px solid rgba(234, 88, 12, 0.7)',
              borderRight: '1.5px solid rgba(234, 88, 12, 0.7)',
            }}
          >
            {/* 突進する巨獣たち（ゆっくり重厚に前進） */}
            {beasts.map((beast) => {
              // rushProgress (0〜1) に基いて Y座標を -15% から 115% へゆっくり移動
              const yPercent = getStampedeBeastY(beast, rushProgress);
              const xPercent = 50 + beast.xOffsetPercent;

              return (
                <div
                  key={beast.id}
                  style={{
                    position: 'absolute',
                    top: `${yPercent}%`,
                    left: `${xPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${beast.size}px`,
                    textShadow: '0 4px 8px rgba(0,0,0,0.6)',
                    zIndex: 35,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* 巨獣アイコン（歩行アニメーションをゆっくりに） */}
                  <div style={{ animation: 'stampede-beast-bob 0.32s infinite alternate' }}>
                    {beast.icon}
                  </div>
                  {/* 足元の控えめな砂煙 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      fontSize: '13px',
                      opacity: 0.5,
                      transform: 'scaleY(-1)',
                    }}
                  >
                    💨
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. クールダウンフェーズ (COOLDOWN) : ほんのり緑色の安全ライン（文字ウィンドウは出さない） */}
        {isCooldown && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(34, 197, 94, 0.05)',
              borderLeft: '1px dashed rgba(34, 197, 94, 0.4)',
              borderRight: '1px dashed rgba(34, 197, 94, 0.4)',
            }}
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.stampede.phase !== next.stampede.phase) return false;
    if (next.stampede.phase === 'cooldown') return true;

    if (next.stampede.phase === 'idle') {
      const isApproaching = isStampedeApproaching(next.stampede);
      const wasApproaching = isStampedeApproaching(prev.stampede);
      return isApproaching === wasApproaching;
    }

    if (next.stampede.phase === 'warning') {
      return true; // 警告フェーズはCSSアニメーションで点滅するため毎フレームのReact再描画は不要
    }

    return prev.stampede.rushProgress === next.stampede.rushProgress;
  }
);
