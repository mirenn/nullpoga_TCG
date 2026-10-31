import { SPAWN, predict, OMEGA } from './circlePhysics';

export function computeCpuLaunchAngle(speed: number, currentTheta: number, w: number = OMEGA): [number, number] {
  const [sx, sy] = SPAWN.c;

  // CPUは少しランダムに数パターンの角度を試し、穴に入る軌道を探す
  // (-0.4 〜 0.4 rad の範囲を少しずつ試す)
  const baseAngles = [];
  for (let i = -0.4; i <= 0.4; i += 0.05) {
    baseAngles.push(i);
  }

  // ちょっとランダムにシャッフル
  baseAngles.sort(() => Math.random() - 0.5);

  let bestHit = false;
  let bestTx = 0;
  let bestTy = 0;

  for (const angleOffset of baseAngles) {
    // 中央方向への基本角度 (CPUから見て下向き)
    const tx = Math.sin(angleOffset) * 200;
    const ty = SPAWN.c[1] + Math.cos(angleOffset) * 200;

    const { hit } = predict(sx, sy, tx, ty, speed, currentTheta, w);

    if (hit) {
      // 完璧すぎないように少し誤差を入れる
      const error = (Math.random() - 0.5) * 0.05;
      const finalTx = Math.sin(angleOffset + error) * 200;
      const finalTy = SPAWN.c[1] + Math.cos(angleOffset + error) * 200;
      bestHit = true;
      bestTx = finalTx;
      bestTy = finalTy;
      break;
    }
  }

  // 見つからなければ適当に中央付近に撃つ
  if (!bestHit) {
    const randomOffset = (Math.random() - 0.5) * 0.25;
    bestTx = Math.sin(randomOffset) * 200;
    bestTy = SPAWN.c[1] + Math.cos(randomOffset) * 200;
  }

  return [bestTx, bestTy];
}
