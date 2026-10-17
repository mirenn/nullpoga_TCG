import React from 'react';
import type { Inhibitor } from '../../app/types';
import { INHIBITOR_DESTROY_MANA_BONUS, INHIBITOR_REGEN_BONUS_PER_KILL } from '../../app/inhibitors';

/**
 * インヒビター（破壊可能な非攻撃オブジェクト）の描画
 * - 生存中: クリスタル + HPバー（被弾時にフラッシュ）
 * - 破壊後: 瓦礫表示（通行可能）
 */
export const RenderInhibitor = React.memo(function RenderInhibitor({ inhibitor }: { inhibitor: Inhibitor }) {
  const isPlayer = inhibitor.owner === 'player';
  const isDestroyed = inhibitor.hp <= 0;
  const isRecentlyHit = Boolean(inhibitor.lastHitTime && Date.now() - inhibitor.lastHitTime < 180);
  const color = isPlayer ? '#38bdf8' : '#f43f5e';
  const hpRatio = Math.max(0, inhibitor.hp / inhibitor.maxHp);
  const rewardPct = Math.round(INHIBITOR_REGEN_BONUS_PER_KILL * 100);

  return (
    <div
      data-inhibitor-id={inhibitor.id}
      data-inhibitor-hp={inhibitor.hp}
      title={
        isDestroyed
          ? `${isPlayer ? '自軍' : '敵'}インヒビター（破壊済み）`
          : `${isPlayer ? '自軍' : '敵'}インヒビター HP ${inhibitor.hp}/${inhibitor.maxHp}\n破壊すると ⚡+${INHIBITOR_DESTROY_MANA_BONUS} & マナ回復 +${rewardPct}%`
      }
      style={{
        position: 'absolute',
        top: `${inhibitor.y}%`,
        left: `${inhibitor.x}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 8,
      }}
    >
      {isDestroyed ? (
        <div style={{ fontSize: '18px', opacity: 0.45, filter: 'grayscale(0.8)' }}>🪨</div>
      ) : (
        <>
          <div
            style={{
              width: '30px',
              height: '4px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '2px',
            }}
          >
            <div
              style={{
                width: `${hpRatio * 100}%`,
                height: '100%',
                backgroundColor: color,
                transition: 'width 0.15s',
              }}
            />
          </div>
          <div
            style={{
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(45deg)',
              borderRadius: '5px',
              border: `2px solid ${color}`,
              background: isRecentlyHit
                ? 'rgba(255,255,255,0.85)'
                : isPlayer
                ? 'radial-gradient(circle, rgba(56,189,248,0.55), rgba(15,23,42,0.9))'
                : 'radial-gradient(circle, rgba(244,63,94,0.55), rgba(15,23,42,0.9))',
              boxShadow: `0 0 10px ${color}`,
              transition: 'background 0.1s',
            }}
          >
            <span
              style={{
                transform: 'rotate(-45deg)',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              {inhibitor.hp}
            </span>
          </div>
        </>
      )}
    </div>
  );
});

