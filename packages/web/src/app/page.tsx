'use client';

import { AuthProvider } from '@/context/authContext';
import GameClient from '@/components/GameClient';

export default function Home() {
  return (
    <AuthProvider>
      <div style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        backgroundColor: '#2563eb',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <a href="/realtime-demo" style={{ color: '#fff', textDecoration: 'none' }}>
          ⚡ リアルタイム版プロトタイプを試す →
        </a>
      </div>
      <GameClient />
    </AuthProvider>
  );
}
