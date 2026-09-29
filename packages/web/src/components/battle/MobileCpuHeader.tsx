import React from 'react';
import { MANA_SPEED_PRESETS } from '../../app/cards';
import { styles } from '../../app/page.styles';

interface MobileCpuHeaderProps {
  cpuHp: number;
  cpuMana: number;
  maxMana: number;
  cpuHandCount: number;
  cpuDeckCount: number;
  manaRegenRate: number;
  setManaRegenRate: (rate: number) => void;
  onReset: () => void;
  onOpenGuide: () => void;
}

export function MobileCpuHeader({
  cpuHp,
  cpuMana,
  maxMana,
  cpuHandCount,
  cpuDeckCount,
  manaRegenRate,
  setManaRegenRate,
  onReset,
  onOpenGuide,
}: MobileCpuHeaderProps) {
  return (
    <div style={styles.cpuHeader} className="mobile-cpu-header">
      <div style={styles.mobileCpuStatusGroup}>
        {/* CPU HP */}
        <div style={styles.mobileCpuHpSection}>
          <span style={styles.mobileCpuName}>🤖 相手</span>
          <div style={styles.mobileCpuHpBarBg}>
            <div
              style={{
                ...styles.hpBarFillCpu,
                width: `${Math.max(0, (cpuHp / 20) * 100)}%`,
              }}
            />
            <span style={styles.hpText}>{cpuHp} HP</span>
          </div>
        </div>

        {/* CPU マナ */}
        <div style={styles.mobileCpuManaSection}>
          <span style={styles.mobileCpuManaCount}>
            ⚡<strong>{cpuMana.toFixed(1)}</strong>
          </span>
          <div style={styles.mobileCpuManaBarBg}>
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

        {/* CPU 手札・山札残数 */}
        <div
          style={styles.mobileCpuDeckSection}
          title={`相手手札: ${cpuHandCount}枚 / 山札: ${cpuDeckCount}枚`}
        >
          <span style={styles.mobileCpuDeckBadge}>🎴{cpuHandCount}</span>
          <span style={styles.mobileCpuDeckBadge}>📚{cpuDeckCount}</span>
        </div>
      </div>

      {/* ゲーム操作コントロール (速度・リセット・モバイルガイド) */}
      <div style={styles.cpuHeaderControls}>
        {/* マナ回復速度セレクター */}
        <div style={styles.manaSpeedSelector} title="マナ回復速度を調整">
          <span style={styles.manaSpeedLabel} className="mana-speed-label-full">
            ⚡速度:
          </span>
          <span style={styles.manaSpeedLabel} className="mana-speed-label-short">
            ⚡
          </span>
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

        <button
          onClick={onOpenGuide}
          style={styles.guideToggleButton}
          className="mobile-guide-btn"
          title="検証ガイド・カード図鑑を表示"
        >
          <span className="btn-text-desktop">💡 ガイド・図鑑</span>
          <span className="btn-text-mobile">💡</span>
        </button>

        <button
          onClick={onReset}
          style={styles.resetButton}
          title="ゲームを最初からやり直す"
        >
          <span className="btn-text-desktop">🔄 やり直す</span>
          <span className="btn-text-mobile">🔄</span>
        </button>
      </div>
    </div>
  );
}
