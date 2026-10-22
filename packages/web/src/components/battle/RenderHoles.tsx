import React from 'react';
import { HOLES, HOLE_RADIUS_Y, HOLE_WIN_SCORE } from '../../app/holes';

/** 両端の得点ホールとスコア表示 */
export function RenderHoles({ playerScore = 0, cpuScore = 0 }: { playerScore?: number; cpuScore?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {(['left', 'right'] as const).flatMap((side) =>
        HOLES.map((h) => (
          <div
            key={`${side}_${h.y}`}
            style={{
              position: 'absolute',
              [side]: '-1.2%',
              top: `${h.y - HOLE_RADIUS_Y}%`,
              height: `${HOLE_RADIUS_Y * 2}%`,
              width: '5%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #020617 40%, rgba(251,191,36,0.35) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fde68a',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {h.points}
          </div>
        ))
      )}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#fde68a',
          background: 'rgba(2, 6, 23, 0.7)',
          padding: '1px 8px',
          borderRadius: '8px',
        }}
      >
        ⛳ {playerScore} - {cpuScore} （先取 {HOLE_WIN_SCORE}）
      </div>
    </div>
  );
}