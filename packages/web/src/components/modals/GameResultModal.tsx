import React from 'react';
import { styles } from '../../app/page.styles';

interface GameResultModalProps {
  gameResult: 'win' | 'lose';
  onReset: () => void;
}

export function GameResultModal({ gameResult, onReset }: GameResultModalProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2
          style={{
            ...styles.modalTitle,
            color: gameResult === 'win' ? '#16a34a' : '#dc2626',
          }}
        >
          {gameResult === 'win' ? '🎉 VICTORY! 勝利！' : '💀 DEFEAT... 敗北'}
        </h2>
        <p style={styles.modalMessage}>
          {gameResult === 'win'
            ? '敵の本拠地を攻め落としました！独立レーンでの進軍と押し引きの感触はいかがでしたか？'
            : '自陣の防衛が破られました。防衛ユニットのタイミングや迎撃スペルの使い方がポイントです。'}
        </p>
        <button onClick={onReset} style={styles.modalButton}>
          もう一度遊ぶ
        </button>
      </div>
    </div>
  );
}
