import { DECK_1, validateDeck } from '@nullpoga/core';

export interface SavedDeck {
  id: string;
  name: string;
  cards: number[];
  updatedAt: number;
}

export const DEFAULT_DECK_ID = 'default-deck-1';

export const DEFAULT_DECK: SavedDeck = {
  id: DEFAULT_DECK_ID,
  name: 'スタンダードデッキ (公式)',
  cards: [...DECK_1],
  updatedAt: 1700000000000,
};

const STORAGE_KEY_DECKS = 'nullpoga_saved_decks';
const STORAGE_KEY_ACTIVE_ID = 'nullpoga_active_deck_id';

export function loadDecks(): SavedDeck[] {
  if (typeof window === 'undefined') {
    return [DEFAULT_DECK];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECKS);
    if (!raw) {
      const initial = [DEFAULT_DECK];
      localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [DEFAULT_DECK];
      localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return [DEFAULT_DECK];
  }
}

export function saveDeck(deck: SavedDeck): void {
  if (typeof window === 'undefined') return;
  const decks = loadDecks();
  const index = decks.findIndex((d) => d.id === deck.id);
  const updatedDeck = { ...deck, updatedAt: Date.now() };
  if (index >= 0) {
    decks[index] = updatedDeck;
  } else {
    decks.push(updatedDeck);
  }
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
}

export function deleteDeck(id: string): void {
  if (typeof window === 'undefined') return;
  let decks = loadDecks().filter((d) => d.id !== id);
  if (decks.length === 0) {
    decks = [DEFAULT_DECK];
  }
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));

  const activeId = getActiveDeckId();
  if (activeId === id) {
    setActiveDeckId(decks[0].id);
  }
}

export function getActiveDeckId(): string {
  if (typeof window === 'undefined') return DEFAULT_DECK_ID;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || DEFAULT_DECK_ID;
}

export function setActiveDeckId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
}

export function getActiveDeck(): SavedDeck {
  const decks = loadDecks();
  const activeId = getActiveDeckId();
  return decks.find((d) => d.id === activeId) || decks[0] || DEFAULT_DECK;
}

export function exportDeckCode(deck: SavedDeck): string {
  const payload = {
    name: deck.name,
    cards: deck.cards,
  };
  const json = JSON.stringify(payload);
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, 'utf-8').toString('base64');
}

export function importDeckCode(code: string): { success: boolean; deck?: SavedDeck; error?: string } {
  try {
    const trimmed = code.trim();
    if (!trimmed) {
      return { success: false, error: 'デッキコードを入力してください。' };
    }
    let json: string;
    if (typeof window !== 'undefined' && window.atob) {
      json = decodeURIComponent(escape(window.atob(trimmed)));
    } else {
      json = Buffer.from(trimmed, 'base64').toString('utf-8');
    }
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.cards)) {
      return { success: false, error: 'デッキコードの形式が不正です。' };
    }
    const validation = validateDeck(parsed.cards);
    if (!validation.valid) {
      return { success: false, error: validation.reason || '無効なデッキ構成です。' };
    }
    const newDeck: SavedDeck = {
      id: `deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'インポートデッキ',
      cards: parsed.cards,
      updatedAt: Date.now(),
    };
    return { success: true, deck: newDeck };
  } catch {
    return { success: false, error: 'デッキコードの解析に失敗しました。正しいコードか確認してください。' };
  }
}
