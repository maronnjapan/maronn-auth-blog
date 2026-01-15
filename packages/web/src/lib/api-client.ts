import { hc } from 'hono/client';
import type { AppType } from '@maronn-auth-blog/api';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';

export const apiClient = hc<AppType>(API_URL, {
  init: {
    credentials: 'include',
  },
});

export type ApiClient = typeof apiClient;
