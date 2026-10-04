import { DemoCard, Unit, CpuSpawnWarning, Inhibitor } from './types';
import { SPAWN_MIN_SPACE } from './cards';
import { COLUMNS, isWithinEngage, SPELL_WIDTH } from './board';
import { inhibitorCoversColumn } from './inhibitors';

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
  cpuSpawnWarnings: CpuSpawnWarning[],
  inhibitors: Inhibitor[] = []
): PlayableOption | null {
  if (currentCpuMana < 1 || !cpuHand || cpuHand.length === 0) {
    return null;
  }

  // 現在出撃可能な列（味方3体未満 かつ 出撃スペース空き かつ 現在召喚詠唱中でない列）
  const validMonsterLanes = COLUMNS.filter((lane) => {
    // 召喚詠唱中なら除外
    if (cpuSpawnWarnings.some((w) => w.lane === lane)) return false;
    const cpuUnitsInLane = units.filter(
      (u) => u.owner === 'cpu' && u.lane === lane && u.hp > 0
    );
    if (cpuUnitsInLane.length >= 3) return false;
    const hasBlockingAlly = cpuUnitsInLane.some((u) => u.y < 5 + SPAWN_MIN_SPACE);
    return !hasBlockingAlly;
  });

  const playerUnits = units.filter((u) => u.owner === 'player' && u.hp > 0);
  const totalPlayerUnits = playerUnits.length;

  // 各列から交戦範囲内（|列差|≦ENGAGE_WIDTH）にいるプレイヤーユニット数
  const engagedPlayerCount = (lane: number) =>
    playerUnits.filter((u) => isWithinEngage(u.lane, lane)).length;
  // そのうち自陣半分より深く侵入している敵
  const engagedPlayerCloseCount = (lane: number) =>
    playerUnits.filter((u) => isWithinEngage(u.lane, lane) && u.y < 55).length;

  // 列の進路上にプレイヤー側の生存インヒビターがあるか（破壊でマナ獲得）
  const hasEnemyInhibitor = (lane: number) =>
    inhibitors.some((i) => i.owner === 'player' && inhibitorCoversColumn(i, lane));
  // 自軍インヒビターが攻撃を受けている列（防衛優先）
  const isOwnInhibitorThreatened = (lane: number) =>
    inhibitors.some(
      (i) =>
        i.owner === 'cpu' &&
        i.hp > 0 &&
        isWithinEngage(i.lane, lane) &&
        playerUnits.some((u) => isWithinEngage(u.lane, i.lane) && u.y < i.y + 15)
    );

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

      // 列ごとにスコア付け
      validMonsterLanes.forEach((lane) => {
        let score = 5;
        const enemyCount = engagedPlayerCount(lane);

        if (card.cardNo === 8) {
          // 忍びアサシン: 敵がいない列を最優先で狙う（奇襲・スプリットプッシュ）
          if (enemyCount === 0) {
            score += 18; // ガラ空き列への奇襲特大ボーナス！
            // インヒビターに阻まれない列なら拠点直撃を狙える
            if (!hasEnemyInhibitor(lane)) score += 4;
          } else {
            score -= 8; // 敵がいる列へは出撃を避ける
          }
        } else if (card.cardNo === 9) {
          // 吸血コウモリ: 相手ユニットを撃破して成長を狙う
          // 敵ユニットが存在する列を優先、特にHPが削れている敵がいる列で高評価
          const enemies = playerUnits.filter((u) => isWithinEngage(u.lane, lane));
          if (enemies.length > 0) {
            score += 10;
            // 撃破圏内（HP2以下）の敵がいれば特大ボーナス！
            const killableEnemies = enemies.filter((e) => e.hp <= 2);
            if (killableEnemies.length > 0) {
              score += 15; // ラストヒット狙いの出撃！
            }
          } else {
            score -= 3; // 敵がいない列は優先度低
          }
        } else {
          // 通常ユニット: 敵が多い列は迎撃として高評価
          score += enemyCount * 4;
          // 敵が自陣に迫っている列は緊急迎撃
          score += engagedPlayerCloseCount(lane) * 5;

          // プレイヤーの忍びアサシンが走っている列があれば最優先で迎撃を試みる
          const hasEnemyAssassin = playerUnits.some(
            (u) => isWithinEngage(u.lane, lane) && u.cardNo === 8
          );
          if (hasEnemyAssassin) {
            score += 12; // アサシンを迎撃して阻止！
          }

          // 自軍インヒビター防衛
          if (isOwnInhibitorThreatened(lane)) score += 6;
          // 敵がいなければ相手インヒビターを割りに行く（マナ獲得狙い）
          if (enemyCount === 0 && hasEnemyInhibitor(lane)) score += 3;
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
        // 隕石: 効果範囲内のプレイヤーユニット（中央付近 y=50±20）が多い列
        for (const lane of COLUMNS) {
          const hits = playerUnits.filter(
            (u) => isWithinEngage(u.lane, lane, SPELL_WIDTH) && Math.abs(u.y - 50) <= 20
          );
          const count = playerUnits.filter((u) => isWithinEngage(u.lane, lane, SPELL_WIDTH)).length;
          if (count > 0) {
            const closeCount = playerUnits.filter(
              (u) => isWithinEngage(u.lane, lane, SPELL_WIDTH) && u.y < 55
            ).length;
            const score = 10 + count * 5 + closeCount * 8 + hits.length * 3 + Math.random() * 2;
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
        // 癒やしの雨: 自軍ユニットのHPが減っている列があれば検討
        for (const lane of COLUMNS) {
          const woundedAllies = units.filter(
            (u) => u.owner === 'cpu' && isWithinEngage(u.lane, lane, SPELL_WIDTH) && u.hp < u.maxHp
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
        // 疾風の号令: 自軍ユニットが交戦中の列があれば検討
        for (const lane of COLUMNS) {
          const hasCpuInLane = units.some(
            (u) => u.owner === 'cpu' && isWithinEngage(u.lane, lane, SPELL_WIDTH) && u.hp > 0
          );
          const hasPlayerInLane = engagedPlayerCount(lane) > 0;
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
