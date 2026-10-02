import { useEffect, useState } from 'react';
import type { ContentBundle } from '@/lib/schema';
import { api, type HistoryEntry } from './api';
import { Button, Card } from './ui';

/** Last 20 content commits. "Load this version" puts it in the editor; nothing changes until Save. */
export default function HistoryPanel({ enabled, onLoad }: { enabled: boolean; onLoad: (content: ContentBundle, label: string) => void }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    api
      .history()
      .then((r) => setEntries(r.entries))
      .catch((e) => setError(e.message));
  }, [enabled]);

  if (!enabled) {
    return (
      <Card title="History">
        <p className="text-sm text-muted">History needs the GitHub connection (it reads the repo’s commits). In local mode, use git directly.</p>
      </Card>
    );
  }

  return (
    <Card title="History">
      <p className="mb-4 text-sm text-muted">
        Every Save is a commit, so nothing is ever lost. Loading an older version puts it in the editor; review the changes and press Save to publish it.
      </p>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {!entries && !error && <p className="text-sm text-muted">Loading…</p>}
      <ol className="grid gap-2">
        {entries?.map((e) => (
          <li key={e.sha} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{e.message.split('\n')[0]}</p>
              <p className="text-xs text-muted">
                {new Date(e.date).toLocaleString('en-GB', { timeZone: 'Asia/Makassar', dateStyle: 'medium', timeStyle: 'short' })} WITA · {e.author} ·{' '}
                <a href={e.url} target="_blank" rel="noopener" className="underline">
                  {e.sha.slice(0, 7)}
                </a>
              </p>
            </div>
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(e.sha);
                try {
                  const { content } = await api.version(e.sha);
                  onLoad(content, e.sha.slice(0, 7));
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === e.sha ? 'Loading…' : 'Load this version'}
            </Button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
