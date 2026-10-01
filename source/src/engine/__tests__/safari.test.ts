/**
 * Older Safari (before 16.4) cannot parse regex lookbehind, and one such regex anywhere in the bundle stops the
 * whole game from loading. Only test files and the test-only reading checker may use it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..');

function appFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : appFiles(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== 'readability.ts' ? [p] : [];
  });
}

describe('code that ships to the browser', () => {
  it('uses no regex lookbehind', () => {
    const files = appFiles(SRC);
    expect(files.length).toBeGreaterThan(40);
    const bad = files.filter((f) => /\(\?<[=!]/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(SRC.length + 1));
    expect(bad).toEqual([]);
  });
});
