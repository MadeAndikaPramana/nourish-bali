import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ContentBundle, type ContentBundle as Bundle } from '@/lib/schema';
import { describeChanges } from '@/lib/diff';
import { api, ApiError, type SaveResult, type SessionInfo, type Snapshot } from './api';
import { Button, Input } from './ui';
import HoursEditor from './HoursEditor';
import MenuEditor from './MenuEditor';
import { AnnouncementEditor, CafesEditor } from './CafesEditor';
import HistoryPanel from './HistoryPanel';

type Tab = 'hours' | 'menu' | 'cafes' | 'announcement' | 'history';
const TABS: { id: Tab; label: string }[] = [
  { id: 'hours', label: 'Opening hours' },
  { id: 'menu', label: 'Menu & prices' },
  { id: 'cafes', label: 'Café info' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'history', label: 'History' },
];
const DRAFT_KEY = 'nourish-admin-draft';

type Publish = { phase: 'saving' } | { phase: 'deploying' | 'live' | 'failed'; result: SaveResult; deployUrl?: string | null } | null;

export default function AdminApp() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<Bundle | null>(null);
  const [tab, setTab] = useState<Tab>('hours');
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [publish, setPublish] = useState<Publish>(null);
  const [restoredFrom, setRestoredFrom] = useState<string | null>(null);

  useEffect(() => {
    api.session().then(setSession).catch((e) => setError(e.message));
  }, []);

  const loadContent = useCallback(async () => {
    setError(null);
    try {
      const s = await api.content();
      setSnap(s);
      // Offer to bring back an unsaved draft from this browser if it was made on the same version.
      const saved = readDraft();
      if (saved && saved.baseSha === s.baseSha && JSON.stringify(saved.content) !== JSON.stringify(s.content)) {
        if (confirm('You have unsaved changes from earlier in this browser. Restore them?')) {
          setDraft(saved.content);
          return;
        }
      }
      clearDraft();
      setDraft(structuredClone(s.content));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setSession((x) => (x ? { ...x, authenticated: false } : x));
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (session?.authenticated) loadContent();
  }, [session?.authenticated, loadContent]);

  const update = useCallback((fn: (d: Bundle) => void) => {
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      fn(next);
      return next;
    });
  }, []);

  const changes = useMemo(() => (snap && draft ? describeChanges(snap.content, draft) : []), [snap, draft]);
  const validation = useMemo(() => (draft ? ContentBundle.safeParse(draft) : null), [draft]);
  const dirty = changes.length > 0;

  // Keep the draft in this browser so a closed tab or dead battery loses nothing.
  useEffect(() => {
    if (!snap || !draft) return;
    if (dirty) writeDraft({ baseSha: snap.baseSha, content: draft });
    else clearDraft();
  }, [draft, snap, dirty]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const doSave = async () => {
    if (!snap || !draft) return;
    setPublish({ phase: 'saving' });
    try {
      const result = await api.save(draft, snap.content, snap.blobShas);
      setSnap({ ...snap, content: structuredClone(draft), baseSha: result.sha, blobShas: result.blobShas });
      clearDraft();
      setRestoredFrom(null);
      setReviewing(false);
      if (snap.source === 'local' || !result.url) {
        setPublish({ phase: 'live', result });
        return;
      }
      setPublish({ phase: 'deploying', result });
      pollDeploy(result, setPublish);
    } catch (e) {
      setPublish(null);
      if (e instanceof ApiError && e.conflict) {
        setError('Someone else saved changes while you were editing. Your edits are kept in this browser: reload to get the latest version, then restore your draft.');
      } else setError((e as Error).message);
      setReviewing(false);
    }
  };

  if (!session) return <Shell><p className="p-10 text-center text-muted">Loading…</p></Shell>;
  if (!session.configured) return <Shell><NotConfigured /></Shell>;
  if (!session.authenticated) return <Shell><Login onDone={() => setSession({ ...session, authenticated: true })} /></Shell>;

  return (
    <Shell
      bar={
        <div className="flex items-center gap-2">
          <span className={`hidden rounded-full px-3 py-1.5 text-xs font-bold sm:inline ${dirty ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
            {dirty ? `${changes.length} unsaved change${changes.length > 1 ? 's' : ''}` : 'All saved'}
          </span>
          <Button variant="accent" className="max-sm:!min-h-10 max-sm:!px-3" disabled={!dirty || !draft} onClick={() => setReviewing(true)}>
            Save{dirty ? ` (${changes.length})` : ''}
          </Button>
          <Button
            variant="quiet"
            className="whitespace-nowrap"
            onClick={async () => {
              if (dirty && !confirm('Log out? Your unsaved changes stay in this browser.')) return;
              await api.logout();
              setSession({ ...session, authenticated: false });
            }}
          >
            Log out
          </Button>
        </div>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-5 px-4 pb-32 pt-5 sm:px-6 lg:grid-cols-[13rem_1fr] lg:gap-8">
        <nav aria-label="Admin sections" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-left text-sm font-bold transition-colors ${tab === t.id ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`}
            >
              {t.label}
            </button>
          ))}
          <div className="mt-4 hidden rounded-2xl bg-white p-3 text-xs text-muted ring-1 ring-line lg:block">
            {snap?.source === 'github' ? (
              <>
                Saving to <strong className="text-ink">{snap.repo}</strong> ({snap.branch}). Each Save is one commit; Vercel publishes it in about a minute.
              </>
            ) : (
              <>Local mode: Save writes the JSON files in this folder (no GitHub token set).</>
            )}
          </div>
        </nav>

        <div className="min-w-0">
          {error && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200" role="alert">
              <span>{error}</span>
              <div className="flex gap-2">
                <Button variant="quiet" onClick={() => location.reload()}>
                  Reload
                </Button>
                <Button variant="quiet" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          {restoredFrom && (
            <div className="mb-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
              Loaded version {restoredFrom} into the editor. Review the changes and press Save to publish it, or reload to cancel.
            </div>
          )}
          {!draft ? (
            <p className="p-10 text-center text-muted">Loading content…</p>
          ) : (
            <>
              {tab === 'hours' && <HoursEditor draft={draft} update={update} />}
              {tab === 'menu' && <MenuEditor draft={draft} update={update} />}
              {tab === 'cafes' && <CafesEditor draft={draft} update={update} />}
              {tab === 'announcement' && <AnnouncementEditor draft={draft} update={update} />}
              {tab === 'history' && (
                <HistoryPanel
                  enabled={snap?.source === 'github'}
                  onLoad={(content, label) => {
                    setDraft(content);
                    setRestoredFrom(label);
                    setTab('hours');
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Phone: sticky save bar */}
      <AnimatePresence>
        {dirty && !reviewing && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-2xl bg-ink p-2 pl-4 text-paper shadow-2xl sm:hidden"
          >
            <span className="text-sm">{changes.length} unsaved</span>
            <Button variant="accent" onClick={() => setReviewing(true)}>
              Review & save
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {reviewing && draft && (
        <ReviewDialog
          changes={changes}
          issues={validation && !validation.success ? validation.error.issues.map((i) => `${i.path.join(' › ')}: ${i.message}`) : []}
          saving={publish?.phase === 'saving'}
          target={snap?.source === 'github' ? `${snap.repo} (${snap.branch})` : 'local files'}
          onCancel={() => setReviewing(false)}
          onDiscard={() => {
            if (!confirm('Throw away all unsaved changes?')) return;
            setDraft(structuredClone(snap!.content));
            setRestoredFrom(null);
            setReviewing(false);
          }}
          onSave={doSave}
        />
      )}

      {publish && publish.phase !== 'saving' && <PublishToast publish={publish} onClose={() => setPublish(null)} />}
    </Shell>
  );
}

function pollDeploy(result: SaveResult, set: (p: Publish) => void) {
  const started = Date.now();
  const tick = async () => {
    try {
      const s = await api.status(result.sha);
      if (s.state === 'success') return set({ phase: 'live', result, deployUrl: s.url });
      if (s.state === 'failure' || s.state === 'error') return set({ phase: 'failed', result, deployUrl: s.url });
    } catch {
      /* keep polling */
    }
    if (Date.now() - started < 6 * 60_000) setTimeout(tick, 6000);
    else set({ phase: 'live', result });
  };
  setTimeout(tick, 5000);
}

function Shell({ children, bar }: { children: React.ReactNode; bar?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" className="flex items-baseline gap-2" title="View the website">
            <span className="display text-xl">
              Nourish<span className="text-accent">.</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Admin</span>
          </a>
          {bar}
        </div>
      </header>
      {children}
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mx-auto mt-[12vh] grid max-w-sm gap-4 px-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.login(password);
          onDone();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="display text-4xl">Staff login</h1>
      <p className="text-sm text-muted">Update opening hours, menu items and prices. One password, shared by the team.</p>
      <Input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
      {error && <p className="text-sm font-semibold text-rose-700" role="alert">{error}</p>}
      <Button type="submit" variant="ink" disabled={busy || !password}>
        {busy ? 'Checking…' : 'Log in'}
      </Button>
    </form>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto mt-[12vh] max-w-lg px-4">
      <h1 className="display text-3xl">Admin isn’t set up yet</h1>
      <p className="mt-3 text-muted">
        Add <code className="rounded bg-ink/5 px-1">ADMIN_PASSWORD</code>, <code className="rounded bg-ink/5 px-1">GITHUB_TOKEN</code> and{' '}
        <code className="rounded bg-ink/5 px-1">GITHUB_REPO</code> in Vercel → Settings → Environment Variables, then redeploy. The README explains each one.
      </p>
    </div>
  );
}

function ReviewDialog({
  changes,
  issues,
  saving,
  target,
  onCancel,
  onDiscard,
  onSave,
}: {
  changes: string[];
  issues: string[];
  saving: boolean;
  target: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onCancel();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCancel, saving]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-line p-5">
          <h2 id="review-title" className="display text-2xl">
            Review {changes.length} change{changes.length === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-sm text-muted">Saving publishes to {target}. The website updates in about a minute.</p>
        </div>
        <div className="overflow-y-auto p-5">
          {issues.length > 0 && (
            <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200">
              <p className="font-bold">Fix these before saving:</p>
              <ul className="mt-2 list-disc pl-5">
                {issues.slice(0, 12).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          <ul className="grid gap-1.5 text-sm">
            {changes.map((c, i) => (
              <li key={i} className="rounded-xl bg-white px-3 py-2 ring-1 ring-line">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4">
          <Button variant="quiet" onClick={onDiscard} disabled={saving}>
            Discard all
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Keep editing
            </Button>
            <Button variant="accent" onClick={onSave} disabled={saving || issues.length > 0}>
              {saving ? 'Saving…' : 'Save & publish'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PublishToast({ publish, onClose }: { publish: Exclude<Publish, null | { phase: 'saving' }>; onClose: () => void }) {
  const { phase, result } = publish;
  const label =
    phase === 'deploying' ? 'Saved. Publishing to the website…' : phase === 'live' ? (result.url ? 'Saved and live on the website.' : 'Saved.') : 'Saved, but the website build failed.';
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-ink p-4 text-paper shadow-2xl" role="status">
      <div className="flex items-start gap-3">
        <span className={`mt-1 size-2.5 shrink-0 rounded-full ${phase === 'deploying' ? 'animate-pulse bg-amber-400' : phase === 'live' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
        <div className="flex-1 text-sm">
          <p className="font-bold">{label}</p>
          <p className="mt-1 text-paper/70">
            {result.changes.length} change{result.changes.length === 1 ? '' : 's'}
            {result.url && (
              <>
                {' · '}
                <a href={result.url} target="_blank" rel="noopener" className="underline">
                  commit {result.sha.slice(0, 7)}
                </a>
              </>
            )}
            {publish.deployUrl && (
              <>
                {' · '}
                <a href={publish.deployUrl} target="_blank" rel="noopener" className="underline">
                  deployment
                </a>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-paper/60 hover:text-paper">
          ✕
        </button>
      </div>
    </div>
  );
}

function readDraft(): { baseSha: string; content: Bundle } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(v: { baseSha: string; content: Bundle }) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
  } catch {
    /* storage full or blocked: the draft just isn't persisted */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
