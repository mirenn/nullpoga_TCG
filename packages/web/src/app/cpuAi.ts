import { DemoCard, Unit, CpuSpawnWarning, Inhibitor } from './types';
import { SPAWN_MIN_SPACE } from './cards';
import {
  SPAWN_Y_MIN,
  SPAWN_Y_MAX,
  isWithinEngageY,
  isWithinCollisionY,
  SPELL_RADIUS,
  FIRE_SPELL_HALF_WIDTH_X,
  isWithinFireSpellColumn,
  isWithinMeteorRange,
  clampSpawnY,
} from './board';
import { INHIBITOR_SLOTS, inhibitorBlocksY } from './inhibitors';

export type PlayableOption = {
  handIndex: number;
  card: DemoCard;
  targetY?: number;
  targetX?: number;
  targetLane?: number; // 互換エイリアス
  score: number;
};

// CPUが出撃検討する代表的なY候補点（上下インヒビター正面、中央、およびその間の隙間ルート）
const STRATEGIC_Y_POINTS = [
  20, // 上インヒビター正面
  35, // 上と中央の隙間（素通りルート！）
  50, // 中央インヒビター正面
  65, // 中央と下の隙間（素通りルート！）
  80, // 下インヒビター正面
];

export function computeCpuAction(
  currentCpuMana: number,
  cpuHand: DemoCard[],
  units: Unit[],
  cpuSpawnWarnings: CpuSpawnWarning[],
  inhibitors: Inhibitor[] = []
): PlayableOption | null {
  if (currentCpuMana < 1 || !cpuHand || cpuHand.length === 0) {
    return null;
  }

  const playerUnits = units.filter((u) => u.owner === 'player' && u.hp > 0);
  const cpuUnits = units.filter((u) => u.owner === 'cpu' && u.hp > 0);
  const totalPlayerUnits = playerUnits.length;

  // 出撃候補となるY座標リスト（戦略ポイント ＋ 攻めてきている敵の正面Y）
  const candidateYs = new Set<number>(STRATEGIC_Y_POINTS);
  playerUnits.forEach((u) => {
    candidateYs.add(clampSpawnY(u.y));
  });

  // 各Y候補点について、自軍ユニットが出撃スペースを塞いでいないか判定
  const validSpawnYs = Array.from(candidateYs).filter((y) => {
    // 召喚予兆がすぐ近くにある場合は避ける
    if (cpuSpawnWarnings.some((w) => isWithinCollisionY(w.y ?? (w.lane ?? 50), y))) return false;
    // 自軍の既存ユニットがすぐ右端出撃地点に詰まっているか（x > 95 - SPAWN_MIN_SPACE）
    const blockingAlly = cpuUnits.some(
      (u) => isWithinCollisionY(u.y, y) && u.x > 95 - SPAWN_MIN_SPACE
    );
    return !blockingAlly;
  });

  const options: PlayableOption[] = [];

  cpuHand.forEach((card, idx) => {
    if (!card || card.manaCost > currentCpuMana) return;

    if (card.type === 'MONSTER') {
      // ドラゴンユニーク制限
      if (card.cardNo === 11) {
        const hasDragon = cpuUnits.some((u) => u.cardNo === 11);
        const isWarningDragon = cpuSpawnWarnings.some((w) => w.card.cardNo === 11);
        if (hasDragon || isWarningDragon) return;
      }

      if (validSpawnYs.length === 0) return;

      validSpawnYs.forEach((y) => {
        let score = 5;
        // このY座標の交戦幅にいるプレイヤーユニット
        const nearbyEnemies = playerUnits.filter((u) => isWithinEngageY(u.y, y));
        // CPU拠点(x=95)に迫っている敵 (x > 50)
        const closeEnemies = nearbyEnemies.filter((u) => u.x > 50);
        // このY座標の進路上に敵インヒビターがあるか
        const enemyInhibitor = inhibitors.find(
          (i) => i.owner === 'player' && inhibitorBlocksY(i, y)
        );

        if (card.cardNo === 8) {
          // 忍びアサシン: 敵がいないルートを最優先で疾走！
          if (nearbyEnemies.length === 0) {
            score += 18;
            // インヒビターにも遮られない素通りルート（y=35や65）なら拠点直撃の特大ボーナス！
            if (!enemyInhibitor) {
              score += 8;
            }
          } else {
            score -= 10;
          }
        } else if (card.cardNo === 9) {
          // 吸血コウモリ: HPの減った敵を狙って撃破成長
          if (nearbyEnemies.length > 0) {
            score += 10;
            const killable = nearbyEnemies.filter((e) => e.hp <= 2);
            if (killable.length > 0) score += 16;
          } else {
            score -= 4;
          }
        } else {
          // 通常ユニット: 迫る敵への迎撃
          score += nearbyEnemies.length * 4;
          score += closeEnemies.length * 6;

          // 忍びアサシンが走っているルートには最優先で迎撃
          if (nearbyEnemies.some((u) => u.cardNo === 8)) {
            score += 14;
          }

          // 敵がいないなら相手インヒビターを割りに行く（マナ獲得）
          if (nearbyEnemies.length === 0 && enemyInhibitor) {
            score += 5;
          }
        }

        score += Math.random() * 3;

        options.push({
          handIndex: idx,
          card,
          targetY: y,
          targetX: 95,
          targetLane: y,
          score,
        });
      });
    } else if (card.type === 'SPELL') {
      if (card.id === 'meteor') {
        // メテオ: 最も多くのプレイヤーユニットを巻き込める座標 (X, Y) を探索
        if (playerUnits.length > 0) {
          let bestTargetX = 50;
          let bestTargetY = 50;
          let maxHits = 0;
          playerUnits.forEach((candidate) => {
            const hits = playerUnits.filter((u) => isWithinMeteorRange(u.x, u.y, candidate.x, candidate.y)).length;
            if (hits > maxHits) {
              maxHits = hits;
              bestTargetX = candidate.x;
              bestTargetY = candidate.y;
            }
          });
          const score = 12 + maxHits * 7 + Math.random() * 2;
          options.push({
            handIndex: idx,
            card,
            targetX: bestTargetX,
            targetY: bestTargetY,
            targetLane: bestTargetY,
            score,
          });
        }
      } else if (card.id === 'fire_spell') {
        // 烈火の呪文: 縦一列（X軸）で最も多くのプレイヤーユニットを巻き込める位置と中心Y座標を探索
        let bestTargetX = 50;
        let bestTargetY = 50;
        let maxHits = 0;
        playerUnits.forEach((targetUnit) => {
          const inCol = playerUnits.filter((u) => isWithinFireSpellColumn(u.x, targetUnit.x));
          if (inCol.length > maxHits) {
            maxHits = inCol.length;
            bestTargetX = targetUnit.x;
            const avgY = inCol.reduce((acc, cur) => acc + cur.y, 0) / inCol.length;
            bestTargetY = Math.round(avgY);
          }
        });
        if (maxHits >= 1) {
          options.push({
            handIndex: idx,
            card,
            targetX: bestTargetX,
            targetY: bestTargetY,
            score: 14 + maxHits * 7 + Math.random() * 3,
          });
        }
      } else if (card.id === 'heal_spell') {
        validSpawnYs.forEach((y) => {
          const wounded = cpuUnits.filter(
            (u) => isWithinEngageY(u.y, y, SPELL_RADIUS) && u.hp < u.maxHp
          );
          if (wounded.length > 0) {
            options.push({
              handIndex: idx,
              card,
              targetY: y,
              targetX: 70,
              targetLane: y,
              score: 8 + wounded.length * 6 + Math.random() * 2,
            });
          }
        });
      } else if (card.id === 'haste_spell') {
        validSpawnYs.forEach((y) => {
          const battlingAllies = cpuUnits.filter(
            (u) => isWithinEngageY(u.y, y, SPELL_RADIUS) && playerUnits.some((p) => isWithinEngageY(p.y, u.y))
          );
          if (battlingAllies.length > 0) {
            options.push({
              handIndex: idx,
              card,
              targetY: y,
              targetX: 70,
              targetLane: y,
              score: 7 + battlingAllies.length * 4 + Math.random() * 3,
            });
          }
        });
      }
    }
  });

  if (options.length === 0) return null;

  options.sort((a, b) => b.score - a.score);
  const topCandidates = options.slice(0, Math.min(3, options.length));
  return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}
