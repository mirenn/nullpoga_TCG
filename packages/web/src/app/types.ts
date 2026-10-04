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
  attackInterval?: number; // 攻撃間隔・クールダウン (秒)
  attackWindup?: number; // 攻撃前隙・チャージ時間 (秒、例: 1.0)
  effectDesc: string;
  icon: string;
}

export type Owner = 'player' | 'cpu';

/** インヒビター（破壊可能な非攻撃オブジェクト） */
export interface Inhibitor {
  id: string;
  owner: Owner;
  lane: number; // 列インデックス (0〜COLUMN_COUNT-1)
  y: number;
  hp: number;
  maxHp: number;
  lastHitTime?: number; // 被弾演出用
}

export interface Unit {
  id: string;
  cardNo: number;
  name: string;
  owner: Owner;
  lane: number; // 列インデックス (0〜COLUMN_COUNT-1, board.ts 参照)
  y: number; // 0(CPU最奥/拠点) 〜 100(プレイヤー最奥/拠点)
  maxHp: number;
  hp: number;
  attack: number;
  speed: number; // 1秒あたりの移動量 (%)
  range: number; // 射程 (%)
  attackCooldown: number; // 秒
  attackInterval: number; // 攻撃間隔（例: 1.0秒）
  attackWindup?: number; // 攻撃前隙・チャージ時間 (秒)
  isCharging?: boolean; // チャージ中か
  chargeStartTime?: number; // チャージ開始時刻 (ms)
  icon: string;
  isStunnedUntil?: number; // タイムスタンプ
  isStunned?: boolean;
  distanceTraveled?: number; // 移動距離（柴犬のバフ用）
  lastAttackEffectTime?: number; // エフェクト描画用
  isCounterDeploy?: boolean; // カウンターデプロイバフ適用中
  comboCount?: number; // コンボボーナス段階 (2=2コンボ, 3=3コンボ)
  isSprinting?: boolean; // 敵不在レーン疾走中（3倍速）
  killCount?: number; // 敵ユニット撃破数（吸血コウモリ等）
  lastKillTime?: number; // 撃破・ステータス向上エフェクト描画用
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
  toLane?: number; // 標的の列（隣接列への攻撃時。未指定なら lane と同じ）
  fromY: number;
  toY: number;
  owner: 'player' | 'cpu';
  effectType: AttackEffectType;
  damage: number;
  createdAt: number;
  duration: number; // アニメーション時間 (ms)
  flightDuration?: number; // 弾が飛ぶ時間 (ms)
}

export interface CpuSpawnWarning {
  id: string;
  lane: number;
  card: DemoCard;
  startTime: number;
  durationMs: number;
  comboCount?: number;
}

