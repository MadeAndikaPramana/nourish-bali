import type { ContentBundle } from '@/lib/schema';

export interface SessionInfo {
  authenticated: boolean;
  configured: boolean;
  store: { mode: 'github'; repo: string; branch: string } | { mode: 'local' } | { mode: 'none' };
}
export interface Snapshot {
  content: ContentBundle;
  baseSha: string;
  blobShas: Record<string, string>;
  source: 'github' | 'local';
  repo?: string;
  branch?: string;
}
export interface SaveResult {
  sha: string;
  url: string | null;
  changed: string[];
  blobShas: Record<string, string>;
  changes: string[];
}
export interface HistoryEntry {
  sha: string;
  message: string;
  date: string;
  author: string;
  url: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public conflict = false,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, Boolean(data.conflict));
  return data as T;
}

export const api = {
  session: () => call<SessionInfo>('session'),
  login: (password: string) => call<{ ok: true }>('login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => call<{ ok: true }>('logout', { method: 'POST' }),
  content: () => call<Snapshot>('content'),
  save: (content: ContentBundle, original: ContentBundle, blobShas: Record<string, string>) =>
    call<SaveResult>('save', { method: 'POST', body: JSON.stringify({ content, original, blobShas }) }),
  history: () => call<{ entries: HistoryEntry[] }>('history'),
  version: (sha: string) => call<{ content: ContentBundle }>(`version?sha=${sha}`),
  status: (sha: string) => call<{ state: 'pending' | 'success' | 'failure' | 'error' | 'none'; url: string | null }>(`status?sha=${encodeURIComponent(sha)}`),
};
