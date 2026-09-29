import React from 'react';
import type { DemoCard } from '../../app/types';
import { styles } from '../../app/page.styles';

interface PlayerCommandBarProps {
  playerHp: number;
  playerMana: number;
  maxMana: number;
  displayCombo: { count: number; visible: boolean };
  nextCard: DemoCard | null;
  deckCount: number;
  discardCount: number;
  hand: DemoCard[];
  selectedCardIndex: number | null;
  draggedCardIndex: number | null;
  isDragging: boolean;
  gameResult: string;
  checkCanPlayCard: (idx: number) => { canPlay: boolean; reason?: string };
  setSelectedCardIndex: (index: number | null | ((prev: number | null) => number | null)) => void;
  handleDragStart: (e: React.DragEvent, idx: number) => void;
  handleDragEnd: () => void;
}

export function PlayerCommandBar({
  playerHp,
  playerMana,
  maxMana,
  displayCombo,
  nextCard,
  deckCount,
  discardCount,
  hand,
  selectedCardIndex,
  draggedCardIndex,
  isDragging,
  gameResult,
  checkCanPlayCard,
  setSelectedCardIndex,
  handleDragStart,
  handleDragEnd,
}: PlayerCommandBarProps) {
  return (
    <>
                <div style={styles.playerCommandBar}>
                  {/* 自軍HP */}
                  <div style={styles.playerHpSection}>
                    <span style={styles.playerName}>🛡️ 自軍</span>
                    <div style={styles.hpBarBg}>
                      <div
                        style={{
                          ...styles.hpBarFillPlayer,
                          width: `${Math.max(0, (playerHp / 20) * 100)}%`,
                        }}
                      />
                      <span style={styles.hpText}>{playerHp} / 20 HP</span>
                    </div>
                  </div>
      
                  {/* マナゲージ */}
                  <div style={styles.playerManaSection}>
                    <div style={styles.manaInfo}>
                      <span style={styles.manaTitle}>⚡ マナ</span>
                      <span style={styles.manaCount}>
                        <strong>{playerMana.toFixed(1)}</strong> / {maxMana}
                      </span>
                      {/* コンボ表示 */}
                      <div
                        style={{
                          marginLeft: '12px',
                          color: '#f97316',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          textShadow: '0 0 8px #ea580c, 0 0 16px #f97316',
                          opacity: displayCombo.visible ? 1 : 0,
                          transform: displayCombo.visible ? 'scale(1)' : 'scale(0.8)',
                          transition: 'all 0.2s ease-out',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {displayCombo.count >= 3 ? '🔥🔥 ' : '🔥 '}
                        {displayCombo.count} COMBO!
                      </div>
                    </div>
                    <div style={styles.manaBarBg}>
                      <div
                        style={{
                          ...styles.manaBarFill,
                          width: `${(playerMana / maxMana) * 100}%`,
                        }}
                      />
                      <div style={styles.manaTicks}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tick) => (
                          <div key={tick} style={styles.manaTick} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
      
                {/* 4. 手札カードリスト & NEXTドック */}
                <div style={styles.dockContainer} className="dock-container" suppressHydrationWarning>
                  {/* NEXTカードスロット */}
                  <div
                    style={styles.nextCardSlot}
                    className="next-card-slot"
                    suppressHydrationWarning
                    title={nextCard ? `次に引くカード: ${nextCard.name} (⚡${nextCard.manaCost})` : '山札なし'}
                  >
                    <div style={styles.nextBadge}>NEXT</div>
                    {nextCard ? (
                      <div style={styles.nextCardInner}>
                        <div style={styles.nextCardCostBadge}>
                          ⚡{nextCard.manaCost}
                        </div>
                        <span style={styles.nextCardIcon} className="next-card-icon">{nextCard.icon}</span>
                        <div style={styles.nextCardName} className="next-card-name">{nextCard.name}</div>
                      </div>
                    ) : (
                      <div style={styles.nextCardEmpty}>-</div>
                    )}
                    <div style={styles.deckCountBadge} title={`山札: 残り${deckCount}枚 / 捨て札: ${discardCount}枚`}>
                      🎴{deckCount}/15
                    </div>
                  </div>
      
                  {/* 4枚の手札グリッド */}
                  <div style={styles.handGrid} className="hand-grid">
                    {hand.map((card, idx) => {
                      const isSelected = selectedCardIndex === idx;
                      const isBeingDragged = isDragging && draggedCardIndex === idx;
                      const validation = checkCanPlayCard(idx);
                      const canPlay = validation.canPlay;
      
                      return (
                        <div
                          key={`${card.id}_${idx}`}
                          draggable={canPlay && gameResult === 'playing'}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCardIndex(null);
                            } else {
                              setSelectedCardIndex(idx);
                            }
                          }}
                          title={canPlay ? 'ドラッグ＆ドロップ または クリックで配置' : validation.reason}
                          style={{
                            ...styles.card,
                            ...(isSelected ? styles.cardSelected : {}),
                            opacity: isBeingDragged ? 0.35 : canPlay ? 1 : 0.45,
                            borderStyle: isBeingDragged ? 'dashed' : 'solid',
                            borderColor: isSelected
                              ? '#3b82f6'
                              : !canPlay && validation.reason?.includes('ドラゴン')
                              ? '#ef4444'
                              : card.type === 'SPELL'
                              ? '#f97316'
                              : '#475569',
                            cursor: canPlay ? (isDragging ? 'grabbing' : 'grab') : 'not-allowed',
                            transform: isBeingDragged
                              ? 'scale(0.95)'
                              : isSelected
                              ? 'translateY(-3px)'
                              : 'none',
                            boxShadow: isBeingDragged
                              ? 'none'
                              : isSelected
                              ? '0 4px 12px rgba(59, 130, 246, 0.5)'
                              : 'none',
                          }}
                          className="card-item"
                          data-card-id={card.id}
                          data-card-no={card.cardNo}
                        >
                          {/* カード上部：コスト・タイプ・ショートカットキー */}
                          <div style={styles.cardHeader}>
                            <span
                              style={{
                                ...styles.cardCostBadge,
                                backgroundColor: card.type === 'SPELL' ? '#c2410c' : '#1d4ed8',
                              }}
                            >
                              ⚡{card.manaCost}
                            </span>
                            {!canPlay && validation.reason?.includes('ドラゴン') && (
                              <span style={styles.cardLockBadge}>1体限</span>
                            )}
                            <span style={styles.cardKeyBadge}>[{idx + 1}]</span>
                          </div>
      
                          {/* カード本体：アイコン & 名前 */}
                          <div style={styles.cardCenter}>
                            <span style={styles.cardIcon} className="card-icon">{card.icon}</span>
                            <div style={styles.cardName} className="card-name">{card.name}</div>
                          </div>
      
                          {/* カード下部：攻防ステータス / スペル表記 */}
                          <div style={styles.cardFooter}>
                            {card.type === 'MONSTER' ? (
                              <div style={styles.cardStats} title={`攻撃力: ${card.attack} / HP: ${card.life} / 移動速度: ${card.speed} / 攻撃間隔: ${card.attackInterval ?? 1.0}s${card.attackWindup ? ` (溜め${card.attackWindup}s)` : ''}`}>
                                <span style={styles.cardAtk} title="攻撃力">⚔️{card.attack}</span>
                                <span style={styles.cardHp} title="HP">❤️{card.life}</span>
                                <span style={styles.cardSpeed} className="card-speed-badge" title="移動速度">🏃{card.speed}</span>
                              </div>
                            ) : (
                              <div style={styles.cardStats}>
                                <span style={styles.cardSpellTag}>✨呪文</span>
                                <span style={styles.cardSpellScope}>
                                  {card.id === 'fire_spell' ? '全体2' : '単体4'}
                                </span>
                              </div>
                            )}
                            <div style={styles.cardDescSnippet} className="card-desc-snippet" title={card.effectDesc}>
                              {card.effectDesc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
    </>
  );
}
