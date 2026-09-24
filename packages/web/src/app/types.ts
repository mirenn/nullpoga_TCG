export type CardType = 'MONSTER' | 'SPELL';

export interface DemoCard {
  id: string;
  cardNo: number;
  name: string;
  type: CardType;
  manaCost: number;
  attack?: number;
  life?: number;
  speed?: number; // 前進速度 (レーン全体の% / 秒)
  range?: number; // 射程 (%単位)
  effectDesc: string;
  icon: string;
}

export interface Unit {
  id: string;
  cardNo: number;
  name: string;
  owner: 'player' | 'cpu';
  lane: number; // 0〜4
  y: number; // 0(CPU最奥/拠点) 〜 100(プレイヤー最奥/拠点)
  maxHp: number;
  hp: number;
  attack: number;
  speed: number; // 1秒あたりの移動量 (%)
  range: number; // 射程 (%)
  attackCooldown: number; // 秒
  attackInterval: number; // 攻撃間隔（例: 1.0秒）
  icon: string;
  isStunnedUntil?: number; // タイムスタンプ
  isStunned?: boolean;
  distanceTraveled?: number; // 移動距離（柴犬のバフ用）
  lastAttackEffectTime?: number; // エフェクト描画用
}

export interface SpellEffect {
  id: string;
  lane: number;
  y: number;
  type: 'meteor' | 'burn' | 'haste' | 'heal';
  createdAt: number;
}

export type AttackEffectType = 'fireball' | 'lightning' | 'slash' | 'base_hit';

export interface AttackEffect {
  id: string;
  attackerId: string;
  lane: number;
  fromY: number;
  toY: number;
  owner: 'player' | 'cpu';
  effectType: AttackEffectType;
  damage: number;
  createdAt: number;
  duration: number; // アニメーション時間 (ms)
  flightDuration?: number; // 弾が飛ぶ時間 (ms)
}
