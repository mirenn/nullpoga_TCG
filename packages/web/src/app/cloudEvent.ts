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
export const CLOUD_DRIFT_DURATION_SEC = 45.0; // 雲がフィールドをゆっくり横切る時間（穏やかな流雲ペース）
export const CLOUD_COOLDOWN_DURATION_SEC = 2.0; // 通過後のクールダウン

/** 雲の幾何サイズ定数 (ユニット2〜3体がすっぽり収まるミニマルサイズ) */
export const CLOUD_MAIN_RADIUS_X = 2.8; // 直径約5.6% (横幅約50〜60px: ユニット2体分の幅)
export const CLOUD_MAIN_RADIUS_Y = 3.6; // 直径約7.2% (縦幅約35〜40px: 1レーン内にすっぽり収まる)
export const CLOUD_SUB_RADIUS_X = 1.8;  // 直径約3.6% (ユニット1体分の小粒なちぎれ雲)
export const CLOUD_SUB_RADIUS_Y = 2.4;  // 直径約4.8%

/** 接近看破（SPOT）の有効距離 (フィールド座標 %) */
export const CLOUD_SPOT_PROXIMITY_DISTANCE = 5.0;

/** 雲のプリセット生成 */
export function generateClouds(direction: 'left-to-right' | 'right-to-left' = 'left-to-right'): CloudEntity[] {
  const isLtoR = direction === 'left-to-right';
  const startX1 = isLtoR ? -8 : 108;
  const targetX1 = isLtoR ? 108 : -8;
  const speedX1 = (targetX1 - startX1) / CLOUD_DRIFT_DURATION_SEC;

  // 出現Y座標: 上段寄り〜下段寄りのレーン帯 (28%〜62%) をゆったり通過
  const baseY = 28 + Math.random() * 34;

  // メイン雲: ユニット2〜3体がすっぽり入る程度のコンパクトな「動く茂み」サイズ (直径: 横約5.6%, 縦約7.2%)
  const mainCloud: CloudEntity = {
    id: `cloud_main_${Date.now()}`,
    x: startX1,
    y: baseY,
    radiusX: CLOUD_MAIN_RADIUS_X,
    radiusY: CLOUD_MAIN_RADIUS_Y,
    speedX: speedX1,
    speedY: (Math.random() * 0.12 - 0.06),
    scale: 1.0,
    opacity: 0.62, // 盤面のユニット戦闘がよく見える軽やかな透明度
    shadowOpacity: 0.16, // 地面にうっすら落ちるソフトな影
  };

  // サブの雲: メイン雲の斜め後ろに寄り添う小さなちぎれ雲 (直径: 横約3.6%, 縦約4.8%)
  const subOffsetX = isLtoR ? -4.5 : 4.5;
  const subTargetX = targetX1 + subOffsetX;
  const subStartX = startX1 + subOffsetX;
  const speedX2 = (subTargetX - subStartX) / CLOUD_DRIFT_DURATION_SEC;
  const subOffsetY = Math.random() * 4 - 2;

  const subCloud: CloudEntity = {
    id: `cloud_sub_${Date.now()}`,
    x: subStartX,
    y: Math.max(16, Math.min(84, baseY + subOffsetY)),
    radiusX: CLOUD_SUB_RADIUS_X,
    radiusY: CLOUD_SUB_RADIUS_Y,
    speedX: speedX2,
    speedY: (Math.random() * 0.12 - 0.06),
    scale: 0.85,
    opacity: 0.45,
    shadowOpacity: 0.10,
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
    // 雲を風に乗せて移動させる（※古い巨大な雲インスタンスがメモリ上に残っていた場合は即座に最新コンパクト値へ縮小補正）
    clouds = clouds.map((c, i) => {
      const isMain = i === 0;
      const targetRx = isMain ? CLOUD_MAIN_RADIUS_X : CLOUD_SUB_RADIUS_X;
      const targetRy = isMain ? CLOUD_MAIN_RADIUS_Y : CLOUD_SUB_RADIUS_Y;
      const targetScale = isMain ? 1.0 : 0.85;
      const targetOpacity = isMain ? 0.62 : 0.45;
      const targetShadowOpacity = isMain ? 0.16 : 0.10;

      // ゲーム内生成の雲 (cloud_main / cloud_sub) で古い巨大パラメータを持つ場合は補正
      const isAutoSpawnedCloud = c.id.startsWith('cloud_main_') || c.id.startsWith('cloud_sub_');
      const needsClamp = isAutoSpawnedCloud && (c.radiusX > targetRx + 0.1 || c.radiusY > targetRy + 0.1);

      return {
        ...c,
        x: c.x + c.speedX * dt,
        y: c.y + c.speedY * dt,
        radiusX: needsClamp ? targetRx : c.radiusX,
        radiusY: needsClamp ? targetRy : c.radiusY,
        scale: needsClamp ? targetScale : c.scale,
        opacity: needsClamp ? targetOpacity : c.opacity,
        shadowOpacity: needsClamp ? targetShadowOpacity : c.shadowOpacity,
      };
    });

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

    // 雲の影の中にいる場合: 対向陣営のユニットが接近しているか（接近看破 / SPOT）を対称に判定
    const enemyUnits = u.owner === 'player' ? cpuUnits : playerUnits;
    const isCloseToEnemy = enemyUnits.some((eu) => {
      const dx = eu.x - u.x;
      const dy = eu.y - u.y;
      return Math.hypot(dx, dy) <= CLOUD_SPOT_PROXIMITY_DISTANCE;
    });

    return {
      ...u,
      isCloudConcealed: true,
      isCloudSpotted: isCloseToEnemy,
    };
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
