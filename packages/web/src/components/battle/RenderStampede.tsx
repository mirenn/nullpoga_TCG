import React from 'react';
import type { StampedeState } from '../../app/types';

interface RenderStampedeProps {
  stampede: StampedeState;
}

export const RenderStampede: React.FC<RenderStampedeProps> = React.memo(function RenderStampede({ stampede }) {
  const { phase, phaseTimer, phaseDuration, zoneXMin, zoneXMax, rushProgress, beasts } = stampede;
  const widthPercent = zoneXMax - zoneXMin;

  const isWarning = phase === 'warning';
  const isRush = phase === 'rush';
  const isCooldown = phase === 'cooldown';

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
      {/* 1. 通常時のうっすらとした獣道（スタンピード回廊の痕跡） */}
      {phase === 'idle' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(180, 83, 9, 0.05) 20%, rgba(180, 83, 9, 0.08) 50%, rgba(180, 83, 9, 0.05) 80%, transparent 100%)',
            borderLeft: '1px dashed rgba(217, 119, 6, 0.25)',
            borderRight: '1px dashed rgba(217, 119, 6, 0.25)',
          }}
        >
          {/* 足跡の痕跡アイコン */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.18,
              fontSize: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            <span>🐾</span>
            <span>🐾</span>
            <span>🐾</span>
          </div>
        </div>
      )}

      {/* 2. 警報フェーズ (WARNING) : 赤い警戒ストライプ・魔導踏切ライン点滅 */}
      {isWarning && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(
              45deg,
              rgba(239, 68, 68, 0.18),
              rgba(239, 68, 68, 0.18) 12px,
              rgba(185, 28, 28, 0.38) 12px,
              rgba(185, 28, 28, 0.38) 24px
            )`,
            borderLeft: '2px solid #ef4444',
            borderRight: '2px solid #ef4444',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.6), inset 0 0 24px rgba(239, 68, 68, 0.35)',
            animation: 'stampede-warning-pulse 0.5s ease-in-out infinite alternate',
          }}
        >
          {/* 踏切トーテム（上端・下端の魔導警報灯） */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1.5px solid #ef4444',
              boxShadow: '0 0 10px #ef4444',
              color: '#fef2f2',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <span style={{ animation: 'stampede-light-blink 0.35s infinite alternate' }}>🚨</span>
            <span>STAMPEDE ALERT</span>
            <span style={{ animation: 'stampede-light-blink 0.35s infinite alternate' }}>🚨</span>
          </div>

          {/* 中央のカウントダウン & 止まれ（HOLD）指示 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid #f87171',
              borderRadius: '10px',
              padding: '8px 14px',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.9)',
              minWidth: '140px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fca5a5' }}>
              ⚠️ 巨獣群 接近中！
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: '900',
                color: '#fee2e2',
                fontFamily: 'monospace',
                margin: '2px 0',
                textShadow: '0 0 10px #ef4444',
              }}
            >
              {phaseTimer.toFixed(1)}s
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fef08a',
                backgroundColor: '#78350f',
                padding: '2px 6px',
                borderRadius: '4px',
                marginTop: '2px',
              }}
            >
              🛑 ユニットをタップして待機(HOLD)!
            </div>
          </div>
        </div>
      )}

      {/* 3. 突進フェーズ (RUSH) : 激走する巨獣たち＋砂煙 */}
      {isRush && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              180deg,
              rgba(180, 83, 9, 0.25) 0%,
              rgba(234, 88, 12, 0.45) 50%,
              rgba(180, 83, 9, 0.25) 100%
            )`,
            borderLeft: '2px solid #ea580c',
            borderRight: '2px solid #ea580c',
            boxShadow: '0 0 35px rgba(234, 88, 12, 0.8), inset 0 0 30px rgba(234, 88, 12, 0.5)',
          }}
        >
          {/* 上部のアナウンス */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#7c2d12',
              color: '#ffedd5',
              border: '2px solid #f97316',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 16px #ea580c',
              zIndex: 36,
            }}
          >
            🦣 スタンピード通過中！ 激突注意！
          </div>

          {/* 突進する巨獣たち */}
          {beasts.map((beast) => {
            // rushProgress (0〜1) に基いて Y座標を -15% から 115% へ移動
            const effectiveProgress = (rushProgress * beast.speedFactor + beast.yProgressOffset) % 1.35;
            const yPercent = -15 + effectiveProgress * 130;
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
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 16px #ea580c)',
                  zIndex: 35,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* 巨獣アイコン */}
                <div style={{ animation: 'stampede-beast-bob 0.15s infinite alternate' }}>
                  {beast.icon}
                </div>
                {/* 足元の砂煙 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    fontSize: '16px',
                    opacity: 0.8,
                    filter: 'blur(1px)',
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

      {/* 4. クールダウンフェーズ (COOLDOWN) : 砂煙の余韻 & ALL CLEAR! */}
      {isCooldown && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(34, 197, 94, 0.15)',
            borderLeft: '2px dashed #22c55e',
            borderRight: '2px dashed #22c55e',
            transition: 'opacity 0.8s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#14532d',
              color: '#dcfce7',
              border: '2px solid #4ade80',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.8)',
              animation: 'stampede-clear-bounce 0.4s ease-out',
            }}
          >
            ✅ ALL CLEAR! 突撃せよ！
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.stampede.phase === 'idle' &&
  next.stampede.phase === 'idle' &&
  prev.stampede.zoneXMin === next.stampede.zoneXMin &&
  prev.stampede.zoneXMax === next.stampede.zoneXMax
);

