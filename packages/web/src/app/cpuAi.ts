import { DemoCard, Unit, CpuSpawnWarning } from './types';
import { SPAWN_MIN_SPACE } from './cards';

export type PlayableOption = {
  handIndex: number;
  card: DemoCard;
  targetLane?: number;
  score: number;
};

export function computeCpuAction(
  currentCpuMana: number,
  cpuHand: DemoCard[],
  units: Unit[],
  cpuSpawnWarnings: CpuSpawnWarning[]
): PlayableOption | null {
  if (currentCpuMana < 1 || !cpuHand || cpuHand.length === 0) {
    return null;
  }

  // 現在出撃可能なレーン（味方3体未満 かつ 出撃スペース空き かつ 現在召喚詠唱中でないレーン）
  const validMonsterLanes = [0, 1, 2, 3, 4].filter((lane) => {
    // 召喚詠唱中なら除外
    if (cpuSpawnWarnings.some((w) => w.lane === lane)) return false;
    const cpuUnitsInLane = units.filter(
      (u) => u.owner === 'cpu' && u.lane === lane && u.hp > 0
    );
    if (cpuUnitsInLane.length >= 3) return false;
    const hasBlockingAlly = cpuUnitsInLane.some((u) => u.y < 5 + SPAWN_MIN_SPACE);
    return !hasBlockingAlly;
  });

  // プレイヤーユニットが攻めてきているレーンの集計
  const lanePlayerCounts = [0, 0, 0, 0, 0];
  const lanePlayerCloseUnits: { lane: number; count: number }[] = [0, 1, 2, 3, 4].map((lane) => ({
    lane,
    count: 0,
  }));
  let totalPlayerUnits = 0;

  units.forEach((u) => {
    if (u.owner === 'player' && u.hp > 0) {
      lanePlayerCounts[u.lane]++;
      totalPlayerUnits++;
      if (u.y < 55) {
        // 自陣半分より深く侵入している敵
        lanePlayerCloseUnits[u.lane].count++;
      }
    }
  });

  const options: PlayableOption[] = [];

  cpuHand.forEach((card, idx) => {
    if (!card || card.manaCost > currentCpuMana) return;

    if (card.type === 'MONSTER') {
      // ドラゴンユニーク制限
      if (card.cardNo === 11) {
        const hasDragon = units.some(
          (u) => u.owner === 'cpu' && u.cardNo === 11 && u.hp > 0
        );
        const isWarningDragon = cpuSpawnWarnings.some(
          (w) => w.card.cardNo === 11
        );
        if (hasDragon || isWarningDragon) return;
      }

      if (validMonsterLanes.length === 0) return;

      // レーンごとにスコア付け
      validMonsterLanes.forEach((lane) => {
        let score = 5;

        if (card.cardNo === 8) {
          // 忍びアサシン: 敵がいないレーンを最優先で狙う（奇襲・スプリットプッシュ）
          if (lanePlayerCounts[lane] === 0) {
            score += 18; // ガラ空きレーンへの奇襲特大ボーナス！
          } else {
            score -= 8; // 敵がいるレーンへは出撃を避ける
          }
        } else if (card.cardNo === 9) {
          // 吸血コウモリ: 相手ユニットを撃破して成長を狙う
          // 敵ユニットが存在するレーンを優先、特にHPが削れている敵がいるレーンで高評価
          const enemies = units.filter(
            (u) => u.owner === 'player' && u.lane === lane && u.hp > 0
          );
          if (enemies.length > 0) {
            score += 10;
            // 撃破圏内（HP2以下）の敵がいれば特大ボーナス！
            const killableEnemies = enemies.filter((e) => e.hp <= 2);
            if (killableEnemies.length > 0) {
              score += 15; // ラストヒット狙いの出撃！
            }
          } else {
            score -= 3; // 敵がいないレーンは優先度低
          }
        } else {
          // 通常ユニット: 敵が多いレーンは迎撃として高評価
          score += lanePlayerCounts[lane] * 4;
          // 敵が自陣に迫っているレーンは緊急迎撃
          const closeCount = lanePlayerCloseUnits[lane].count;
          score += closeCount * 5;

          // プレイヤーの忍びアサシンが走っているレーンがあれば最優先で迎撃を試みる
          const hasEnemyAssassin = units.some(
            (u) => u.owner === 'player' && u.lane === lane && u.cardNo === 8 && u.hp > 0
          );
          if (hasEnemyAssassin) {
            score += 12; // アサシンを迎撃して阻止！
          }
        }

        // ランダム性を少し付与して展開を多様化
        score += Math.random() * 3;

        options.push({
          handIndex: idx,
          card,
          targetLane: lane,
          score,
        });
      });
    } else if (card.type === 'SPELL') {
      if (card.id === 'meteor') {
        // 隕石: プレイヤーユニットがいるレーン（特に迫っている or 複数いるレーン）
        for (let lane = 0; lane < 5; lane++) {
          const count = lanePlayerCounts[lane];
          if (count > 0) {
            const closeCount = lanePlayerCloseUnits[lane].count;
            const score = 10 + count * 5 + closeCount * 8 + Math.random() * 2;
            options.push({
              handIndex: idx,
              card,
              targetLane: lane,
              score,
            });
          }
        }
      } else if (card.id === 'fire_spell') {
        // 烈火: プレイヤーユニット全体が2体以上いれば使用検討
        if (totalPlayerUnits >= 2) {
          options.push({
            handIndex: idx,
            card,
            score: 12 + totalPlayerUnits * 4 + Math.random() * 3,
          });
        }
      } else if (card.id === 'heal_spell') {
        // 癒やしの雨: 自軍ユニットのHPが減っているレーンがあれば検討
        for (let lane = 0; lane < 5; lane++) {
          const woundedAllies = units.filter(
            (u) => u.owner === 'cpu' && u.lane === lane && u.hp < u.maxHp
          );
          if (woundedAllies.length > 0) {
            options.push({
              handIndex: idx,
              card,
              targetLane: lane,
              score: 8 + woundedAllies.length * 5 + Math.random() * 2,
            });
          }
        }
      } else if (card.id === 'haste_spell') {
        // 疾風の号令: 自軍ユニットが交戦中のレーンがあれば検討
        for (let lane = 0; lane < 5; lane++) {
          const hasCpuInLane = units.some(
            (u) => u.owner === 'cpu' && u.lane === lane && u.hp > 0
          );
          const hasPlayerInLane = lanePlayerCounts[lane] > 0;
          if (hasCpuInLane && hasPlayerInLane) {
            options.push({
              handIndex: idx,
              card,
              targetLane: lane,
              score: 7 + Math.random() * 3,
            });
          }
        }
      }
    }
  });

  if (options.length === 0) return null;

  // スコア順にソートして候補を選択
  options.sort((a, b) => b.score - a.score);
  const topCandidates = options.slice(0, Math.min(3, options.length));
  return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}
