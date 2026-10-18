import React from 'react';
import type { StampedeState } from '../../app/types';
import { isStampedeApproaching } from '../../app/stampede';

interface RenderStampedeProps {
  stampede: StampedeState;
}

export const RenderStampede: React.FC<RenderStampedeProps> = React.memo(function RenderStampede({ stampede }) {
  const { phase, phaseTimer, phaseDuration, zoneXMin, zoneXMax, rushProgress, beasts, nextStampedeIn } = stampede;
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
        zIndex: isRush ? 35 : isWarning ? 25 : isApproaching ? 20 : 15,
        animation: isApproaching ? 'stampede-rumble-shake 0.15s infinite' : undefined,
      }}
    >
      {/* 1. 通常時・地鳴り接近時の獣道（スタンピード回廊の痕跡 & 事前カウントダウン） */}
      {phase === 'idle' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isApproaching
              ? 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.12) 20%, rgba(217, 119, 6, 0.22) 50%, rgba(245, 158, 11, 0.12) 80%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(180, 83, 9, 0.05) 20%, rgba(180, 83, 9, 0.08) 50%, rgba(180, 83, 9, 0.05) 80%, transparent 100%)',
            borderLeft: isApproaching ? '1.5px dashed rgba(245, 158, 11, 0.65)' : '1px dashed rgba(217, 119, 6, 0.25)',
            borderRight: isApproaching ? '1.5px dashed rgba(245, 158, 11, 0.65)' : '1px dashed rgba(217, 119, 6, 0.25)',
            transition: 'background 0.5s ease, border-color 0.5s ease',
          }}
        >
          {/* 上端の事前タイマー標識（回廊の目印） */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              backgroundColor: isApproaching ? 'rgba(120, 53, 15, 0.88)' : 'rgba(15, 23, 42, 0.72)',
              border: isApproaching ? '1px solid #f59e0b' : '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: isApproaching ? '#fef3c7' : '#fed7aa',
              boxShadow: isApproaching ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
              whiteSpace: 'nowrap',
              animation: isApproaching ? 'stampede-timer-pulse 0.8s infinite alternate' : undefined,
            }}
          >
            <span>{isApproaching ? '⚠️' : '🐾'}</span>
            <span>{isApproaching ? `地鳴り接近 ${nextStampedeIn.toFixed(1)}s` : `巨獣道 (${Math.ceil(nextStampedeIn)}s)`}</span>
          </div>

          {/* 地鳴り接近時の立ち上る砂煙エフェクト */}
          {isApproaching && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '30%',
                  fontSize: '18px',
                  animation: 'stampede-dust-rise 1.2s infinite ease-out',
                }}
              >
                💨
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '55%',
                  left: '65%',
                  fontSize: '22px',
                  animation: 'stampede-dust-rise 1.0s infinite ease-out 0.4s',
                }}
              >
                💨
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '75%',
                  left: '35%',
                  fontSize: '16px',
                  animation: 'stampede-dust-rise 1.4s infinite ease-out 0.2s',
                }}
              >
                💨
              </div>
            </>
          )}

          {/* 足跡の痕跡アイコン */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: isApproaching ? 0.45 : 0.18,
              fontSize: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '40px',
              alignItems: 'center',
              filter: isApproaching ? 'drop-shadow(0 0 6px #f59e0b)' : undefined,
              transition: 'opacity 0.4s ease',
            }}
          >
            <span>🐾</span>
            <span>🐾</span>
            <span>🐾</span>
          </div>

          {/* 地鳴り接近時（残り6秒以下）の中央事前警告 */}
          {isApproaching && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                backgroundColor: 'rgba(20, 10, 5, 0.88)',
                border: '1.5px solid #f59e0b',
                borderRadius: '8px',
                padding: '6px 12px',
                boxShadow: '0 0 18px rgba(245, 158, 11, 0.7)',
                minWidth: '130px',
              }}
            >
              <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#fde68a' }}>
                ⚠️ 遠くで激しい地鳴り...
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  color: '#fffbeb',
                  fontFamily: 'monospace',
                  margin: '2px 0',
                  textShadow: '0 0 8px #d97706',
                }}
              >
                {nextStampedeIn.toFixed(1)}s
              </div>
              <div style={{ fontSize: '9px', color: '#fed7aa' }}>
                まもなく回廊警報発令
              </div>
            </div>
          )}
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
                  textShadow: '0 6px 12px rgba(0,0,0,0.8), 0 0 16px #ea580c',
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
                    opacity: 0.72,
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
}, (prev, next) => {
  if (prev.stampede.phase !== next.stampede.phase) return false;
  if (
    prev.stampede.zoneXMin !== next.stampede.zoneXMin ||
    prev.stampede.zoneXMax !== next.stampede.zoneXMax
  ) {
    return false;
  }
  if (next.stampede.phase === 'cooldown') {
    return true;
  }
  if (next.stampede.phase === 'idle') {
    const isApproaching = isStampedeApproaching(next.stampede);
    const wasApproaching = isStampedeApproaching(prev.stampede);
    if (isApproaching !== wasApproaching) return false;
    if (isApproaching) {
      return prev.stampede.nextStampedeIn.toFixed(1) === next.stampede.nextStampedeIn.toFixed(1);
    }
    return Math.ceil(prev.stampede.nextStampedeIn) === Math.ceil(next.stampede.nextStampedeIn);
  }
  if (next.stampede.phase === 'warning') {
    return prev.stampede.phaseTimer.toFixed(1) === next.stampede.phaseTimer.toFixed(1);
  }
  return prev.stampede.rushProgress === next.stampede.rushProgress;
});


