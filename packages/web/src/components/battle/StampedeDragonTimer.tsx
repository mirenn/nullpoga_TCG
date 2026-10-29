import React from 'react';
import type { StampedeState } from '../../app/types';
import { isStampedeApproaching } from '../../app/stampede';

interface StampedeDragonTimerProps {
  stampede: StampedeState;
  onFocusStampedeZone?: () => void;
}

/**
 * 巨獣スタンピード・コンパクトタイマーチップ
 * 上部カメラ操作バー内に馴染む控えめなピル型表示。
 * 通常時はスレートグレーで静かに秒数を示し、接近・警報時のみ穏やかに色づく。
 */
export const StampedeDragonTimer: React.FC<StampedeDragonTimerProps> = React.memo(
  function StampedeDragonTimer({ stampede, onFocusStampedeZone }) {
    const { phase, phaseTimer, nextStampedeIn } = stampede;
    const isApproaching = isStampedeApproaching(stampede);
    const isWarning = phase === 'warning';
    const isRush = phase === 'rush';
    const isCooldown = phase === 'cooldown';

    let badgeBg = '#1e293b';
    let badgeBorder = '1px solid #475569';
    let textColor = '#94a3b8';
    let timeColor = '#cbd5e1';
    let icon = '🦣';
    let timeText = `${Math.ceil(nextStampedeIn)}s`;

    if (isCooldown) {
      badgeBg = 'rgba(20, 83, 45, 0.35)';
      badgeBorder = '1px solid rgba(34, 197, 94, 0.45)';
      textColor = '#86efac';
      timeColor = '#bbf7d0';
      timeText = '通過';
    } else if (isRush) {
      badgeBg = 'rgba(154, 52, 18, 0.5)';
      badgeBorder = '1px solid rgba(251, 146, 60, 0.65)';
      textColor = '#fdba74';
      timeColor = '#ffedd5';
      timeText = '突進中';
    } else if (isWarning) {
      badgeBg = 'rgba(153, 27, 27, 0.55)';
      badgeBorder = '1px solid rgba(248, 113, 113, 0.75)';
      textColor = '#fca5a5';
      timeColor = '#fee2e2';
      icon = '🚨';
      timeText = `${Math.ceil(phaseTimer)}s`;
    } else if (isApproaching) {
      badgeBg = 'rgba(180, 83, 9, 0.35)';
      badgeBorder = '1px solid rgba(245, 158, 11, 0.6)';
      textColor = '#fcd34d';
      timeColor = '#fef3c7';
      icon = '⚠️';
      timeText = `${Math.ceil(nextStampedeIn)}s`;
    }

    return (
      <button
        type="button"
        onClick={onFocusStampedeZone}
        title={onFocusStampedeZone ? '巨獣スタンピードタイマー（クリックで視点を中央へ）' : '巨獣スタンピードタイマー'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: badgeBg,
          border: badgeBorder,
          borderRadius: '999px',
          padding: '2px 7px',
          fontSize: '9.5px',
          fontWeight: 'bold',
          color: textColor,
          cursor: onFocusStampedeZone ? 'pointer' : 'default',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{icon} 巨獣</span>
        <span
          style={{
            fontFamily: 'monospace',
            color: timeColor,
            minWidth: '18px',
            textAlign: 'right',
          }}
        >
          {timeText}
        </span>
      </button>
    );
  },
  (prev, next) => {
    if (prev.stampede.phase !== next.stampede.phase) return false;
    if (next.stampede.phase === 'cooldown' || next.stampede.phase === 'rush') return true;
    if (next.stampede.phase === 'warning') {
      return Math.ceil(prev.stampede.phaseTimer) === Math.ceil(next.stampede.phaseTimer);
    }
    return (
      isStampedeApproaching(prev.stampede) === isStampedeApproaching(next.stampede) &&
      Math.ceil(prev.stampede.nextStampedeIn) === Math.ceil(next.stampede.nextStampedeIn)
    );
  }
);
