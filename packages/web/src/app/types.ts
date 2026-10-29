export type CardType = 'MONSTER' | 'SPELL';

export type ObstacleAction = 'slide' | 'jump' | 'smash' | 'block';

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
  canMoveWhileCharging?: boolean; // 攻撃チャージ中（attackWindup）も立ち止まらずに前進・突進可能か（猪・柴犬など）
  isCircularRange?: boolean; // 円形探知範囲（忍者など）
  obstacleAction?: ObstacleAction; // 障害物衝突時の性質（slide=スライド迂回, jump=飛び越え, smash=激突粉砕, block=停止）
  hasSpellShield?: boolean; // スペルシールド（あらゆる被弾ダメージ＆付随効果を最初の1回だけ無効化）
  effectDesc: string;
  icon: string;
}

export type Owner = 'player' | 'cpu';

/** インヒビター＆中立スカトル（破壊可能な非攻撃オブジェクト） */
export interface Inhibitor {
  id: string;
  owner: Owner | 'neutral';
  x: number; // 0〜100%
  y: number; // 0〜100%
  hp: number;
  maxHp: number;
  lastHitTime?: number; // 被弾演出用
  respawnAt?: number; // 中立スカトル等の再出現時刻 (ms)
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
  canMoveWhileCharging?: boolean; // 攻撃チャージ中も前進可能か
  isCircularRange?: boolean; // 円形全方位探知（忍者など）
  obstacleAction?: ObstacleAction; // 障害物・前方味方への接触時の性質（slide=スライド迂回, jump=飛び越え, smash=障害物粉砕＆味方押し出しプッシュ, block=障害物を攻撃破壊・味方に追従）
  isJumping?: boolean; // 障害物・味方の飛び越え中か
  jumpProgress?: number; // ジャンプ進行度 (0〜1)
  isSliding?: boolean; // 障害物・味方のスライド迂回中か
  isPushed?: boolean; // 後方のsmash味方（イノシシ・ドラゴン）に押されて加速前進中か
  isPushing?: boolean; // 前方の味方を後ろから押し出し（プッシュ）中か
  isAttackingObstacle?: boolean; // 進路上の障害物（木・岩・結晶）を攻撃して破壊中か
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
  holdDuration?: number; // 待機（ホールド）継続秒数
  hasAmbushCharge?: boolean; // 2秒以上待機でチャージ完了（次の攻撃力+2＆解除後1.5秒ダッシュ）
  ambushDashUntil?: number; // チャージ解除後の奇襲ダッシュ終了タイムスタンプ (ms)
  isScouting?: boolean; // 索敵モード中（その場で立ち止まり、前方160度をスキャン）
  scoutProgress?: number; // 索敵スキャンの進行度 (0.0 〜 1.0)
  scoutTargetUnitId?: string; // 索敵で発見して追跡中の敵ユニットID
  isSprinting?: boolean; // 前方敵不在で疾走中（3倍速）
  killCount?: number; // 敵ユニット撃破数（吸血コウモリ等）
  lastKillTime?: number; // 撃破・ステータス向上エフェクト描画用
  isSpotted?: boolean; // カメラ平行移動（覗き込み）によって遮蔽物の死角から看破されたか
  lastSpottedTime?: number; // スポット（看破）演出用タイムスタンプ
  isAmbushDeploy?: boolean; // 自陣遮蔽物の陰から奇襲出撃したバフ適用中か
  isCloudConcealed?: boolean; // 雲の影に入って死角に隠れているか
  isCloudSpotted?: boolean; // 雲の中にいるが味方接近等で看破されたか
  hasSpellShield?: boolean; // スペルシールド保持中か（1回被弾で消費）
  lane?: number; // 互換エイリアス
}

export type StampedePhase = 'idle' | 'warning' | 'rush' | 'cooldown';

export interface StampedeBeast {
  id: string;
  icon: string;
  name: string;
  xOffsetPercent: number; // 回廊中心(50%)からのXオフセット (-3% 〜 +3%)
  yProgressOffset: number; // 突進進行度のズレ (0〜0.3)
  speedFactor: number;
  size: number;
}

export interface StampedeState {
  phase: StampedePhase;
  phaseTimer: number; // 現在フェーズの残り秒数
  phaseDuration: number; // 現在フェーズの規定秒数
  nextStampedeIn: number; // 次の突進開始（warning含む）までの秒数
  zoneXMin: number; // 危険回廊左端 (%)
  zoneXMax: number; // 危険回廊右端 (%)
  rushProgress: number; // 0.0 〜 1.0 (rushフェーズの進行率)
  beasts: StampedeBeast[]; // 巨獣群のデータ
  hitUnitIds: Record<string, boolean>; // この突進で既に被弾したユニットID
}

export interface SpellEffect {
  id: string;
  x: number;
  y: number;
  type: 'meteor' | 'burn' | 'burn_warning' | 'haste' | 'haste_warning' | 'heal' | 'heal_warning';
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
  | 'blood_bite'
  | 'arrow'
  | 'shuriken';

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

export type CloudEventPhase = 'idle' | 'drifting' | 'cooldown';

export interface CloudEntity {
  id: string;
  x: number; // 0〜100% (雲中心のX座標)
  y: number; // 0〜100% (雲中心のY座標)
  radiusX: number; // 影・死角の水平半径 (%)
  radiusY: number; // 影・死角の垂直半径 (%)
  speedX: number; // 1秒あたりの移動速度 (%/s)
  speedY: number; // 1秒あたりのY微動速度 (%/s)
  scale: number; // 表示スケール
  opacity: number; // 雲の透明度 (0.0〜1.0)
  shadowOpacity: number; // 地面に落ちる影の濃さ (0.0〜1.0)
}

export interface CloudEventState {
  phase: CloudEventPhase;
  phaseTimer: number; // 現在フェーズの残り秒数
  phaseDuration: number; // 現在フェーズの規定秒数
  nextCloudIn: number; // 次の雲発生までの秒数
  clouds: CloudEntity[]; // 現在流れている雲群
}

