import { describe, it, expect } from 'vitest';
import {
  validateDeck,
  AVAILABLE_CARDS,
  DECK_SIZE,
  MAX_COPIES_PER_CARD,
} from '../card-master';
import { DECK_1, DECK_2 } from '../state';
import { CardType, instanceCard } from '../card';
import { Player } from '../player';

describe('Deck Validation & Card Master', () => {
  it('should have 16 available cards (9 monsters, 7 spells)', () => {
    expect(AVAILABLE_CARDS.length).toBe(16);
    const monsters = AVAILABLE_CARDS.filter((c) => c.cardType === CardType.MONSTER);
    const spells = AVAILABLE_CARDS.filter((c) => c.cardType === CardType.SPELL);
    expect(monsters.length).toBe(9);
    expect(spells.length).toBe(7);
    expect(DECK_SIZE).toBe(30);
    expect(MAX_COPIES_PER_CARD).toBe(2);
  });

  it('should validate default DECK_1 and DECK_2 as valid', () => {
    const res1 = validateDeck(DECK_1);
    expect(res1.valid).toBe(true);
    expect(res1.reason).toBeUndefined();

    const res2 = validateDeck(DECK_2);
    expect(res2.valid).toBe(true);
    expect(res2.reason).toBeUndefined();
  });

  it('should validate a custom valid 30-card deck', () => {
    // 15 cards x 2 = 30
    const customDeck: number[] = [];
    for (let i = 0; i < 15; i++) {
      customDeck.push(AVAILABLE_CARDS[i].cardNo);
      customDeck.push(AVAILABLE_CARDS[i].cardNo);
    }
    expect(customDeck.length).toBe(30);
    const res = validateDeck(customDeck);
    expect(res.valid).toBe(true);
  });

  it('should reject non-array inputs', () => {
    expect(validateDeck(null as any).valid).toBe(false);
    expect(validateDeck(undefined as any).valid).toBe(false);
    expect(validateDeck({} as any).valid).toBe(false);
  });

  it('should reject deck with fewer than 30 cards', () => {
    const shortDeck = DECK_1.slice(0, 29);
    const res = validateDeck(shortDeck);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('30枚');
    expect(res.reason).toContain('29枚');
  });

  it('should reject deck with more than 30 cards', () => {
    const longDeck = [...DECK_1, 1];
    const res = validateDeck(longDeck);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('30枚');
    expect(res.reason).toContain('31枚');
  });

  it('should reject deck with more than MAX_COPIES_PER_CARD (2) copies of a card', () => {
    // Take DECK_1, replace one card with cardNo 1 (which already has 2 copies in DECK_1)
    // Find index of a card that is not 1
    const notOneIndex = DECK_1.findIndex((id) => id !== 1);
    const deckWith3Ones = [...DECK_1];
    deckWith3Ones[notOneIndex] = 1;

    const res = validateDeck(deckWith3Ones);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('ネズミ');
    expect(res.reason).toContain('2枚まで');
  });

  it('should reject deck with unknown or token card IDs', () => {
    // ID 99 is token rock, not in AVAILABLE_CARDS
    const deckWithToken = [...DECK_1];
    deckWithToken[0] = 99;
    const resToken = validateDeck(deckWithToken);
    expect(resToken.valid).toBe(false);
    expect(resToken.reason).toContain('99');

    // ID 999 does not exist
    const deckWithInvalid = [...DECK_1];
    deckWithInvalid[0] = 999;
    const resInvalid = validateDeck(deckWithInvalid);
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.reason).toContain('999');
  });

  it('should initialize Player with a validated custom deck and draw properly', () => {
    const customDeck: number[] = [];
    for (let i = 0; i < 15; i++) {
      customDeck.push(AVAILABLE_CARDS[i].cardNo);
      customDeck.push(AVAILABLE_CARDS[i].cardNo);
    }
    const val = validateDeck(customDeck);
    expect(val.valid).toBe(true);

    const player = new Player(customDeck, 'custom-user');
    expect(player.deckCards.length).toBe(30);
    player.init();
    expect(player.handCards.length).toBe(5);
    expect(player.deckCards.length).toBe(25);
    expect(player.planHandCards.length).toBe(5);
  });

  it('should instantiate all 16 available cards via instanceCard without error', () => {
    for (const cardDef of AVAILABLE_CARDS) {
      const card = instanceCard(cardDef.cardNo);
      expect(card).toBeDefined();
      expect(card.cardNo).toBe(cardDef.cardNo);
      expect(card.cardName).toBe(cardDef.cardName);
      expect(card.manaCost).toBe(cardDef.manaCost);
      expect(card.cardType).toBe(cardDef.cardType);
    }
  });

  it('should reject deck containing invalid numbers such as 0, negative numbers, floats, or NaN', () => {
    const deckWithZero = [...DECK_1];
    deckWithZero[0] = 0;
    expect(validateDeck(deckWithZero).valid).toBe(false);

    const deckWithNegative = [...DECK_1];
    deckWithNegative[0] = -1;
    expect(validateDeck(deckWithNegative).valid).toBe(false);

    const deckWithFloat = [...DECK_1];
    deckWithFloat[0] = 1.5;
    expect(validateDeck(deckWithFloat).valid).toBe(false);

    const deckWithNaN = [...DECK_1];
    deckWithNaN[0] = NaN;
    expect(validateDeck(deckWithNaN).valid).toBe(false);
  });

  it('should validate a legal deck combining 14 two-copy cards and 2 one-copy cards', () => {
    // 14 * 2 + 2 * 1 = 30 cards
    const deck: number[] = [];
    for (let i = 0; i < 14; i++) {
      deck.push(AVAILABLE_CARDS[i].cardNo);
      deck.push(AVAILABLE_CARDS[i].cardNo);
    }
    deck.push(AVAILABLE_CARDS[14].cardNo);
    deck.push(AVAILABLE_CARDS[15].cardNo);
    expect(deck.length).toBe(30);

    const res = validateDeck(deck);
    expect(res.valid).toBe(true);
    expect(res.reason).toBeUndefined();
  });
});

