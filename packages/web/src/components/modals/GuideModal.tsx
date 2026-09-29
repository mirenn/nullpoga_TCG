import React, { useState } from 'react';
import { CARD_POOL } from '../../app/cards';
import { styles } from '../../app/page.styles';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<'tips' | 'catalog'>('tips');

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.guideModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.guideModalHeader}>
          <div style={styles.sidePanelHeader}>
            <button
              onClick={() => setActiveTab('tips')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'tips' ? styles.tabButtonActive : {}),
              }}
            >
              💡 攻略ポイント
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'catalog' ? styles.tabButtonActive : {}),
              }}
            >
              📖 全カード図鑑 ({CARD_POOL.length})
            </button>
          </div>
          <button
            onClick={onClose}
            style={styles.guideModalCloseBtn}
            title="閉じる"
          >
            ✕
          </button>
        </div>
        <div style={styles.guideModalBody}>
          {activeTab === 'tips' ? (
            <div style={styles.tipsSection}>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🐢 戦線維持</div>
                <div style={styles.tipText}>
                  カメなどで耐えて後方から遠距離や範囲攻撃で支援するのが戦闘の基本です。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>⚡ オフサイド急襲</div>
                <div style={styles.tipText}>
                  敵の攻めを防ぎつつ反対側の空きレーンにネズミを流す陽動が強力です。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🐗 背水の陣バフ</div>
                <div style={styles.tipText}>
                  イノシシは味方拠点が瀕死なほど攻撃力が上がり、土壇場で敵本拠地の一撃粉砕を狙えます。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🦇 吸血コウモリのキル成長</div>
                <div style={styles.tipText}>
                  敵にとどめを刺すたびに吸血し、攻撃力+1・最大HP+1・HP+1と永続成長します。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>⚡ 迎撃スペル</div>
                <div style={styles.tipText}>
                  敵が密集している場所はライトニングボルトやメテオストライクで一網打尽にできます。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>⚡ AAキャンセル</div>
                <div style={styles.tipText}>
                  疾風の号令は攻撃の直後に使うことで、即座に再攻撃コンボが可能です。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🌧️ 癒やしの雨</div>
                <div style={styles.tipText}>
                  指定レーンの味方全員を3回回復。カメなどの高耐久ユニットと好相性です。
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🔄 15枚デッキとNEXTサイクル</div>
                <div style={styles.tipText}>
                  手札4枚＋NEXT1枚の合計15枚デッキ。使い切ると自動で再シャッフルされます！
                </div>
              </div>
              <div style={styles.tipBox}>
                <div style={styles.tipTitle}>🛡️ 出撃レギュレーション</div>
                <div style={styles.tipText}>
                  1レーン最大3体、直前の味方ユニットがある程度前進するまでの出撃スペース確保、ドラゴン1体制限、連続召喚誤爆防止（約0.12秒）の制限があります。
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.catalogList}>
              {CARD_POOL.map((c) => (
                <div key={c.id} style={styles.catalogItem}>
                  <span style={{ fontSize: '20px' }}>{c.icon}</span>
                  <div style={{ flex: 1, fontSize: '12px' }}>
                    <div style={styles.catalogItemTop}>
                      <strong>{c.name}</strong>
                      <span style={styles.catalogItemCost}>💎{c.manaCost}</span>
                    </div>
                    {c.type === 'MONSTER' && (
                      <div style={styles.catalogItemStats}>
                        <span>⚔️ {c.attack}</span>
                        <span>❤️ {c.life}</span>
                        <span>👟 {c.speed}</span>
                        <span>🎯 {c.range}%</span>
                        <span title={c.attackWindup ? `攻撃間隔: ${c.attackInterval ?? 1.0}s / チャージ(前隙): ${c.attackWindup}s` : '攻撃間隔'}>
                          ⏱️ {c.attackInterval ?? 1.0}s{c.attackWindup ? ` (蓄${c.attackWindup}s)` : ''}
                        </span>
                      </div>
                    )}
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      {c.effectDesc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
