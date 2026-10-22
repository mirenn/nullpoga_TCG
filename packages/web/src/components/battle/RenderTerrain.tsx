import React, { useEffect, useState } from 'react';
import { FIELD_TERRAIN_ZONES, TerrainZone, resetRoadFlow, turnRoadPanel } from '../../app/terrain';

export interface RenderTerrainProps {
  zones?: TerrainZone[];
}

export function RenderTerrain({ zones = FIELD_TERRAIN_ZONES }: RenderTerrainProps) {
  const [, rerender] = useState(0);
  useEffect(() => { resetRoadFlow(); rerender((n) => n + 1); }, []);
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
              onClick={() => { turnRoadPanel(zone); rerender((n) => n + 1); }}
              title="クリックで矢印を時計回りに回す"
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                background: 'rgba(148, 163, 184, 0.14)',
                outline: '1px dashed rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 矢印: 0:上 1:右 2:下 3:左。回転時に滑らかに向きが変わる */}
              <span
                style={{
                  fontSize: '14px',
                  color: 'rgba(251, 191, 36, 0.75)',
                  transform: `rotate(${zone.spin ?? (zone.flowDir ?? 0) * 90}deg)`,
                  transition: 'transform 0.6s ease-in-out',
                }}
              >
                ↑
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
