'use client';

import { AuthProvider } from '@/context/authContext';
import GameClient from '@/components/GameClient';

export default function Home() {
  return (
    <AuthProvider>
      <GameClient />
    </AuthProvider>
  );
}
