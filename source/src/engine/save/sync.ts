/**
 * Cloud sync for players, the scheme Engineering Quest and Word Raiders use. A player that is "linked" carries a
 * secret 12-character sync code; the same code entered on another device brings the same player and progress.
 * The server keeps one save per code with a revision counter, so two devices never overwrite each other silently:
 * a device with an older copy is handed the newer save instead.
 *
 * All the family games share one sync service (a tiny Cloudflare Worker with a database, see
 * wordraiders/sync/worker.mjs). The address comes from localStorage "logic-quest.sync.url" (self-hosting, tests),
 * then sync.json next to the game, then the built-in default. The value "off" in either place hides sync.
 *
 * What travels is the player's export file (name, colour and save; never the PIN), gzipped and base64-encoded
 * ("gz1:" prefix) whenever the browser can compress, to stay well under the server's 400 KB cap.
 */
import { exportSave, importSave, type Player, type SaveData } from './save';
import { CODE_ALPHABET, CODE_LENGTH, type SyncLink } from './syncLink';

export { CODE_ALPHABET, CODE_LENGTH, parseLink, validCode, type SyncLink } from './syncLink';

/** Logic Quest codes start with LQ, so a code tells you which game it belongs to. */
export const CODE_PREFIX = 'LQ';
export const SYNC_URL_KEY = 'logic-quest.sync.url';
export const DEFAULT_SYNC_URL = 'https://wordraiders-sync.wordraiders.workers.dev';
/** Push at most this often while playing; pull when the app comes back after this long. */
export const PUSH_DELAY_MS = 15_000;
export const PULL_GAP_MS = 20_000;
/** The server refuses bodies over 400 KB; leave room for the envelope. */
export const MAX_PUSH_CHARS = 390 * 1024;
/** A cloud copy that unpacks to more than this is refused: far above a real save, far below what crashes a phone. */
export const MAX_UNPACKED_BYTES = 3_000_000;

/** What a player sees when sync cannot do its job. Plain words, never the server's own text. */
export const MSG = {
  offline: 'Offline: progress will sync when you are back online.',
  trouble: 'The cloud is not working right now. Progress will sync later.',
  tooBig: 'This save is too big to sync. Download a copy in Settings instead.',
  tooOld: 'This browser is too old to sync. Use a save file in Settings instead.',
  unpackedTooBig: 'That cloud save is too big to load.',
} as const;

export interface RemoteSave { rev: number; savedAt: number; data: string }
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export function newSyncCode(random: () => number = Math.random): string {
  let c = CODE_PREFIX;
  while (c.length < CODE_LENGTH) c += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return c;
}
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, CODE_LENGTH);
export const formatCode = (c: string) => (c.length === CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}` : c);
export const validSyncUrl = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\/[^\s]+$/.test(u) && u.length < 300;

/** The sync server address. Never throws; null only when sync has been switched off by config. */
export async function loadSyncConfig(fetchFn: Fetch, storage?: Pick<Storage, 'getItem'>, base = './'): Promise<{ url: string } | null> {
  try {
    const o = storage?.getItem(SYNC_URL_KEY);
    if (o === 'off') return null;
    if (validSyncUrl(o)) return { url: o.replace(/\/$/, '') };
  } catch { /* storage may be blocked */ }
  try {
    const res = await fetchFn(`${base}sync.json?_=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const x = (await res.json()) as { url?: unknown };
      if (validSyncUrl(x?.url)) return { url: x.url.replace(/\/$/, '') };
      if (x?.url === 'off') return null;
    }
  } catch { /* no sync.json: use the default */ }
  return { url: DEFAULT_SYNC_URL };
}

/* ---------- compression: gzip + base64 when the browser has CompressionStream ---------- */
const GZ = 'gz1:';
type Stream = { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };
declare const CompressionStream: { new (format: string): Stream } | undefined;
declare const DecompressionStream: { new (format: string): Stream } | undefined;

async function pipe(bytes: Uint8Array, stream: Stream, max = Infinity): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  void w.write(bytes).catch(() => undefined);
  void w.close().catch(() => undefined);
  const chunks: Uint8Array[] = [];
  const r = stream.readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > max) { void r.cancel().catch(() => undefined); throw new Error(MSG.unpackedTooBig); }
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
const toB64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

/** Shrink a save for the wire. Plain text when compression is unavailable. */
export async function packSave(raw: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return raw;
  try { return GZ + toB64(await pipe(new TextEncoder().encode(raw), new CompressionStream('gzip'))); } catch { return raw; }
}
/** Undo packSave. Throws when the text is compressed and this browser cannot decompress, or when it unpacks too big. */
export async function unpackSave(text: string): Promise<string> {
  if (!text.startsWith(GZ)) {
    if (text.length > MAX_UNPACKED_BYTES) throw new Error(MSG.unpackedTooBig);
    return text;
  }
  if (typeof DecompressionStream === 'undefined') throw new Error(MSG.tooOld);
  return new TextDecoder().decode(await pipe(fromB64(text.slice(GZ.length)), new DecompressionStream('gzip'), MAX_UNPACKED_BYTES));
}

/** Can this browser read what other devices send? (Safari before 16.4 cannot unzip.) Such a browser must not sync. */
export const canSync = () => typeof DecompressionStream !== 'undefined';

/* ---------- what travels: the player's export file ---------- */

/** The cloud copy of a player: the same text as an export file (name, colour, save), packed. Never the PIN. */
export async function packPlayer(player: Pick<Player, 'name' | 'color'>, data: SaveData): Promise<string> {
  return packSave(exportSave(player, data));
}

/** Read a cloud copy back. An error message when it is not a Logic Quest player. */
export async function readRemote(data: string): Promise<{ name: string; color: string; data: SaveData } | { error: string }> {
  let raw: string;
  try { raw = await unpackSave(data); } catch (e) { return { error: e instanceof Error ? e.message : 'That save could not be read.' }; }
  return importSave(raw);
}

/** Which game a code belongs to, by its first two letters, for a kinder message when it is the wrong one. */
export function codeGame(code: string): 'logic-quest' | 'engineering-quest' | 'other' {
  return code.startsWith('LQ') ? 'logic-quest' : code.startsWith('EQ') ? 'engineering-quest' : 'other';
}

/* ---------- server calls ---------- */
/** The cloud copy for a code, or null when there is none. Throws MSG.trouble when the server misbehaves. */
export async function pullSave(url: string, code: string, fetchFn: Fetch): Promise<RemoteSave | null> {
  const res = await fetchFn(`${url}/v1/save/${code}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(MSG.trouble);
  const x = (await res.json().catch(() => null)) as { rev?: unknown; savedAt?: unknown; data?: unknown } | null;
  if (!x || !Number.isInteger(x.rev) || typeof x.data !== 'string') throw new Error(MSG.trouble);
  return { rev: x.rev as number, savedAt: Number(x.savedAt) || 0, data: x.data };
}

export type PushResult = { ok: true; rev: number; savedAt: number } | { ok: false; conflict: RemoteSave } | { ok: false; error: string };
export async function pushSave(url: string, code: string, data: string, baseRev: number, savedAt: number, fetchFn: Fetch, keepalive = false): Promise<PushResult> {
  try {
    if (data.length > MAX_PUSH_CHARS) return { ok: false, error: MSG.tooBig };
    const body = JSON.stringify({ data, baseRev, savedAt });
    // text/plain keeps the browser from sending a CORS preflight before every push. Browsers cap keepalive bodies at 64 KB.
    const res = await fetchFn(`${url}/v1/save/${code}`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: keepalive && body.length < 60_000 });
    const x = (await res.json().catch(() => null)) as { conflict?: unknown; rev?: unknown; savedAt?: unknown; data?: unknown; error?: unknown } | null;
    if (res.status === 409 && x?.conflict) return { ok: false, conflict: { rev: Number(x.rev) || 0, savedAt: Number(x.savedAt) || 0, data: typeof x.data === 'string' ? x.data : '' } };
    if (!res.ok) return { ok: false, error: res.status === 413 ? MSG.tooBig : MSG.trouble };
    return { ok: true, rev: Number(x?.rev) || baseRev + 1, savedAt: Number(x?.savedAt) || savedAt };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'No connection.' }; }
}

/** A message from a failed sync step, in the words a player sees. */
export function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (isOffline(m)) return MSG.offline;
  return (Object.values(MSG) as string[]).includes(m) ? m : MSG.trouble;
}

/**
 * What to do after looking at the cloud copy. `localSavedAt` is when play last changed this device's copy (the time
 * stamped on its save file), or 0 when nothing is saved here.
 *
 *  - use-remote: the cloud moved on since this device last synced and it is the newer save;
 *  - push: this device has changes the cloud does not (its base revision is still current, or its copy is newer);
 *  - same: nothing to do.
 */
export function reconcile(link: SyncLink, localSavedAt: number, remote: RemoteSave | null): 'use-remote' | 'push' | 'same' {
  if (!remote) return 'push';
  // Nothing saved on this device (a missing or damaged save loads dated 0): the cloud copy always wins.
  if (localSavedAt === 0) return 'use-remote';
  const localChanged = localSavedAt > link.at;
  if (remote.rev === link.rev) return localChanged ? 'push' : 'same';
  if (remote.rev < link.rev) return 'push';
  if (!localChanged) return 'use-remote';
  return remote.savedAt >= localSavedAt ? 'use-remote' : 'push';
}

/** True for messages that mean the network is down rather than the server saying no. */
export const isOffline = (message: string) => /connection|fetch|network|load failed/i.test(message);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'} ago`;
export const ago = (ms: number) =>
  ms < 60_000 ? 'just now' : ms < 3_600_000 ? `${Math.round(ms / 60_000)} min ago` : ms < 86_400_000 ? plural(Math.round(ms / 3_600_000), 'hour') : plural(Math.round(ms / 86_400_000), 'day');
