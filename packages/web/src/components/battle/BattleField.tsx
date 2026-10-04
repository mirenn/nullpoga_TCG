import React, { useRef, useState, useCallback } from 'react';
import type { Unit, SpellEffect, AttackEffect, CpuSpawnWarning, DemoCard, Inhibitor } from '../../app/types';
import { styles } from '../../app/page.styles';
import { RenderUnit } from '../units/RenderUnit';
import { RenderAttackEffect } from '../effects/RenderAttackEffect';
import { RenderInhibitor } from './RenderInhibitor';
import { clampSpawnX, SPELL_RADIUS_X, SPAWN_X_MIN, SPAWN_X_MAX } from '../../app/board';
import { INHIBITOR_SLOTS } from '../../app/inhibitors';

export interface BattleFieldProps {
  units: Unit[];
  inhibitors: Inhibitor[];
  spellEffects: SpellEffect[];
  attackEffects: AttackEffect[];
  cpuSpawnWarnings: CpuSpawnWarning[];
  selectedCard: DemoCard | null;
  selectedCardIndex: number | null;
  activeDraggedCard: DemoCard | null;
  draggedCardIndex: number | null;
  isDragging: boolean;
  playerMana: number;
  checkCanPlayCard: (idx: number, spawnX?: number) => { canPlay: boolean; reason?: string };
  playCardAtX: (spawnX: number, cardIndexOverride?: number) => void;
  // 互換用（オプショナル）
  playCardOnLane?: (laneIndex: number, cardIndexOverride?: number) => void;
  dragOverLaneIndex?: number | null;
  spawnRippleLane?: number | null;
  handleLaneDragOver?: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDragLeave?: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDrop?: (e: React.DragEvent, laneIndex: number) => void;
  setDragOverLaneIndex?: (laneIndex: number | null) => void;
}

export function BattleField({
  units,
  inhibitors,
  spellEffects,
  attackEffects,
  cpuSpawnWarnings,
  selectedCard,
  selectedCardIndex,
  activeDraggedCard,
  draggedCardIndex,
  isDragging,
  playerMana,
  checkCanPlayCard,
  playCardAtX,
}: BattleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [rippleX, setRippleX] = useState<number | null>(null);

  // マウス/タッチ座標からフィールドの横パーセント (SPAWN_X_MIN〜SPAWN_X_MAX) を算出
  const calculateXPercent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 50;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    return clampSpawnX(rawPct);
  }, []);

  // ホバー追従
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const x = calculateXPercent(e.clientX);
    setHoverX(x);
  };

  const handlePointerLeave = () => {
    setHoverX(null);
  };

  // フィールドクリック時の出撃
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    if (selectedCardIndex === null || !selectedCard) return;
    const x = calculateXPercent(e.clientX);
    const validation = checkCanPlayCard(selectedCardIndex, x);
    if (validation.canPlay) {
      playCardAtX(x, selectedCardIndex);
      triggerRipple(x);
    }
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const x = calculateXPercent(e.clientX);
    setHoverX(x);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setHoverX(null);
    }
  };

  // ドロップ時の出撃
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const cardIdx = data !== '' ? parseInt(data, 10) : draggedCardIndex;
    if (cardIdx !== null && cardIdx !== undefined && !isNaN(cardIdx)) {
      const x = calculateXPercent(e.clientX);
      const validation = checkCanPlayCard(cardIdx, x);
      if (validation.canPlay) {
        playCardAtX(x, cardIdx);
        triggerRipple(x);
      }
    }
    setHoverX(null);
  };

  const triggerRipple = (x: number) => {
    setRippleX(x);
    setTimeout(() => setRippleX(null), 500);
  };

  const activeCard = isDragging ? activeDraggedCard : selectedCard;
  const activeCardIdx = isDragging ? draggedCardIndex : selectedCardIndex;
  const currentTargetX = hoverX ?? 50;
  const validation = activeCard && activeCardIdx !== null
    ? checkCanPlayCard(activeCardIdx, currentTargetX)
    : { canPlay: true };
  const canAfford = activeCard ? playerMana >= activeCard.manaCost : false;
  const isTargetBlocked = !validation.canPlay;
  const isSpaceBlocked = isTargetBlocked && validation.reason === '出撃スペース不足';

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minHeight: '220px',
        position: 'relative',
        margin: '4px 0',
        borderRadius: '8px',
        border: '1px solid #334155',
        backgroundColor: '#0a0f1d',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.12) 0%, transparent 70%),
          linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 20px 20px, 20px 20px',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: activeCard ? (validation.canPlay ? 'crosshair' : 'not-allowed') : 'default',
        boxShadow: activeCard
          ? 'inset 0 0 20px rgba(59, 130, 246, 0.2), 0 0 10px rgba(15, 23, 42, 0.8)'
          : 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
      }}
      data-field="battle-arena"
    >
      {/* 互換用レーンスロット（旧テスト・セレクタ対応） */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
        const slotX = 10 + idx * 10;
        return (
          <div
            key={`compat_lane_${idx}`}
            data-lane-index={idx}
            style={{
              position: 'absolute',
              left: `${slotX - 5}%`,
              width: '10%',
              top: 0,
              bottom: 0,
              opacity: 0,
            }}
          />
        );
      })}

      {/* 1. フィールド背景ガイドライン */}
      {/* 敵陣ベースライン (y=5%) */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(239, 68, 68, 0.25)',
          borderBottom: '1px dashed rgba(239, 68, 68, 0.4)',
          pointerEvents: 'none',
        }}
      />
      {/* 中央境界ライン (y=50%) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(148, 163, 184, 0.15)',
          borderBottom: '1px dashed rgba(148, 163, 184, 0.25)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '9px',
            color: 'rgba(148, 163, 184, 0.35)',
            letterSpacing: '2px',
            fontWeight: 'bold',
          }}
        >
          MIDLINE
        </span>
      </div>
      {/* 自陣召喚ベースライン (y=95%) */}
      <div
        style={{
          position: 'absolute',
          top: '95%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          borderBottom: '1px dashed rgba(59, 130, 246, 0.4)',
          pointerEvents: 'none',
        }}
      />

      {/* 3基のインヒビター進軍パスライン（薄い垂直ガイド） */}
      {INHIBITOR_SLOTS.map((slot) => (
        <div
          key={slot.key}
          style={{
            position: 'absolute',
            left: `${slot.x}%`,
            top: 0,
            bottom: 0,
            width: '1px',
            borderLeft: '1px dashed rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '8px',
              color: 'rgba(148, 163, 184, 0.4)',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {slot.key.toUpperCase()}
          </span>
        </div>
      ))}

      {/* 2. インヒビター（6基） */}
      {inhibitors.map((inhib) => (
        <RenderInhibitor key={inhib.id} inhibitor={inhib} />
      ))}

      {/* 3. CPU召喚予兆（詠唱魔方陣・インジケーター） */}
      {cpuSpawnWarnings.map((w) => (
        <div
          key={w.id}
          style={{
            ...styles.cpuSpawnCircle,
            left: `${w.x}%`,
            top: '5%',
          }}
          className="cpu-spawn-pulse"
          title={`相手の召喚予告: ${w.card.name}`}
        >
          <div style={styles.cpuSpawnRing} />
          <span style={styles.cpuSpawnIcon}>{w.card.icon}</span>
          <div style={styles.cpuSpawnBadge}>召喚予兆</div>
        </div>
      ))}

      {/* 4. フィールド上のユニット描画 */}
      {units.map((unit) => (
        <RenderUnit
          key={unit.id}
          unit={unit}
          isBlockingSpawn={isSpaceBlocked && unit.owner === 'player' && unit.y > 87}
        />
      ))}

      {/* 5. スペル演出 */}
      {spellEffects.map((spell) => {
        if (spell.type === 'meteor') {
          return (
            <div
              key={spell.id}
              style={{
                position: 'absolute',
                top: `${spell.y}%`,
                left: `${spell.x}%`,
                transform: 'translate(-50%, -50%)',
                width: `${SPELL_RADIUS_X * 2}%`,
                height: '38%',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            >
              {/* 予告円 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(239, 68, 68, 0.3)',
                  border: '2px solid rgba(239, 68, 68, 0.8)',
                  borderRadius: '50%',
                  animation: 'meteor-indicator-anim 1s ease-out forwards',
                }}
              />
              {/* 降ってくる隕石 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '32px',
                  animation: 'meteor-falling-anim 1s ease-in forwards',
                  zIndex: 31,
                }}
              >
                ☄️
              </div>
              {/* 爆発 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '40px',
                  animation: 'meteor-explosion-anim 1s ease-out forwards',
                  zIndex: 32,
                }}
              >
                💥
              </div>
            </div>
          );
        }

        return (
          <div
            key={spell.id}
            style={{
              ...styles.spellBlast,
              left: `${spell.x}%`,
              top: `${spell.y}%`,
              transform: 'translate(-50%, -50%)',
              ...(spell.type === 'burn' ? styles.spellBurn : {}),
              ...(spell.type === 'haste' ? styles.spellHaste : {}),
              ...(spell.type === 'heal' ? styles.spellHeal : {}),
              animation: spell.type === 'burn'
                ? 'burn-spell-anim 1s ease-out forwards'
                : spell.type === 'haste'
                ? 'haste-spell-anim 0.6s ease-out forwards'
                : spell.type === 'heal'
                ? 'heal-spell-anim 1s ease-out forwards'
                : undefined,
              pointerEvents: 'none',
              zIndex: 35,
            }}
          >
            {spell.type === 'burn'
              ? '🔥 烈火!!'
              : spell.type === 'haste'
              ? '💨 疾風!!'
              : '🌧️ 癒やし!!'}
          </div>
        );
      })}

      {/* 6. 攻撃エフェクト（弾道・斬撃・着弾・ダメージポップアップ） */}
      {attackEffects.map((effect) => (
        <RenderAttackEffect key={effect.id} effect={effect} />
      ))}

      {/* 7. 出撃波紋エフェクト */}
      {rippleX !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: `${rippleX}%`,
            transform: 'translate(-50%, 50%)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid #38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.25)',
            pointerEvents: 'none',
            zIndex: 25,
            animation: 'shockwavePing 0.5s ease-out forwards',
          }}
        />
      )}

      {/* 8. 自陣手前出撃ゾーン（アクティブカード選択中・ドラッグ中の下部発光） */}
      {activeCard && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${SPAWN_X_MIN}%`,
            right: `${100 - SPAWN_X_MAX}%`,
            height: '18%',
            backgroundColor: 'rgba(30, 58, 138, 0.08)',
            borderTop: '1px dashed rgba(59, 130, 246, 0.35)',
            pointerEvents: 'none',
            zIndex: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(147, 197, 253, 0.5)',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            DEPLOY ZONE (クリック / ドロップで出撃)
          </span>
        </div>
      )}

      {/* 9. 照準カーソル / 出撃プレビュー（ホバー・ドラッグ追従） */}
      {hoverX !== null && activeCard && (
        <>
          {/* 垂直照準ライン */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${hoverX}%`,
              width: '2px',
              transform: 'translateX(-50%)',
              backgroundColor: isTargetBlocked
                ? 'rgba(239, 68, 68, 0.65)'
                : 'rgba(56, 189, 248, 0.65)',
              boxShadow: isTargetBlocked
                ? '0 0 10px rgba(239, 68, 68, 0.8)'
                : '0 0 10px rgba(56, 189, 248, 0.8)',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />

          {/* 出撃位置の照準ターゲットサークル (y=95% = 自陣ベース) */}
          <div
            style={{
              position: 'absolute',
              top: activeCard.type === 'SPELL' ? '50%' : '95%',
              left: `${hoverX}%`,
              transform: 'translate(-50%, -50%)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: `2px solid ${isTargetBlocked ? '#ef4444' : '#38bdf8'}`,
              backgroundColor: isTargetBlocked
                ? 'rgba(239, 68, 68, 0.25)'
                : 'rgba(56, 189, 248, 0.25)',
              boxShadow: isTargetBlocked
                ? '0 0 16px rgba(239, 68, 68, 0.8)'
                : '0 0 16px rgba(56, 189, 248, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 22,
            }}
          >
            <span style={{ fontSize: '18px' }}>{activeCard.icon}</span>
          </div>

          {/* ガイドバッジ（出撃可能 / 理由表示） */}
          <div
            style={{
              position: 'absolute',
              top: activeCard.type === 'SPELL' ? '40%' : '86%',
              left: `${hoverX}%`,
              transform: 'translateX(-50%)',
              backgroundColor: isTargetBlocked
                ? isSpaceBlocked
                  ? '#ea580c'
                  : '#ef4444'
                : activeCard.type === 'SPELL'
                ? '#8b5cf6'
                : '#2563eb',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
              pointerEvents: 'none',
              zIndex: 25,
              whiteSpace: 'nowrap',
            }}
          >
            {isTargetBlocked
              ? `🚫 ${validation.reason}`
              : isDragging
              ? activeCard.type === 'SPELL'
                ? '✨ ドロップ発動'
                : '🎯 ドロップ出撃'
              : activeCard.type === 'SPELL'
              ? '✨ クリック発動'
              : '🎯 クリック出撃'}
          </div>
        </>
      )}
    </div>
  );
}
