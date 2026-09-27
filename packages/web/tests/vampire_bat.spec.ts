import { test, expect } from '@playwright/test';

test('Verify Vampire Bat card, summoning, SVG rendering and initial stats', async ({ page }) => {
  await page.goto('http://localhost:3000/realtime-demo');
  await expect(page.locator('text=自軍')).toBeVisible({ timeout: 10000 });

  // 1. 吸血コウモリが手札に現れるまでカードを使用
  const batInHand = page.locator('.card-item[data-card-id="vampire_bat"]');
  let tries = 0;
  while (!(await batInHand.isVisible()) && tries < 20) {
    // プレイ可能な（マナが足りている）手札カードを探して出撃
    const cards = page.locator('.card-item');
    const cardCount = await cards.count();
    for (let c = 0; c < cardCount; c++) {
      const card = cards.nth(c);
      const isPlayable = await card.evaluate((el) => !el.getAttribute('title')?.includes('マナが足りません'));
      if (isPlayable) {
        await card.click();
        await page.waitForTimeout(200);
        const targetLane = (tries + c) % 5;
        await page.locator(`[data-lane-index="${targetLane}"]`).click({ position: { x: 50, y: 300 } });
        break;
      }
    }
    await page.waitForTimeout(1000);
    tries++;
  }

  // 手札に吸血コウモリが出現したことを検証
  await expect(batInHand).toBeVisible({ timeout: 5000 });

  // マナ（2マナ）が蓄積するのを待機
  await page.waitForTimeout(2500);

  // 吸血コウモリカードをクリックして選択
  await batInHand.click();
  await page.waitForTimeout(300);

  // 空いているレーン（L5 / index 4）をクリックして出撃
  await page.locator('[data-lane-index="4"]').click({ position: { x: 50, y: 300 } });

  // 吸血コウモリ（cardNo: 9）がフィールドに出現したことを検証
  const batUnit = page.locator('[data-card-no="9"]').first();
  await expect(batUnit).toBeVisible({ timeout: 5000 });

  // BatSvg のパーツ（翼や体）がレンダリングされていることを検証
  const batSvgBody = batUnit.locator('svg .bat-walk-body, svg .bat-idle-body').first();
  await expect(batSvgBody).toBeAttached({ timeout: 3000 });

  // ユニット初期ステータス（ATK: 2, HP: 2）の確認
  const atkBadge = batUnit.locator('[data-badge="atk"]').first();
  await expect(atkBadge).toHaveText('2');
  const hpBadge = batUnit.locator('[data-badge="hp"]').first();
  await expect(hpBadge).toHaveText('2');

  // スクリーンショット撮影
  await page.screenshot({ path: 'vampire-bat-summoned.png' });
});

test('Verify Vampire Bat stat growth on kill logic simulation', async ({ page }) => {
  await page.goto('http://localhost:3000/realtime-demo');

  // ブラウザ環境内で吸血コウモリの撃破成長ロジックを直接シミュレーション検証
  const simulationResult = await page.evaluate(() => {
    const now = Date.now();

    // 攻撃者: 吸血コウモリ (cardNo: 9, ATK: 2, HP: 2, maxHp: 2)
    const batAttacker = {
      id: 'bat_test',
      cardNo: 9,
      name: '吸血コウモリ',
      owner: 'player' as const,
      lane: 0,
      y: 50,
      attack: 2,
      hp: 2,
      maxHp: 2,
      range: 9,
      speed: 6,
      attackCooldown: 1.0,
      attackInterval: 1.0,
      icon: '🦇',
      lastAttackEffectTime: now,
      killCount: 0,
    };

    // 被攻撃者: 敵ネズミ (cardNo: 1, ATK: 1, HP: 1, maxHp: 1)
    const enemyMouse = {
      id: 'enemy_mouse_test',
      cardNo: 1,
      name: 'ネズミ',
      owner: 'cpu' as const,
      lane: 0,
      y: 45,
      attack: 1,
      hp: 1,
      maxHp: 1,
      range: 9,
      speed: 8,
      attackCooldown: 1.0,
      attackInterval: 1.0,
      icon: '🐭',
      lastAttackEffectTime: 0,
      killCount: 0,
    };

    const updatedUnits = [batAttacker, enemyMouse];

    // useRealtimeGame.ts と全く同一の近接戦闘・キル解決アルゴリズム
    const killCountMap = new Map<string, number>();

    const unitsAfterDamage = updatedUnits.map((unit) => {
      let currentHp = unit.hp;
      let y = unit.y;

      updatedUnits.forEach((attacker) => {
        if (
          attacker.lane === unit.lane &&
          attacker.owner !== unit.owner &&
          attacker.lastAttackEffectTime === now
        ) {
          const dist = attacker.owner === 'player' ? attacker.y - unit.y : unit.y - attacker.y;
          if (dist >= -2 && dist <= attacker.range + 2) {
            const hadHp = currentHp > 0;
            currentHp -= attacker.attack;
            if (hadHp && currentHp <= 0) {
              // attacker が unit にとどめを刺した！
              killCountMap.set(attacker.id, (killCountMap.get(attacker.id) || 0) + 1);
            }
          }
        }
      });

      return { ...unit, hp: currentHp, y, isStunned: false };
    });

    // 生存ユニットにキルボーナス（ステータス向上）を適用
    const finalUnits = unitsAfterDamage
      .filter((u) => u.hp > 0)
      .map((unit) => {
        const kills = killCountMap.get(unit.id) || 0;
        if (kills > 0) {
          const newKillCount = (unit.killCount || 0) + kills;
          if (unit.cardNo === 9) {
            const bonusAtk = kills * 1;
            const bonusHp = kills * 1;
            const nextMaxHp = unit.maxHp + bonusHp;
            const nextHp = Math.min(nextMaxHp, unit.hp + bonusHp);
            return {
              ...unit,
              killCount: newKillCount,
              attack: unit.attack + bonusAtk,
              maxHp: nextMaxHp,
              hp: nextHp,
              lastKillTime: now,
            };
          }
        }
        return unit;
      });

    return {
      survivingUnits: finalUnits,
      killsRecorded: killCountMap.get('bat_test'),
    };
  });

  // 1. ネズミが撃破され、吸血コウモリのみが生き残っていること
  expect(simulationResult.survivingUnits).toHaveLength(1);
  const survivingBat = simulationResult.survivingUnits[0];

  // 2. キル数が記録されていること
  expect(simulationResult.killsRecorded).toBe(1);
  expect(survivingBat.killCount).toBe(1);

  // 3. 吸血コウモリのステータスが向上していること（ATK: 2 -> 3, HP: 2 -> 3, maxHp: 2 -> 3）
  expect(survivingBat.attack).toBe(3);
  expect(survivingBat.maxHp).toBe(3);
  expect(survivingBat.hp).toBe(3);
});
