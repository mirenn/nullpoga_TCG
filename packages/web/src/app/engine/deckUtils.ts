import { DemoCard } from '../types';
import { DeckState, shuffleCards } from '../cards';

/**
 * 手札からカードをプレイした後の手札補充（NEXTカードを使用枠へ移動＋山札からNEXT補充＋捨て札リサイクル）
 * プレイヤー・CPU双方で共通の純粋関数
 */
export function drawNextCardFromDeck(
  prev: DeckState,
  replaceIndex: number,
  playedCard: DemoCard
): DeckState {
  const nextCardToPlace = prev.nextCard;
  const newHand = [...prev.hand];
  newHand[replaceIndex] = nextCardToPlace as DemoCard;

  const newDiscard = [...prev.discardPile, playedCard];
  let newDeck = [...prev.deck];
  let newNextCard: DemoCard | null = null;

  if (newDeck.length > 0) {
    newNextCard = newDeck[0];
    newDeck = newDeck.slice(1);
    return {
      hand: newHand,
      nextCard: newNextCard,
      deck: newDeck,
      discardPile: newDiscard,
    };
  }

  // 山札が空になったため、捨て札を再シャッフルして新しい山札へ
  const recycled = shuffleCards(newDiscard);
  newNextCard = recycled[0] || null;
  newDeck = recycled.slice(1);
  return {
    hand: newHand,
    nextCard: newNextCard,
    deck: newDeck,
    discardPile: [],
  };
}
