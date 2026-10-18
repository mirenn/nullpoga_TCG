import type { CloudEventState, CloudEventPhase, CloudEntity, Unit } from './types';

/**
 * 流雲・動的死角（Drifting Clouds & Moving Fog）システム
 *
 * 【ゲームデザイン意図・背景】
 * 固定された障害物（岩・木）による死角に加え、
 * フィールド上空を風に乗ってゆっくり流れる「雲」と「地面の雲影」によって、
 * 一時的に戦場を横切る動的な死角（フォグ・オブ・ウォー）を創出する。
 *
 * 1. ☁️ 雲の出現と移動:
 *    - 約22秒周期で、上空から厚みのある雲群（メイン雲＋サブ雲）が発生。
 *    - 風に乗ってフィールドを約14秒かけてゆっくり横断する。
 *    - 風向きは左から右（西風）または右から左（東風）へランダムに発生。
 *
 * 2. 🌫️ 動的死角（雲隠れ / Cloud Concealment）:
 *    - 雲の影に入った敵ユニットは、プレイヤーから「❓」マークと濃い影のシルエットに隠蔽され、
 *      HPバーや詳細ステータスが秘匿される。
 *    - 突然の強襲や、大軍の隠密進軍による心理的緊張感・複雑性を演出する。
 *
 * 3. 👁️ 接近看破（Proximity Spot）:
 *    - 味方ユニットが雲の中の敵ユニットに一定距離（約13%）まで接近すると、
 *      視界によって正体を看破（SPOT!）できる。
 *    - プレイヤー自身の味方ユニットは、自軍からは見失わないよう半透明＋「☁️隠密」アイコンで表示。
 */

/** 各フェーズの時間設定 (秒) */
export const CLOUD_INITIAL_DELAY_SEC = 10.0; // ゲーム開始後、初回雲イベントまでの秒数
export const CLOUD_INTERVAL_SEC = 25.0; // 雲イベント間のアイドル待機時間
export const CLOUD_DRIFT_DURATION_SEC = 42.0; // 雲がフィールドをゆっくり横切る時間（旧14.0秒から穏やかなペースへ調整）
export const CLOUD_COOLDOWN_DURATION_SEC = 2.0; // 通過後のクールダウン

/** 接近看破（SPOT）の有効距離 (フィールド座標 %) */
export const CLOUD_SPOT_PROXIMITY_DISTANCE = 13.0;

/** 雲のプリセット生成 */
export function generateClouds(direction: 'left-to-right' | 'right-to-left' = 'left-to-right'): CloudEntity[] {
  const isLtoR = direction === 'left-to-right';
  const startX1 = isLtoR ? -18 : 118;
  const targetX1 = isLtoR ? 118 : -18;
  const speedX1 = (targetX1 - startX1) / CLOUD_DRIFT_DURATION_SEC;

  // 出現Y座標: 上段寄り(34%)〜下段寄り(58%)の特定レーン帯を通過
  const baseY = 34 + Math.random() * 24;

  // メイン雲（旧radiusX:22, radiusY:38からコンパクトに調整し、画面全体を覆い尽くさず1〜2レーンを程よくカバー）
  const mainCloud: CloudEntity = {
    id: `cloud_main_${Date.now()}`,
    x: startX1,
    y: baseY,
    radiusX: 11, // 横幅の半径 (%) -> 直径約22% (旧22から縮小)
    radiusY: 14, // 縦幅の半径 (%) -> 直径約28% (旧38から大幅縮小)
    speedX: speedX1,
    speedY: (Math.random() * 0.4 - 0.2), // ごくわずかに上下に揺れる
    scale: 1.0,
    opacity: 0.78, // 盤面視認性を高めるため微調整 (旧0.88)
    shadowOpacity: 0.28, // 地面の影をソフトに調整 (旧0.42)
  };

  // サブの雲（メイン雲に寄り添い、適度な間隔で並走する小ぶりの雲塊）
  const subStartX = isLtoR ? startX1 - 12 : startX1 + 12;
  const subTargetX = isLtoR ? targetX1 - 12 : targetX1 + 12;
  const speedX2 = (subTargetX - subStartX) / CLOUD_DRIFT_DURATION_SEC;
  const subOffsetY = Math.random() * 12 - 6;

  const subCloud: CloudEntity = {
    id: `cloud_sub_${Date.now()}`,
    x: subStartX,
    y: Math.max(18, Math.min(82, baseY + subOffsetY)),
    radiusX: 8.5, // 旧18から縮小
    radiusY: 11, // 旧30から縮小
    speedX: speedX2,
    speedY: (Math.random() * 0.4 - 0.2),
    scale: 0.88,
    opacity: 0.72,
    shadowOpacity: 0.22,
  };

  return [mainCloud, subCloud];
}

/** 雲イベント状態の初期値を生成 */
export function createInitialCloudEventState(): CloudEventState {
  return {
    phase: 'idle',
    phaseTimer: CLOUD_INITIAL_DELAY_SEC,
    phaseDuration: CLOUD_INITIAL_DELAY_SEC,
    nextCloudIn: CLOUD_INITIAL_DELAY_SEC,
    clouds: [],
  };
}

/** ユニットが特定の雲の影（楕円領域）内にあるか判定 */
export function isUnitInCloudShadow(unitX: number, unitY: number, cloud: CloudEntity): boolean {
  if (cloud.radiusX <= 0 || cloud.radiusY <= 0) return false;
  const dx = (unitX - cloud.x) / cloud.radiusX;
  const dy = (unitY - cloud.y) / cloud.radiusY;
  return (dx * dx + dy * dy) <= 1.0;
}

/** ユニットがいずれかの雲の影に入っているか判定 */
export function isUnitCoveredByAnyCloud(unitX: number, unitY: number, clouds: CloudEntity[]): boolean {
  return clouds.some((cloud) => isUnitInCloudShadow(unitX, unitY, cloud));
}

/** 雲イベント更新処理結果 */
export interface UpdateCloudEventResult {
  nextState: CloudEventState;
  updatedUnits: Unit[];
}

/**
 * 毎フレームの雲イベント更新処理
 *
 * @param dt 前フレームからの経過秒数
 * @param state 現在の雲イベント状態
 * @param units 現在フィールドにいるユニット群
 */
export function updateCloudEvent(
  dt: number,
  state: CloudEventState,
  units: Unit[]
): UpdateCloudEventResult {
  let { phase, phaseTimer, phaseDuration, nextCloudIn, clouds } = state;

  phaseTimer -= dt;

  if (phase === 'idle') {
    nextCloudIn = Math.max(0, phaseTimer);
    if (phaseTimer <= 0) {
      // 雲の横断開始！風向きをランダム決定 (70%はプレイヤーから敵へ、30%は敵からプレイヤーへ)
      const direction = Math.random() < 0.7 ? 'left-to-right' : 'right-to-left';
      phase = 'drifting';
      phaseDuration = CLOUD_DRIFT_DURATION_SEC;
      phaseTimer = CLOUD_DRIFT_DURATION_SEC;
      nextCloudIn = 0;
      clouds = generateClouds(direction);
    }
  } else if (phase === 'drifting') {
    // 雲を風に乗せて移動させる
    clouds = clouds.map((c) => ({
      ...c,
      x: c.x + c.speedX * dt,
      y: c.y + c.speedY * dt,
    }));

    if (phaseTimer <= 0) {
      // 横断完了 -> クールダウンへ
      phase = 'cooldown';
      phaseDuration = CLOUD_COOLDOWN_DURATION_SEC;
      phaseTimer = CLOUD_COOLDOWN_DURATION_SEC;
    }
  } else if (phase === 'cooldown') {
    if (phaseTimer <= 0) {
      // クールダウン完了 -> 次回発生待ちへ
      phase = 'idle';
      phaseDuration = CLOUD_INTERVAL_SEC;
      phaseTimer = CLOUD_INTERVAL_SEC;
      nextCloudIn = CLOUD_INTERVAL_SEC;
      clouds = [];
    }
  }

  // ユニットの雲隠れ（死角判定）＆ 接近看破（SPOT）の評価
  const playerUnits = units.filter((u) => u.owner === 'player');
  const cpuUnits = units.filter((u) => u.owner === 'cpu');

  const updatedUnits = units.map((u) => {
    // 雲がフィールドにない場合は雲隠れ解除
    if (clouds.length === 0 || phase !== 'drifting') {
      return { ...u, isCloudConcealed: false, isCloudSpotted: false };
    }

    // 雲の影の中にいるか
    const inCloud = isUnitCoveredByAnyCloud(u.x, u.y, clouds);

    if (!inCloud) {
      return { ...u, isCloudConcealed: false, isCloudSpotted: false };
    }

    // 雲の影の中にいる場合
    if (u.owner === 'player') {
      // プレイヤーユニットは味方からは常に見えるが、雲隠れステータスを付与
      return {
        ...u,
        isCloudConcealed: true,
        isCloudSpotted: true,
      };
    } else {
      // CPUユニット: 味方プレイヤーユニットが近くにいるか判定
      const hasClosePlayerUnit = playerUnits.some((pu) => {
        const dx = pu.x - u.x;
        const dy = pu.y - u.y;
        return Math.hypot(dx, dy) <= CLOUD_SPOT_PROXIMITY_DISTANCE;
      });

      const isSpotted = hasClosePlayerUnit;
      return {
        ...u,
        isCloudConcealed: true,
        isCloudSpotted: isSpotted,
      };
    }
  });

  return {
    nextState: {
      phase,
      phaseTimer: Math.max(0, phaseTimer),
      phaseDuration,
      nextCloudIn: Math.max(0, nextCloudIn),
      clouds,
    },
    updatedUnits,
  };
}
