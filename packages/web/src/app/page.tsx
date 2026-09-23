'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRealtimeGame, CARD_POOL, MANA_SPEED_PRESETS } from './useRealtimeGame';
import { Unit } from './types';

export default function RealtimeDemoPage() {
  const {
    playerHp,
    cpuHp,
    playerMana,
    maxMana,
    manaRegenRate,
    setManaRegenRate,
    hand,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    gameResult,
    playCardOnLane,
    resetGame,
  } = useRealtimeGame();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tips' | 'catalog'>('tips');

  // ドラッグ＆ドロップ用ステート
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverLaneIndex, setDragOverLaneIndex] = useState<number | null>(null);
  const [spawnRippleLane, setSpawnRippleLane] = useState<number | null>(null);

  const selectedCard = selectedCardIndex !== null ? hand[selectedCardIndex] : null;
  const activeDraggedCard = draggedCardIndex !== null ? hand[draggedCardIndex] : null;

  // ゲームリセット（D&D状態もクリア）
  const handleReset = useCallback(() => {
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
    setSpawnRippleLane(null);
    resetGame();
  }, [resetGame]);

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    const card = hand[idx];
    if (!card || playerMana < card.manaCost || gameResult !== 'playing') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedCardIndex(idx);
    setIsDragging(true);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
  };

  // レーン上のドラッグオーバー
  const handleLaneDragOver = (e: React.DragEvent, laneIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverLaneIndex !== laneIndex) {
      setDragOverLaneIndex(laneIndex);
    }
  };

  // レーンから離脱
  const handleLaneDragLeave = (e: React.DragEvent, laneIndex: number) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverLaneIndex === laneIndex) {
        setDragOverLaneIndex(null);
      }
    }
  };

  // レーンへのドロップ
  const handleLaneDrop = (e: React.DragEvent, laneIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const cardIdx = data !== '' ? parseInt(data, 10) : draggedCardIndex;
    if (cardIdx !== null && cardIdx !== undefined && !isNaN(cardIdx)) {
      const card = hand[cardIdx];
      if (card && playerMana >= card.manaCost && gameResult === 'playing') {
        playCardOnLane(laneIndex, cardIdx);
        setSpawnRippleLane(laneIndex);
        setTimeout(() => setSpawnRippleLane(null), 400);
      }
    }
    setDraggedCardIndex(null);
    setIsDragging(false);
    setDragOverLaneIndex(null);
  };

  // キーボードショートカット (1〜4キーで手札選択、Escで選択解除)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // フォーム入力中の誤爆を防止
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < hand.length) {
          setSelectedCardIndex((prev) => (prev === index ? null : index));
        }
      } else if (e.key === 'Escape') {
        setSelectedCardIndex(null);
      }
    },
    [hand.length, setSelectedCardIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={styles.container} className="realtime-demo-container">
      {/* 画面内CSS (レスポンシブ & アニメーション) */}
      <style>{`
        .realtime-demo-container {
          box-sizing: border-box;
        }
        @media (max-width: 959px) {
          .desktop-side-panel {
            display: none !important;
          }
          .mobile-guide-btn {
            display: inline-flex !important;
          }
        }
        @media (min-width: 960px) {
          .desktop-side-panel {
            display: flex !important;
          }
          .mobile-guide-btn {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .header-badge {
            display: none !important;
          }
          .back-link-full {
            display: none !important;
          }
          .back-link-short {
            display: inline !important;
          }
          .mana-speed-label-full {
            display: none !important;
          }
          .mana-speed-label-short {
            display: inline !important;
          }
          .btn-text-desktop {
            display: none !important;
          }
          .btn-text-mobile {
            display: inline !important;
          }
        }
        @media (min-width: 641px) {
          .back-link-short {
            display: none !important;
          }
          .mana-speed-label-short {
            display: none !important;
          }
          .btn-text-mobile {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .header-title {
            font-size: 13px !important;
          }
          .card-name {
            font-size: 11px !important;
            max-width: 52px !important;
          }
          .card-icon {
            font-size: 17px !important;
          }
          .card-desc-snippet {
            display: none !important;
          }
          .card-speed-badge {
            display: none !important;
          }
        }
        @media (max-height: 520px) {
          .realtime-demo-container {
            overflow-y: auto !important;
            height: auto !important;
            min-height: 100vh !important;
          }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 16px rgba(59, 130, 246, 0.85); }
        }
        @keyframes pulseSummonBadge {
          0%, 100% { transform: translate(-50%, 0) scale(1); opacity: 0.95; }
          50% { transform: translate(-50%, 0) scale(1.05); opacity: 1; }
        }
      `}</style>

      {/* ヘッダーバー (スリム 34px) */}
      <header style={styles.header} className="header-bar">
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backLink} title="通常版に戻る">
            <span className="back-link-full">← 通常版</span>
            <span className="back-link-short">←</span>
          </Link>
          <div style={styles.titleGroup}>
            <h1 style={styles.title} className="header-title">Nullpoga RTS</h1>
            <span style={styles.badge} className="header-badge">5レーン検証</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          {/* マナ回復速度セレクター */}
          <div style={styles.manaSpeedSelector} title="マナ回復速度を調整">
            <span style={styles.manaSpeedLabel} className="mana-speed-label-full">⚡速度:</span>
            <span style={styles.manaSpeedLabel} className="mana-speed-label-short">⚡</span>
            <select
              value={manaRegenRate}
              onChange={(e) => setManaRegenRate(parseFloat(e.target.value))}
              style={styles.manaSpeedSelect}
            >
              {MANA_SPEED_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowGuideModal(true)}
            style={styles.guideToggleButton}
            className="mobile-guide-btn"
            title="検証ガイド・カード図鑑を表示"
          >
            <span className="btn-text-desktop">💡 ガイド・図鑑</span>
            <span className="btn-text-mobile">💡 ガイド</span>
          </button>
          <button onClick={handleReset} style={styles.resetButton} title="ゲームを最初からやり直す">
            <span className="btn-text-desktop">🔄 やり直す</span>
            <span className="btn-text-mobile">🔄</span>
          </button>
        </div>
      </header>

      {/* メインゲーム領域 (100vh収容・レスポンシブ2カラム) */}
      <div style={styles.mainLayout}>
        {/* 左／中央：バトルアリーナ */}
        <div style={styles.arenaColumn} className="arena-column">
          {/* 1. CPU陣地ステータスバー */}
          <div style={styles.cpuHeader}>
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>🤖 相手（CPU）</span>
              <div style={styles.hpBarBg}>
                <div
                  style={{
                    ...styles.hpBarFillCpu,
                    width: `${Math.max(0, (cpuHp / 20) * 100)}%`,
                  }}
                />
                <span style={styles.hpText}>{cpuHp} / 20 HP</span>
              </div>
            </div>
            <div style={styles.baseLabel}>敵 本 拠 地</div>
          </div>

          {/* 2. 5レーン戦場フィールド (flex: 1 で全画面収容) */}
          <div style={styles.fieldGrid}>
            {[0, 1, 2, 3, 4].map((laneIndex) => {
              const laneUnits = units.filter((u) => u.lane === laneIndex);
              const laneSpells = spellEffects.filter(
                (e) => e.lane === laneIndex || e.lane === -1
              );
              const canAfford = selectedCard && playerMana >= selectedCard.manaCost;
              const isHoveredDrop = isDragging && dragOverLaneIndex === laneIndex;
              const isDroppableTarget = isDragging && activeDraggedCard && playerMana >= activeDraggedCard.manaCost;
              const isRippling = spawnRippleLane === laneIndex;

              return (
                <div
                  key={laneIndex}
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
                      ? 'rgba(30, 58, 138, 0.45)'
                      : isDroppableTarget
                      ? 'rgba(30, 58, 138, 0.16)'
                      : selectedCard && canAfford
                      ? 'rgba(30, 58, 138, 0.28)'
                      : 'rgba(15, 23, 42, 0.85)',
                    borderColor: isHoveredDrop
                      ? '#60a5fa'
                      : isDroppableTarget
                      ? 'rgba(96, 165, 250, 0.65)'
                      : selectedCard && canAfford
                      ? '#3b82f6'
                      : '#334155',
                    borderStyle: isDroppableTarget && !isHoveredDrop ? 'dashed' : 'solid',
                    borderWidth: isHoveredDrop ? '2px' : '1px',
                    cursor: isDroppableTarget
                      ? 'copy'
                      : selectedCard && canAfford
                      ? 'pointer'
                      : 'default',
                    boxShadow: isHoveredDrop
                      ? 'inset 0 0 24px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.4)'
                      : isRippling
                      ? 'inset 0 0 24px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.4)'
                      : selectedCard && canAfford
                      ? 'inset 0 0 16px rgba(59, 130, 246, 0.25)'
                      : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {/* レーン番号（上部） */}
                  <div style={styles.laneNumberTop}>L{laneIndex + 1}</div>

                  {/* レーン中央ガイドライン */}
                  <div style={styles.laneTrackLine} />

                  {/* レーン上のユニット描画 */}
                  {laneUnits.map((unit) => (
                    <RenderUnit key={unit.id} unit={unit} />
                  ))}

                  {/* スペル演出 */}
                  {laneSpells.map((spell) => (
                    <div
                      key={spell.id}
                      style={{
                        ...styles.spellBlast,
                        top: `${spell.y}%`,
                      }}
                    >
                      {spell.type === 'meteor' ? '💥 隕石着弾!!' : '🔥 烈火!!'}
                    </div>
                  ))}

                  {/* ドラッグ＆ドロップ時のターゲットガイド */}
                  {isHoveredDrop && activeDraggedCard && (
                    <div
                      style={{
                        ...styles.summonGuideBadge,
                        backgroundColor: activeDraggedCard.type === 'SPELL' ? '#ea580c' : '#2563eb',
                        boxShadow: activeDraggedCard.type === 'SPELL'
                          ? '0 0 14px rgba(234, 88, 12, 0.9)'
                          : '0 0 14px rgba(37, 99, 235, 0.9)',
                      }}
                    >
                      {activeDraggedCard.type === 'SPELL' ? '✨ ドロップ発動' : '🎯 ドロップ出撃'}
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
                    <div style={styles.summonGuideBadge}>
                      ▲ 出撃
                    </div>
                  )}

                  {/* レーン番号（下部） */}
                  <div style={styles.laneNumberBottom}>L{laneIndex + 1}</div>
                </div>
              );
            })}
          </div>

          {/* 3. 統合プレイヤー司令バー (自軍HP & マナゲージ) */}
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

          {/* 4. 操作ナビゲーションティッカー (スリム 22px) */}
          <div
            style={{
              ...styles.instructionTicker,
              backgroundColor: isDragging
                ? 'rgba(37, 99, 235, 0.25)'
                : selectedCard
                ? 'rgba(37, 99, 235, 0.2)'
                : 'rgba(30, 41, 59, 0.4)',
              borderColor: isDragging
                ? '#60a5fa'
                : selectedCard
                ? 'rgba(59, 130, 246, 0.4)'
                : '#334155',
            }}
          >
            {isDragging && activeDraggedCard ? (
              <span style={styles.instructionActive}>
                ✋ <strong>{activeDraggedCard.name}</strong> をドラッグ中... 配置先レーンへドロップ！
              </span>
            ) : selectedCard ? (
              <span style={styles.instructionActive}>
                👉 <strong>{selectedCard.name}</strong>（マナ {selectedCard.manaCost}）選択中！ レーンをタップ/クリック [Escで解除]
              </span>
            ) : (
              <span style={styles.instructionIdle}>
                💡 カードを選択/ドラッグして進軍レーンへ出撃！（キー[1〜4]対応）
              </span>
            )}
          </div>

          {/* 5. 手札カードリスト (下部ドック・4カード) */}
          <div style={styles.handGrid} className="hand-grid">
            {hand.map((card, idx) => {
              const isSelected = selectedCardIndex === idx;
              const isBeingDragged = isDragging && draggedCardIndex === idx;
              const canPlay = playerMana >= card.manaCost;

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
                  title={canPlay ? 'ドラッグ＆ドロップ または クリックで配置' : `マナが足りません (${card.manaCost}必要)`}
                  style={{
                    ...styles.card,
                    ...(isSelected ? styles.cardSelected : {}),
                    opacity: isBeingDragged ? 0.35 : canPlay ? 1 : 0.45,
                    borderStyle: isBeingDragged ? 'dashed' : 'solid',
                    borderColor: isSelected
                      ? '#3b82f6'
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
                      <div style={styles.cardStats}>
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

        {/* 右：検証ガイド & カード戦術パネル (デスクトップ横並び表示) */}
        <div style={styles.sidePanel} className="desktop-side-panel">
          <div style={styles.sidePanelHeader}>
            <button
              onClick={() => setActiveTab('tips')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'tips' ? styles.tabButtonActive : {}),
              }}
            >
              💡 戦術・検証ポイント
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
              }}
            >
              🃏 カード図鑑 ({CARD_POOL.length})
            </button>
          </div>

          <div style={styles.sidePanelContent}>
            {activeTab === 'tips' ? (
              <div style={styles.tipsSection}>
                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐢 隊列と前線維持</div>
                  <div style={styles.tipText}>
                    耐久7の<strong>亀吉</strong>を壁にし、後ろから<strong>猫</strong>や<strong>クラゲ</strong>を流すと前線が崩れません。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐭 逆サイド奇襲</div>
                  <div style={styles.tipText}>
                    敵が1つのレーンに集中した隙に、空いた逆端レーンへ足の速い<strong>ネズミ</strong>（速度16）を走らせて拠点を削りましょう。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐕 柴犬ラン丸の長距離突破</div>
                  <div style={styles.tipText}>
                    前進距離に応じて攻撃力が<strong>最大+4</strong>まで上昇！自陣最奥から走らせるほど敵拠点到達時の破壊力が増します。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>🐗 イノシシの突進突破</div>
                  <div style={styles.tipText}>
                    コスト3で攻撃3/HP4/速度7の突進アタッカー。手薄なレーンを一気に押し込みます。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>☄️ 迎撃スペルの使いどころ</div>
                  <div style={styles.tipText}>
                    迫る敵の群れには<strong>烈火の呪文</strong>（全体2ダメ）、高HPのドラゴンや密集部隊には<strong>隕石落下</strong>（単一レーン4ダメ）で迎撃しましょう。
                  </div>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipTitle}>⚡ マナ回復速度の変更</div>
                  <div style={styles.tipText}>
                    上部ヘッダーの「マナ速度」セレクタから、プレイスタイルに合わせて回復ペース（4.0秒〜1.3秒/マナ）を変更できます。
                  </div>
                </div>

                <div style={styles.shortcutGuide}>
                  <strong>🎮 操作方法：</strong>
                  <span>・カードをレーンにドラッグ＆ドロップして出撃</span>
                  <span>・カードをクリック後、レーンをクリックで配置</span>
                  <span>・キー [1]〜[4] で選択 / [Esc] で解除</span>
                </div>
              </div>
            ) : (
              <div style={styles.catalogList}>
                {CARD_POOL.map((c) => (
                  <div key={c.id} style={styles.catalogItem}>
                    <div style={styles.catalogItemIcon}>{c.icon}</div>
                    <div style={styles.catalogItemInfo}>
                      <div style={styles.catalogItemTop}>
                        <span style={styles.catalogItemName}>{c.name}</span>
                        <span style={styles.catalogItemCost}>⚡{c.manaCost}</span>
                      </div>
                      <div style={styles.catalogItemStats}>
                        {c.type === 'MONSTER' ? (
                          <>
                            <span>⚔️ {c.attack}</span>
                            <span>❤️ {c.life}</span>
                            <span>🏃 {c.speed}</span>
                            <span>🎯 {c.range}%</span>
                          </>
                        ) : (
                          <span style={{ color: '#f97316' }}>スペル（呪文）</span>
                        )}
                      </div>
                      <div style={styles.catalogItemDesc}>{c.effectDesc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* モバイル・小画面用ガイドモーダル */}
      {showGuideModal && (
        <div style={styles.overlay} onClick={() => setShowGuideModal(false)}>
          <div style={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.guideModalHeader}>
              <div style={styles.sidePanelHeader}>
                <button
                  onClick={() => setActiveTab('tips')}
                  style={{
                    ...styles.tabButton,
                    ...(activeTab === 'tips' ? styles.tabButtonActive : {}),
                  }}
                >
                  💡 戦術ポイント
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    ...styles.tabButton,
                    ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
                  }}
                >
                  🃏 全カード図鑑 ({CARD_POOL.length})
                </button>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                style={styles.guideModalCloseBtn}
                title="閉じる"
              >
                ✕
              </button>
            </div>
            <div style={styles.guideModalBody}>
              {activeTab === 'tips' ? (
                <div style={styles.tipsSection}>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐢 隊列と前線維持</div>
                    <div style={styles.tipText}>
                      亀吉で耐えて後ろから猫やクラゲで支援する隊列戦闘の感触をお試しください。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐭 逆サイド奇襲</div>
                    <div style={styles.tipText}>
                      敵の攻めを見て反対側の空きレーンにネズミを流す奇襲戦術が有効です。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>🐕 柴犬の長距離バフ</div>
                    <div style={styles.tipText}>
                      走るほど攻撃力が上がる柴犬ラン丸で敵本拠地の一撃粉砕を狙えます。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>☄️ 迎撃スペル</div>
                    <div style={styles.tipText}>
                      迫る群れを隕石落下や烈火の呪文で一掃できます。
                    </div>
                  </div>
                  <div style={styles.tipBox}>
                    <div style={styles.tipTitle}>⚡ マナ回復速度</div>
                    <div style={styles.tipText}>
                      ヘッダーの「マナ速度」セレクタで低速(4.0s)〜高速(1.3s)を切り替え可能です。
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.catalogList}>
                  {CARD_POOL.map((c) => (
                    <div key={c.id} style={styles.catalogItem}>
                      <span style={{ fontSize: '20px' }}>{c.icon}</span>
                      <div style={{ flex: 1, fontSize: '12px' }}>
                        <div style={styles.catalogItemTop}>
                          <strong>{c.name}</strong>
                          <span style={styles.catalogItemCost}>⚡{c.manaCost}</span>
                        </div>
                        {c.type === 'MONSTER' && (
                          <div style={styles.catalogItemStats}>
                            <span>⚔️ {c.attack}</span>
                            <span>❤️ {c.life}</span>
                            <span>🏃 {c.speed}</span>
                            <span>🎯 {c.range}%</span>
                          </div>
                        )}
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                          {c.effectDesc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 勝敗オーバーレイ */}
      {gameResult !== 'playing' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2
              style={{
                ...styles.modalTitle,
                color: gameResult === 'win' ? '#16a34a' : '#dc2626',
              }}
            >
              {gameResult === 'win' ? '🎉 VICTORY! 勝利！' : '💀 DEFEAT... 敗北'}
            </h2>
            <p style={styles.modalMessage}>
              {gameResult === 'win'
                ? '敵の本拠地を攻め落としました！独立レーンでの進軍と押し引きの感触はいかがでしたか？'
                : '自陣の防衛が破られました。防衛ユニットのタイミングや迎撃スペルの使い方がポイントです。'}
            </p>
            <button onClick={handleReset} style={styles.modalButton}>
              もう一度遊ぶ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ユニット描画サブコンポーネント
function RenderUnit({ unit }: { unit: Unit }) {
  const isPlayer = unit.owner === 'player';
  const isStunned = unit.isStunnedUntil && unit.isStunnedUntil > Date.now();
  const hasBuff = unit.cardNo === 2 && (unit.attack || 0) > 1; // 柴犬バフ

  return (
    <div
      style={{
        ...styles.unitWrapper,
        top: `${unit.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* HPバー */}
      <div style={styles.unitHpBarBg}>
        <div
          style={{
            ...styles.unitHpBarFill,
            width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
            backgroundColor: isPlayer ? '#22c55e' : '#ef4444',
          }}
        />
      </div>

      {/* ユニット本体アイコン */}
      <div
        style={{
          ...styles.unitBody,
          borderColor: isPlayer ? '#3b82f6' : '#ef4444',
          backgroundColor: isPlayer ? '#1e293b' : '#2d1515',
          boxShadow: isStunned
            ? '0 0 10px #eab308'
            : isPlayer
            ? '0 2px 6px rgba(59, 130, 246, 0.4)'
            : '0 2px 6px rgba(239, 68, 68, 0.4)',
        }}
      >
        <span style={styles.unitIconText}>{unit.icon}</span>

        {/* 状態異常・バフ表示 */}
        {isStunned && <span style={styles.statusStun}>⚡麻痺</span>}
        {hasBuff && <span style={styles.statusBuff}>⚔️+{unit.attack - 1}</span>}
      </div>

      {/* 攻撃力 / HP バッジ */}
      <div style={styles.unitBadges}>
        <span style={styles.unitAtkBadge}>{unit.attack}</span>
        <span style={styles.unitHpBadge}>{unit.hp}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    maxHeight: '100dvh',
    overflow: 'hidden',
    backgroundColor: '#0b1120',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    width: '100%',
    maxWidth: '1160px',
    margin: '0 auto 4px auto',
    minHeight: '34px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 1,
    minWidth: 0,
  },
  backLink: {
    color: '#94a3b8',
    fontSize: '12px',
    backgroundColor: '#1e293b',
    padding: '4px 8px',
    borderRadius: '12px',
    textDecoration: 'none',
    border: '1px solid #334155',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  title: {
    fontSize: '15px',
    fontWeight: 'bold',
    margin: 0,
    letterSpacing: '-0.3px',
    whiteSpace: 'nowrap',
  },
  badge: {
    backgroundColor: '#1d4ed8',
    color: '#dbeafe',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '8px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  manaSpeedSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '2px 6px',
  },
  manaSpeedLabel: {
    fontSize: '11px',
    color: '#60a5fa',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  manaSpeedSelect: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 4px',
    cursor: 'pointer',
    outline: 'none',
  },
  guideToggleButton: {
    backgroundColor: '#1e3a8a',
    color: '#bfdbfe',
    border: '1px solid #3b82f6',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  resetButton: {
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    padding: '3px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  mainLayout: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '1160px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  arenaColumn: {
    flex: 1,
    minHeight: 0,
    maxWidth: '780px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '6px 10px',
    border: '1px solid #1f2937',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
  },
  cpuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '28px',
    flexShrink: 0,
    paddingBottom: '2px',
    borderBottom: '1px solid #1f2937',
    width: '100%',
    boxSizing: 'border-box',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
  },
  baseLabel: {
    fontSize: '10px',
    color: '#64748b',
    letterSpacing: '1px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    marginLeft: '6px',
  },
  hpBarBg: {
    flex: 1,
    maxWidth: '130px',
    minWidth: '50px',
    height: '15px',
    backgroundColor: '#030712',
    borderRadius: '7px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #374151',
  },
  hpBarFillCpu: {
    height: '100%',
    backgroundColor: '#ef4444',
    transition: 'width 0.2s',
  },
  hpBarFillPlayer: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.2s',
  },
  hpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '0 1px 2px #000',
    whiteSpace: 'nowrap',
  },
  fieldGrid: {
    flex: 1,
    minHeight: '180px',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    position: 'relative',
    margin: '4px 0',
  },
  lane: {
    borderRadius: '6px',
    border: '1px solid #334155',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background-color 0.12s, border-color 0.12s',
  },
  laneNumberTop: {
    fontSize: '10px',
    color: '#475569',
    fontWeight: 'bold',
    marginTop: '2px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  laneNumberBottom: {
    fontSize: '10px',
    color: '#475569',
    fontWeight: 'bold',
    marginBottom: '2px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  laneTrackLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '1px',
    borderLeft: '1px dashed rgba(255,255,255,0.06)',
    pointerEvents: 'none',
  },
  summonGuideBadge: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
    pointerEvents: 'none',
    zIndex: 15,
    animation: 'pulseSummonBadge 0.8s infinite ease-in-out',
    boxShadow: '0 0 10px rgba(37,99,235,0.7)',
    whiteSpace: 'nowrap',
  },
  dropZoneHint: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px dashed rgba(96, 165, 250, 0.8)',
    color: '#93c5fd',
    fontSize: '9px',
    padding: '2px 5px',
    borderRadius: '3px',
    fontWeight: 'bold',
    pointerEvents: 'none',
    zIndex: 14,
    whiteSpace: 'nowrap',
  },
  unitWrapper: {
    position: 'absolute',
    left: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
    willChange: 'top',
  },
  unitHpBarBg: {
    width: '28px',
    height: '4px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '2px',
  },
  unitHpBarFill: {
    height: '100%',
    transition: 'width 0.1s',
  },
  unitBody: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unitIconText: {
    fontSize: '19px',
    lineHeight: 1,
  },
  statusStun: {
    position: 'absolute',
    top: '-11px',
    fontSize: '8px',
    backgroundColor: '#eab308',
    color: '#000',
    padding: '1px 3px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  statusBuff: {
    position: 'absolute',
    bottom: '-9px',
    fontSize: '8px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '1px 3px',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  unitBadges: {
    display: 'flex',
    gap: '3px',
    marginTop: '2px',
  },
  unitAtkBadge: {
    fontSize: '9px',
    backgroundColor: '#f59e0b',
    color: '#000',
    fontWeight: 'bold',
    padding: '0 3px',
    borderRadius: '2px',
    lineHeight: '13px',
  },
  unitHpBadge: {
    fontSize: '9px',
    backgroundColor: '#22c55e',
    color: '#000',
    fontWeight: 'bold',
    padding: '0 3px',
    borderRadius: '2px',
    lineHeight: '13px',
  },
  spellBlast: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    zIndex: 20,
    boxShadow: '0 0 15px #ef4444',
    whiteSpace: 'nowrap',
  },
  playerCommandBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '30px',
    flexShrink: 0,
    gap: '8px',
    padding: '3px 8px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1px solid #1e293b',
    width: '100%',
    boxSizing: 'border-box',
  },
  playerHpSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: '1 1 42%',
    minWidth: 0,
  },
  playerManaSection: {
    flex: '1 1 58%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
    maxWidth: '300px',
  },
  manaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    flexShrink: 0,
  },
  manaTitle: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  manaCount: {
    color: '#60a5fa',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  manaBarBg: {
    flex: 1,
    minWidth: '50px',
    height: '14px',
    backgroundColor: '#030712',
    borderRadius: '7px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #2563eb',
  },
  manaBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
    transition: 'width 0.08s linear',
  },
  manaTicks: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    padding: '0 10%',
  },
  manaTick: {
    width: '1px',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  instructionTicker: {
    height: '22px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: '1px solid',
    margin: '3px 0',
    fontSize: '11px',
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
  },
  instructionActive: {
    color: '#93c5fd',
    fontWeight: 'bold',
  },
  instructionIdle: {
    color: '#94a3b8',
  },
  handGrid: {
    height: '100px',
    flexShrink: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1.5px solid #334155',
    padding: '5px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    touchAction: 'manipulation',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
    transform: 'translateY(-3px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    lineHeight: 1,
  },
  cardCostBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  cardKeyBadge: {
    fontSize: '9px',
    color: '#64748b',
    fontWeight: 'bold',
  },
  cardCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    margin: '1px 0',
  },
  cardIcon: {
    fontSize: '19px',
  },
  cardName: {
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '75px',
  },
  cardFooter: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
  },
  cardStats: {
    display: 'flex',
    gap: '5px',
    fontSize: '10px',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  cardSpellTag: {
    fontSize: '9px',
    color: '#fb923c',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  cardSpellScope: {
    fontSize: '9px',
    color: '#fdba74',
    lineHeight: 1,
  },
  cardAtk: {
    color: '#f59e0b',
  },
  cardHp: {
    color: '#22c55e',
  },
  cardSpeed: {
    color: '#38bdf8',
  },
  cardDescSnippet: {
    fontSize: '9px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    textAlign: 'center',
    opacity: 0.85,
  },
  sidePanel: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '10px',
    border: '1px solid #1f2937',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    minHeight: 0,
  },
  sidePanelHeader: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
    borderBottom: '1px solid #1f2937',
    paddingBottom: '6px',
    flexShrink: 0,
  },
  tabButton: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '5px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
    color: '#60a5fa',
  },
  sidePanelContent: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    minHeight: 0,
  },
  tipsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tipBox: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '8px 10px',
    border: '1px solid #1e293b',
  },
  tipTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#93c5fd',
    marginBottom: '3px',
  },
  tipText: {
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  shortcutGuide: {
    backgroundColor: '#1e293b',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
  },
  catalogList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  catalogItem: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '6px 8px',
    border: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  catalogItemIcon: {
    fontSize: '22px',
    width: '28px',
    textAlign: 'center',
    flexShrink: 0,
  },
  catalogItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  catalogItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogItemName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  catalogItemCost: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  catalogItemStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: '#94a3b8',
    margin: '2px 0',
  },
  catalogItemDesc: {
    fontSize: '10px',
    color: '#64748b',
    lineHeight: '1.3',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(3px)',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '420px',
    textAlign: 'center',
    border: '1px solid #475569',
    boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  modalMessage: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  modalButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  guideModal: {
    backgroundColor: '#111827',
    borderRadius: '10px',
    padding: '14px',
    maxWidth: '440px',
    width: '92%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #374151',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
  },
  guideModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px',
  },
  guideModalCloseBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  guideModalBody: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: 0,
  },
};
