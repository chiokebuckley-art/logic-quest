import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';

/** Stamps the build (version + time) into the bundle and emits version.json for update checks. */
export function buildInfo(): { define: Record<string, string>; plugin: Plugin } {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  const info = { version: pkg.version, builtAt: new Date().toISOString() };
  return {
    define: { __LQ_BUILD__: JSON.stringify(info) },
    plugin: {
      name: 'lq-version-json',
      generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(info) }); },
    },
  };
}
