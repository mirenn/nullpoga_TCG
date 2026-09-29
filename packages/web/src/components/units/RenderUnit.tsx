import React from 'react';
import type { Unit } from '../../app/types';
import { UnitSvgRenderer, deriveAnimationState } from './UnitSvgRenderer';
import { styles } from '../../app/page.styles';

const COOLDOWN_RING_RADIUS = 16.5;
const COOLDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * COOLDOWN_RING_RADIUS; // ~103.67

interface UnitCooldownRingProps {
  unit: Unit;
  isPlayer: boolean;
  isStunned: boolean;
  isBlockingSpawn?: boolean;
}

/**
 * ユニットの攻撃クールダウン（リロード時間）を円形枠のプログレスリングとして可視化する
 */
function UnitCooldownRing({ unit, isPlayer, isStunned, isBlockingSpawn }: UnitCooldownRingProps) {
  // 攻撃力0のユニット（亀など盾役）は専用の防御フレーム（リロードゲージ不要）
  if (unit.attack === 0) {
    const shieldColor = isBlockingSpawn ? '#ea580c' : isPlayer ? '#10b981' : '#f59e0b';
    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '36px',
          height: '36px',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 2,
        }}
        viewBox="0 0 36 36"
      >
        <circle
          cx="18"
          cy="18"
          r={COOLDOWN_RING_RADIUS}
          fill="none"
          stroke={shieldColor}
          strokeWidth="2.5"
          style={{
            filter: `drop-shadow(0 0 3px ${shieldColor})`,
          }}
        />
      </svg>
    );
  }

  const interval = unit.attackInterval || 1.0;
  const cooldown = Math.max(0, unit.attackCooldown || 0);
  // 0 (攻撃直後) 〜 1 (Ready)
  const progress = interval > 0 ? Math.min(1, Math.max(0, 1 - cooldown / interval)) : 1;
  const isReady = progress >= 0.999;
  const isCharging = Boolean(unit.isCharging);

  // トラック（未チャージ・下地の溝）の色: 極めて薄い暗色にしてゲージの欠け（未チャージ部分）を明確にする
  let trackColor = 'rgba(0, 0, 0, 0.45)';
  if (isBlockingSpawn) trackColor = 'rgba(234, 88, 12, 0.25)';
  if (isStunned) trackColor = 'rgba(234, 179, 8, 0.15)';

  // ゲージの色
  let gaugeColor = isPlayer ? '#38bdf8' : '#f43f5e';
  let glowColor = isPlayer ? 'rgba(56, 189, 248, 0.95)' : 'rgba(244, 63, 94, 0.95)';

  if (isBlockingSpawn) {
    gaugeColor = '#ea580c';
    glowColor = '#ea580c';
  } else if (isStunned) {
    gaugeColor = '#eab308';
    glowColor = '#eab308';
  } else if (isCharging) {
    gaugeColor = '#facc15';
    glowColor = '#facc15';
  } else if (isReady) {
    gaugeColor = isPlayer ? '#00f0ff' : '#ff1744';
  }

  const strokeDashoffset = COOLDOWN_RING_CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '36px',
        height: '36px',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 2,
      }}
      viewBox="0 0 36 36"
    >
      {/* ベース下地の溝（未チャージ部分: 暗いレール） */}
      <circle
        cx="18"
        cy="18"
        r={COOLDOWN_RING_RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth="1.8"
      />

      {/* 状態に応じたゲージ表示 */}
      {isStunned ? (
        // 麻痺中は破線で停止を表現
        <circle
          cx="18"
          cy="18"
          r={COOLDOWN_RING_RADIUS}
          fill="none"
          stroke={gaugeColor}
          strokeWidth="3.2"
          strokeDasharray="4 3"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
      ) : (
        // クールダウン進行ゲージ（上部12時から時計回りに満ちる。太く鮮やかにして欠けを一目で分かるように）
        <circle
          cx="18"
          cy="18"
          r={COOLDOWN_RING_RADIUS}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={isReady || isCharging ? 3.4 : 3.0}
          strokeDasharray={COOLDOWN_RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={progress > 0.05 ? 'round' : 'butt'}
          transform="rotate(-90 18 18)"
          style={{
            filter: `drop-shadow(0 0 ${isReady ? '5px' : '2.5px'} ${glowColor})`,
            transition: 'stroke-dashoffset 0.04s linear',
          }}
        />
      )}
    </svg>
  );
}

// ユニット描画サブコンポーネント
export function RenderUnit({ unit, isBlockingSpawn }: { unit: Unit; isBlockingSpawn?: boolean }) {
  const isPlayer = unit.owner === 'player';
  const isStunned = Boolean(unit.isStunned);
  const hasBuff = unit.cardNo === 2 && (unit.attack || 0) > 1; // 柴犬バフ
  const hasBatBuff = unit.cardNo === 9 && (unit.killCount || 0) > 0; // 吸血コウモリ撃破バフ
  const isRecentKill = Boolean(unit.lastKillTime && Date.now() - unit.lastKillTime < 800);
  const isAttacking = unit.lastAttackEffectTime && (Date.now() - unit.lastAttackEffectTime < 240);
  const attackClass = isAttacking
    ? (isPlayer ? 'unit-attacking-player' : 'unit-attacking-cpu')
    : '';

  // クールダウン完了状態（攻撃可能）かどうか
  const interval = unit.attackInterval || 1.0;
  const cooldown = Math.max(0, unit.attackCooldown || 0);
  const isReady = interval > 0 ? (cooldown / interval) <= 0.001 : true;

  // SVG アニメーション状態を算出
  const animState = deriveAnimationState(unit);
  const svgElement = UnitSvgRenderer({
    cardNo: unit.cardNo,
    state: animState,
    isPlayer,
    size: 36,
  });
  const hasSvg = svgElement !== null;

  return (
    <div
      data-unit-id={unit.id}
      data-card-no={unit.cardNo}
      data-cooldown={unit.attackCooldown}
      data-interval={unit.attackInterval}
      data-kill-count={unit.killCount || 0}
      style={{
        ...styles.unitWrapper,
        top: `${unit.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 吸血・撃破フロートポップアップ */}
      {isRecentKill && (
        <div style={styles.unitKillPopup}>
          🩸 吸血 +1/+1!
        </div>
      )}

      {/* HPバー */}
      <div style={styles.unitHpBarBg}>
        <div
          style={{
            ...styles.unitHpBarFill,
            width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
            backgroundColor: isPlayer ? '#22c55e' : '#ef4444',
          }}
        />
      </div>

      {/* ユニット本体アイコン */}
      <div
        className={attackClass}
        style={{
          ...styles.unitBody,
          border: 'none',
          backgroundColor: isPlayer ? '#1e293b' : '#2d1515',
          boxShadow: isBlockingSpawn
            ? '0 0 12px #ea580c'
            : isStunned
            ? '0 0 10px #eab308'
            : hasBatBuff
            ? '0 0 14px #a855f7, 0 0 20px #7e22ce'
            : unit.isSprinting
            ? '0 0 14px #06b6d4, 0 0 20px #0284c7'
            : unit.isCharging
            ? '0 0 14px #38bdf8, 0 0 20px #facc15'
            : isReady
            ? (isPlayer ? '0 0 8px rgba(56, 189, 248, 0.6)' : '0 0 8px rgba(244, 63, 94, 0.6)')
            : '0 2px 4px rgba(0,0,0,0.5)',
          // SVG の尻尾・触手がはみ出せるように
          overflow: hasSvg ? 'visible' : undefined,
        }}
      >
        {/* 円形攻撃クールダウンゲージ（リロードリング） */}
        <UnitCooldownRing
          unit={unit}
          isPlayer={isPlayer}
          isStunned={isStunned}
          isBlockingSpawn={isBlockingSpawn}
        />

        {/* SVG コンポーネント or 絵文字フォールバック */}
        {svgElement ?? <span style={styles.unitIconText}>{unit.icon}</span>}

        {/* 状態異常・バフ表示 */}
        {isStunned && <span style={styles.statusStun}>⚡麻痺</span>}
        {unit.isSprinting && !isStunned && <span style={styles.statusSprint}>💨3x速</span>}
        {hasBuff && <span style={styles.statusBuff}>⚔️+{unit.attack - 1}</span>}
        {hasBatBuff && <span style={styles.statusBatBuff}>🩸+{unit.killCount}</span>}
      </div>

      {/* 攻撃力 / HP バッジ */}
      <div style={styles.unitBadges}>
        <span data-badge="atk" style={styles.unitAtkBadge}>{unit.attack}</span>
        <span data-badge="hp" style={styles.unitHpBadge}>{unit.hp}</span>
        {hasBatBuff && (
          <span data-badge="kill" style={{ fontSize: '9px', backgroundColor: '#9333ea', color: '#fff', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title={`吸血成長: 撃破${unit.killCount}体 (+${unit.killCount}/+${unit.killCount})`}>🩸x{unit.killCount}</span>
        )}
        {unit.isSprinting && (
          <span style={{ fontSize: '9px', backgroundColor: '#06b6d4', color: '#fff', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title="敵不在レーン3倍速疾走！">💨</span>
        )}
        {unit.isCounterDeploy && (
          <span style={{ fontSize: '9px', backgroundColor: '#6366f1', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title="カウンターデプロイ">⚔️</span>
        )}
        {unit.comboCount && unit.comboCount > 1 && (
          <span style={{ fontSize: '9px', backgroundColor: '#ea580c', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title={`${unit.comboCount}コンボボーナス`}>🔥</span>
        )}
      </div>

      {/* 出撃スペース塞ぎ中の前進待ちインジケーター */}
      {isBlockingSpawn && (
        <div
          style={{
            position: 'absolute',
            bottom: '-18px',
            fontSize: '8px',
            backgroundColor: '#ea580c',
            color: '#fff',
            padding: '1px 5px',
            borderRadius: '3px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 8px rgba(234, 88, 12, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            zIndex: 30,
          }}
        >
          <span>▲</span>
          <span>前進待ち</span>
        </div>
      )}
    </div>
  );
}


// 攻撃エフェクト（電撃ビーム・火炎ブレス・着弾放電スパーク・火炎爆発・ダメージポップアップ）描画サブコンポーネント
