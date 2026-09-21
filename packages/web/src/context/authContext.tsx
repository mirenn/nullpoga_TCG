'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { client } from '../lib/client';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  login: (userId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('gameRoomId');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUserId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('gameRoomId');
    }
  }, []);

  useEffect(() => {
    setToken(localStorage.getItem('jwtToken'));
    setUserId(localStorage.getItem('userId'));

    const onUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, [logout]);

  const login = async (newUserId: string) => {
    try {
      const response = await client.api.auth.login.$post({
        json: { username: newUserId },
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const newToken = data.access_token;
      setToken(newToken);
      setUserId(newUserId);
      localStorage.setItem('jwtToken', newToken);
      localStorage.setItem('userId', newUserId);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}