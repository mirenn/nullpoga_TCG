import React, { useEffect, useState } from 'react';
import {
  FIELD_TERRAIN_ZONES,
  TerrainZone,
  resetRoadFlow,
  turnRoadPanel,
  getRoadNextRotateIn,
  getRoadProgress,
} from '../../app/terrain';

export interface RenderTerrainProps {
  zones?: TerrainZone[];
}

/** 向き別のアクセントカラー (0:上=シアン, 1:右=ゴールド, 2:下=オレンジ, 3:左=パープル) */
const DIR_THEMES = [
  { gradientDir: 'to top', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.32)', shadow: 'rgba(56, 189, 248, 0.8)', name: '上' },
  { gradientDir: 'to right', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.32)', shadow: 'rgba(251, 191, 36, 0.8)', name: '右' },
  { gradientDir: 'to bottom', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.32)', shadow: 'rgba(251, 146, 60, 0.8)', name: '下' },
  { gradientDir: 'to left', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.32)', shadow: 'rgba(192, 132, 252, 0.8)', name: '左' },
] as const;

export function RenderTerrain({ zones = FIELD_TERRAIN_ZONES }: RenderTerrainProps) {
  const [, rerender] = useState(0);
  useEffect(() => { resetRoadFlow(); rerender((n) => n + 1); }, []);

  const progress = getRoadProgress();
  const nextRotateIn = getRoadNextRotateIn();
  const isUrgent = nextRotateIn <= 0.8;
  const isWarning = nextRotateIn <= 2.0;

  // 円周 2 * PI * 13 ≈ 81.68
  const RING_CIRCUMFERENCE = 81.68;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1, // レーンのベース、ユニットや障害物の下
      }}
    >
      <style>{`
        @keyframes swampPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.02); }
        }
        @keyframes rotateWarningPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1.0; transform: scale(1.08); filter: brightness(1.25); }
        }
        @keyframes rotateUrgentPulse {
          0%, 100% { opacity: 0.7; transform: scale(0.96); }
          50% { opacity: 1.0; transform: scale(1.14); filter: brightness(1.4); }
        }
      `}</style>

      {zones.map((zone) => {
        const left = zone.x - zone.width / 2;
        const top = zone.y - zone.height / 2;

        if (zone.type === 'road') {
          const dir = (zone.flowDir ?? 0) % 4;
          const theme = DIR_THEMES[dir];
          const anim = isUrgent
            ? 'rotateUrgentPulse 0.32s ease-in-out infinite'
            : isWarning
            ? 'rotateWarningPulse 0.64s ease-in-out infinite'
            : undefined;

          return (
            <div
              key={zone.id}
              onClick={() => { turnRoadPanel(zone); rerender((n) => n + 1); }}
              title={`矢印タイル [${theme.name}向き] - 回転まで約${nextRotateIn.toFixed(1)}秒 (クリックで時計回りに手動回転)`}
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                boxSizing: 'border-box',
                // 先端側ほど明るいグラデーション（向き別の固有カラー）
                background: `linear-gradient(${theme.gradientDir}, rgba(15, 23, 42, 0.08) 0%, ${theme.bg} 100%)`,
                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                WebkitClipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 中央の大きい太矢印 ＋ タイマープログレスリング */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: anim,
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  style={{ overflow: 'visible', filter: `drop-shadow(0 0 4px ${theme.shadow})` }}
                >
                  {/* 背景タイマーリング */}
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    fill="rgba(15, 23, 42, 0.55)"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.6"
                  />
                  {/* 8秒タイマー進行度リング (時計回りに満ちる) */}
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    fill="none"
                    stroke={isWarning ? '#fef08a' : theme.color}
                    strokeWidth="2.2"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 16 16)"
                    opacity={isWarning ? 1.0 : 0.85}
                  />
                  {/* 大きな太矢印 (方向別色 + スムーズ回転アニメ) */}
                  <g
                    transform={`rotate(${zone.spin ?? dir * 90} 16 16)`}
                    style={{ transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  >
                    <path
                      d="M16 5.5 L7.5 14 L12 14 L12 24.5 L20 24.5 L20 14 L24.5 14 Z"
                      fill={theme.color}
                      stroke="#090d16"
                      strokeWidth="1.2"
                    />
                  </g>
                </svg>
              </div>
            </div>
          );
        }
        if (zone.type === 'swamp') {
          return (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.22) 0%, rgba(20, 83, 45, 0.28) 60%, rgba(20, 83, 45, 0.05) 100%)',
                border: '1px dashed rgba(74, 222, 128, 0.35)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'swampPulse 3.5s ease-in-out infinite',
              }}
            >
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 'bold',
                  color: 'rgba(187, 247, 208, 0.85)',
                  background: 'rgba(20, 83, 45, 0.65)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                🌿 泥沼 (減速 -50%)
              </span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
