import { DemoCard } from './types';

export const CARD_POOL: DemoCard[] = [
  {
    id: 'mouse',
    cardNo: 1,
    name: 'ネズミ',
    type: 'MONSTER',
    manaCost: 1,
    attack: 1,
    life: 1,
    speed: 8, // 高速ダッシュ型アタッカー（旧16から調整）
    range: 9, // 近接接触
    attackInterval: 1.0,
    effectDesc: '足が速い低コストアタッカー。奇襲や時間稼ぎに。',
    icon: '🐭',
  },
  {
    id: 'cat',
    cardNo: 3,
    name: 'ネコ',
    type: 'MONSTER',
    manaCost: 1,
    attack: 2,
    life: 2,
    speed: 5, // 標準歩兵ペース（旧10から調整）
    range: 9,
    attackInterval: 1.0,
    effectDesc: 'バランスの取れた標準的な歩兵ユニット。',
    icon: '🐱',
  },
  {
    id: 'shiba',
    cardNo: 2,
    name: '柴犬ラン丸',
    type: 'MONSTER',
    manaCost: 2,
    attack: 1,
    life: 2,
    speed: 5, // じっくり前進（旧10から調整）
    range: 9,
    attackInterval: 1.0,
    effectDesc: '前進した距離に応じて攻撃力が上昇する（最大+4）。',
    icon: '🐕',
  },
  {
    id: 'turtle',
    cardNo: 5,
    name: '亀 (亀吉)',
    type: 'MONSTER',
    manaCost: 2,
    attack: 0,
    life: 7,
    speed: 2.5, // 重装タンク歩行（旧4から調整）
    range: 8,
    attackInterval: 1.0,
    effectDesc: '高耐久の盾役。後ろの味方を守りながらじっくり進む。',
    icon: '🐢',
  },
  {
    id: 'jellyfish',
    cardNo: 6,
    name: '電気クラゲ',
    type: 'MONSTER',
    manaCost: 3,
    attack: 1,
    life: 2,
    speed: 3.5, // 後方支援ペース
    range: 28, // 長距離放電（旧12から大幅拡大：遠くから雷撃）
    attackInterval: 2.0, // 攻撃間隔2.0秒（スタン1.2秒との間に隙を作りバランス調整）
    attackWindup: 1.0, // 攻撃前隙（チャージモーション1.0秒）
    effectDesc: '遠距離から放電し、相手ユニットを1.2秒間スタン（麻痺）させる。1.0秒のチャージ後に雷撃を放つ。',
    icon: '🪼',
  },
  {
    id: 'boar',
    cardNo: 7,
    name: 'イノシシ',
    type: 'MONSTER',
    manaCost: 3,
    attack: 3,
    life: 4,
    speed: 7, // 突破突進（旧13から調整）
    range: 9,
    attackInterval: 1.0,
    effectDesc: '素早い突進力と高い火力を併せ持つ突破ユニット。攻撃ヒット時に相手をノックバックさせる。',
    icon: '🐗',
  },
  {
    id: 'assassin',
    cardNo: 8,
    name: '忍びアサシン',
    type: 'MONSTER',
    manaCost: 2,
    attack: 2,
    life: 2,
    speed: 5, // 通常速度5（敵不在時は3倍速の15）
    range: 9, // 近接接触
    attackInterval: 1.0,
    effectDesc: '敵がいないレーンを走ると移動速度が3倍（超高速）になる。奇襲やスプリットプッシュに特化。',
    icon: '🥷',
  },
  {
    id: 'vampire_bat',
    cardNo: 9,
    name: '吸血コウモリ',
    type: 'MONSTER',
    manaCost: 2,
    attack: 2,
    life: 2,
    speed: 6, // 飛行による素早い前進
    range: 9, // 近接接触
    attackInterval: 1.0,
    effectDesc: '相手ユニットにとどめを刺すと吸血し、攻撃力+1・最大HP+1・HP+1（成長）する。',
    icon: '🦇',
  },
  {
    id: 'dragon',
    cardNo: 11,
    name: '炎のドラゴン',
    type: 'MONSTER',
    manaCost: 5,
    attack: 5,
    life: 8,
    speed: 3.5, // 重量級ボス
    range: 32, // 長距離火炎ブレス（旧15から大幅拡大）
    attackInterval: 1.0,
    effectDesc: '遠距離から強烈な火炎ブレスを浴びせ、大ダメージを与える。',
    icon: '🐉',
  },
  {
    id: 'haste_spell',
    cardNo: 102,
    name: '疾風の号令',
    type: 'SPELL',
    manaCost: 1,
    effectDesc: '指定レーンの味方の攻撃クールダウンをリセットし、即座に攻撃させる（AAキャンセル）。',
    icon: '💨',
  },
  {
    id: 'heal_spell',
    cardNo: 103,
    name: '癒やしの雨',
    type: 'SPELL',
    manaCost: 3,
    effectDesc: '指定したレーンの味方ユニットすべてのHPを3回復する。',
    icon: '🌧️',
  },
  {
    id: 'meteor',
    cardNo: 101,
    name: '隕石落下',
    type: 'SPELL',
    manaCost: 3,
    effectDesc: '指定したレーンの中央付近に隕石を落とし、範囲内の敵に3ダメージ。',
    icon: '☄️',
  },
  {
    id: 'fire_spell',
    cardNo: 106,
    name: '烈火の呪文',
    type: 'SPELL',
    manaCost: 4,
    effectDesc: '戦場全体を炎で包み、全レーンの敵ユニットに2ダメージ。',
    icon: '🔥',
  },
];

export const MANA_SPEED_PRESETS = [
  { label: '低速 (4.0秒/マナ)', value: 0.25, secPerMana: '4.0秒' },
  { label: '標準 (2.5秒/マナ)', value: 0.40, secPerMana: '2.5秒' },
  { label: '速め (1.8秒/マナ)', value: 0.55, secPerMana: '1.8秒' },
  { label: '高速 (1.3秒/マナ)', value: 0.75, secPerMana: '1.3秒' },
] as const;

export const DEFAULT_MANA_REGEN_PER_SEC = 0.40; // 推奨標準：約2.5秒で1マナ（クラロワ風バランス）
export const MOVE_SPEED_SCALE = 0.75; // ユニット移動速度の全体スケーラー（25%減速・標準歩兵走破約23.7秒）
export const PLAY_CARD_COOLDOWN_MS = 120; // カード使用時の誤爆・連打防止デバウンス（約0.12秒）
export const SPAWN_MIN_SPACE = 8.0; // 召喚時の最小専有空間（%単位：味方の前進待ちスペース）

export const createDefault15Deck = (): DemoCard[] => {
  const cardMap: Record<string, DemoCard> = {};
  CARD_POOL.forEach((c) => {
    cardMap[c.id] = c;
  });
  return [
    cardMap['mouse'], cardMap['haste_spell'],
    cardMap['cat'],
    cardMap['shiba'],
    cardMap['turtle'], cardMap['heal_spell'],
    cardMap['vampire_bat'], cardMap['vampire_bat'],
    cardMap['jellyfish'], cardMap['jellyfish'],
    cardMap['assassin'],
    cardMap['boar'],
    cardMap['dragon'],
    cardMap['meteor'],
    cardMap['fire_spell'],
  ].filter(Boolean);
};

export const shuffleCards = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export interface DeckState {
  hand: DemoCard[];
  nextCard: DemoCard | null;
  deck: DemoCard[];
  discardPile: DemoCard[];
}

export const createDeterministicDeckState = (): DeckState => {
  const cards = createDefault15Deck();
  return {
    hand: cards.slice(0, 4),
    nextCard: cards[4] || null,
    deck: cards.slice(5),
    discardPile: [],
  };
};

export const createRandomDeckState = (): DeckState => {
  const shuffled = shuffleCards(createDefault15Deck());
  return {
    hand: shuffled.slice(0, 4),
    nextCard: shuffled[4] || null,
    deck: shuffled.slice(5),
    discardPile: [],
  };
};
