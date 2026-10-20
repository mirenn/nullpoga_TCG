import React from 'react';
import { FIELD_TERRAIN_ZONES, TerrainZone } from '../../app/terrain';

export interface RenderTerrainProps {
  zones?: TerrainZone[];
}

export function RenderTerrain({ zones = FIELD_TERRAIN_ZONES }: RenderTerrainProps) {
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
        @keyframes riverFlowDown {
          0% { transform: translateY(-16px); }
          100% { transform: translateY(16px); }
        }
        @keyframes riverFlowUp {
          0% { transform: translateY(16px); }
          100% { transform: translateY(-16px); }
        }
        @keyframes swampPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.02); }
        }
        @keyframes roadDashGlow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {zones.map((zone) => {
        const left = zone.x - zone.width / 2;
        const top = zone.y - zone.height / 2;

        if (zone.type === 'road') {
          return (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                background: 'linear-gradient(180deg, rgba(203, 213, 225, 0.08) 0%, rgba(148, 163, 184, 0.16) 50%, rgba(203, 213, 225, 0.08) 100%)',
                borderTop: '1px dashed rgba(245, 158, 11, 0.4)',
                borderBottom: '1px dashed rgba(245, 158, 11, 0.4)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* 街道の中央進行ガイドライン */}
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <line
                  x1="0"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="rgba(251, 191, 36, 0.28)"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                  style={{ animation: 'roadDashGlow 2.5s linear infinite' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  right: '6%',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  color: 'rgba(251, 191, 36, 0.65)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>⚡ 街道 (加速 +35%)</span>
              </div>
            </div>
          );
        }

        if (zone.type === 'river') {
          const isDownflow = (zone.driftY ?? 0) > 0;
          return (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.12) 0%, rgba(56, 189, 248, 0.28) 50%, rgba(14, 165, 233, 0.12) 100%)',
                borderLeft: '1px solid rgba(56, 189, 248, 0.35)',
                borderRight: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 水流の波紋・矢印アニメーション */}
              <div
                style={{
                  position: 'absolute',
                  inset: -8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  animation: `${isDownflow ? 'riverFlowDown' : 'riverFlowUp'} 1.8s linear infinite`,
                  opacity: 0.6,
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '11px',
                      color: 'rgba(56, 189, 248, 0.7)',
                      lineHeight: 1,
                      filter: 'drop-shadow(0 0 2px rgba(14, 165, 233, 0.8))',
                    }}
                  >
                    {isDownflow ? '▼' : '▲'}
                  </div>
                ))}
              </div>
              <span
                style={{
                  position: 'relative',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  color: 'rgba(224, 242, 254, 0.9)',
                  background: 'rgba(12, 74, 110, 0.6)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                🌊 {zone.name}
              </span>
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
