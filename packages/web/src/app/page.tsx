'use client';

import { AuthProvider } from '@/context/authContext';
import { GameProvider } from '@/context/gameContext';
import GameClient from '@/components/GameClient';

export default function Home() {
  return (
    <AuthProvider>
      <GameProvider>
         <GameClient />
      </GameProvider>
    </AuthProvider>
  );
}
