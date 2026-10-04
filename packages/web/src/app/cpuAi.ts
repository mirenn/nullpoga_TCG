import { DemoCard, Unit, CpuSpawnWarning, Inhibitor } from './types';
import { SPAWN_MIN_SPACE } from './cards';
import {
  SPAWN_X_MIN,
  SPAWN_X_MAX,
  isWithinEngageX,
  isWithinCollisionX,
  SPELL_RADIUS_X,
  clampSpawnX,
} from './board';
import { INHIBITOR_SLOTS, inhibitorBlocksX } from './inhibitors';

export type PlayableOption = {
  handIndex: number;
  card: DemoCard;
  targetX?: number;
  targetLane?: number; // 互換エイリアス
  score: number;
};

// CPUが出撃検討する代表的なX候補点（左右インヒビター正面、中央、およびその間の隙間ルート）
const STRATEGIC_X_POINTS = [
  18, // 左インヒビター正面
  34, // 左と中央の隙間（素通りルート！）
  50, // 中央インヒビター正面
  66, // 中央と右の隙間（素通りルート！）
  82, // 右インヒビター正面
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

  // 出撃候補となるX座標リスト（戦略ポイント ＋ 攻めてきている敵の正面X）
  const candidateXs = new Set<number>(STRATEGIC_X_POINTS);
  playerUnits.forEach((u) => {
    candidateXs.add(clampSpawnX(u.x));
  });

  // 各X候補点について、自軍ユニットが出撃スペースを塞いでいないか判定
  const validSpawnXs = Array.from(candidateXs).filter((x) => {
    // 召喚予兆がすぐ近くにある場合は避ける
    if (cpuSpawnWarnings.some((w) => isWithinCollisionX(w.x, x))) return false;
    // 自軍の既存ユニットがすぐ出撃地点に詰まっているか（y < 5 + SPAWN_MIN_SPACE）
    const blockingAlly = cpuUnits.some(
      (u) => isWithinCollisionX(u.x, x) && u.y < 5 + SPAWN_MIN_SPACE
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

      if (validSpawnXs.length === 0) return;

      validSpawnXs.forEach((x) => {
        let score = 5;
        // このX座標の交戦幅にいるプレイヤーユニット
        const nearbyEnemies = playerUnits.filter((u) => isWithinEngageX(u.x, x));
        const closeEnemies = nearbyEnemies.filter((u) => u.y < 55);
        // このX座標の進路上に敵インヒビターがあるか
        const enemyInhibitor = inhibitors.find(
          (i) => i.owner === 'player' && inhibitorBlocksX(i, x)
        );

        if (card.cardNo === 8) {
          // 忍びアサシン: 敵がいないルートを最優先で疾走！
          if (nearbyEnemies.length === 0) {
            score += 18;
            // インヒビターにも遮られない素通りルート（x=34や66）なら拠点直撃の特大ボーナス！
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
          targetX: x,
          targetLane: x,
          score,
        });
      });
    } else if (card.type === 'SPELL') {
      if (card.id === 'meteor') {
        // メテオ: プレイヤーユニットが集まっているX座標（中央Y付近）
        validSpawnXs.forEach((x) => {
          const hits = playerUnits.filter(
            (u) => isWithinEngageX(u.x, x, SPELL_RADIUS_X) && Math.abs(u.y - 50) <= 20
          );
          if (hits.length > 0) {
            const score = 12 + hits.length * 7 + Math.random() * 2;
            options.push({
              handIndex: idx,
              card,
              targetX: x,
              targetLane: x,
              score,
            });
          }
        });
      } else if (card.id === 'fire_spell') {
        if (totalPlayerUnits >= 2) {
          options.push({
            handIndex: idx,
            card,
            score: 12 + totalPlayerUnits * 4 + Math.random() * 3,
          });
        }
      } else if (card.id === 'heal_spell') {
        validSpawnXs.forEach((x) => {
          const wounded = cpuUnits.filter(
            (u) => isWithinEngageX(u.x, x, SPELL_RADIUS_X) && u.hp < u.maxHp
          );
          if (wounded.length > 0) {
            options.push({
              handIndex: idx,
              card,
              targetX: x,
              targetLane: x,
              score: 8 + wounded.length * 6 + Math.random() * 2,
            });
          }
        });
      } else if (card.id === 'haste_spell') {
        validSpawnXs.forEach((x) => {
          const battlingAllies = cpuUnits.filter(
            (u) => isWithinEngageX(u.x, x, SPELL_RADIUS_X) && playerUnits.some((p) => isWithinEngageX(p.x, u.x))
          );
          if (battlingAllies.length > 0) {
            options.push({
              handIndex: idx,
              card,
              targetX: x,
              targetLane: x,
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
