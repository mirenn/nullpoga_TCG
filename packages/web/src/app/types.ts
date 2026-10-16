export type CardType = 'MONSTER' | 'SPELL';

export interface DemoCard {
  id: string;
  cardNo: number;
  name: string;
  type: CardType;
  manaCost: number;
  attack?: number;
  life?: number;
  speed?: number; // 前進速度 (フィールド全体の% / 秒)
  hitRange?: number; // 実際に攻撃が当たる距離 (%)。range(探知・攻撃モーション開始距離)より短いと、範囲外へ逃げた相手に空振りする
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
  x: number; // 0〜100%
  y: number; // 0〜100%
  hp: number;
  maxHp: number;
  lastHitTime?: number; // 被弾演出用
  lane?: number; // 互換エイリアス
}

export interface Unit {
  id: string;
  cardNo: number;
  name: string;
  owner: Owner;
  x: number; // 0(左端) 〜 100(右端) %
  y: number; // 0(CPU最奥/拠点) 〜 100(プレイヤー最奥/拠点) %
  maxHp: number;
  hp: number;
  attack: number;
  speed: number; // 1秒あたりの移動量 (%)
  hitRange?: number; // 実ヒット距離 (%)。未指定なら range と同じ
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
  isHolding?: boolean; // クリックで待機中（移動のみ停止。射程内なら攻撃は継続）
  isSprinting?: boolean; // 前方敵不在で疾走中（3倍速）
  killCount?: number; // 敵ユニット撃破数（吸血コウモリ等）
  lastKillTime?: number; // 撃破・ステータス向上エフェクト描画用
  isSpotted?: boolean; // カメラ平行移動（覗き込み）によって遮蔽物の死角から看破されたか
  lastSpottedTime?: number; // スポット（看破）演出用タイムスタンプ
  isAmbushDeploy?: boolean; // 自陣遮蔽物の陰から奇襲出撃したバフ適用中か
  lane?: number; // 互換エイリアス
}

export interface SpellEffect {
  id: string;
  x: number;
  y: number;
  type: 'meteor' | 'burn' | 'haste' | 'heal';
  createdAt: number;
  originY?: number; // 烈火の呪文などの延焼起点Y座標
  lane?: number;
}

export type AttackEffectType =
  | 'fireball'
  | 'lightning'
  | 'slash'
  | 'base_hit'
  | 'claw'
  | 'bite'
  | 'tackle'
  | 'headbutt'
  | 'shadow_slash'
  | 'blood_bite';

export interface AttackEffect {
  id: string;
  attackerId: string;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  owner: Owner;
  effectType: AttackEffectType;
  damage: number;
  createdAt: number;
  duration: number; // アニメーション時間 (ms)
  flightDuration?: number; // 弾が飛ぶ時間 (ms)
  lane?: number;
  toLane?: number;
}

export interface CpuSpawnWarning {
  id: string;
  x: number;
  y?: number;
  targetY?: number;
  card: DemoCard;
  startTime: number;
  durationMs: number;
  comboCount?: number;
  lane?: number;
}

