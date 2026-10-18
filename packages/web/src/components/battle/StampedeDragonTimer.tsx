import React from 'react';
import type { StampedeState } from '../../app/types';
import { isStampedeApproaching } from '../../app/stampede';

interface StampedeDragonTimerProps {
  stampede: StampedeState;
  onFocusStampedeZone?: () => void;
}

/**
 * 巨獣スタンピード・ドラゴンタイマーHUD (LoLスタイル)
 *
 * 【ゲームデザイン意図・背景】
 * League of Legends のドラゴン出現タイマーのように、中央危険回廊に発生する巨獣スタンピード
 * の次回突進までの残り秒数を常時カウントダウン表示する。
 *
 * - 通常時 (残り>6秒): 落ち着いたスレート＋アンバーのバッジで「あと何秒」を常に把握可能。
 * - 地鳴り接近時 (残り<=6秒): オレンジ色の警告パルスと地鳴りカウントダウンで事前警戒を促す。
 * - 警報発令時 (warning / 3.5秒): 赤色点滅とサイレンで即時ホールド（立ち止まり）を指示。
 * - 突進通過中 (rush): 巨獣激突アニメーション。
 * - 通過後 (cooldown): オールクリア表示。
 */
export const StampedeDragonTimer: React.FC<StampedeDragonTimerProps> = React.memo(
  function StampedeDragonTimer({ stampede, onFocusStampedeZone }) {
    const { phase, phaseTimer, nextStampedeIn } = stampede;
    const isApproaching = isStampedeApproaching(stampede);
    const isWarning = phase === 'warning';
    const isRush = phase === 'rush';
    const isCooldown = phase === 'cooldown';

    // プログレスバーのパーセンテージ（次の突進までのゲージ）
    // 通常サイクルは約27.5秒 (interval 24s + warning 3.5s)
    const maxCycleSec = 27.5;
    const cycleProgress = Math.max(0, Math.min(100, ((maxCycleSec - nextStampedeIn) / maxCycleSec) * 100));

    // フェーズごとの外観スタイル定義
    let badgeBg = 'rgba(15, 23, 42, 0.9)';
    let badgeBorder = '1px solid rgba(217, 119, 6, 0.45)';
    let badgeGlow = '0 3px 10px rgba(0, 0, 0, 0.6)';
    let iconAnim: string | undefined = undefined;
    let containerAnim: string | undefined = undefined;
    let icon = '🦣';
    let label = '巨獣回廊';
    let timeText = `${Math.ceil(nextStampedeIn)}s`;
    let timeColor = '#fef08a';

    if (isCooldown) {
      badgeBg = 'rgba(20, 83, 45, 0.88)';
      badgeBorder = '1px solid #22c55e';
      badgeGlow = '0 2px 8px rgba(34, 197, 94, 0.35)';
      icon = '✅';
      label = 'スタンピード';
      timeText = 'CLEAR';
      timeColor = '#bbf7d0';
    } else if (isRush) {
      badgeBg = 'rgba(124, 45, 18, 0.9)';
      badgeBorder = '1px solid #ea580c';
      badgeGlow = '0 2px 10px rgba(234, 88, 12, 0.5)';
      icon = '🦣';
      label = 'スタンピード';
      timeText = '突進中';
      timeColor = '#ffedd5';
    } else if (isWarning) {
      badgeBg = 'rgba(127, 29, 29, 0.92)';
      badgeBorder = '1.5px solid #ef4444';
      badgeGlow = '0 2px 10px rgba(239, 68, 68, 0.5)';
      icon = '🚨';
      label = 'スタンピード';
      timeText = `${phaseTimer.toFixed(1)}s`;
      timeColor = '#fee2e2';
    } else if (isApproaching) {
      badgeBg = 'rgba(120, 53, 15, 0.9)';
      badgeBorder = '1px solid #f59e0b';
      badgeGlow = '0 2px 8px rgba(245, 158, 11, 0.4)';
      icon = '⚠️';
      label = 'スタンピード';
      timeText = `${nextStampedeIn.toFixed(1)}s`;
      timeColor = '#fef3c7';
    } else {
      // 通常 idle
      icon = '🦣';
      label = 'スタンピード';
      timeText = `${Math.ceil(nextStampedeIn)}s`;
      timeColor = '#fef08a';
    }

    return (
      <div
        onClick={onFocusStampedeZone}
        title={onFocusStampedeZone ? 'クリックで中央の巨獣回廊に視点をリセット' : '巨獣スタンピード タイマー'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: badgeBg,
          border: badgeBorder,
          borderRadius: '999px',
          padding: '2px 10px 2px 5px',
          boxShadow: badgeGlow,
          cursor: onFocusStampedeZone ? 'pointer' : 'default',
          animation: containerAnim,
          transition: 'background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* プログレスバー背景（LoLドラゴンタイマー風の微細なチャージインジケーター） */}
        {phase === 'idle' && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '2px',
              width: `${cycleProgress}%`,
              backgroundColor: isApproaching ? '#f59e0b' : 'rgba(217, 119, 6, 0.7)',
              boxShadow: isApproaching ? '0 0 6px #f59e0b' : 'none',
              transition: 'width 1s linear',
            }}
          />
        )}

        {/* アイコンサークル */}
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: isWarning
              ? 'rgba(239, 68, 68, 0.3)'
              : isApproaching
              ? 'rgba(245, 158, 11, 0.3)'
              : 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            animation: iconAnim,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* ラベル & タイマーテキスト */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: isWarning ? '#fca5a5' : isApproaching ? '#fed7aa' : '#cbd5e1',
              letterSpacing: '0.3px',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '900',
              fontFamily: 'monospace',
              color: timeColor,
              letterSpacing: '0.5px',
              textShadow: isWarning
                ? '0 0 8px #ef4444'
                : isApproaching
                ? '0 0 6px #f59e0b'
                : '0 0 4px rgba(254, 240, 138, 0.4)',
              minWidth: isApproaching || isWarning ? '30px' : '22px',
            }}
          >
            {timeText}
          </span>
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.stampede.phase !== next.stampede.phase) return false;
    if (next.stampede.phase === 'cooldown') return true;

    if (next.stampede.phase === 'idle') {
      const isAppNext = isStampedeApproaching(next.stampede);
      const isAppPrev = isStampedeApproaching(prev.stampede);
      if (isAppNext !== isAppPrev) return false;
      if (isAppNext) {
        return prev.stampede.nextStampedeIn.toFixed(1) === next.stampede.nextStampedeIn.toFixed(1);
      }
      return Math.ceil(prev.stampede.nextStampedeIn) === Math.ceil(next.stampede.nextStampedeIn);
    }

    if (next.stampede.phase === 'warning') {
      return prev.stampede.phaseTimer.toFixed(1) === next.stampede.phaseTimer.toFixed(1);
    }

    return prev.stampede.rushProgress === next.stampede.rushProgress;
  }
);
