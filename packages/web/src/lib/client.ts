import { hc } from 'hono/client';
import type { AppType } from '../server/app';

// Hono RPC Client for type-safe API requests
export const client = hc<AppType>('');

// Token-aware RPC helper
export const getApiClient = (token?: string | null) => {
  return hc<AppType>('', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
