import React from 'react';
import type { Unit } from '../../app/types';
import { UnitSvgRenderer, hasUnitSvg, deriveAnimationState } from './UnitSvgRenderer';
import { styles } from '../../app/page.styles';

interface UnitCooldownBarProps {
  unit: Unit;
  isPlayer: boolean;
  isStunned: boolean;
  isBlockingSpawn?: boolean;
}

/**
 * ユニットの攻撃クールダウン（リロード時間・攻撃前隙・麻痺）をHPバー直下の極細2pxバーとして可視化する
 */
function UnitCooldownBar({ unit, isPlayer, isStunned, isBlockingSpawn }: UnitCooldownBarProps) {
  if (unit.attack === 0) {
    const shieldColor = isBlockingSpawn
      ? '#ea580c'
      : unit.hasSpellShield
      ? '#38bdf8'
      : isPlayer
      ? '#10b981'
      : '#f59e0b';
    return (
      <div style={styles.unitCooldownBarBg}>
        <div style={{ width: '100%', height: '100%', backgroundColor: shieldColor }} />
      </div>
    );
  }

  const interval = unit.attackInterval || 1.0;
  const cooldown = Math.max(0, unit.attackCooldown || 0);
  const isCharging = Boolean(unit.isCharging);

  let rawProgress = 1;
  if (isCharging && unit.chargeStartTime && unit.attackWindup && unit.attackWindup > 0) {
    const elapsed = (Date.now() - unit.chargeStartTime) / 1000;
    rawProgress = Math.min(1, Math.max(0, elapsed / unit.attackWindup));
  } else if (interval > 0) {
    rawProgress = Math.min(1, Math.max(0, 1 - cooldown / interval));
  }

  const isReady = !isCharging && rawProgress >= 0.999;
  const progress = isReady ? 1 : Math.round(rawProgress * 20) / 20;

  let gaugeColor = '#fb923c';
  if (isBlockingSpawn) {
    gaugeColor = '#ea580c';
  } else if (isStunned) {
    gaugeColor = '#eab308';
  } else if (isCharging) {
    gaugeColor = '#facc15';
  } else if (isReady) {
    gaugeColor = isPlayer ? '#00f0ff' : '#ff1744';
  }

  return (
    <div style={styles.unitCooldownBarBg}>
      <div
        style={{
          width: isStunned ? '100%' : `${progress * 100}%`,
          height: '100%',
          background: isStunned
            ? 'repeating-linear-gradient(90deg, #eab308 0 3px, transparent 3px 5px)'
            : gaugeColor,
        }}
      />
    </div>
  );
}

// ユニット描画サブコンポーネント
export const RenderUnit = React.memo(function RenderUnit({
  unit,
  isBlockingSpawn,
  isConcealed = false,
  onToggleHold,
}: {
  unit: Unit;
  isBlockingSpawn?: boolean;
  isConcealed?: boolean;
  onToggleHold?: (unitId: string) => void;
}) {
  const isScouting = Boolean(unit.isScouting) && unit.owner === 'player';
  const isHolding = Boolean(unit.isHolding) && unit.owner === 'player' && !isScouting;
  const canToggleHold = Boolean(onToggleHold) && unit.owner === 'player';
  const isPlayer = unit.owner === 'player';
  const isStunned = Boolean(unit.isStunned);
  const hasBuff = unit.cardNo === 2 && (unit.attack || 0) > 1; // 柴犬バフ
  const hasBatBuff = unit.cardNo === 9 && (unit.killCount || 0) > 0; // 吸血コウモリ撃破バフ
  const isRecentKill = Boolean(unit.lastKillTime && Date.now() - unit.lastKillTime < 800);
  const isRecentSpot = Boolean(unit.lastSpottedTime && Date.now() - unit.lastSpottedTime < 1800);
  const nowMs = Date.now();
  const isWhiffVulnerable = Boolean(unit.whiffVulnerableUntil && nowMs < unit.whiffVulnerableUntil);
  const isRecentSway = Boolean(unit.lastSwayTime && nowMs - unit.lastSwayTime < 900);
  const isRecentCounterHit = Boolean(unit.lastCounterHitTime && nowMs - unit.lastCounterHitTime < 1200);
  const isEnemyCharging = Boolean(!isPlayer && unit.isCharging && !unit.isAttackingObstacle);

  // SVG アニメーション状態を算出
  const animState = deriveAnimationState(unit);
  const isAttacking = animState === 'attacking';
  const attackClass = isAttacking
    ? (isPlayer ? 'unit-attacking-player' : 'unit-attacking-cpu')
    : '';

  const hasSvg = hasUnitSvg(unit.cardNo);

  const isJumping = Boolean(unit.isJumping);
  const isSliding = Boolean(unit.isSliding);
  const isPushed = Boolean(unit.isPushed);
  const isPushing = Boolean(unit.isPushing);
  const isAttackingObstacle = Boolean(unit.isAttackingObstacle);
  const jumpProgress = unit.jumpProgress ?? 0;
  const jumpOffsetY = isJumping ? -Math.sin(jumpProgress * Math.PI) * 26 : 0;
  const jumpScale = isJumping ? 1 + Math.sin(jumpProgress * Math.PI) * 0.25 : 1;

  // 雲の影による動的死角の判定
  const isCloudConcealed = Boolean(unit.isCloudConcealed);
  const isCloudSpotted = Boolean(unit.isCloudSpotted);
  const isCpuHiddenInCloud = !isPlayer && isCloudConcealed && !isCloudSpotted;
  const isCpuRevealedInCloud = !isPlayer && isCloudConcealed && isCloudSpotted;
  const isPlayerInCloud = isPlayer && isCloudConcealed;

  return (
    <div
      data-unit-id={unit.id}
      data-card-no={unit.cardNo}
      data-cooldown={unit.attackCooldown}
      data-interval={unit.attackInterval}
      data-kill-count={unit.killCount || 0}
      data-spotted={unit.isSpotted ? 'true' : 'false'}
      data-concealed={isConcealed || isCpuHiddenInCloud ? 'true' : 'false'}
      data-cloud-concealed={isCloudConcealed ? 'true' : 'false'}
      data-jumping={isJumping ? 'true' : 'false'}
      data-sliding={isSliding ? 'true' : 'false'}
      data-pushed={isPushed ? 'true' : 'false'}
      data-pushing={isPushing ? 'true' : 'false'}
      data-attacking-obstacle={isAttackingObstacle ? 'true' : 'false'}
      style={{
        ...styles.unitWrapper,
        left: `${unit.x}%`,
        top: `${unit.y}%`,
        transform: `translate(-50%, calc(-50% + ${jumpOffsetY}px)) scale(${jumpScale})`,
        opacity: isConcealed ? 0.12 : isCpuHiddenInCloud ? 0.32 : isPlayerInCloud ? 0.78 : 1,
        zIndex: isJumping ? 45 : unit.isSpotted ? 31 : styles.unitWrapper.zIndex,
        transition: isJumping ? 'none' : 'opacity 0.2s ease-out',
      }}
    >
      {/* 雲の死角（未看破の敵）インジケーター */}
      {isCpuHiddenInCloud && !isJumping && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#cbd5e1',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '999px',
            border: '1px dashed #94a3b8',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.8)',
            whiteSpace: 'nowrap',
            zIndex: 42,
            pointerEvents: 'none',
          }}
        >
          🌫️ 雲隠れ [???]
        </div>
      )}

      {/* 雲の中で味方接近により看破された敵インジケーター */}
      {isCpuRevealedInCloud && !isJumping && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0284c7',
            color: '#f0f9ff',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '999px',
            border: '1px solid #38bdf8',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.8)',
            whiteSpace: 'nowrap',
            zIndex: 42,
            pointerEvents: 'none',
          }}
        >
          👁️ 雲から看破!
        </div>
      )}

      {/* 雲の影に紛れている自軍ユニット */}
      {isPlayerInCloud && !isJumping && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(30, 41, 59, 0.88)',
            color: '#93c5fd',
            fontSize: '8.5px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '999px',
            border: '1px solid #60a5fa',
            whiteSpace: 'nowrap',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          ☁️ 雲隠れ中
        </div>
      )}

      {/* 障害物・味方ジャンプ飛び越えバッジ */}
      {isJumping && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0284c7',
            color: '#f0f9ff',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '999px',
            border: '1px solid #38bdf8',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.8)',
            whiteSpace: 'nowrap',
            zIndex: 46,
            pointerEvents: 'none',
          }}
        >
          🦘 飛び越え!
        </div>
      )}

      {/* 後方の味方（イノシシ・ドラゴン）による押し出し加速バッジ */}
      {!isJumping && isPushed && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#c2410c',
            color: '#fff7ed',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '999px',
            border: '1px solid #fb923c',
            boxShadow: '0 0 10px rgba(249, 115, 22, 0.85)',
            whiteSpace: 'nowrap',
            zIndex: 44,
            pointerEvents: 'none',
          }}
        >
          💨 押し出し加速!
        </div>
      )}

      {/* 前方の味方を押し出し中（プッシュ）バッジ */}
      {!isJumping && !isPushed && isPushing && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#9a3412',
            color: '#ffedd5',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '999px',
            border: '1px solid #f97316',
            boxShadow: '0 0 8px rgba(234, 88, 12, 0.8)',
            whiteSpace: 'nowrap',
            zIndex: 44,
            pointerEvents: 'none',
          }}
        >
          🐗 プッシュ!
        </div>
      )}

      {/* 通常ユニット（block）が障害物を攻撃して撤去中バッジ */}
      {!isJumping && !isPushed && !isPushing && isAttackingObstacle && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#475569',
            color: '#f8fafc',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '999px',
            border: '1px solid #94a3b8',
            boxShadow: '0 0 8px rgba(148, 163, 184, 0.7)',
            whiteSpace: 'nowrap',
            zIndex: 44,
            pointerEvents: 'none',
          }}
        >
          ⛏️ 障害物破壊中!
        </div>
      )}

      {/* 差し返しカウンターヒット発生ポップアップ */}
      {isRecentCounterHit && (
        <div
          data-badge="counter-hit"
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#dc2626',
            color: '#fef08a',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1.5px solid #fef08a',
            boxShadow: '0 0 14px rgba(239, 68, 68, 0.95)',
            whiteSpace: 'nowrap',
            zIndex: 48,
            pointerEvents: 'none',
          }}
        >
          ⚡ カウンター! +2!
        </div>
      )}

      {/* 空振り（WHIFF）後の後隙・被カウンター状態インジケーター */}
      {!isRecentCounterHit && isWhiffVulnerable && (
        <div
          data-badge="whiff-vulnerable"
          style={{
            position: 'absolute',
            top: '-26px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#7c2d12',
            color: '#fed7aa',
            fontSize: '9.5px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '999px',
            border: '1.5px dashed #fb923c',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.9)',
            whiteSpace: 'nowrap',
            zIndex: 47,
            pointerEvents: 'none',
          }}
        >
          💨 空振り! 隙だらけ
        </div>
      )}

      {/* 敵の攻撃前隙（タメ中）インジケーター：スウェー誘発の合図 */}
      {!isRecentCounterHit && !isWhiffVulnerable && isEnemyCharging && !isCpuHiddenInCloud && (
        <div
          data-badge="enemy-windup"
          style={{
            position: 'absolute',
            top: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#b91c1c',
            color: '#fef08a',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '999px',
            border: '1px solid #facc15',
            boxShadow: '0 0 10px rgba(250, 204, 21, 0.9)',
            whiteSpace: 'nowrap',
            zIndex: 46,
            pointerEvents: 'none',
          }}
        >
          ⚠️ 攻撃タメ中!
        </div>
      )}

      {/* バックステップ寸止め（スウェー）ポップアップ */}
      {!isRecentCounterHit && isRecentSway && (
        <div
          data-badge="sway"
          style={{
            position: 'absolute',
            top: '-26px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f766e',
            color: '#ccfbf1',
            fontSize: '9.5px',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '999px',
            border: '1px solid #2dd4bf',
            boxShadow: '0 0 10px rgba(45, 212, 191, 0.85)',
            whiteSpace: 'nowrap',
            zIndex: 47,
            pointerEvents: 'none',
          }}
        >
          💨 スウェー寸止め!
        </div>
      )}

      {/* カメラ覗き込みによる奇襲看破（SPOT!）ポップアップ */}
      {isRecentSpot && (
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ca8a04',
            color: '#fefce8',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1.5px solid #fef08a',
            boxShadow: '0 0 14px rgba(250, 204, 21, 0.95)',
            whiteSpace: 'nowrap',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          👁️ SPOT! 奇襲看破!!
        </div>
      )}

      {/* 吸血・撃破フロートポップアップ */}
      {isRecentKill && (
        <div style={styles.unitKillPopup}>
          🩸 吸血 +1/+1!
        </div>
      )}

      {/* HPバー & クールダウンバー (雲の死角にいる敵ユニットは秘匿) */}
      {!isCpuHiddenInCloud && (
        <>
          <div style={styles.unitHpBarBg}>
            <div
              style={{
                ...styles.unitHpBarFill,
                width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
                backgroundColor: isPlayer ? '#22c55e' : '#ef4444',
              }}
            />
          </div>
          <UnitCooldownBar
            unit={unit}
            isPlayer={isPlayer}
            isStunned={isStunned}
            isBlockingSpawn={isBlockingSpawn}
          />
        </>
      )}

      {/* ユニット本体アイコン */}
      <div
        className={attackClass}
        data-holding={isHolding ? 'true' : 'false'}
        data-scouting={isScouting ? 'true' : 'false'}
        onClick={
          canToggleHold
            ? (e) => {
                e.stopPropagation();
                onToggleHold?.(unit.id);
              }
            : undefined
        }
        style={{
          ...styles.unitBody,
          pointerEvents: canToggleHold ? 'auto' : undefined,
          cursor: canToggleHold ? 'pointer' : undefined,
          transform: `${isPlayer ? '' : 'scaleX(-1) '}rotate(${unit.spin ?? 0}deg)`,
          transition: unit.spin ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
          animation: unit.hasAmbushCharge ? 'unit-ambush-charge-pulse 1.2s infinite alternate' : undefined,
          // SVG の尻尾・触手がはみ出せるように
          overflow: hasSvg ? 'visible' : undefined,
        }}
      >
        {/* SVG コンポーネント or 絵文字フォールバック (雲の死角の敵は「❓」シルエット) */}
        {isCpuHiddenInCloud ? (
          <span style={{ fontSize: '20px', textShadow: '0 0 6px #000', opacity: 0.9 }}>❓</span>
        ) : hasSvg ? (
          <UnitSvgRenderer
            cardNo={unit.cardNo}
            state={animState}
            isPlayer={isPlayer}
            size={36}
          />
        ) : (
          <span style={styles.unitIconText}>{unit.icon}</span>
        )}

        {/* 状態異常・バフ表示 */}
        {isScouting && (
          <div
            style={{
              position: 'absolute',
              top: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              fontWeight: 'bold',
              color: '#cffafe',
              backgroundColor: '#0e7490',
              border: '1px solid #22d3ee',
              boxShadow: '0 0 10px #06b6d4',
              padding: '1px 5px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 35,
            }}
          >
            👁 索敵中 ({Math.round(Math.min(1.0, unit.scoutProgress || 0) * 100)}%)
          </div>
        )}
        {isHolding && (
          <div
            style={{
              position: 'absolute',
              top: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              fontWeight: 'bold',
              color: unit.hasAmbushCharge ? '#fef08a' : '#fffbeb',
              backgroundColor: unit.hasAmbushCharge ? '#854d0e' : '#b45309',
              border: unit.hasAmbushCharge ? '1px solid #facc15' : '1px solid #d97706',
              boxShadow: unit.hasAmbushCharge ? '0 0 10px #facc15' : undefined,
              padding: '1px 5px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 35,
            }}
          >
            {unit.hasAmbushCharge ? '🎯 待ち伏せ完了!(+2/突撃)' : `⏸ 集中中... (${Math.min(2.0, unit.holdDuration || 0).toFixed(1)}/2.0s)`}
          </div>
        )}
        {Boolean(unit.ambushDashUntil && Date.now() < unit.ambushDashUntil) && !isHolding && (
          <span
            style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              fontWeight: 'bold',
              color: '#fef08a',
              backgroundColor: '#ca8a04',
              border: '1px solid #fef08a',
              boxShadow: '0 0 8px #facc15',
              padding: '0 4px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 35,
            }}
          >
            ⚡ 奇襲突撃!
          </span>
        )}
        {isStunned && <span style={styles.statusStun}>⚡麻痺</span>}
        {unit.isSprinting && !isStunned && <span style={styles.statusSprint}>💨3x速</span>}
        {hasBuff && <span style={styles.statusBuff}>⚔️+{unit.attack - 1}</span>}
        {hasBatBuff && <span style={styles.statusBatBuff}>🩸+{unit.killCount}</span>}
      </div>

      {/* 攻撃力 / HP バッジ */}
      <div style={styles.unitBadges}>
        <span data-badge="atk" style={styles.unitAtkBadge}>{unit.attack}</span>
        <span data-badge="hp" style={styles.unitHpBadge}>{unit.hp}</span>
        {unit.hasSpellShield && (
          <span
            data-badge="spell-shield"
            style={{
              fontSize: '9px',
              backgroundColor: '#0284c7',
              color: '#e0f2fe',
              padding: '0 3px',
              borderRadius: '2px',
              lineHeight: '13px',
              fontWeight: 'bold',
            }}
            title="スペルシールド: 最初の被弾ダメージと状態異常を1回無効化"
          >
            🛡️盾
          </span>
        )}
        {unit.isSpotted && (
          <span
            data-badge="spotted"
            style={{
              fontSize: '9px',
              backgroundColor: '#ca8a04',
              color: '#fff',
              padding: '0 3px',
              borderRadius: '2px',
              lineHeight: '13px',
              fontWeight: 'bold',
            }}
            title="看破済み: 遮蔽物を透過して常時可視化＆疾走無効"
          >
            👁️看破
          </span>
        )}
        {unit.isAmbushDeploy && (
          <span
            data-badge="ambush"
            style={{
              fontSize: '9px',
              backgroundColor: '#15803d',
              color: '#dcfce7',
              padding: '0 3px',
              borderRadius: '2px',
              lineHeight: '13px',
              fontWeight: 'bold',
            }}
            title="森隠れ奇襲出撃ボーナス (攻撃力+1)"
          >
            🌲奇襲
          </span>
        )}
        {hasBatBuff && (
          <span data-badge="kill" style={{ fontSize: '9px', backgroundColor: '#9333ea', color: '#fff', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title={`吸血成長: 撃破${unit.killCount}体 (+${unit.killCount}/+${unit.killCount})`}>🩸x{unit.killCount}</span>
        )}
        {unit.isSprinting && (
          <span style={{ fontSize: '9px', backgroundColor: '#06b6d4', color: '#fff', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title="敵不在レーン3倍速疾走！">💨</span>
        )}
        {unit.isCounterDeploy && (
          <span style={{ fontSize: '9px', backgroundColor: '#6366f1', padding: '0 2px', borderRadius: '2px', lineHeight: '13px' }} title="カウンターデプロイ">⚔️</span>
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
});



// 攻撃エフェクト（電撃ビーム・火炎ブレス・着弾放電スパーク・火炎爆発・ダメージポップアップ）描画サブコンポーネント
