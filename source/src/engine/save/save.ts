import { freshBridge, parseBridge, type BridgeProgress } from '../../game/pattern/bridges';
/**
 * Players and saves, kept in the browser's localStorage (the WORDRAIDERS model): a registry of named
 * players, each with an optional 4-digit PIN, and one save per player. Every save carries
 * game: 'logic-quest' so a save from another family game is refused on import (and later on sync).
 */
import type { StopProgress } from '../journey/mastery';
import type { Notebook } from '../notebook';

export const REGISTRY_KEY = 'logic-quest.players.v1';
export const saveKeyFor = (id: string) => `logic-quest.save.${id}`;
export const MAX_PLAYERS = 8;
export const COLORS = ['#a78bfa', '#2dd4bf', '#ffb347', '#22d3ee', '#f472b6', '#c9a227'] as const;
export const SAVE_VERSION = 1;

export interface Player {
  id: string;
  name: string;
  color: string;
  /** Salted hash of a 4-digit PIN. A deterrent between siblings, not security. */
  pin?: string;
  createdAt: number;
  lastPlayed: number;
}

export interface Registry {
  players: Player[];
  active?: string;
}

export interface Settings {
  /** 90-second calm timer on check questions. Grown-ups can turn it off. */
  timer: boolean;
  readAloud: boolean;
  reduceMotion: boolean;
}

/** answered, right on the first try */
export type Tally = [number, number];

export interface SaveData {
  patternBridge: BridgeProgress;
  game: 'logic-quest';
  v: number;
  savedAt: number;
  stops: Record<string, StopProgress>;
  /** day -> skill -> tally, for Progress and the CSV. */
  stats: Record<string, Record<string, Tally>>;
  /** day -> seconds of active play. */
  active: Record<string, number>;
  settings: Settings;
  /** The Wrong-Answer Notebook: skill -> card (see engine/notebook.ts). */
  notebook: Notebook;
  /** Notebook cards cleared by three clean fixes, all time. */
  fixedCount: number;
}

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: Settings = { timer: true, readAloud: true, reduceMotion: false };

export function newSave(now = Date.now()): SaveData {
  return { patternBridge: freshBridge(), game: 'logic-quest', v: SAVE_VERSION, savedAt: now, stops: {}, stats: {}, active: {}, settings: { ...DEFAULT_SETTINGS }, notebook: {}, fixedCount: 0 };
}

/** Skill tags look like 's2.or-both'. Anything else in an imported save is dropped (it would also break the CSV). */
const SKILL_RE = /^s\d{1,2}\.[a-z0-9._-]{1,60}$/i;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Top-level save fields this version reads. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.keys(newSave(0)));
/** Up to this many other top-level fields are kept, each at most this long as JSON. */
const MAX_EXTRA_KEYS = 20;
const MAX_EXTRA_JSON = 200_000;
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const strs = (x: unknown, max = 64): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, max) : []);
const num = (x: unknown, min = 0, max = 1e9) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.floor(x))) : min);

function parseProgress(x: unknown): StopProgress | null {
  if (!isObj(x)) return null;
  const p: StopProgress = { lessonsDone: strs(x.lessonsDone), attempts: num(x.attempts, 0, 1e6) };
  if (isDay(x.passDay)) p.passDay = x.passDay;
  if (isDay(x.lockDay)) p.lockDay = x.lockDay;
  if (isDay(x.weekDay)) p.weekDay = x.weekDay;
  const ny = x.notYet;
  if (isObj(ny) && (ny.kind === 'pass' || ny.kind === 'lockin' || ny.kind === 'week') && isDay(ny.day)) {
    p.notYet = { kind: ny.kind, day: ny.day, missed: strs(ny.missed), redone: strs(ny.redone) };
  }
  const oc = x.openCheck;
  if (isObj(oc) && (oc.kind === 'pass' || oc.kind === 'lockin' || oc.kind === 'week') && isDay(oc.day) && Array.isArray(oc.answered)) {
    p.openCheck = {
      kind: oc.kind,
      day: oc.day,
      answered: oc.answered
        .filter((r): r is { lesson: string; correct: boolean } => isObj(r) && typeof r.lesson === 'string' && typeof r.correct === 'boolean')
        .slice(0, 20)
        .map((r) => ({ lesson: r.lesson.slice(0, 40), correct: r.correct })),
    };
  }
  if (isObj(x.notYetsByDay)) {
    const out: Record<string, number> = {};
    for (const [d, n] of Object.entries(x.notYetsByDay)) if (isDay(d)) out[d] = num(n, 0, 100);
    p.notYetsByDay = out;
  }
  return p;
}

/** Whitelist and clamp every field. Returns null for anything that is not a Logic Quest save. */
export function parseSave(raw: unknown): SaveData | null {
  if (!isObj(raw) || raw.game !== 'logic-quest') return null;
  const s = newSave(num(raw.savedAt, 0, 8.64e15));
  if (isObj(raw.stops)) {
    for (const [id, v] of Object.entries(raw.stops)) {
      const p = /^s\d{1,2}$/.test(id) ? parseProgress(v) : null;
      if (p) s.stops[id] = p;
    }
  }
  if (isObj(raw.stats)) {
    for (const [day, skills] of Object.entries(raw.stats)) {
      if (!isDay(day) || !isObj(skills)) continue;
      const row: Record<string, Tally> = {};
      for (const [skill, t] of Object.entries(skills)) {
        if (Array.isArray(t) && t.length === 2 && SKILL_RE.test(skill)) row[skill] = [num(t[0]), Math.min(num(t[1]), num(t[0]))];
      }
      s.stats[day] = row;
    }
  }
  if (isObj(raw.active)) for (const [day, sec] of Object.entries(raw.active)) if (isDay(day)) s.active[day] = num(sec, 0, 86400);
  if (isObj(raw.notebook)) {
    for (const [skill, c] of Object.entries(raw.notebook).slice(0, 500)) {
      if (!SKILL_RE.test(skill) || !isObj(c) || !isDay(c.missed) || !isDay(c.due) || typeof c.lesson !== 'string' || !/^s\d{1,2}\.l\d{1,2}$/.test(c.lesson)) continue;
      s.notebook[skill] = { skill, stop: num(c.stop, 1, 99), lesson: c.lesson, missed: c.missed, fixes: num(c.fixes, 0, 2), due: c.due };
    }
  }
  s.patternBridge = parseBridge(raw.patternBridge);
  s.fixedCount = num(raw.fixedCount, 0, 1e6);
  if (isObj(raw.settings)) {
    const st = raw.settings;
    s.settings = {
      timer: typeof st.timer === 'boolean' ? st.timer : DEFAULT_SETTINGS.timer,
      readAloud: typeof st.readAloud === 'boolean' ? st.readAloud : DEFAULT_SETTINGS.readAloud,
      reduceMotion: typeof st.reduceMotion === 'boolean' ? st.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    };
  }
  // Fields from a newer version are carried through untouched, so an older tab that saves does not wipe them.
  const extra = s as unknown as Record<string, unknown>;
  let kept = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (KNOWN_KEYS.has(key) || key in Object.prototype || kept >= MAX_EXTRA_KEYS || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) continue;
    let json: string | undefined;
    try { json = JSON.stringify(value); } catch { continue; }
    if (json === undefined || json.length > MAX_EXTRA_JSON) continue;
    extra[key] = JSON.parse(json) as unknown;
    kept++;
  }
  return s;
}

export function parseRegistry(raw: unknown): Registry {
  if (!isObj(raw) || !Array.isArray(raw.players)) return { players: [] };
  const players: Player[] = [];
  for (const p of raw.players.slice(0, MAX_PLAYERS)) {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string') continue;
    players.push({
      id: p.id.slice(0, 40),
      name: p.name.trim().slice(0, 24) || 'Player',
      color: typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : COLORS[0],
      pin: typeof p.pin === 'string' && p.pin.startsWith('fnv:') ? p.pin : undefined,
      createdAt: num(p.createdAt, 0, 8.64e15),
      lastPlayed: num(p.lastPlayed, 0, 8.64e15),
    });
  }
  const active = typeof raw.active === 'string' && players.some((p) => p.id === raw.active) ? raw.active : undefined;
  return { players, active };
}

const readJson = (kv: KV, key: string): unknown => {
  try { const t = kv.getItem(key); return t ? JSON.parse(t) : null; } catch { return null; }
};

export function loadRegistry(kv: KV): Registry { return parseRegistry(readJson(kv, REGISTRY_KEY)); }
export function saveRegistry(kv: KV, reg: Registry): void { kv.setItem(REGISTRY_KEY, JSON.stringify(reg)); }
export function loadSave(kv: KV, id: string): SaveData { return parseSave(readJson(kv, saveKeyFor(id))) ?? newSave(); }
export function writeSave(kv: KV, id: string, data: SaveData, now = Date.now()): void {
  kv.setItem(saveKeyFor(id), JSON.stringify({ ...data, savedAt: now }));
}

export function newPlayerId(now = Date.now(), rand = Math.random()): string {
  return `p-${now.toString(36)}${Math.floor(rand * 1e6).toString(36)}`;
}

export function addPlayer(reg: Registry, name: string, color: string, now = Date.now(), rand = Math.random()): { reg: Registry; player: Player } {
  const player: Player = { id: newPlayerId(now, rand), name: name.trim().slice(0, 24) || 'Player', color, createdAt: now, lastPlayed: now };
  return { reg: { players: [...reg.players, player].slice(0, MAX_PLAYERS), active: player.id }, player };
}

export function removePlayer(kv: KV, reg: Registry, id: string): Registry {
  kv.removeItem(saveKeyFor(id));
  const players = reg.players.filter((p) => p.id !== id);
  return { players, active: reg.active === id ? undefined : reg.active };
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h >>> 0).toString(36);
}

export const isPin = (pin: string) => /^\d{4}$/.test(pin);
export function hashPin(pin: string, salt: string): string { return `fnv:${salt}:${fnv(`${salt}|${pin}|logic-quest`)}`; }
export function checkPin(player: Player, pin: string): boolean {
  if (!player.pin) return true;
  const salt = player.pin.split(':')[1] ?? '';
  return hashPin(pin, salt) === player.pin;
}

/** Count one answer: `firstTry` is true when the first attempt at this item was right. */
export function recordAnswer(data: SaveData, day: string, skill: string, firstTry: boolean): SaveData {
  const row = { ...(data.stats[day] ?? {}) };
  const [a, f] = row[skill] ?? [0, 0];
  row[skill] = [a + 1, f + (firstTry ? 1 : 0)];
  return { ...data, stats: { ...data.stats, [day]: row } };
}

export function addActive(data: SaveData, day: string, seconds: number): SaveData {
  return { ...data, active: { ...data.active, [day]: Math.min(86400, (data.active[day] ?? 0) + seconds) } };
}

/** Portable file: one player's name and colour with their save. */
export function exportSave(player: Pick<Player, 'name' | 'color'>, data: SaveData): string {
  return JSON.stringify({ game: 'logic-quest', kind: 'player-export', v: SAVE_VERSION, player: { name: player.name, color: player.color }, data }, null, 1);
}

export function importSave(text: string): { name: string; color: string; data: SaveData } | { error: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { error: 'That file is not a save file.' }; }
  if (!isObj(raw) || raw.game !== 'logic-quest') return { error: 'That save belongs to a different game, not Logic Quest.' };
  const data = parseSave(raw.data);
  if (!data) return { error: 'That save file is damaged.' };
  const pl = isObj(raw.player) ? raw.player : {};
  const name = typeof pl.name === 'string' && pl.name.trim() ? pl.name.trim().slice(0, 24) : 'Player';
  const color = typeof pl.color === 'string' && /^#[0-9a-f]{6}$/i.test(pl.color) ? pl.color : COLORS[0];
  return { name, color, data };
}

/** One CSV field: quoted when needed, and never read as a spreadsheet formula. */
function csvField(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** date,skill,answered,first_try_right — one row per day and skill, oldest first. */
export function statsCsv(data: SaveData): string {
  const rows = ['date,skill,answered,first_try_right'];
  for (const day of Object.keys(data.stats).sort()) {
    for (const [skill, [a, f]] of Object.entries(data.stats[day]).sort()) rows.push([day, skill, a, f].map(csvField).join(','));
  }
  return rows.join('\n') + '\n';
}

