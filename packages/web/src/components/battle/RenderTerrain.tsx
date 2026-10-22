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
                // 矢印の先端側ほど明るいグラデーション。ユニットが矢印を隠しても向きが分かる
                background: `linear-gradient(${['to top', 'to right', 'to bottom', 'to left'][zone.flowDir ?? 0]}, rgba(251, 191, 36, 0.02) 0%, rgba(251, 191, 36, 0.4) 100%)`,
                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', // 菱形。矢印は回さず上下左右のまま
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '25%', // 矢印4つを菱形の内側に収める
                placeItems: 'center',
              }}
            >
              {/* 矢印は4つ並べ、1体のユニットで全部は隠れないようにする。0:上 1:右 2:下 3:左 */}
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'rgba(253, 224, 71, 0.95)',
                    textShadow: '0 0 3px rgba(0, 0, 0, 0.9)',
                    transform: `rotate(${zone.spin ?? (zone.flowDir ?? 0) * 90}deg)`,
                    transition: 'transform 0.6s ease-in-out',
                  }}
                >
                  ↑
                </span>
              ))}
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
