'use client';

import React from 'react';
import Link from 'next/link';
import { useRealtimeGame } from './useRealtimeGame';
import { Unit } from './types';

export default function RealtimeDemoPage() {
  const {
    playerHp,
    cpuHp,
    playerMana,
    maxMana,
    hand,
    selectedCardIndex,
    setSelectedCardIndex,
    units,
    spellEffects,
    gameResult,
    playCardOnLane,
    resetGame,
  } = useRealtimeGame();

  const selectedCard = selectedCardIndex !== null ? hand[selectedCardIndex] : null;

  return (
    <div style={styles.container}>
      {/* ヘッダー・検証ガイド */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backLink}>
            ← 通常版へ戻る
          </Link>
          <h1 style={styles.title}>Nullpoga RTS [リアルタイム検証プロトタイプ]</h1>
          <span style={styles.badge}>独立5レーン・アクティブ交戦</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={resetGame} style={styles.resetButton}>
            🔄 最初からやり直す
          </button>
        </div>
      </header>

      {/* 検証ガイドバナー */}
      <div style={styles.guideBanner}>
        <strong>💡 検証ポイント：</strong>
        「亀吉で耐えて後ろから攻める隊列」「相手の攻めを見て逆サイドにネズミを流す奇襲」「走るほど攻撃力が上がる柴犬」「迫る群れを隕石で一掃」の触感をテストしてみてください。
      </div>

      <div style={styles.gameWrapper}>
        {/* 対戦スタジアム（メイン画面） */}
        <div style={styles.boardContainer}>
          {/* CPU陣地ヘッダー */}
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

          {/* 5レーン戦場フィールド */}
          <div style={styles.fieldGrid}>
            {[0, 1, 2, 3, 4].map((laneIndex) => {
              const laneUnits = units.filter((u) => u.lane === laneIndex);
              const laneSpells = spellEffects.filter(
                (e) => e.lane === laneIndex || e.lane === -1
              );
              const canAfford = selectedCard && playerMana >= selectedCard.manaCost;

              return (
                <div
                  key={laneIndex}
                  onClick={() => playCardOnLane(laneIndex)}
                  style={{
                    ...styles.lane,
                    backgroundColor:
                      selectedCard && canAfford ? 'rgba(59, 130, 246, 0.08)' : 'rgba(241, 245, 249, 0.6)',
                    borderColor:
                      selectedCard && canAfford ? 'rgba(59, 130, 246, 0.5)' : '#cbd5e1',
                    cursor: selectedCard && canAfford ? 'pointer' : 'default',
                  }}
                >
                  <div style={styles.laneNumber}>レーン {laneIndex + 1}</div>

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

                  {/* 召喚ガイド表示 */}
                  {selectedCard && canAfford && (
                    <div style={styles.summonGuide}>
                      クリックで召喚
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* プレイヤー陣地ヘッダー */}
          <div style={styles.playerHeader}>
            <div style={styles.baseLabel}>自 軍 本 拠 地</div>
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>🛡️ あなた</span>
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
          </div>
        </div>

        {/* コントロール・手札エリア */}
        <div style={styles.controlsContainer}>
          {/* マナバー */}
          <div style={styles.manaSection}>
            <div style={styles.manaLabel}>
              <span>⚡ マナ:</span>
              <strong style={styles.manaCount}>{playerMana.toFixed(1)} / {maxMana}</strong>
            </div>
            <div style={styles.manaBarBg}>
              <div
                style={{
                  ...styles.manaBarFill,
                  width: `${(playerMana / maxMana) * 100}%`,
                }}
              />
              <div style={styles.manaTicks}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
                  <div key={tick} style={styles.manaTick} />
                ))}
              </div>
            </div>
          </div>

          {/* 手札カードリスト */}
          <div style={styles.handSection}>
            <div style={styles.handInstruction}>
              {selectedCard
                ? `👉 「${selectedCard.name}」を選択中！配置したいレーンをクリックしてください`
                : 'カードを選んで、レーンに出撃させましょう'}
            </div>
            <div style={styles.handGrid}>
              {hand.map((card, idx) => {
                const isSelected = selectedCardIndex === idx;
                const canPlay = playerMana >= card.manaCost;

                return (
                  <div
                    key={`${card.id}_${idx}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCardIndex(null);
                      } else {
                        setSelectedCardIndex(idx);
                      }
                    }}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardSelected : {}),
                      opacity: canPlay ? 1 : 0.5,
                      borderColor: isSelected
                        ? '#2563eb'
                        : card.type === 'SPELL'
                        ? '#ea580c'
                        : '#3b82f6',
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <span style={styles.cardCost}>⚡{card.manaCost}</span>
                      <span style={styles.cardTypeBadge}>
                        {card.type === 'SPELL' ? 'スペル' : 'ユニット'}
                      </span>
                    </div>
                    <div style={styles.cardIcon}>{card.icon}</div>
                    <div style={styles.cardName}>{card.name}</div>
                    {card.type === 'MONSTER' && (
                      <div style={styles.cardStats}>
                        <span style={styles.cardAtk}>⚔️ {card.attack}</span>
                        <span style={styles.cardHp}>❤️ {card.life}</span>
                      </div>
                    )}
                    <div style={styles.cardDesc}>{card.effectDesc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
            <button onClick={resetGame} style={styles.modalButton}>
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
          backgroundColor: isPlayer ? '#eff6ff' : '#fef2f2',
          boxShadow: isStunned ? '0 0 10px #eab308' : '0 2px 5px rgba(0,0,0,0.15)',
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
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backLink: {
    color: '#94a3b8',
    fontSize: '14px',
    textDecoration: 'underline',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
  },
  headerRight: {},
  resetButton: {
    backgroundColor: '#334155',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  guideBanner: {
    width: '100%',
    maxWidth: '900px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#93c5fd',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  gameWrapper: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  boardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  cpuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #334155',
  },
  playerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #334155',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '15px',
  },
  baseLabel: {
    fontSize: '12px',
    color: '#64748b',
    letterSpacing: '2px',
    fontWeight: 'bold',
  },
  hpBarBg: {
    width: '160px',
    height: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #475569',
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
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '0 1px 2px #000',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    height: '420px',
    position: 'relative',
  },
  lane: {
    borderRadius: '8px',
    border: '1px solid #334155',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  laneNumber: {
    position: 'absolute',
    top: '6px',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 'bold',
  },
  summonGuide: {
    position: 'absolute',
    bottom: '12px',
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    color: '#fff',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    pointerEvents: 'none',
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
    width: '32px',
    height: '5px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '2px',
  },
  unitHpBarFill: {
    height: '100%',
    transition: 'width 0.1s',
  },
  unitBody: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unitIconText: {
    fontSize: '22px',
  },
  statusStun: {
    position: 'absolute',
    top: '-12px',
    fontSize: '9px',
    backgroundColor: '#eab308',
    color: '#000',
    padding: '1px 3px',
    borderRadius: '3px',
    fontWeight: 'bold',
  },
  statusBuff: {
    position: 'absolute',
    bottom: '-10px',
    fontSize: '9px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '1px 3px',
    borderRadius: '3px',
    fontWeight: 'bold',
  },
  unitBadges: {
    display: 'flex',
    gap: '4px',
    marginTop: '2px',
  },
  unitAtkBadge: {
    fontSize: '10px',
    backgroundColor: '#f59e0b',
    color: '#000',
    fontWeight: 'bold',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  unitHpBadge: {
    fontSize: '10px',
    backgroundColor: '#22c55e',
    color: '#000',
    fontWeight: 'bold',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  spellBlast: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 20,
    boxShadow: '0 0 15px #ef4444',
    animation: 'pulse 0.5s infinite',
  },
  controlsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  manaSection: {
    marginBottom: '14px',
  },
  manaLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '4px',
  },
  manaCount: {
    color: '#60a5fa',
    fontSize: '16px',
  },
  manaBarBg: {
    width: '100%',
    height: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #475569',
  },
  manaBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.1s linear',
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
  },
  manaTick: {
    width: '1px',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  handSection: {},
  handInstruction: {
    fontSize: '13px',
    color: '#cbd5e1',
    marginBottom: '8px',
    fontWeight: '500',
  },
  handGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '2px solid #334155',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
    transform: 'translateY(-4px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  cardCost: {
    fontSize: '13px',
    fontWeight: 'bold',
    backgroundColor: '#1d4ed8',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  cardTypeBadge: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  cardIcon: {
    fontSize: '28px',
    marginBottom: '4px',
  },
  cardName: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '4px',
    textAlign: 'center',
  },
  cardStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  cardAtk: {
    color: '#f59e0b',
  },
  cardHp: {
    color: '#22c55e',
  },
  cardDesc: {
    fontSize: '10px',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '420px',
    textAlign: 'center',
    border: '1px solid #475569',
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
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
