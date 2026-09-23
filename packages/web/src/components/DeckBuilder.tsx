'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AVAILABLE_CARDS,
  AVAILABLE_CARD_MAP,
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
  CardDefinition,
  CardType,
  validateDeck,
} from '@nullpoga/core';
import {
  SavedDeck,
  DEFAULT_DECK,
  loadDecks,
  saveDeck,
  deleteDeck,
  getActiveDeckId,
  setActiveDeckId,
  exportDeckCode,
  importDeckCode,
} from '../utils/deckStorage';
import Link from 'next/link';

const getCardEmoji = (card: CardDefinition): string => {
  if (card.cardType === CardType.SPELL) {
    if (card.cardName.includes('隕石')) return '☄️';
    if (card.cardName.includes('岩')) return '🪨';
    if (card.cardName.includes('前後') || card.cardName.includes('交換')) return '🔄';
    if (card.cardName.includes('守護')) return '🛡️';
    if (card.cardName.includes('儀式')) return '📜';
    if (card.cardName.includes('烈火')) return '🔥';
    if (card.cardName.includes('雨')) return '🌧️';
    return '✨';
  } else {
    if (card.cardName.includes('ネズミ')) return '🐭';
    if (card.cardName.includes('柴犬') || card.cardName.includes('犬')) return '🐕';
    if (card.cardName.includes('ネコ') || card.cardName.includes('猫')) return '🐱';
    if (card.cardName.includes('カエル')) return '🐸';
    if (card.cardName.includes('亀')) return '🐢';
    if (card.cardName.includes('クラゲ')) return '🪼';
    if (card.cardName.includes('イノシシ')) return '🐗';
    if (card.cardName.includes('ドラゴン')) return '🐉';
    if (card.cardName.includes('ウルヴァン') || card.cardName.includes('狼')) return '🐺';
    return '👾';
  }
};

export default function DeckBuilder() {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [currentDeck, setCurrentDeck] = useState<SavedDeck>(DEFAULT_DECK);
  const [activeDeckId, setActiveDeckIdState] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MONSTER' | 'SPELL'>('ALL');
  const [costFilter, setCostFilter] = useState<number | 'ALL'>('ALL');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const isLoadedRef = React.useRef(false);

  // 初回ロード
  useEffect(() => {
    const loaded = loadDecks();
    setDecks(loaded);
    const activeId = getActiveDeckId();
    setActiveDeckIdState(activeId);

    const initial = loaded.find((d) => d.id === activeId) || loaded[0] || DEFAULT_DECK;
    setSelectedDeckId(initial.id);
    setCurrentDeck(initial);
    isLoadedRef.current = true;
  }, []);

  // currentDeck 変更時の自動同期（localStorage へ自動保存し、画面離脱時の編集消失を防止）
  useEffect(() => {
    if (!isLoadedRef.current) return;
    saveDeck(currentDeck);
    const updated = loadDecks();
    setDecks(updated);
  }, [currentDeck]);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // デッキ変更ハンドラ
  const handleSelectDeck = (id: string) => {
    if (id === '__NEW__') {
      const newDeck: SavedDeck = {
        id: `deck-${Date.now()}`,
        name: `カスタムデッキ ${decks.length + 1}`,
        cards: [...DEFAULT_DECK.cards],
        updatedAt: Date.now(),
      };
      saveDeck(newDeck);
      const updated = loadDecks();
      setDecks(updated);
      setSelectedDeckId(newDeck.id);
      setCurrentDeck(newDeck);
      showToast('新規デッキを作成しました', 'success');
      return;
    }

    const found = decks.find((d) => d.id === id);
    if (found) {
      setSelectedDeckId(found.id);
      setCurrentDeck({ ...found, cards: [...found.cards] });
    }
  };

  // デッキ名変更
  const handleNameChange = (name: string) => {
    setCurrentDeck((prev) => ({ ...prev, name }));
  };

  // デッキ保存
  const handleSaveDeck = () => {
    saveDeck(currentDeck);
    const updated = loadDecks();
    setDecks(updated);
    showToast(`デッキ「${currentDeck.name}」を保存しました`, 'success');
  };

  // デッキ削除
  const handleDeleteDeck = () => {
    if (decks.length <= 1) {
      showToast('最後のデッキは削除できません', 'error');
      return;
    }
    if (confirm(`デッキ「${currentDeck.name}」を削除しますか？`)) {
      isLoadedRef.current = false;
      deleteDeck(currentDeck.id);
      const updated = loadDecks();
      setDecks(updated);
      const nextDeck = updated[0];
      setSelectedDeckId(nextDeck.id);
      setCurrentDeck(nextDeck);
      setActiveDeckIdState(getActiveDeckId());
      setTimeout(() => {
        isLoadedRef.current = true;
      }, 50);
      showToast('デッキを削除しました', 'info');
    }
  };

  // 公式デッキへ初期化
  const handleResetToDefault = () => {
    if (confirm('デッキを公式初期デッキ(DECK_1)の構成にリセットしますか？')) {
      setCurrentDeck((prev) => ({
        ...prev,
        cards: [...DEFAULT_DECK.cards],
      }));
      showToast('公式初期デッキ構成にリセットしました', 'info');
    }
  };

  // 対戦使用デッキに設定
  const handleSetActive = () => {
    const val = validateDeck(currentDeck.cards);
    if (!val.valid) {
      showToast(val.reason || 'デッキは30枚である必要があります', 'error');
      return;
    }
    saveDeck(currentDeck);
    setActiveDeckId(currentDeck.id);
    setActiveDeckIdState(currentDeck.id);
    const updated = loadDecks();
    setDecks(updated);
    showToast(`「${currentDeck.name}」を対戦使用デッキに設定しました！`, 'success');
  };

  // デッキコードコピー
  const handleCopyDeckCode = async () => {
    const code = exportDeckCode(currentDeck);
    try {
      await navigator.clipboard.writeText(code);
      showToast('デッキコードをクリップボードにコピーしました！', 'success');
    } catch {
      prompt('デッキコードをコピーしてください:', code);
    }
  };

  // デッキコードインポート
  const handleImportSubmit = () => {
    setImportError(null);
    const res = importDeckCode(importCodeInput);
    if (!res.success || !res.deck) {
      setImportError(res.error || 'インポートに失敗しました');
      return;
    }

    saveDeck(res.deck);
    const updated = loadDecks();
    setDecks(updated);
    setSelectedDeckId(res.deck.id);
    setCurrentDeck(res.deck);
    setImportModalOpen(false);
    setImportCodeInput('');
    showToast(`デッキ「${res.deck.name}」をインポートしました！`, 'success');
  };

  // カード追加・削除
  const addCard = (cardNo: number) => {
    if (currentDeck.cards.length >= DECK_SIZE) {
      showToast(`デッキは最大${DECK_SIZE}枚です`, 'error');
      return;
    }
    const currentCount = currentDeck.cards.filter((id) => id === cardNo).length;
    if (currentCount >= MAX_COPIES_PER_CARD) {
      showToast(`同名カードは最大${MAX_COPIES_PER_CARD}枚までです`, 'error');
      return;
    }
    setCurrentDeck((prev) => ({
      ...prev,
      cards: [...prev.cards, cardNo],
    }));
  };

  const removeCard = (cardNo: number) => {
    const index = currentDeck.cards.lastIndexOf(cardNo);
    if (index >= 0) {
      const nextCards = [...currentDeck.cards];
      nextCards.splice(index, 1);
      setCurrentDeck((prev) => ({
        ...prev,
        cards: nextCards,
      }));
    }
  };

  // 集計・分析
  const deckCardCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const cardNo of currentDeck.cards) {
      map.set(cardNo, (map.get(cardNo) || 0) + 1);
    }
    return map;
  }, [currentDeck.cards]);

  // デッキ内カード（マナ順、カード番号順にソート）
  const deckGroupedCards = useMemo(() => {
    const entries: { card: CardDefinition; count: number }[] = [];
    deckCardCounts.forEach((count, cardNo) => {
      const card = AVAILABLE_CARD_MAP.get(cardNo);
      if (card) {
        entries.push({ card, count });
      }
    });
    return entries.sort((a, b) => {
      if (a.card.manaCost !== b.card.manaCost) {
        return a.card.manaCost - b.card.manaCost;
      }
      return a.card.cardNo - b.card.cardNo;
    });
  }, [deckCardCounts]);

  // マナカーブ集計 (0, 1, 2, 3, 4, 5, 6, 7, 8+)
  const manaCurve = useMemo(() => {
    const curve: { [cost: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    for (const cardNo of currentDeck.cards) {
      const card = AVAILABLE_CARD_MAP.get(cardNo);
      if (card) {
        const costKey = Math.min(card.manaCost, 8);
        curve[costKey] = (curve[costKey] || 0) + 1;
      }
    }
    return curve;
  }, [currentDeck.cards]);

  const maxManaCount = useMemo(() => {
    return Math.max(1, ...Object.values(manaCurve));
  }, [manaCurve]);

  // 種別集計・平均コスト
  const stats = useMemo(() => {
    let monsterCount = 0;
    let spellCount = 0;
    let totalMana = 0;
    for (const cardNo of currentDeck.cards) {
      const card = AVAILABLE_CARD_MAP.get(cardNo);
      if (card) {
        if (card.cardType === CardType.MONSTER) monsterCount++;
        if (card.cardType === CardType.SPELL) spellCount++;
        totalMana += card.manaCost;
      }
    }
    const avgMana = currentDeck.cards.length > 0 ? (totalMana / currentDeck.cards.length).toFixed(1) : '0';
    return { monsterCount, spellCount, avgMana };
  }, [currentDeck.cards]);

  // フィルタリングされたカタログカード
  const filteredCatalog = useMemo(() => {
    return AVAILABLE_CARDS.filter((card) => {
      if (typeFilter === 'MONSTER' && card.cardType !== CardType.MONSTER) return false;
      if (typeFilter === 'SPELL' && card.cardType !== CardType.SPELL) return false;
      if (costFilter !== 'ALL') {
        if (costFilter === 8 && card.manaCost >= 8) return true;
        if (card.manaCost !== costFilter) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.manaCost !== b.manaCost) return a.manaCost - b.manaCost;
      return a.cardNo - b.cardNo;
    });
  }, [typeFilter, costFilter]);

  const validation = validateDeck(currentDeck.cards);
  const isDeckComplete = validation.valid;
  const isSelectedActive = currentDeck.id === activeDeckId;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px 20px', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* トースト通知 */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor:
              toastMessage.type === 'error' ? '#ef4444' : toastMessage.type === 'success' ? '#10b981' : '#3b82f6',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 600,
            fontSize: '14px',
            zIndex: 9999,
            transition: 'all 0.3s ease',
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* インポートモーダル */}
      {importModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9990,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '520px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0f172a' }}>デッキコードのインポート</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
              共有されたデッキコード（Base64形式）を貼り付けてください。
            </p>
            <textarea
              rows={4}
              value={importCodeInput}
              onChange={(e) => setImportCodeInput(e.target.value)}
              placeholder="デッキコードをここにペースト..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {importError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{importError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportCodeInput('');
                  setImportError(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleImportSubmit}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                読み込む
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トップナビゲーションバー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#334155',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            ← 対戦画面へ戻る
          </Link>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
            🃏 デッキ構築（デッキビルダー）
          </h1>
        </div>

        {/* デッキ選択・管理コントロール */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedDeckId}
            onChange={(e) => handleSelectDeck(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.id === activeDeckId ? '★ (使用中)' : ''}
              </option>
            ))}
            <option value="__NEW__">＋ 新規デッキ作成</option>
          </select>

          <input
            type="text"
            value={currentDeck.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="デッキ名"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              width: '160px',
            }}
          />

          <button
            onClick={handleSaveDeck}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            💾 保存
          </button>

          <button
            onClick={handleSetActive}
            disabled={!isDeckComplete}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: isSelectedActive ? '1px solid #10b981' : '1px solid #059669',
              background: isSelectedActive ? '#10b981' : '#ecfdf5',
              color: isSelectedActive ? '#ffffff' : '#047857',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isDeckComplete ? 'pointer' : 'not-allowed',
              opacity: isDeckComplete ? 1 : 0.6,
            }}
          >
            {isSelectedActive ? '✓ 使用中' : 'このデッキを使用'}
          </button>

          <button
            onClick={handleCopyDeckCode}
            title="デッキコードをコピー"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📋 コード共有
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            title="デッキコードを読込"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📥 インポート
          </button>

          <button
            onClick={handleResetToDefault}
            title="公式デッキに戻す"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            🔄 初期化
          </button>

          {decks.length > 1 && (
            <button
              onClick={handleDeleteDeck}
              title="このデッキを削除"
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* メインレイアウト（左：カードカタログ / 右：現在のデッキ＆マナカーブ） */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* 左側：カードカタログ */}
        <div
          style={{
            flex: '1 1 580px',
            minWidth: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* フィルターバー */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* 種別タブ */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { key: 'ALL', label: `すべて (${AVAILABLE_CARDS.length})` },
                  { key: 'MONSTER', label: `モンスター (9)` },
                  { key: 'SPELL', label: `スペル (7)` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: typeFilter === tab.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: typeFilter === tab.key ? '#eff6ff' : '#ffffff',
                    color: typeFilter === tab.key ? '#2563eb' : '#64748b',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* マナコストチップ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginRight: '4px' }}>コスト:</span>
              <button
                onClick={() => setCostFilter('ALL')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: costFilter === 'ALL' ? '1px solid #334155' : '1px solid #e2e8f0',
                  background: costFilter === 'ALL' ? '#334155' : '#ffffff',
                  color: costFilter === 'ALL' ? '#ffffff' : '#64748b',
                }}
              >
                All
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                <button
                  key={c}
                  onClick={() => setCostFilter(c)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: costFilter === c ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: costFilter === c ? '#2563eb' : '#ffffff',
                    color: costFilter === c ? '#ffffff' : '#64748b',
                  }}
                >
                  {c === 8 ? '8+' : c}
                </button>
              ))}
            </div>
          </div>

          {/* カタログカードグリッド */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredCatalog.map((card) => {
              const countInDeck = deckCardCounts.get(card.cardNo) || 0;
              const isMaxCopies = countInDeck >= MAX_COPIES_PER_CARD;
              const isDeckFull = currentDeck.cards.length >= DECK_SIZE;
              const isMonster = card.cardType === CardType.MONSTER;
              const emoji = getCardEmoji(card);

              return (
                <div
                  key={card.cardNo}
                  style={{
                    border: countInDeck > 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    backgroundColor: isMonster ? '#faf5ff' : '#f0fdf4',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: countInDeck > 0 ? '0 2px 8px rgba(59,130,246,0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* カード上部 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          {card.manaCost}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          {card.cardName}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isMonster ? '#e9d5ff' : '#bbf7d0',
                          color: isMonster ? '#6b21a8' : '#166534',
                        }}
                      >
                        {isMonster ? 'モンスター' : 'スペル'}
                      </span>
                    </div>

                    {/* カードビジュアル */}
                    <div
                      style={{
                        height: '60px',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        marginBottom: '8px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.cardName}
                          style={{ maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const sibling = e.currentTarget.parentElement?.querySelector('.card-emoji-icon') as HTMLElement;
                            if (sibling) sibling.style.opacity = '1';
                          }}
                        />
                      ) : null}
                      <span
                        className="card-emoji-icon"
                        style={{
                          position: card.imageUrl ? 'absolute' : 'static',
                          zIndex: 0,
                          opacity: card.imageUrl ? 0.3 : 1,
                        }}
                      >
                        {emoji}
                      </span>
                    </div>

                    {/* ステータス or 効果 */}
                    <div style={{ minHeight: '34px', fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                      {isMonster ? (
                        <div style={{ display: 'flex', gap: '8px', fontWeight: 700 }}>
                          <span style={{ color: '#dc2626' }}>⚔️ ATK: {card.attack}</span>
                          <span style={{ color: '#059669' }}>❤️ HP: {card.life}</span>
                        </div>
                      ) : null}
                      {card.effect && (
                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                          {card.effect}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* カード下部操作 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: countInDeck > 0 ? '#2563eb' : '#94a3b8',
                      }}
                    >
                      投入: {countInDeck} / {MAX_COPIES_PER_CARD}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => removeCard(card.cardNo)}
                        disabled={countInDeck === 0}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: countInDeck > 0 ? '#ffffff' : '#f8fafc',
                          color: countInDeck > 0 ? '#ef4444' : '#cbd5e1',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: countInDeck > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        －
                      </button>
                      <button
                        onClick={() => addCard(card.cardNo)}
                        disabled={isMaxCopies || isDeckFull}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          background: !isMaxCopies && !isDeckFull ? '#3b82f6' : '#e2e8f0',
                          color: !isMaxCopies && !isDeckFull ? '#ffffff' : '#94a3b8',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: !isMaxCopies && !isDeckFull ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側：現在のデッキリスト ＆ マナカーブ */}
        <div
          style={{
            flex: '1 1 340px',
            maxWidth: '100%',
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* デッキ枚数 ＆ バリデーションステータス */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>デッキ構成枚数</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: isDeckComplete ? '#10b981' : currentDeck.cards.length > DECK_SIZE ? '#ef4444' : '#f59e0b',
                }}
              >
                {currentDeck.cards.length} / {DECK_SIZE} 枚
              </span>
            </div>

            {/* プログレスバー */}
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (currentDeck.cards.length / DECK_SIZE) * 100)}%`,
                  height: '100%',
                  backgroundColor: isDeckComplete ? '#10b981' : currentDeck.cards.length > DECK_SIZE ? '#ef4444' : '#3b82f6',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            {/* バリデーションメッセージ */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: isDeckComplete ? '#ecfdf5' : '#fef3c7',
                color: isDeckComplete ? '#065f46' : '#92400e',
                border: isDeckComplete ? '1px solid #a7f3d0' : '1px solid #fde68a',
              }}
            >
              {isDeckComplete
                ? '✅ ちょうど30枚完成！対戦に使用できます。'
                : validation.reason || `あと ${DECK_SIZE - currentDeck.cards.length} 枚追加してください。`}
            </div>
          </div>

          {/* マナカーブ ＆ サマリー */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>マナカーブ</h3>
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                <span>👾 モンスター: <strong>{stats.monsterCount}</strong></span>
                <span>✨ スペル: <strong>{stats.spellCount}</strong></span>
                <span>平均: <strong>{stats.avgMana}</strong></span>
              </div>
            </div>

            {/* 棒グラフ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '75px',
                paddingTop: '15px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cost) => {
                const count = manaCurve[cost] || 0;
                const heightPercent = maxManaCount > 0 ? (count / maxManaCount) * 100 : 0;
                return (
                  <div
                    key={cost}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, color: count > 0 ? '#2563eb' : '#cbd5e1' }}>
                      {count > 0 ? count : ''}
                    </span>
                    <div
                      style={{
                        width: '18px',
                        height: `${Math.max(2, heightPercent * 0.55)}px`,
                        backgroundColor: count > 0 ? '#3b82f6' : '#f1f5f9',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.2s ease',
                      }}
                    />
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                      {cost === 8 ? '8+' : cost}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* デッキ内カード一覧リスト */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                デッキ内容 ({deckGroupedCards.length} 種)
              </h3>
            </div>

            {deckGroupedCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                左のカタログからカードを追加してください
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {deckGroupedCards.map(({ card, count }) => {
                  const isMonster = card.cardType === CardType.MONSTER;
                  const isMaxCopies = count >= MAX_COPIES_PER_CARD;
                  const isDeckFull = currentDeck.cards.length >= DECK_SIZE;

                  return (
                    <div
                      key={card.cardNo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: isMonster ? '#faf5ff' : '#f0fdf4',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {card.manaCost}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {card.cardName}
                        </span>
                        {isMonster ? (
                          <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
                            {card.attack}/{card.life}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#166534', flexShrink: 0 }}>スペル</span>
                        )}
                      </div>

                      {/* 数量操作 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => removeCard(card.cardNo)}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#ef4444',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          －
                        </button>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#2563eb',
                            minWidth: '20px',
                            textAlign: 'center',
                          }}
                        >
                          ×{count}
                        </span>
                        <button
                          onClick={() => addCard(card.cardNo)}
                          disabled={isMaxCopies || isDeckFull}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            border: '1px solid #3b82f6',
                            background: !isMaxCopies && !isDeckFull ? '#3b82f6' : '#e2e8f0',
                            color: !isMaxCopies && !isDeckFull ? '#ffffff' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: !isMaxCopies && !isDeckFull ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
