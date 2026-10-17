import React from 'react';
import { MANA_SPEED_PRESETS } from '../../app/cards';
import { styles } from '../../app/page.styles';

interface MobileCpuHeaderProps {
  cpuHp: number;
  cpuMana: number;
  maxMana: number;
  cpuManaRegenMultiplier?: number;
  cpuHandCount: number;
  cpuDeckCount: number;
  manaRegenRate: number;
  setManaRegenRate: (rate: number) => void;
  showUnitRange?: boolean;
  onToggleUnitRange?: () => void;
  onReset: () => void;
  onOpenGuide: () => void;
}

export const MobileCpuHeader = React.memo(function MobileCpuHeader({
  cpuHp,
  cpuMana,
  maxMana,
  cpuManaRegenMultiplier = 1,
  cpuHandCount,
  cpuDeckCount,
  manaRegenRate,
  setManaRegenRate,
  showUnitRange = false,
  onToggleUnitRange,
  onReset,
  onOpenGuide,
}: MobileCpuHeaderProps) {
  const isCpuBoosted = cpuManaRegenMultiplier > 1;
  const cpuBoostPercent = Math.round((cpuManaRegenMultiplier - 1) * 100);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={styles.mobileCpuManaCount}>
              ⚡<strong>{cpuMana.toFixed(1)}</strong>
            </span>
            {isCpuBoosted && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#f43f5e',
                  backgroundColor: 'rgba(225, 29, 72, 0.25)',
                  border: '1px solid #f43f5e',
                  padding: '0 3px',
                  borderRadius: '2px',
                }}
                title={`相手マナ回復 +${cpuBoostPercent}%`}
              >
                +{cpuBoostPercent}%
              </span>
            )}
          </div>
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

      {/* ゲーム操作コントロール (速度・射程・リセット・モバイルガイド) */}
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
            suppressHydrationWarning
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

        {onToggleUnitRange && (
          <button
            type="button"
            onClick={onToggleUnitRange}
            data-testid="toggle-unit-range-mobile"
            style={{
              ...styles.guideToggleButton,
              backgroundColor: showUnitRange ? '#0369a1' : '#1e293b',
              border: `1px solid ${showUnitRange ? '#38bdf8' : '#475569'}`,
              color: showUnitRange ? '#e0f2fe' : '#94a3b8',
            }}
            title="各ユニットの射程範囲表示を切り替え (ショートカット: Rキー)"
          >
            <span className="btn-text-desktop">🎯 射程:{showUnitRange ? 'ON' : 'OFF'}</span>
            <span className="btn-text-mobile">🎯</span>
          </button>
        )}

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
}, (prev, next) => {
  return (
    prev.cpuHp === next.cpuHp &&
    Math.floor(prev.cpuMana * 10) === Math.floor(next.cpuMana * 10) &&
    prev.cpuManaRegenMultiplier === next.cpuManaRegenMultiplier &&
    prev.cpuHandCount === next.cpuHandCount &&
    prev.cpuDeckCount === next.cpuDeckCount &&
    prev.manaRegenRate === next.manaRegenRate &&
    prev.showUnitRange === next.showUnitRange
  );
});
