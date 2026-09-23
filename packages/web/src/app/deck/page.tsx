'use client';

import { AuthProvider } from '@/context/authContext';
import DeckBuilder from '@/components/DeckBuilder';

export default function DeckPage() {
  return (
    <AuthProvider>
      <DeckBuilder />
    </AuthProvider>
  );
}
