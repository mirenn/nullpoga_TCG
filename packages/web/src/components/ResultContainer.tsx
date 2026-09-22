import React from 'react';
import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';

interface ResultContainerProps {
  gameState?: GameModels.State;
  myUserId?: string;
  onStartGame?: () => void;
}

const ResultContainer: React.FC<ResultContainerProps> = ({ gameState, myUserId, onStartGame }) => {
  const { isGameOver, result, message } = GameUtils.checkGameOver(gameState, myUserId);

  if (!isGameOver || !result) {
    return null;
  }

  const resultClass = result === 'VICTORY' ? 'victory' : result === 'DEFEAT' ? 'defeat' : 'draw';
  const headerText = result === 'VICTORY' ? 'VICTORY!' : result === 'DEFEAT' ? 'DEFEAT...' : 'DRAW GAME';

  return (
    <div
      className={`result-container ${resultClass}`}
      id="result"
      style={{
        margin: '24px auto',
        maxWidth: '520px',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: resultClass === 'victory' ? '#ecfdf5' : resultClass === 'defeat' ? '#fef2f2' : '#f8fafc',
        border: `2px solid ${resultClass === 'victory' ? '#10b981' : resultClass === 'defeat' ? '#ef4444' : '#94a3b8'}`,
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
        color: resultClass === 'victory' ? '#065f46' : resultClass === 'defeat' ? '#991b1b' : '#1e293b',
      }}
    >
      <div style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px', letterSpacing: '1px' }}>
        {headerText}
      </div>
      <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 16px 0', opacity: 0.9 }}>
        {message}
      </p>
      {onStartGame && (
        <button
          onClick={onStartGame}
          style={{
            padding: '10px 24px',
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: resultClass === 'victory' ? '#059669' : resultClass === 'defeat' ? '#dc2626' : '#475569',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
        >
          もう一度対戦する（Start New Game）
        </button>
      )}
    </div>
  );
};

export default ResultContainer;