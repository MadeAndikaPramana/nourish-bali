import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

describe('CREDITS.md', () => {
  it('lists every photo shipped in src/assets/photos', () => {
    const credits = readFileSync('CREDITS.md', 'utf8');
    const files = readdirSync('src/assets/photos').filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(credits, `${f} missing from CREDITS.md`).toContain(`\`${f}\``);
  });
});
