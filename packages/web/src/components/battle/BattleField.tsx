import React from 'react';
import type { Unit, SpellEffect, AttackEffect, CpuSpawnWarning, DemoCard } from '../../app/types';
import { styles } from '../../app/page.styles';
import { RenderUnit } from '../units/RenderUnit';
import { RenderAttackEffect } from '../effects/RenderAttackEffect';

interface BattleFieldProps {
  units: Unit[];
  spellEffects: SpellEffect[];
  attackEffects: AttackEffect[];
  cpuSpawnWarnings: CpuSpawnWarning[];
  selectedCard: DemoCard | null;
  selectedCardIndex: number | null;
  activeDraggedCard: DemoCard | null;
  draggedCardIndex: number | null;
  isDragging: boolean;
  dragOverLaneIndex: number | null;
  spawnRippleLane: number | null;
  playerMana: number;
  checkCanPlayCard: (idx: number, laneIndex?: number) => { canPlay: boolean; reason?: string };
  playCardOnLane: (laneIndex: number) => void;
  handleLaneDragOver: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDragLeave: (e: React.DragEvent, laneIndex: number) => void;
  handleLaneDrop: (e: React.DragEvent, laneIndex: number) => void;
  setDragOverLaneIndex: (laneIndex: number | null) => void;
}

export function BattleField({
  units,
  spellEffects,
  attackEffects,
  cpuSpawnWarnings,
  selectedCard,
  selectedCardIndex,
  activeDraggedCard,
  draggedCardIndex,
  isDragging,
  dragOverLaneIndex,
  spawnRippleLane,
  playerMana,
  checkCanPlayCard,
  playCardOnLane,
  handleLaneDragOver,
  handleLaneDragLeave,
  handleLaneDrop,
  setDragOverLaneIndex,
}: BattleFieldProps) {
  return (
            <div style={styles.fieldGrid}>
              {[0, 1, 2, 3, 4].map((laneIndex) => {
                const laneUnits = units.filter((u) => u.lane === laneIndex);
                const laneSpells = spellEffects.filter(
                  (e) => e.lane === laneIndex || e.lane === -1
                );
                const laneAttackEffects = attackEffects.filter((e) => e.lane === laneIndex);
                const activeCard = isDragging ? activeDraggedCard : selectedCard;
                const activeCardIdx = isDragging ? draggedCardIndex : selectedCardIndex;
                const laneValidation = activeCard && activeCardIdx !== null
                  ? checkCanPlayCard(activeCardIdx, laneIndex)
                  : { canPlay: true };
                const isBlocked = !laneValidation.canPlay;
                const isSpaceBlocked = isBlocked && laneValidation.reason === '出撃スペース不足';
                const isOtherBlocked = isBlocked && !isSpaceBlocked;
  
                const canAfford = selectedCard && playerMana >= selectedCard.manaCost;
                const isHoveredDrop = isDragging && dragOverLaneIndex === laneIndex;
                const isDroppableTarget = isDragging && activeDraggedCard && playerMana >= activeDraggedCard.manaCost && !isBlocked;
                const isRippling = spawnRippleLane === laneIndex;
  
                return (
                  <div
                    key={laneIndex}
                    data-lane-index={laneIndex}
                    onClick={() => playCardOnLane(laneIndex)}
                    onDragOver={(e) => handleLaneDragOver(e, laneIndex)}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (dragOverLaneIndex !== laneIndex) setDragOverLaneIndex(laneIndex);
                    }}
                    onDragLeave={(e) => handleLaneDragLeave(e, laneIndex)}
                    onDrop={(e) => handleLaneDrop(e, laneIndex)}
                    style={{
                      ...styles.lane,
                      backgroundColor: isHoveredDrop
                        ? isOtherBlocked
                          ? 'rgba(239, 68, 68, 0.35)'
                          : isSpaceBlocked
                          ? 'rgba(30, 41, 59, 0.75)'
                          : 'rgba(30, 58, 138, 0.45)'
                        : isDroppableTarget
                        ? 'rgba(30, 58, 138, 0.16)'
                        : selectedCard && canAfford && !isBlocked
                        ? 'rgba(30, 58, 138, 0.28)'
                        : selectedCard && isOtherBlocked
                        ? 'rgba(239, 68, 68, 0.12)'
                        : selectedCard && isSpaceBlocked
                        ? 'rgba(30, 41, 59, 0.5)'
                        : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isHoveredDrop
                        ? isOtherBlocked
                          ? '#ef4444'
                          : isSpaceBlocked
                          ? '#f97316'
                          : '#60a5fa'
                        : isDroppableTarget
                        ? 'rgba(96, 165, 250, 0.65)'
                        : selectedCard && canAfford && !isBlocked
                        ? '#3b82f6'
                        : selectedCard && isOtherBlocked
                        ? 'rgba(239, 68, 68, 0.5)'
                        : selectedCard && isSpaceBlocked
                        ? 'rgba(249, 115, 22, 0.45)'
                        : '#334155',
                      borderStyle: isDroppableTarget && !isHoveredDrop ? 'dashed' : 'solid',
                      borderWidth: isHoveredDrop ? '2px' : '1px',
                      cursor: isHoveredDrop && isBlocked
                        ? 'not-allowed'
                        : isDroppableTarget
                        ? 'copy'
                        : selectedCard && canAfford && !isBlocked
                        ? 'pointer'
                        : 'default',
                      boxShadow: isHoveredDrop
                        ? isOtherBlocked
                          ? 'inset 0 0 24px rgba(239, 68, 68, 0.5), 0 0 16px rgba(239, 68, 68, 0.4)'
                          : isSpaceBlocked
                          ? 'inset 0 0 16px rgba(249, 115, 22, 0.35), 0 0 12px rgba(249, 115, 22, 0.3)'
                          : 'inset 0 0 24px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.4)'
                        : isRippling
                        ? 'inset 0 0 24px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.4)'
                        : selectedCard && canAfford && !isBlocked
                        ? 'inset 0 0 16px rgba(59, 130, 246, 0.25)'
                        : 'none',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {/* レーン番号（上部） */}
                    <div style={styles.laneNumberTop}>L{laneIndex + 1}</div>
  
                    {/* レーン中央ガイドライン */}
                    <div style={styles.laneTrackLine} />
  
                    {/* CPU召喚予兆（詠唱魔方陣・インジケーター） */}
                    {cpuSpawnWarnings
                      .filter((w) => w.lane === laneIndex)
                      .map((w) => (
                        <div
                          key={w.id}
                          style={{
                            ...styles.cpuSpawnCircle,
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
  
                    {/* レーン上のユニット描画 */}
                    {laneUnits.map((unit) => (
                      <RenderUnit
                        key={unit.id}
                        unit={unit}
                        isBlockingSpawn={isSpaceBlocked && unit.owner === 'player' && unit.y > 87}
                      />
                    ))}
  
                    {/* スペル演出 */}
                    {laneSpells.map((spell) => (
                      <div
                        key={spell.id}
                        style={{
                          ...styles.spellBlast,
                          top: `${spell.y}%`,
                          ...(spell.type === 'burn' ? styles.spellBurn : {}),
                          ...(spell.type === 'haste' ? styles.spellHaste : {}),
                          ...(spell.type === 'heal' ? styles.spellHeal : {}),
                          animation: spell.type === 'meteor'
                            ? 'meteor-spell-anim 0.8s ease-out forwards'
                            : spell.type === 'burn'
                            ? 'burn-spell-anim 1s ease-out forwards'
                            : spell.type === 'haste'
                            ? 'haste-spell-anim 0.6s ease-out forwards'
                            : spell.type === 'heal'
                            ? 'heal-spell-anim 1s ease-out forwards'
                            : undefined,
                        }}
                      >
                        {spell.type === 'meteor'
                          ? '💥 隕石着弾!!'
                          : spell.type === 'burn'
                          ? '🔥 烈火!!'
                          : spell.type === 'haste'
                          ? '💨 疾風!!'
                          : '🌧️ 癒やし!!'}
                      </div>
                    ))}
  
                    {/* 攻撃エフェクト（弾道・斬撃・着弾・ダメージポップアップ） */}
                    {laneAttackEffects.map((effect) => (
                      <RenderAttackEffect key={effect.id} effect={effect} />
                    ))}
  
                    {/* 自陣手前出撃ゾーン（モンスター選択・ドラッグ時の手前空間ビジュアル） */}
                    {activeCard && activeCard.type === 'MONSTER' && (
                      <>
                        {isSpaceBlocked ? (
                          <div className="spawn-zone-blocked">
                            <div
                              style={{
                                fontSize: '9px',
                                color: '#fee2e2',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                backgroundColor: 'rgba(185, 28, 28, 0.88)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                                whiteSpace: 'nowrap',
                                border: '1px solid rgba(254, 202, 202, 0.4)',
                              }}
                            >
                              <span>🚫</span>
                              <span>手前詰まり・前進待ち</span>
                            </div>
                          </div>
                        ) : (
                          !isBlocked &&
                          (isHoveredDrop || isDroppableTarget || (selectedCard && canAfford)) && (
                            <div className="spawn-zone-ready">
                              <div
                                style={{
                                  fontSize: '9px',
                                  color: '#93c5fd',
                                  fontWeight: 'bold',
                                  opacity: 0.85,
                                  letterSpacing: '0.5px',
                                }}
                              >
                                出撃エリア
                              </div>
                            </div>
                          )
                        )}
                      </>
                    )}
  
                    {/* ドラッグ＆ドロップ時のターゲットガイド */}
                    {isHoveredDrop && activeDraggedCard && (
                      <div
                        style={{
                          ...styles.summonGuideBadge,
                          backgroundColor: isOtherBlocked
                            ? '#ef4444'
                            : isSpaceBlocked
                            ? '#ea580c'
                            : activeDraggedCard.type === 'SPELL'
                            ? '#ea580c'
                            : '#2563eb',
                          boxShadow: isOtherBlocked
                            ? '0 0 14px rgba(239, 68, 68, 0.9)'
                            : isSpaceBlocked
                            ? '0 0 14px rgba(234, 88, 12, 0.9)'
                            : activeDraggedCard.type === 'SPELL'
                            ? '0 0 14px rgba(234, 88, 12, 0.9)'
                            : '0 0 14px rgba(37, 99, 235, 0.9)',
                        }}
                      >
                        {isBlocked
                          ? `🚫 ${laneValidation.reason}`
                          : activeDraggedCard.type === 'SPELL'
                          ? '✨ ドロップ発動'
                          : '🎯 ドロップ出撃'}
                      </div>
                    )}
  
                    {/* 他のレーンのドロップヒント（ドラッグ中） */}
                    {isDroppableTarget && !isHoveredDrop && (
                      <div style={styles.dropZoneHint}>
                        ⬇️ ここに配置
                      </div>
                    )}
  
                    {/* クリック選択時の出撃ガイド（ドラッグしていない時のみ） */}
                    {!isDragging && selectedCard && canAfford && (
                      <div
                        style={{
                          ...styles.summonGuideBadge,
                          backgroundColor: isOtherBlocked
                            ? '#ef4444'
                            : isSpaceBlocked
                            ? '#ea580c'
                            : '#2563eb',
                        }}
                      >
                        {isBlocked ? `🚫 ${laneValidation.reason}` : '▲ 出撃'}
                      </div>
                    )}
  
                    {/* レーン番号（下部） */}
                    <div style={styles.laneNumberBottom}>L{laneIndex + 1}</div>
                  </div>
                );
              })}
            </div>
  
  );
}
