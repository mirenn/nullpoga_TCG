import React from 'react';
import type { DemoCard } from '../../app/types';
import { MANA_SPEED_PRESETS } from '../../app/cards';
import { styles } from '../../app/page.styles';
import { GuideContent } from '../modals/GuideContent';

interface DesktopSidePanelProps {
  cpuHp: number;
  cpuMana: number;
  maxMana: number;
  cpuHand: DemoCard[];
  cpuDeckCount: number;
  manaRegenRate: number;
  setManaRegenRate: (rate: number) => void;
  onReset: () => void;
}

export function DesktopSidePanel({
  cpuHp,
  cpuMana,
  maxMana,
  cpuHand,
  cpuDeckCount,
  manaRegenRate,
  setManaRegenRate,
  onReset,
}: DesktopSidePanelProps) {
  return (
    <div style={styles.sidePanel} className="desktop-side-panel">
      {/* パネル上部タイトル */}
      <div style={styles.sidePanelTitleRow}>
        <span style={styles.sidePanelTitle}>Nullpoga RTS</span>
        <span style={styles.sidePanelBadge}>5レーン検証</span>
      </div>

      {/* 対戦相手（CPU）ステータス ＆ バトル操作カード */}
      <div style={styles.sideBattleCard}>
        <div style={styles.sideCpuStatusRow}>
          <div style={styles.sideCpuInfo}>
            <span style={styles.sideCpuName}>🤖 相手 (CPU)</span>
            <div style={styles.sideHpBarBg}>
              <div
                style={{
                  ...styles.hpBarFillCpu,
                  width: `${Math.max(0, (cpuHp / 20) * 100)}%`,
                }}
              />
              <span style={styles.hpText}>{cpuHp} / 20 HP</span>
            </div>
          </div>
        </div>

        {/* 相手CPUマナゲージ行 */}
        <div style={styles.sideCpuManaRow}>
          <div style={styles.manaInfo}>
            <span style={styles.cpuManaTitle}>⚡ マナ</span>
            <span style={styles.cpuManaCount}>
              <strong>{cpuMana.toFixed(1)}</strong> / {maxMana}
            </span>
          </div>
          <div style={styles.sideCpuManaBarBg}>
            <div
              style={{
                ...styles.cpuManaBarFill,
                width: `${(cpuMana / maxMana) * 100}%`,
              }}
            />
            <div style={styles.manaTicks}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tick) => (
                <div key={tick} style={styles.manaTick} />
              ))}
            </div>
          </div>
        </div>

        {/* 相手CPU手札・山札枠 */}
        <div style={styles.sideCpuHandRow}>
          <div style={styles.sideCpuHandHeader}>
            <span style={styles.sideCpuHandTitle}>🎴 相手手札 ({cpuHand.length}/4)</span>
            <span style={styles.sideCpuDeckCount} title="相手の山札残数">
              📚 山札 {cpuDeckCount}枚
            </span>
          </div>
          <div style={styles.sideCpuHandCards}>
            {cpuHand.map((_, idx) => (
              <div
                key={idx}
                style={styles.sideCpuCardSlot}
                title="相手の手札（裏向き）"
              >
                <div style={styles.cpuCardBack}>
                  <span style={styles.cpuCardBackPattern}>✦</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.sideControlRow}>
          {/* マナ回復速度セレクター */}
          <div style={styles.manaSpeedSelector} title="マナ回復速度を調整">
            <span style={styles.manaSpeedLabel} className="mana-speed-label-full">⚡速度:</span>
            <span style={styles.manaSpeedLabel} className="mana-speed-label-short">⚡</span>
            <select
              value={manaRegenRate}
              onChange={(e) => setManaRegenRate(parseFloat(e.target.value))}
              style={styles.manaSpeedSelect}
            >
              {MANA_SPEED_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onReset} style={styles.resetButton} title="ゲームを最初からやり直す">
            <span className="btn-text-desktop">🔄 やり直す</span>
            <span className="btn-text-mobile">🔄</span>
          </button>
        </div>
      </div>

      <GuideContent />
    </div>
  );
}
