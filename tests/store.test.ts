import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONTENT_PATHS } from '@/lib/schema';
import { ConflictError, allPaths, load, save } from '@/lib/server/store';

/**
 * A tiny in-memory GitHub (refs, commits, trees, blobs) covering the Git Data API calls the admin makes,
 * so the "one Save = one commit" flow and conflict handling are tested without touching a real repo.
 */
class FakeGitHub {
  blobs = new Map<string, string>();
  trees = new Map<string, Record<string, string>>(); // path → blob sha
  commits = new Map<string, { tree: string; parents: string[]; message: string }>();
  head = '';
  patchCalls = 0;
  beforePatch?: () => void;

  constructor(files: Record<string, string>) {
    const tree = this.putTree(Object.fromEntries(Object.entries(files).map(([p, c]) => [p, this.putBlob(c)])));
    this.head = this.putCommit(tree, [], 'initial');
  }
  private id = (s: string) => createHash('sha1').update(s).digest('hex');
  putBlob(c: string) {
    const sha = this.id(`blob:${c}`);
    this.blobs.set(sha, c);
    return sha;
  }
  putTree(entries: Record<string, string>) {
    const sha = this.id(`tree:${JSON.stringify(Object.entries(entries).sort())}`);
    this.trees.set(sha, entries);
    return sha;
  }
  putCommit(tree: string, parents: string[], message: string) {
    const sha = this.id(`commit:${tree}:${parents.join()}:${message}:${this.commits.size}`);
    this.commits.set(sha, { tree, parents, message });
    return sha;
  }
  /** Simulates someone else pushing directly to the branch. */
  push(changes: Record<string, string>, message = 'other push') {
    const base = this.trees.get(this.commits.get(this.head)!.tree)!;
    const next = { ...base, ...Object.fromEntries(Object.entries(changes).map(([p, c]) => [p, this.putBlob(c)])) };
    this.head = this.putCommit(this.putTree(next), [this.head], message);
  }
  fileAtHead(path: string) {
    return this.blobs.get(this.trees.get(this.commits.get(this.head)!.tree)![path])!;
  }

  fetch = async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : null;
    const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
    let m: RegExpMatchArray | null;

    if (method === 'GET' && path === '/git/ref/heads/main') return ok({ object: { sha: this.head } });
    if (method === 'GET' && (m = path.match(/^\/git\/commits\/(\w+)$/))) return ok({ tree: { sha: this.commits.get(m[1])!.tree } });
    if (method === 'GET' && (m = path.match(/^\/git\/trees\/(\w+)$/)))
      return ok({ tree: Object.entries(this.trees.get(m[1])!).map(([p, sha]) => ({ path: p, sha, type: 'blob' })) });
    if (method === 'GET' && (m = path.match(/^\/git\/blobs\/(\w+)$/)))
      return ok({ content: Buffer.from(this.blobs.get(m[1])!).toString('base64'), encoding: 'base64' });
    if (method === 'POST' && path === '/git/trees') {
      const base = { ...this.trees.get(body.base_tree)! };
      for (const e of body.tree) base[e.path] = this.putBlob(e.content);
      return ok({ sha: this.putTree(base) });
    }
    if (method === 'POST' && path === '/git/commits') {
      const sha = this.putCommit(body.tree, body.parents, body.message);
      return ok({ sha, html_url: `https://github.com/x/y/commit/${sha}` });
    }
    if (method === 'PATCH' && path === '/git/refs/heads/main') {
      this.patchCalls++;
      this.beforePatch?.();
      this.beforePatch = undefined;
      const parent = this.commits.get(body.sha)!.parents[0];
      if (!body.force && parent !== this.head) return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      this.head = body.sha;
      return ok({ object: { sha: body.sha } });
    }
    return new Response(`unhandled ${method} ${path}`, { status: 404 });
  };
}

const realFiles = () => Object.fromEntries(allPaths().map((p) => [p, readFileSync(p, 'utf8')]));

describe('GitHub content store', () => {
  let gh: FakeGitHub;

  beforeEach(() => {
    gh = new FakeGitHub({ ...realFiles(), 'src/pages/index.astro': '<h1>code</h1>' });
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.stubEnv('GITHUB_REPO', 'x/y');
    vi.stubEnv('GITHUB_BRANCH', 'main');
    vi.stubGlobal('fetch', gh.fetch);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads the content files and their blob shas from the branch head', async () => {
    const snap = await load();
    expect(snap.source).toBe('github');
    expect(snap.baseSha).toBe(gh.head);
    expect(Object.keys(snap.blobShas).sort()).toEqual(allPaths().sort());
    expect(snap.content.branches.berawa.whatsapp).toBe('+62 821-4645-2189');
  });

  it('writes only the changed file, in a single commit with the given message', async () => {
    const snap = await load();
    const before = gh.commits.size;
    snap.content.branches.berawa.hours.sun = [{ open: '07:00', close: '21:00' }];
    const res = await save(snap.content, snap.blobShas, 'admin: Berawa Sunday');
    expect(gh.commits.size).toBe(before + 1);
    expect(res.changed).toEqual([CONTENT_PATHS.branches.berawa]);
    expect(gh.commits.get(gh.head)!.message).toBe('admin: Berawa Sunday');
    expect(JSON.parse(gh.fileAtHead(CONTENT_PATHS.branches.berawa)).hours.sun[0].open).toBe('07:00');
    expect(gh.fileAtHead(CONTENT_PATHS.menus.bukit)).toBe(readFileSync(CONTENT_PATHS.menus.bukit, 'utf8'));
  });

  it('refuses to overwrite content someone else changed since loading', async () => {
    const snap = await load();
    gh.push({ [CONTENT_PATHS.branches.berawa]: readFileSync(CONTENT_PATHS.branches.berawa, 'utf8').replace('06:00', '05:30') });
    snap.content.site.announcement = { active: true, text: 'Hi', link: '' };
    await expect(save(snap.content, snap.blobShas, 'admin: x')).rejects.toBeInstanceOf(ConflictError);
  });

  it('builds on top of unrelated code pushes made after loading', async () => {
    const snap = await load();
    gh.push({ 'src/pages/index.astro': '<h1>new code</h1>' });
    snap.content.site.announcement = { active: true, text: 'Closed for Nyepi', link: '' };
    await save(snap.content, snap.blobShas, 'admin: announcement');
    expect(gh.fileAtHead('src/pages/index.astro')).toBe('<h1>new code</h1>');
    expect(JSON.parse(gh.fileAtHead(CONTENT_PATHS.site)).announcement.text).toBe('Closed for Nyepi');
  });

  it('retries once if the branch moves between reading and updating the ref', async () => {
    const snap = await load();
    gh.beforePatch = () => gh.push({ 'README.md': 'docs' });
    snap.content.site.tagline = 'New tagline';
    await save(snap.content, snap.blobShas, 'admin: tagline');
    expect(gh.patchCalls).toBe(2);
    expect(gh.fileAtHead('README.md')).toBe('docs');
    expect(JSON.parse(gh.fileAtHead(CONTENT_PATHS.site)).tagline).toBe('New tagline');
  });

  it('makes no commit when nothing changed', async () => {
    const snap = await load();
    const before = gh.commits.size;
    const res = await save(snap.content, snap.blobShas, 'admin: nothing');
    expect(res.changed).toEqual([]);
    expect(gh.commits.size).toBe(before);
  });
});
