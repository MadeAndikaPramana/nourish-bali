import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ContentBundle } from '@/lib/schema';
import { describeChanges, commitMessage } from '@/lib/diff';
import {
  adminConfigured,
  checkPassword,
  clearSession,
  hasSession,
  issueSession,
  loginLocked,
  recordFailure,
  recordSuccess,
  sameOrigin,
} from '@/lib/server/auth';
import { ConflictError, NotConfiguredError, contentAt, deployStatus, history, load, save, storeInfo } from '@/lib/server/store';

/** The only server-rendered route: everything else on the site is static. */
export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });

const SaveBody = z.object({
  content: ContentBundle,
  blobShas: z.record(z.string(), z.string()),
  /** Snapshot the editor started from, to describe the change in the commit message. */
  original: ContentBundle,
});

export const ALL: APIRoute = async ({ params, request, cookies, clientAddress, url }) => {
  const action = params.action;
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Bad origin' }, 403);

  try {
    if (action === 'session' && request.method === 'GET') {
      return json({ authenticated: hasSession(cookies), configured: adminConfigured(), store: storeInfo() });
    }

    if (action === 'login' && request.method === 'POST') {
      if (!adminConfigured()) return json({ error: 'ADMIN_PASSWORD is not set on the server.' }, 503);
      const ip = clientAddress ?? 'unknown';
      const wait = loginLocked(ip);
      if (wait) return json({ error: `Too many attempts. Try again in ${wait}s.` }, 429);
      const { password } = z.object({ password: z.string().max(200) }).parse(await request.json());
      if (!checkPassword(password)) {
        recordFailure(ip);
        await new Promise((r) => setTimeout(r, 500));
        return json({ error: 'Wrong password.' }, 401);
      }
      recordSuccess(ip);
      issueSession(cookies, url.protocol === 'https:');
      return json({ ok: true });
    }

    if (action === 'logout' && request.method === 'POST') {
      clearSession(cookies);
      return json({ ok: true });
    }

    // Everything below needs a session.
    if (!hasSession(cookies)) return json({ error: 'Please log in again.' }, 401);

    if (action === 'content' && request.method === 'GET') {
      return json(await load());
    }

    if (action === 'save' && request.method === 'POST') {
      const body = SaveBody.parse(await request.json());
      const changes = describeChanges(body.original, body.content);
      const result = await save(body.content, body.blobShas, commitMessage(changes));
      return json({ ...result, changes });
    }

    if (action === 'history' && request.method === 'GET') {
      return json({ entries: await history() });
    }

    if (action === 'version' && request.method === 'GET') {
      const sha = z.string().regex(/^[0-9a-f]{40}$/).parse(url.searchParams.get('sha'));
      return json({ content: await contentAt(sha) });
    }

    if (action === 'status' && request.method === 'GET') {
      const sha = z.string().min(1).max(64).parse(url.searchParams.get('sha'));
      return json(await deployStatus(sha));
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof ConflictError) return json({ error: err.message, conflict: true }, 409);
    if (err instanceof NotConfiguredError) return json({ error: err.message }, 503);
    if (err instanceof z.ZodError) return json({ error: 'Some fields are invalid.', issues: err.issues.slice(0, 20) }, 422);
    console.error('[admin]', err);
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500);
  }
};
