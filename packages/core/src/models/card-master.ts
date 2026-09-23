import { CardType } from './card';

export interface CardDefinition {
  cardNo: number;
  cardName: string;
  cardType: CardType;
  manaCost: number;
  attack?: number;
  life?: number;
  effect?: string;
  imageUrl?: string | null;
}

export const DECK_SIZE = 30;
export const MAX_COPIES_PER_CARD = 2;

export const AVAILABLE_CARDS: CardDefinition[] = [
  // モンスターカード (9種)
  {
    cardNo: 1,
    cardName: 'ネズミ',
    cardType: CardType.MONSTER,
    manaCost: 1,
    attack: 1,
    life: 1,
    imageUrl: '/images/1.png',
  },
  {
    cardNo: 2,
    cardName: '柴犬ラン丸',
    cardType: CardType.MONSTER,
    manaCost: 2,
    attack: 1,
    life: 2,
    effect: '移動時、自身の攻撃力を+1する。',
    imageUrl: '/images/2.png',
  },
  {
    cardNo: 3,
    cardName: 'ネコ',
    cardType: CardType.MONSTER,
    manaCost: 1,
    attack: 2,
    life: 2,
    imageUrl: '/images/3.png',
  },
  {
    cardNo: 4,
    cardName: 'カエル三等兵',
    cardType: CardType.MONSTER,
    manaCost: 0,
    attack: 1,
    life: 2,
    effect: 'ターン開始時、1ターン目はHP+1、2ターン目は攻+1、3ターン目以降は攻+1/HP+1。',
  },
  {
    cardNo: 5,
    cardName: '亀',
    cardType: CardType.MONSTER,
    manaCost: 0,
    attack: 4,
    life: 2,
  },
  {
    cardNo: 6,
    cardName: '電気クラゲ',
    cardType: CardType.MONSTER,
    manaCost: 1,
    attack: 1,
    life: 2,
    effect: '攻撃時、相手モンスターを1ターンスタンにする。',
  },
  {
    cardNo: 7,
    cardName: 'イノシシ',
    cardType: CardType.MONSTER,
    manaCost: 3,
    attack: 2,
    life: 3,
  },
  {
    cardNo: 11,
    cardName: '炎のドラゴン',
    cardType: CardType.MONSTER,
    manaCost: 5,
    attack: 6,
    life: 7,
  },
  {
    cardNo: 12,
    cardName: 'ウルヴァン',
    cardType: CardType.MONSTER,
    manaCost: 8,
    attack: 8,
    life: 8,
    imageUrl: '/images/12.png',
  },

  // スペルカード (7種)
  {
    cardNo: 101,
    cardName: '隕石落下',
    cardType: CardType.SPELL,
    manaCost: 3,
    effect: '指定したゾーンのモンスターに3ダメージ。空のバトルゾーンなら荒野化する。',
    imageUrl: '/images/101.png',
  },
  {
    cardNo: 102,
    cardName: '不動の岩',
    cardType: CardType.SPELL,
    manaCost: 3,
    effect: '空いているバトルゾーンに不動の岩（攻0/HP3）を配置する。',
    imageUrl: '/images/102.png',
  },
  {
    cardNo: 103,
    cardName: '前後交換',
    cardType: CardType.SPELL,
    manaCost: 7,
    effect: '指定した列の縦2マス（前線と待機ゾーン、または敵モンスター引き寄せ）の配置を入れ替える。',
    imageUrl: '/images/103.png',
  },
  {
    cardNo: 104,
    cardName: '炎の守護',
    cardType: CardType.SPELL,
    manaCost: 4,
    effect: '味方モンスター1体を次のターンまで無敵にする。',
    imageUrl: '/images/104.png',
  },
  {
    cardNo: 105,
    cardName: '召喚の儀式',
    cardType: CardType.SPELL,
    manaCost: 3,
    effect: '手札のコスト3以下のモンスターを1体直接バトルゾーンに出す。',
    imageUrl: '/images/105.png',
  },
  {
    cardNo: 106,
    cardName: '烈火の呪文',
    cardType: CardType.SPELL,
    manaCost: 5,
    effect: '相手バトルゾーンの全モンスターに1ダメージを与え、火傷（次ターン開始時に1ダメージ）を付与する。',
    imageUrl: '/images/106.png',
  },
  {
    cardNo: 107,
    cardName: '火の雨',
    cardType: CardType.SPELL,
    manaCost: 6,
    effect: 'ランダムなバトルゾーン3箇所に3ダメージを与える。',
    imageUrl: '/images/107.png',
  },
];

export const AVAILABLE_CARD_MAP = new Map<number, CardDefinition>(
  AVAILABLE_CARDS.map((card) => [card.cardNo, card])
);

export function validateDeck(deck: number[]): { valid: boolean; reason?: string } {
  if (!Array.isArray(deck)) {
    return { valid: false, reason: 'デッキデータが配列ではありません。' };
  }

  if (deck.length !== DECK_SIZE) {
    return {
      valid: false,
      reason: `デッキはちょうど${DECK_SIZE}枚である必要があります（現在: ${deck.length}枚）。`,
    };
  }

  const counts = new Map<number, number>();
  for (const cardNo of deck) {
    const def = AVAILABLE_CARD_MAP.get(cardNo);
    if (!def) {
      return {
        valid: false,
        reason: `登録されていないカード（ID: ${cardNo}）が含まれています。`,
      };
    }

    const currentCount = (counts.get(cardNo) || 0) + 1;
    if (currentCount > MAX_COPIES_PER_CARD) {
      return {
        valid: false,
        reason: `「${def.cardName}」は${MAX_COPIES_PER_CARD}枚までしかデッキに入れられません（現在: ${currentCount}枚）。`,
      };
    }
    counts.set(cardNo, currentCount);
  }

  return { valid: true };
}
