import { describe, expect, it } from 'vitest';
import {
  CODE_PREFIX, DEFAULT_SYNC_URL, MAX_PUSH_CHARS, MSG, SYNC_URL_KEY, ago, canSync, codeGame, formatCode, friendly, loadSyncConfig, newSyncCode,
  normalizeCode, packPlayer, packSave, parseLink, pullSave, pushSave, readRemote, reconcile, unpackSave, validCode, type Fetch,
} from '../save/sync';
import { exportSave, hashPin, importSave, loadSave, newSave, parseRegistry, recordAnswer } from '../save/save';

const res = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body }) as unknown as Response;

describe('sync codes', () => {
  it('are 12 characters, start with LQ and avoid look-alike letters', () => {
    for (let i = 0; i < 50; i++) {
      const c = newSyncCode();
      expect(c).toHaveLength(12);
      expect(c.startsWith(CODE_PREFIX)).toBe(true);
      expect(validCode(c)).toBe(true);
      expect(c.slice(2)).not.toMatch(/[IO01]/);
    }
  });
  it('tidy what a kid types, and show it in groups of four', () => {
    expect(normalizeCode(' lq4k-9tq2-mhb7 ')).toBe('LQ4K9TQ2MHB7');
    expect(validCode(normalizeCode('lq4k 9tq2 mhb7'))).toBe(true);
    expect(validCode('LQ4K9TQ2MHB')).toBe(false);
    expect(validCode('LQ4K9TQ2MHB0')).toBe(false);
    expect(formatCode('LQ4K9TQ2MHB7')).toBe('LQ4K-9TQ2-MHB7');
  });
  it('tell which game a code belongs to', () => {
    expect(codeGame('LQ4K9TQ2MHB7')).toBe('logic-quest');
    expect(codeGame('EQ4K9TQ2MHB7')).toBe('engineering-quest');
    expect(codeGame('AB4K9TQ2MHB7')).toBe('other');
  });
});

describe('reconcile', () => {
  const link = { code: 'LQ4K9TQ2MHB7', rev: 3, at: 1000 };
  it('pushes when the cloud has nothing', () => { expect(reconcile(link, 1000, null)).toBe('push'); });
  it('does nothing when both sides are where we left them', () => { expect(reconcile(link, 1000, { rev: 3, savedAt: 1000, data: '' })).toBe('same'); });
  it('pushes local changes when the cloud has not moved', () => { expect(reconcile(link, 2000, { rev: 3, savedAt: 1000, data: '' })).toBe('push'); });
  it('takes the cloud copy when another device played and this one did not', () => { expect(reconcile(link, 1000, { rev: 4, savedAt: 1500, data: '' })).toBe('use-remote'); });
  it('when both changed, the later save wins', () => {
    expect(reconcile(link, 2000, { rev: 4, savedAt: 3000, data: '' })).toBe('use-remote');
    expect(reconcile(link, 4000, { rev: 4, savedAt: 3000, data: '' })).toBe('push');
  });
  it('pushes when the cloud is behind this device (a reset server)', () => { expect(reconcile(link, 1000, { rev: 1, savedAt: 900, data: '' })).toBe('push'); });
  it('a missing save on this device never beats the cloud copy', () => {
    const empty = loadSave({ getItem: () => null, setItem: () => {}, removeItem: () => {} }, 'p-gone');
    expect(empty.savedAt).toBe(0);
    expect(reconcile(link, empty.savedAt, { rev: 5, savedAt: 1200, data: '' })).toBe('use-remote');
    // Even when the cloud has not moved since this device last synced (its save failed to write, say).
    expect(reconcile(link, 0, { rev: 3, savedAt: 1000, data: '' })).toBe('use-remote');
    expect(reconcile(link, 0, { rev: 1, savedAt: 900, data: '' })).toBe('use-remote');
    // With nothing in the cloud either, this device fills it.
    expect(reconcile(link, 0, null)).toBe('push');
  });
});

describe('what travels', () => {
  const busy = () => {
    let d = newSave(1);
    for (let day = 1; day <= 28; day++) {
      for (let k = 0; k < 40; k++) d = recordAnswer(d, `2026-09-${String(day).padStart(2, '0')}`, `s${1 + (k % 7)}.skill-${k}`, k % 3 !== 0);
    }
    return d;
  };
  it('packs a busy save small and reads it back as the same player', async () => {
    const data = busy();
    const raw = exportSave({ name: 'Ada', color: '#9d6bff' }, data);
    const packed = await packPlayer({ name: 'Ada', color: '#9d6bff' }, data);
    expect(packed.startsWith('gz1:')).toBe(true);
    expect(packed.length).toBeLessThan(raw.length / 4);
    expect(packed.length).toBeLessThan(MAX_PUSH_CHARS);
    expect(await unpackSave(packed)).toBe(raw);
    const got = await readRemote(packed);
    expect('error' in got).toBe(false);
    if (!('error' in got)) {
      expect(got.name).toBe('Ada');
      expect(got.color).toBe('#9d6bff');
      expect(got.data.stats['2026-09-05']).toEqual(data.stats['2026-09-05']);
    }
  });
  it('never carries the PIN', async () => {
    const pin = hashPin('4821', 'salt12');
    const packed = await packPlayer({ name: 'Ada', color: '#9d6bff', pin } as never, newSave(1));
    const text = await unpackSave(packed);
    expect(text).not.toContain(pin);
    expect(text).not.toContain('fnv:');
  });
  it('refuses a cloud copy that unpacks far too big, without running out of memory', async () => {
    const bomb = await packSave(exportSave({ name: 'Ada', color: '#9d6bff' }, newSave(1)).replace('{', '{"pad":"' + ' '.repeat(4_000_000) + '",'));
    expect(bomb.length).toBeLessThan(MAX_PUSH_CHARS);
    expect(await readRemote(bomb)).toEqual({ error: MSG.unpackedTooBig });
  });
  it('keeps at most a little of the fields it does not know', () => {
    const junk: Record<string, string> = {};
    for (let i = 0; i < 20; i++) junk[`extra${i}`] = 'x'.repeat(199_000);
    const got = importSave(JSON.stringify({ game: 'logic-quest', player: { name: 'Ada' }, data: { ...newSave(1), ...junk } }));
    expect('error' in got).toBe(false);
    if (!('error' in got)) expect(JSON.stringify(got.data).length).toBeLessThan(250_000);
  });
  it('refuses saves from other games and plain junk', async () => {
    expect(await unpackSave('{"a":1}')).toBe('{"a":1}');
    expect(await readRemote(await packSave(JSON.stringify({ game: 'engineering-quest', data: {} })))).toEqual({ error: 'That save belongs to a different game, not Logic Quest.' });
    expect(await readRemote('{"name":"Word Raider","quest":{}}')).toHaveProperty('error');
    expect(await readRemote('not json')).toHaveProperty('error');
  });
});

describe('server calls', () => {
  it('pull: 404 means no save yet, other errors throw', async () => {
    expect(await pullSave('https://s', 'LQ4K9TQ2MHB7', (async () => res(404, { error: 'none' })) as Fetch)).toBeNull();
    expect(await pullSave('https://s', 'LQ4K9TQ2MHB7', (async () => res(200, { rev: 2, savedAt: 5, data: 'x' })) as Fetch)).toEqual({ rev: 2, savedAt: 5, data: 'x' });
    await expect(pullSave('https://s', 'LQ4K9TQ2MHB7', (async () => res(503, { error: 'Sync storage is unavailable: D1_ERROR' })) as Fetch)).rejects.toThrow(MSG.trouble);
    await expect(pullSave('https://s', 'LQ4K9TQ2MHB7', (async () => res(200, { rev: 'two' })) as Fetch)).rejects.toThrow(MSG.trouble);
  });
  it('push: sends text/plain with the base revision and reports conflicts', async () => {
    let seen: { url: string; init?: RequestInit } | null = null;
    const ok = await pushSave('https://s', 'LQ4K9TQ2MHB7', 'DATA', 2, 777, (async (url, init) => { seen = { url, init }; return res(200, { rev: 3, savedAt: 777 }); }) as Fetch);
    expect(ok).toEqual({ ok: true, rev: 3, savedAt: 777 });
    expect(seen!.url).toBe('https://s/v1/save/LQ4K9TQ2MHB7');
    expect((seen!.init!.headers as Record<string, string>)['content-type']).toBe('text/plain');
    expect(JSON.parse(seen!.init!.body as string)).toEqual({ data: 'DATA', baseRev: 2, savedAt: 777 });
    const conflict = await pushSave('https://s', 'LQ4K9TQ2MHB7', 'DATA', 2, 777, (async () => res(409, { conflict: true, rev: 5, savedAt: 900, data: 'THEIRS' })) as Fetch);
    expect(conflict).toEqual({ ok: false, conflict: { rev: 5, savedAt: 900, data: 'THEIRS' } });
    const offline = await pushSave('https://s', 'LQ4K9TQ2MHB7', 'DATA', 2, 777, (async () => { throw new TypeError('Failed to fetch'); }) as Fetch);
    expect(offline).toEqual({ ok: false, error: 'Failed to fetch' });
    // The server's own words never reach a player.
    expect(await pushSave('https://s', 'LQ4K9TQ2MHB7', 'DATA', 2, 777, (async () => res(503, { error: 'Sync storage is unavailable: D1_ERROR' })) as Fetch)).toEqual({ ok: false, error: MSG.trouble });
    expect(await pushSave('https://s', 'LQ4K9TQ2MHB7', 'DATA', 2, 777, (async () => res(413, { error: 'That save is too large.' })) as Fetch)).toEqual({ ok: false, error: MSG.tooBig });
  });
  it('turns any failure into words for a player', () => {
    expect(friendly(new TypeError('Failed to fetch'))).toBe(MSG.offline);
    expect(friendly(new TypeError('Load failed'))).toBe(MSG.offline);
    expect(friendly(new Error(MSG.tooOld))).toBe(MSG.tooOld);
    expect(friendly(new Error('D1_ERROR: no such table'))).toBe(MSG.trouble);
    expect(friendly(null)).toBe(MSG.trouble);
    expect(ago(30_000)).toBe('just now');
    expect(ago(5 * 60_000)).toBe('5 min ago');
    expect(ago(3_600_000)).toBe('1 hour ago');
    expect(ago(3 * 3_600_000)).toBe('3 hours ago');
    expect(ago(2 * 86_400_000)).toBe('2 days ago');
    expect(canSync()).toBe(true);
  });
  it('push: keepalive only for small bodies, and a save too big for the server is not sent', async () => {
    const seen: (boolean | undefined)[] = [];
    const f = (async (_u: string, init?: RequestInit) => { seen.push(init?.keepalive); return res(200, { rev: 1, savedAt: 1 }); }) as Fetch;
    await pushSave('https://s', 'LQ4K9TQ2MHB7', 'small', 0, 1, f, true);
    await pushSave('https://s', 'LQ4K9TQ2MHB7', 'x'.repeat(70_000), 0, 1, f, true);
    expect(seen).toEqual([true, false]);
    const big = await pushSave('https://s', 'LQ4K9TQ2MHB7', 'x'.repeat(MAX_PUSH_CHARS + 1), 0, 1, f);
    expect(big).toMatchObject({ ok: false });
    expect(seen).toHaveLength(2);
  });
  it('config: localStorage, then sync.json next to the game, then the shared default; "off" switches sync off', async () => {
    const store = (v: string | null) => ({ getItem: () => v });
    let asked = '';
    const json = (body: unknown) => (async (url: string) => { asked = url; return res(200, body); }) as Fetch;
    expect(await loadSyncConfig((async () => res(404, {})) as Fetch, store('https://mine.example/'))).toEqual({ url: 'https://mine.example' });
    expect(await loadSyncConfig(json({ url: 'https://json.example' }), store(null), '/logic-quest/')).toEqual({ url: 'https://json.example' });
    expect(asked.startsWith('/logic-quest/sync.json')).toBe(true);
    expect(await loadSyncConfig(json({ url: 'off' }), store(null))).toBeNull();
    expect(await loadSyncConfig((async () => { throw new Error('offline'); }) as Fetch, store(null))).toEqual({ url: DEFAULT_SYNC_URL });
    expect(await loadSyncConfig((async () => res(404, {})) as Fetch, store('off'))).toBeNull();
    expect(await loadSyncConfig((async () => res(404, {})) as Fetch, { getItem: () => { throw new Error('blocked'); } })).toEqual({ url: DEFAULT_SYNC_URL });
    expect(SYNC_URL_KEY).toBe('logic-quest.sync.url');
  });
});

describe('links in the player list', () => {
  it('keeps a valid link and drops a broken one', () => {
    const reg = parseRegistry({
      players: [
        { id: 'p1', name: 'Ada', color: '#9d6bff', createdAt: 1, lastPlayed: 2, sync: { code: 'LQ4K9TQ2MHB7', rev: 4, at: 99 } },
        { id: 'p2', name: 'Max', color: '#3cff9d', createdAt: 1, lastPlayed: 2, sync: { code: 'lq-nope', rev: 1, at: 1 } },
        { id: 'p3', name: 'Zed', color: '#ff7a1a', createdAt: 1, lastPlayed: 2 },
      ],
    });
    expect(reg.players[0].sync).toEqual({ code: 'LQ4K9TQ2MHB7', rev: 4, at: 99 });
    expect(reg.players[1]).not.toHaveProperty('sync');
    expect(reg.players[2]).not.toHaveProperty('sync');
  });
  it('mends a bad revision or time instead of failing', () => {
    expect(parseLink({ code: 'LQ4K9TQ2MHB7', rev: -2, at: 'soon' })).toEqual({ code: 'LQ4K9TQ2MHB7', rev: 0, at: 0 });
    expect(parseLink(null)).toBeUndefined();
    expect(parseLink({ code: 'LQ4K9TQ2MHB7X' })).toBeUndefined();
  });
});
