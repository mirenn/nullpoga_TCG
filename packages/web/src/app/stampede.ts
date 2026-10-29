import type { StampedeState, StampedePhase, StampedeBeast, Unit } from './types';

/**
 * 巨獣スタンピード（Stampede）システム
 *
 * 【ゲームデザイン意図・背景】
 * プレイヤーがユニットをタップして「立ち止まる（ホールド）」操作の価値・インセンティブを
 * 最大化するための環境ギミック。
 *
 * フィールド中央（x=45〜55%）の回廊に、定期的に野生の巨獣たち（🦣マンモス、🦏サイ、🐃野牛、🐗巨大猪）の
 * 大暴走（スタンピード）が発生する。
 *
 * 1. ⚠️ 警報フェーズ（約3.2秒間）:
 *    - 地鳴りと角笛の警告音、地面に赤い警告帯が点滅！
 *    - プレイヤーはこの間に前進中のユニットをタップして「手前で立ち止まらせる（HOLD）」！
 *    - 逆に、敵（CPU）のユニットを手前でおびき寄せることで、敵をスタンピードに巻き込む（トレインキル）ことが可能。
 *
 * 2. 🦣 突進フェーズ（約2.0秒間）:
 *    - 巨獣の群れが上から下へ猛スピードで駆け抜ける。
 *    - 回廊内にいるユニット（プレイヤー・敵問わず）は即死級の大激突ダメージ（999）で一掃される！
 *
 * 3. 🎯 立ち止まりインセンティブ「待ち伏せ集中（Ambush Charge）」:
 *    - 2.0秒以上立ち止まったユニットは「待ち伏せ集中」が完了。
 *    - スタンピード通過後にタップ解除（再前進）した瞬間、1.5秒間の高速ダッシュ＋初回攻撃力+2の奇襲一撃を放てる！
 */

/** 危険回廊のX座標範囲 (%) */
export const STAMPEDE_ZONE_X_MIN = 45;
export const STAMPEDE_ZONE_X_MAX = 55;
export const STAMPEDE_ZONE_CENTER_X = 50;

/** 各フェーズの時間設定 (秒) */
export const STAMPEDE_INITIAL_DELAY_SEC = 35; // ゲーム開始から初回警報までの秒数 (初回突進は 35 + 3.5 = 38.5秒)
export const STAMPEDE_INTERVAL_SEC = 50; // 通常アイドル時間 (突進間隔は 50 + 3.5 = 53.5秒)
export const STAMPEDE_APPROACHING_SEC = 6.0; // 地鳴り予兆フェーズ（突進前6秒 / 警報の約2.5秒前から予兆開始）
export const STAMPEDE_WARNING_DURATION_SEC = 3.5; // 警告フェーズ（タップして止まるための猶予時間: 3.5秒）
export const STAMPEDE_RUSH_DURATION_SEC = 4.5; // 巨獣群の突進通過時間（ゆっくり重厚に駆け抜ける速度: 4.5秒）
export const STAMPEDE_COOLDOWN_DURATION_SEC = 1.0; // 通過後の余韻・解除タイミング

/** スタンピードの激突ダメージ (即死級) */
export const STAMPEDE_CRUSH_DAMAGE = 999;

/** 立ち止まり（ホールド）による「待ち伏せ集中」の必要秒数 */
export const HOLD_AMBUSH_CHARGE_TIME_SEC = 2.0;

/** 待ち伏せ集中完了後の初回攻撃力ボーナス */
export const HOLD_AMBUSH_ATTACK_BONUS = 2;

/** 待ち伏せ解除後のダッシュ倍率 & 持続秒数 */
export const HOLD_AMBUSH_DASH_SPEED_MULTIPLIER = 1.8;
export const HOLD_AMBUSH_DASH_DURATION_SEC = 1.5;

/** 巨獣の当たり判定半径 (%) */
export const STAMPEDE_BEAST_HIT_RADIUS_X = 4;
export const STAMPEDE_BEAST_HIT_RADIUS_Y = 5;

/** 巨獣の現在Y座標 (%)。RenderStampede の描画位置と同じ式 */
export function getStampedeBeastY(beast: StampedeBeast, rushProgress: number): number {
  return -15 + ((rushProgress * beast.speedFactor + beast.yProgressOffset) % 1.35) * 130;
}

/** 巨獣のプリセット定義 */
const BEAST_PRESETS: Array<{ icon: string; name: string; size: number }> = [
  { icon: '🦣', name: '古代マンモス', size: 48 },
  { icon: '🦏', name: '暴走サイ', size: 42 },
  { icon: '🐃', name: '野生バッファロー', size: 40 },
  { icon: '🐗', name: '大猪王', size: 38 },
  { icon: '🦣', name: '古代マンモス', size: 46 },
  { icon: '🐃', name: '野生バッファロー', size: 40 },
  { icon: '🦏', name: '暴走サイ', size: 42 },
];

/** 突進する巨獣群の初期配置を生成 */
export function generateStampedeBeasts(): StampedeBeast[] {
  return BEAST_PRESETS.map((preset, index) => {
    // 左右に少しばらつかせる (-3% 〜 +3%)
    const xOffsetPercent = ((index % 3) - 1) * 2.8 + (Math.sin(index * 1.5) * 1.2);
    // 縦方向の突進ズレ (波状攻撃のようにズラす)
    const yProgressOffset = (index * 0.12) % 0.35;
    // 速度差 (0.95 〜 1.15)
    const speedFactor = 0.95 + (index % 4) * 0.06;

    return {
      id: `beast_${index}_${Date.now()}`,
      icon: preset.icon,
      name: preset.name,
      xOffsetPercent,
      yProgressOffset,
      speedFactor,
      size: preset.size,
    };
  });
}

/** スタンピード状態の初期値を生成 */
export function createInitialStampedeState(): StampedeState {
  const nextIn = STAMPEDE_INITIAL_DELAY_SEC + STAMPEDE_WARNING_DURATION_SEC;
  return {
    phase: 'idle',
    phaseTimer: STAMPEDE_INITIAL_DELAY_SEC,
    phaseDuration: STAMPEDE_INITIAL_DELAY_SEC,
    nextStampedeIn: nextIn,
    zoneXMin: STAMPEDE_ZONE_X_MIN,
    zoneXMax: STAMPEDE_ZONE_X_MAX,
    rushProgress: 0,
    beasts: generateStampedeBeasts(),
    hitUnitIds: {},
  };
}

/** 地鳴り（接近中・予兆）状態かどうか判定（突進まで STAMPEDE_APPROACHING_SEC 秒以下、かつまだ warning に入っていない idle 時） */
export function isStampedeApproaching(state: StampedeState): boolean {
  return state.phase === 'idle' && state.nextStampedeIn <= STAMPEDE_APPROACHING_SEC;
}

/** ユニットがスタンピードの危険回廊内に入っているか判定 */
export function isUnitInStampedeZone(
  unitX: number,
  zoneXMin: number = STAMPEDE_ZONE_X_MIN,
  zoneXMax: number = STAMPEDE_ZONE_X_MAX
): boolean {
  return unitX >= zoneXMin && unitX <= zoneXMax;
}

/** スタンピードの回廊の手前に安全にいるか（プレイヤー目線：回廊より手前 x < zoneXMin） */
export function isPlayerUnitSafeBeforeZone(unitX: number, zoneXMin: number = STAMPEDE_ZONE_X_MIN): boolean {
  return unitX < zoneXMin;
}

/** スタンピードの回廊の手前に安全にいるか（CPU目線：回廊より手前 x > zoneXMax） */
export function isCpuUnitSafeBeforeZone(unitX: number, zoneXMax: number = STAMPEDE_ZONE_X_MAX): boolean {
  return unitX > zoneXMax;
}

/**
 * CPUユニットがスタンピード警報・突進を察知して手前で立ち止まるべきかを判定
 *
 * 【性格付け・駆け引き】
 * - 🐗 イノシシ (cardNo: 7) や 🐭 ネズミ (cardNo: 1):
 *   猪突猛進＆パニックで止まることができず、そのまま突っ込んで轢かれる！
 * - 🐢 亀 (cardNo: 5), 🪼 電気クラゲ (cardNo: 6), 🏹 森の狩人 (cardNo: 12), 🐱 ネコ (cardNo: 3):
 *   危険を察知して回廊の手前（x=55%〜65%）でピタッと立ち止まり待機する！
 * - スタンピード通過後 (cooldown / idle) は自動で前進を再開する。
 */
export function shouldCpuUnitHoldForStampede(unit: Unit, state: StampedeState): boolean {
  if (unit.owner !== 'cpu') return false;
  if (state.phase !== 'warning' && state.phase !== 'rush') return false;

  // 猪突猛進・無謀な突進モンスターは止まらない
  if (unit.cardNo === 7 || unit.cardNo === 1) {
    return false;
  }

  // 回廊の手前（x: 55%〜66%）に接近している場合、手前で立ち止まってやり過ごす
  return unit.x > state.zoneXMax && unit.x <= state.zoneXMax + 11;
}


export interface StampedeUpdateResult {
  nextState: StampedeState;
  crushedUnitIds: string[]; // このフレームで轢かれたユニットのID
  didPhaseChange: boolean;
  prevPhase: StampedePhase;
}

/**
 * ゲームループ内で毎フレーム呼び出されるスタンピード状態更新ロジック
 */
export function updateStampede(
  dt: number,
  state: StampedeState,
  units: Unit[]
): StampedeUpdateResult {
  let { phase, phaseTimer, phaseDuration, rushProgress, beasts, hitUnitIds } = state;
  let didPhaseChange = false;
  const prevPhase = phase;
  const crushedUnitIds: string[] = [];

  phaseTimer -= dt;

  if (phaseTimer <= 0) {
    didPhaseChange = true;
    switch (phase) {
      case 'idle':
        // アイドル終了 -> 警報フェーズへ
        phase = 'warning';
        phaseTimer = STAMPEDE_WARNING_DURATION_SEC;
        phaseDuration = STAMPEDE_WARNING_DURATION_SEC;
        hitUnitIds = {};
        break;

      case 'warning':
        // 警報終了 -> 突進フェーズへ
        phase = 'rush';
        phaseTimer = STAMPEDE_RUSH_DURATION_SEC;
        phaseDuration = STAMPEDE_RUSH_DURATION_SEC;
        rushProgress = 0;
        beasts = generateStampedeBeasts();
        hitUnitIds = {};
        break;

      case 'rush':
        // 突進終了 -> クールダウンフェーズへ
        phase = 'cooldown';
        phaseTimer = STAMPEDE_COOLDOWN_DURATION_SEC;
        phaseDuration = STAMPEDE_COOLDOWN_DURATION_SEC;
        rushProgress = 1.0;
        break;

      case 'cooldown':
        // クールダウン終了 -> アイドルへ戻る
        phase = 'idle';
        phaseTimer = STAMPEDE_INTERVAL_SEC;
        phaseDuration = STAMPEDE_INTERVAL_SEC;
        rushProgress = 0;
        hitUnitIds = {};
        break;
    }
  }

  // rush フェーズ中の進行率更新 & 激突判定
  if (phase === 'rush') {
    const elapsed = phaseDuration - phaseTimer;
    rushProgress = Math.min(1.0, Math.max(0, elapsed / phaseDuration));

    // 巨獣の体が実際に触れた未被弾ユニットのみ激突判定 (範囲一括ではなく、各巨獣の現在位置で判定)
    const prevProgress = prevPhase === 'rush' ? state.rushProgress : 0;
    for (const unit of units) {
      if (unit.hp <= 0) continue;
      if (hitUnitIds[unit.id]) continue;

      const touched = beasts.some((beast) => {
        if (Math.abs(unit.x - (50 + beast.xOffsetPercent)) > STAMPEDE_BEAST_HIT_RADIUS_X) return false;
        // 前フレームから今フレームまでの軌跡をなぞり、すり抜けを防ぐ
        const yTo = getStampedeBeastY(beast, rushProgress);
        const yPrev = getStampedeBeastY(beast, prevProgress);
        const yFrom = yPrev <= yTo ? yPrev : yTo; // 折り返し(ワープ)時は軌跡を引かない
        return unit.y >= Math.min(yFrom, yTo) - STAMPEDE_BEAST_HIT_RADIUS_Y
          && unit.y <= Math.max(yFrom, yTo) + STAMPEDE_BEAST_HIT_RADIUS_Y;
      });
      if (touched) {
        crushedUnitIds.push(unit.id);
        hitUnitIds[unit.id] = true;
      }
    }
  }

  // UI用の次回突進（rush激突）までの残り秒数計算 (LoLドラゴンタイマー方式)
  let nextStampedeIn = 0;
  if (phase === 'idle') {
    nextStampedeIn = phaseTimer + STAMPEDE_WARNING_DURATION_SEC;
  } else if (phase === 'warning') {
    nextStampedeIn = phaseTimer;
  } else if (phase === 'rush') {
    nextStampedeIn = 0;
  } else {
    // cooldown
    nextStampedeIn = phaseTimer + STAMPEDE_INTERVAL_SEC + STAMPEDE_WARNING_DURATION_SEC;
  }

  return {
    nextState: {
      phase,
      phaseTimer: Math.max(0, phaseTimer),
      phaseDuration,
      nextStampedeIn: Math.max(0, nextStampedeIn),
      zoneXMin: state.zoneXMin,
      zoneXMax: state.zoneXMax,
      rushProgress,
      beasts,
      hitUnitIds,
    },
    crushedUnitIds,
    didPhaseChange,
    prevPhase,
  };
}
