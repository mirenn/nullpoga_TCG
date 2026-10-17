import React, { useState } from 'react';
import { CARD_POOL } from '../../app/cards';
import { styles } from '../../app/page.styles';

export function GuideContent() {
  const [activeTab, setActiveTab] = useState<'tips' | 'catalog'>('tips');

  return (
    <>
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

      <div style={styles.sidePanelContent}>
        {activeTab === 'tips' ? (
          <div style={styles.tipsSection}>
            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>🏰 インヒビター攻略とマナボーナス</div>
              <div style={styles.tipText}>
                上流・中央・下流（TOP/MID/BOTレーン）に佇むインヒビターは進路を塞ぐ壁です。破壊すると即座にマナ+2、さらに以後のマナ回復速度が永続で+20%（最大+60%）強化されます！
              </div>
            </div>
            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>📐 左右対戦フィールドと進軍</div>
              <div style={styles.tipText}>
                戦場はPC画面に合わせたワイドな左右対戦！自軍（左側）から敵軍（右側）へ向かって進軍します。インヒビターのない隙間ルート（y=35%や65%など）を突くか、正面突破するかの駆け引きが熱い！
              </div>
            </div>
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
              <div style={styles.tipTitle}>🌲 障害物＆前方味方への移動アクション（スライド・ジャンプ・粉砕＆プッシュ・通常破壊）</div>
              <div style={styles.tipText}>
                木や岩などの障害物や、前方を歩く味方ユニットに追いついた際のアクションはユニットごとに異なります！
                ネコ・柴犬・忍者・猟犬は上下にするりと【スライド迂回・追い抜き】して前進を継続し、
                コウモリは【ジャンプ飛び越え】で障害物や味方の頭上を華麗にパス。
                イノシシやドラゴンは障害物を一瞬で【激突粉砕】し、前の遅い味方も後ろから【押し出し（プッシュ）加速】させます。
                ネズミ・カメ・狩人などの通常（block）ユニットは、障害物にぶつかると【2〜3回攻撃して破壊】してから前進します！
              </div>
            </div>
            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>🐗 イノシシと柴犬のチャージ突撃</div>
              <div style={styles.tipText}>
                通常ユニットは攻撃チャージ中に足を止めますが、イノシシと柴犬ラン丸はチャージ中も止まらずに前進・突進します！イノシシは走り込んで激突時に相手をノックバックさせ、柴犬は走り込みながら移動距離ボーナスを稼いで強力な一撃を叩き込みます。
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
              <div style={styles.tipTitle}>🎯 奥行き配置（前衛・中衛・後衛）</div>
              <div style={styles.tipText}>
                自陣エリア（左半面: x=6%〜48%）の任意位置をクリック/ドロップで出撃可能！前衛で即座に敵を迎撃したり、後衛に遠距離・回復役を配置して戦術的な布陣を敷くことができます。
              </div>
            </div>
            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>🛡️ 出撃レギュレーション</div>
              <div style={styles.tipText}>
                直前味方ユニットとの出撃スペース確保、ドラゴン1体制限、連続召喚誤爆防止（約0.12秒）の制限があります。
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
                      <span title={c.attackWindup ? `攻撃間隔: ${c.attackInterval ?? 1.0}s / チャージ(前隙): ${c.attackWindup}s${c.canMoveWhileCharging ? ' (チャージ中移動可能)' : ''}` : '攻撃間隔'}>
                        ⏱️ {c.attackInterval ?? 1.0}s{c.attackWindup ? ` (${c.canMoveWhileCharging ? '🏃' : '蓄'}${c.attackWindup}s)` : ''}
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
    </>
  );
}
