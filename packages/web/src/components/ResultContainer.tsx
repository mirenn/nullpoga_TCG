'use client';

import React, { useState, useEffect } from 'react';
import * as GameModels from '../types/gameModels';
import * as GameUtils from '../utils/gameUtils';

interface ResultContainerProps {
  gameState?: GameModels.State;
  myUserId?: string;
  onStartGame?: () => void;
}

const ResultContainer: React.FC<ResultContainerProps> = ({ gameState, myUserId, onStartGame }) => {
  const { isGameOver, result, message } = GameUtils.checkGameOver(gameState, myUserId);
  const [isDismissed, setIsDismissed] = useState(false);

  // 新しい対戦が始まったらモーダル非表示状態をリセット
  useEffect(() => {
    if (!isGameOver) {
      setIsDismissed(false);
    }
  }, [isGameOver]);

  if (!isGameOver || !result || isDismissed) {
    return null;
  }

  const isVictory = result === 'VICTORY';
  const isDefeat = result === 'DEFEAT';
  const resultClass = isVictory ? 'victory' : isDefeat ? 'defeat' : 'draw';
  const headerText = isVictory ? '🎉 VICTORY!' : isDefeat ? '💀 DEFEAT...' : '🤝 DRAW GAME';

  const myPlayer = GameUtils.getPlayerByUserId(gameState, myUserId!);
  const opponent = GameUtils.getPlayerExcludingUserId(gameState, myUserId!);

  return (
    <div
      className="game-result-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={() => setIsDismissed(true)}
    >
      <div
        className={`result-container ${resultClass}`}
        id="result"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '460px',
          padding: '32px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: `3px solid ${isVictory ? '#10b981' : isDefeat ? '#ef4444' : '#64748b'}`,
          textAlign: 'center',
          boxSizing: 'border-box',
          height: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '36px',
            fontWeight: 900,
            color: isVictory ? '#059669' : isDefeat ? '#dc2626' : '#334155',
            marginBottom: '12px',
            letterSpacing: '1px',
          }}
        >
          {headerText}
        </div>

        <p
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {myPlayer && opponent && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              width: '100%',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: 800,
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>あなた (ライフ)</div>
              <div style={{ fontSize: '20px', color: myPlayer.life <= 0 ? '#dc2626' : '#15803d' }}>
                {myPlayer.life}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #cbd5e1' }}></div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>対戦相手 (ライフ)</div>
              <div style={{ fontSize: '20px', color: opponent.life <= 0 ? '#dc2626' : '#15803d' }}>
                {opponent.life}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {onStartGame && (
            <button
              onClick={() => {
                setIsDismissed(false);
                onStartGame();
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 800,
                color: '#ffffff',
                backgroundColor: isVictory ? '#059669' : '#2563eb',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              もう一度対戦する（Start New Game）
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            style={{
              width: '100%',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            盤面を確認する（閉じる）
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultContainer;