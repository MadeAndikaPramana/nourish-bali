import { CONTENT_PATHS, ContentBundle, toJson, type ContentBundle as Bundle } from '@/lib/schema';

/**
 * Where /admin reads and writes content.
 * - Production: the GitHub repo, through the Git Data API, so one Save = one commit = one Vercel deploy.
 * - `astro dev` without a token: the local files, so the admin can be tried without any setup.
 */

const env = (k: string) => (import.meta.env[k] as string | undefined) ?? process.env[k];

export interface Snapshot {
  content: Bundle;
  /** Commit the content was read from (GitHub) or "local". */
  baseSha: string;
  /** Blob sha per content path, used to detect edits made elsewhere since this snapshot. */
  blobShas: Record<string, string>;
  source: 'github' | 'local';
  repo?: string;
  branch?: string;
}

export interface HistoryEntry {
  sha: string;
  message: string;
  date: string;
  author: string;
  url: string;
}

export class ConflictError extends Error {}
export class NotConfiguredError extends Error {}

export const allPaths = () => [CONTENT_PATHS.site, ...Object.values(CONTENT_PATHS.branches), ...Object.values(CONTENT_PATHS.menus)];

export function bundleToFiles(content: Bundle): Record<string, string> {
  const files: Record<string, string> = { [CONTENT_PATHS.site]: toJson(content.site) };
  for (const [slug, path] of Object.entries(CONTENT_PATHS.branches)) files[path] = toJson(content.branches[slug as keyof Bundle['branches']]);
  for (const [id, path] of Object.entries(CONTENT_PATHS.menus)) files[path] = toJson(content.menus[id as keyof Bundle['menus']]);
  return files;
}

function filesToBundle(files: Record<string, string>): Bundle {
  const parse = (p: string) => JSON.parse(files[p] ?? 'null');
  return ContentBundle.parse({
    site: parse(CONTENT_PATHS.site),
    branches: Object.fromEntries(Object.entries(CONTENT_PATHS.branches).map(([k, p]) => [k, parse(p)])),
    menus: Object.fromEntries(Object.entries(CONTENT_PATHS.menus).map(([k, p]) => [k, parse(p)])),
  });
}

/* ---------------------------------- GitHub ---------------------------------- */

const gh = () => {
  const token = env('GITHUB_TOKEN');
  const repo = env('GITHUB_REPO');
  const branch = env('GITHUB_BRANCH') || 'main';
  if (!token || !repo) return null;
  return { token, repo, branch };
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = gh()!;
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nourish-admin',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub ${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function headSha(branch: string) {
  const ref = await api<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`);
  return ref.object.sha;
}

async function contentBlobs(commitSha: string) {
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${commitSha}`);
  const tree = await api<{ tree: { path: string; sha: string; type: string }[] }>(`/git/trees/${commit.tree.sha}?recursive=1`);
  const wanted = new Set(allPaths());
  return { treeSha: commit.tree.sha, blobs: Object.fromEntries(tree.tree.filter((e) => e.type === 'blob' && wanted.has(e.path)).map((e) => [e.path, e.sha])) as Record<string, string> };
}

async function readBlob(sha: string) {
  const blob = await api<{ content: string; encoding: string }>(`/git/blobs/${sha}`);
  return Buffer.from(blob.content, blob.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
}

async function readAt(commitSha: string) {
  const { blobs } = await contentBlobs(commitSha);
  const entries = await Promise.all(Object.entries(blobs).map(async ([p, sha]) => [p, await readBlob(sha)] as const));
  return { files: Object.fromEntries(entries), blobs };
}

/* ---------------------------------- Local ----------------------------------- */

async function localFs() {
  const fs = await import('node:fs/promises');
  const crypto = await import('node:crypto');
  const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
  const read = async () => {
    const files: Record<string, string> = {};
    for (const p of allPaths()) files[p] = await fs.readFile(p, 'utf8');
    return files;
  };
  return { fs, sha, read };
}

const useLocal = () => !gh() && import.meta.env.DEV;

/* ---------------------------------- Public ---------------------------------- */

export function storeInfo() {
  const cfg = gh();
  if (cfg) return { mode: 'github' as const, repo: cfg.repo, branch: cfg.branch };
  if (import.meta.env.DEV) return { mode: 'local' as const };
  return { mode: 'none' as const };
}

export async function load(): Promise<Snapshot> {
  if (useLocal()) {
    const { read, sha } = await localFs();
    const files = await read();
    return { content: filesToBundle(files), baseSha: 'local', blobShas: Object.fromEntries(Object.entries(files).map(([p, c]) => [p, sha(c)])), source: 'local' };
  }
  const cfg = gh();
  if (!cfg) throw new NotConfiguredError('GITHUB_TOKEN and GITHUB_REPO are not set.');
  const base = await headSha(cfg.branch);
  const { files, blobs } = await readAt(base);
  return { content: filesToBundle(files), baseSha: base, blobShas: blobs, source: 'github', repo: cfg.repo, branch: cfg.branch };
}

/**
 * Writes the files that changed in one commit. Rejects with ConflictError if any content file was changed
 * by someone else since `expected` (the blob shas the editor started from). Unrelated commits (code) are fine.
 */
export async function save(content: Bundle, expected: Record<string, string>, message: string) {
  const next = bundleToFiles(ContentBundle.parse(content));

  if (useLocal()) {
    const { fs, read, sha } = await localFs();
    const current = await read();
    for (const p of allPaths()) if (sha(current[p]) !== expected[p]) throw new ConflictError('Content changed on disk since you loaded it.');
    const changed = allPaths().filter((p) => current[p] !== next[p]);
    for (const p of changed) await fs.writeFile(p, next[p]);
    const after = await read();
    return { sha: 'local', url: null, changed, blobShas: Object.fromEntries(Object.entries(after).map(([p, c]) => [p, sha(c)])) };
  }

  const cfg = gh();
  if (!cfg) throw new NotConfiguredError('GITHUB_TOKEN and GITHUB_REPO are not set.');

  for (let attempt = 0; attempt < 2; attempt++) {
    const head = await headSha(cfg.branch);
    const { treeSha, blobs } = await contentBlobs(head);
    for (const p of allPaths()) if (blobs[p] !== expected[p]) throw new ConflictError(`${p} was changed by someone else.`);

    const current = Object.fromEntries(await Promise.all(allPaths().map(async (p) => [p, await readBlob(blobs[p])] as const)));
    const changed = allPaths().filter((p) => current[p] !== next[p]);
    if (!changed.length) return { sha: head, url: null, changed, blobShas: blobs };

    const tree = await api<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: treeSha, tree: changed.map((p) => ({ path: p, mode: '100644', type: 'blob', content: next[p] })) }),
    });
    const commit = await api<{ sha: string; html_url: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
    });
    try {
      await api(`/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
    } catch (err) {
      // Branch moved between read and write (e.g. a code push): retry once on the new head.
      if ((err as { status?: number }).status === 422 && attempt === 0) continue;
      throw err;
    }
    const { blobs: after } = await contentBlobs(commit.sha);
    return { sha: commit.sha, url: commit.html_url, changed, blobShas: after };
  }
  throw new ConflictError('The branch kept moving. Please try again.');
}

export async function history(): Promise<HistoryEntry[]> {
  const cfg = gh();
  if (!cfg) return [];
  const list = await api<{ sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }[]>(
    `/commits?sha=${encodeURIComponent(cfg.branch)}&path=src/content&per_page=20`,
  );
  return list.map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.author.date, author: c.commit.author.name, url: c.html_url }));
}

/** Content as it was right after `sha`, ready to be saved again as a new commit. */
export async function contentAt(sha: string): Promise<Bundle> {
  if (!gh()) throw new NotConfiguredError('History needs GitHub.');
  const { files } = await readAt(sha);
  return filesToBundle(files);
}

/** Deploy state that Vercel reports back to GitHub on the commit. */
export async function deployStatus(sha: string) {
  if (!gh() || sha === 'local') return { state: 'none' as const, url: null };
  const status = await api<{ state: string; statuses: { context: string; state: string; target_url: string | null }[] }>(`/commits/${sha}/status`);
  const vercel = status.statuses.find((s) => /vercel/i.test(s.context));
  const state = (vercel?.state ?? (status.statuses.length ? status.state : 'none')) as 'pending' | 'success' | 'failure' | 'error' | 'none';
  return { state, url: vercel?.target_url ?? null };
}
