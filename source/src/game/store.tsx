import { completeBridge, type AgePath } from './pattern/bridges';
/**
 * The app store: the player registry, the active player's save, and which screen is showing.
 * React context + useReducer. The reducer is pure; action helpers compute anything that needs the
 * clock or randomness (days, PIN salts, new ids) and do the localStorage side effects.
 * The save is written 250 ms after the last change, and at once when the page is hidden.
 * Cloud sync (engine/save/sync.ts): a linked player pulls when the app opens, when the player is picked and when
 * the app comes back to the front, and pushes a little after each change. The later save wins: "later" is when play
 * last changed a copy, which is also the time stamped on its save file. Changes the game makes by itself (settling a
 * check left open, counting active time) are saved but are not news for sync.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import * as mastery from '../engine/journey/mastery';
import type { CheckKind, CheckOutcome } from '../engine/journey/mastery';
import * as saves from '../engine/save/save';
import * as notebook from '../engine/notebook';
import type { KV, Player, Registry, SaveData, Settings } from '../engine/save/save';
import * as sync from '../engine/save/sync';
import type { Fetch, RemoteSave, SyncLink } from '../engine/save/sync';
import type { Item } from '../engine/types';
import { stopById } from '../content/stops';
import type { AnswerRecord } from './components/contracts';

// ---------- routes ----------

/** Where a lesson was opened from, so finishing or leaving it goes back there. */
export type LessonFrom = 'journey' | 'learn' | 'check' | 'stop' | 'library' | 'home';

/** The Library's kind filter. */
export type LibraryKind = 'all' | 'ideas' | 'real' | 'practice' | 'lab' | 'soon';

export type Route =
  | { name: 'players'; mode?: 'list' | 'new' | 'import' | 'link'; pinFor?: string }
  | { name: 'pattern'; workshop?: boolean; event?: string }
  | { name: 'home' }
  | { name: 'journey'; track?: 'main' | 'side' }
  /** One page per stop: lessons, checks, practice, Pattern Lab events and repair cards. */
  | { name: 'stop'; stopId: string }
  /** `stop`: open that stop's section (the Real life view). */
  | { name: 'library'; kind?: LibraryKind; stop?: string }
  | { name: 'me' }
  | { name: 'grownups' }
  | { name: 'search'; q?: string }
  /** Old address: now the Library's Ideas view. */
  | { name: 'learn' }
  | { name: 'lesson'; stopId: string; lessonId: string; from: LessonFrom }
  | { name: 'check'; stopId: string; kind: CheckKind; result?: boolean }
  | { name: 'arcade'; practice?: string }
  | { name: 'progress' }
  /** The Wrong-Answer Notebook. `fix`: fixing the ready cards (the tab bar hides, like practice). */
  | { name: 'notebook'; fix?: boolean }
  /** `section: 'sync'` scrolls to Sync across devices. */
  | { name: 'settings'; section?: 'sync' };

export type Tab = 'home' | 'journey' | 'arcade' | 'library' | 'me';

/** The last finished check, kept for this session so "Learn this again" can come back to the result. */
export interface LastCheck {
  stopId: string;
  kind: CheckKind;
  items: Item[];
  records: AnswerRecord[];
  passed: boolean;
  missed: string[];
}

export interface State {
  registry: Registry;
  /** The unlocked player, or null while nobody is playing. */
  playerId: string | null;
  save: SaveData | null;
  route: Route;
  /** Goes up on every navigation. Screens are keyed by it, so each visit starts fresh. */
  routeSeq: number;
  lastCheck: LastCheck | null;
}

type Action =
  | { type: 'registry'; registry: Registry }
  | { type: 'login'; registry: Registry; playerId: string; save: SaveData; route: Route }
  | { type: 'logout'; registry: Registry; route: Route }
  | { type: 'save'; fn: (s: SaveData) => SaveData }
  | { type: 'replaceSave'; save: SaveData }
  | { type: 'navigate'; route: Route }
  | { type: 'lastCheck'; lastCheck: LastCheck | null };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'registry':
      return { ...s, registry: a.registry };
    case 'login':
      return { ...s, registry: a.registry, playerId: a.playerId, save: a.save, route: a.route, routeSeq: s.routeSeq + 1, lastCheck: null };
    case 'logout':
      return { ...s, registry: a.registry, playerId: null, save: null, route: a.route, routeSeq: s.routeSeq + 1, lastCheck: null };
    case 'save':
      return s.save ? { ...s, save: a.fn(s.save) } : s;
    case 'replaceSave':
      return s.save ? { ...s, save: a.save } : s;
    case 'navigate':
      return { ...s, route: a.route, routeSeq: s.routeSeq + 1 };
    case 'lastCheck':
      return { ...s, lastCheck: a.lastCheck };
  }
}

// ---------- storage ----------

/** window.localStorage behind the KV interface. Private modes can throw; every call is guarded. */
export function browserKV(): KV {
  const ls = (): Storage | null => {
    try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
  };
  return {
    getItem: (k) => { try { return ls()?.getItem(k) ?? null; } catch { return null; } },
    setItem: (k, v) => { try { ls()?.setItem(k, v); } catch { /* storage full or blocked */ } },
    removeItem: (k) => { try { ls()?.removeItem(k); } catch { /* blocked */ } },
  };
}

function playersRoute(reg: Registry, pinFor?: string): Route {
  return { name: 'players', mode: reg.players.length ? 'list' : 'new', pinFor };
}

/**
 * Saves the game changed by itself, not by play: settling a check left open, and counting active time. They are
 * written, but under the time of the last real change, and they start no push.
 */
const quietSaves = new WeakSet<SaveData>();

/** A check left open by a reload or a closed app counts as leaving it (see mastery.settleOpenCheck). */
function settleOpenChecks(save: SaveData): SaveData {
  let stops: SaveData['stops'] | null = null;
  for (const [id, p] of Object.entries(save.stops)) {
    const stop = stopById(id);
    if (!p.openCheck || !stop) continue;
    stops ??= { ...save.stops };
    stops[id] = mastery.settleOpenCheck(stop, p, mastery.journeyDay(Date.now()));
  }
  if (!stops) return save;
  const out = { ...save, stops };
  quietSaves.add(out);
  return out;
}

/** The save to treat as unchanged after a load: null when settling an open check changed it, so it is written. */
const baselineFor = (save: SaveData | null) => (save && !quietSaves.has(save) ? save : null);

function initState(kv: KV): State {
  const registry = saves.loadRegistry(kv);
  const last = registry.players.find((p) => p.id === registry.active);
  if (last && !last.pin) {
    return { registry, playerId: last.id, save: settleOpenChecks(saves.loadSave(kv, last.id)), route: { name: 'home' }, routeSeq: 0, lastCheck: null };
  }
  return { registry, playerId: null, save: null, route: playersRoute(registry, last?.pin ? last.id : undefined), routeSeq: 0, lastCheck: null };
}

/** The current Journey day (rolls over at 3 am). */
export const todayNow = () => mastery.journeyDay(Date.now());

const newSalt = () => Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0');

/** Add " 2", " 3" … when the name is taken, so two players never look the same. */
function uniqueName(players: readonly Player[], name: string): string {
  const base = name.trim().slice(0, 24) || 'Player';
  const taken = new Set(players.map((p) => p.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const n = `${base.slice(0, 21)} ${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
  return base;
}

// ---------- context ----------

/** How a push ended: the cloud has this copy, this device took the cloud's later copy instead, or it did not work. */
type PushOutcome = 'pushed' | 'took' | 'failed';
/** How a pull ended: the same as a push, or nothing to do. */
type PullOutcome = PushOutcome | 'same';
/** A player's save and the time play last changed it, captured when a push is asked for. */
interface Snapshot { save: SaveData; changedAt: number }

export interface Actions {
  navigate(route: Route): void;
  /** Make a player and start playing as them. Returns an error message, or null. */
  createPlayer(name: string, color: string, pin?: string): string | null;
  /** Start playing as a player. Check the PIN first. */
  selectPlayer(id: string): void;
  renamePlayer(id: string, name: string): void;
  removePlayer(id: string): void;
  setPin(id: string, pin: string): boolean;
  removePin(id: string): void;
  /**
   * Mark a lesson done. A lesson with guided boards is done only after markDrilled for it: opening or reading the
   * cards never passes a lesson.
   */
  completeLesson(stopId: string, lessonId: string): void;
  /** The learner marked a lesson's guided boards right (the Do step). */
  markDrilled(lessonId: string): void;
  /** Remember (or forget, with null) the lesson in progress. */
  setLessonRun(run: saves.LessonRun | null): void;
  finishCheck(stopId: string, kind: CheckKind, items: Item[], records: AnswerRecord[]): CheckOutcome | null;
  /** The player left a check early. After at least one answer it counts as a try (see mastery.recordLeft). */
  leaveCheck(stopId: string, kind: CheckKind, answered: AnswerRecord[]): void;
  /** Save a check in progress after each answer, so a reload or a closed app still counts as leaving. */
  checkAnswered(stopId: string, kind: CheckKind, answered: AnswerRecord[]): void;
  /**
   * Count one answered item. A miss (wrong in a check, timed out, or a lesson item not passed on its own after the explanation) also goes
   * into the Wrong-Answer Notebook,
   * unless `fromNotebook` (a fix attempt; use fixNote for those).
   */
  recordAnswer(record: Pick<AnswerRecord, 'skill' | 'firstTry' | 'correct' | 'stop' | 'lesson' | 'help'>, opts?: { fromNotebook?: boolean }): void;
  /** A Wrong-Answer Notebook fix attempt on a skill. Returns true when that card is now cleared. */
  fixNote(skill: string, correct: boolean): boolean;
  addActive(seconds: number): void;
  setPatternPath(path: AgePath): void;
  finishPatternBridge(ids: string[], workshop: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  /** Add a player from an export file. `play` also switches to them. */
  importSave(text: string, play: boolean): { name: string } | { error: string };
  /** The active player's export file, or null. */
  exportSave(): string | null;
  /** Start syncing the active player: makes a sync code and pushes the save. True when the cloud has it. */
  turnOnSync(): Promise<boolean>;
  /** Stop syncing the active player on this device. The cloud copy stays. */
  turnOffSync(): void;
  /** Pull now (and push when this device has newer changes). */
  syncNow(): Promise<void>;
  /** Bring a player from another device by its sync code. Resolves to an error message, or null when linked. */
  linkPlayer(code: string): Promise<string | null>;
  dismissNotice(): void;
}

/** Cloud sync for the active player, for Settings. */
export interface SyncInfo {
  /** False while the sync server is being looked up, and when sync has been switched off by config. */
  available: boolean;
  /** True while the game is still looking up the sync server. */
  loading: boolean;
  busy: boolean;
  /** A short status line: offline, server trouble, or empty. */
  note: string;
  /** The active player's link, when they sync. */
  link: SyncLink | null;
  /** When this device last checked with the cloud for the active player (0: not yet since they were picked). */
  checkedAt: number;
}

export interface Store {
  state: State;
  /** Cloud sync for the active player. */
  sync: SyncInfo;
  /** A short message to show for a moment ("Loaded newer progress from the cloud."), or ''. */
  notice: string;
  /** The Journey day right now (updated every 30 s). */
  today: string;
  player: Player | null;
  save: SaveData | null;
  actions: Actions;
  /** The storage behind the store, for reading other players' saves (player cards). */
  kv: KV;
}

const Ctx = createContext<Store | null>(null);

const browserFetch: Fetch = (input, init) => fetch(input, init);

export function StoreProvider({ children, kv: kvProp, fetchFn = browserFetch }: { children: ReactNode; kv?: KV; fetchFn?: Fetch }) {
  const kv = useMemo(() => kvProp ?? browserKV(), [kvProp]);
  const [state, dispatch] = useReducer(reducer, kv, initState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ----- cloud sync state -----
  /** undefined while loading; null when sync is switched off. */
  const [syncCfg, setSyncCfg] = useState<{ url: string } | null | undefined>(undefined);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNote, setSyncNote] = useState('');
  const [notice, setNotice] = useState('');
  const [checkedAt, setCheckedAt] = useState(0);
  const syncCfgRef = useRef<{ url: string } | null>(null);
  const cfgReady = useRef<Promise<{ url: string } | null>>(Promise.resolve(null));
  /** The save as loaded or taken from the cloud. A different object means play changed it. */
  const baseline = useRef<SaveData | null>(baselineFor(state.save));
  /** When play last changed the active player's save (its file's savedAt after a load; 0 when nothing is saved). */
  const localChangedAt = useRef(state.save?.savedAt ?? 0);
  const pushTimer = useRef<number | null>(null);
  const lastPull = useRef(0);
  /** Change the player list, and mirror it in stateRef at once so the sync code that runs next sees it. */
  const commitRegistry = useCallback((registry: Registry) => {
    dispatch({ type: 'registry', registry });
    stateRef.current = { ...stateRef.current, registry };
  }, []);
  /** Sync calls run one at a time, so two pushes never race each other with the same revision. */
  const syncQueue = useRef<Promise<unknown>>(Promise.resolve());
  const syncFns = useRef<{ push(id: string, keepalive?: boolean, snap?: Snapshot): Promise<PushOutcome>; pull(id: string): Promise<PullOutcome> }>({
    push: async () => 'failed',
    pull: async () => 'failed',
  });
  /** Is this player still synced with this code on this device? (Sync may be turned off while a call is out.) */
  const linkedTo = useCallback((id: string, code: string) => stateRef.current.registry.players.find((x) => x.id === id)?.sync?.code === code, []);

  const [today, setToday] = useState(todayNow);
  useEffect(() => {
    const t = window.setInterval(() => setToday((d) => (d === todayNow() ? d : todayNow())), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // ----- autosave -----
  /** The next write: the save, and the time to stamp on it (when play last changed it). */
  const pending = useRef<{ id: string; data: SaveData; at: number } | null>(null);
  const timer = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    const p = pending.current;
    pending.current = null;
    if (p) saves.writeSave(kv, p.id, p.data, p.at);
  }, [kv]);

  // A save that just arrived from another tab is already in storage: do not write it straight back. A save just
  // loaded (or taken from the cloud) is not a change either, so it is not written again with a new time.
  const adopted = useRef<SaveData | null>(null);
  useEffect(() => {
    if (!state.playerId || !state.save) return;
    if (adopted.current === state.save || baseline.current === state.save) return;
    // Play changed the save: its time moves on, and never backwards (another device's clock may run ahead). A change
    // the game made by itself keeps the last real change's time.
    const quiet = quietSaves.has(state.save);
    if (!quiet) localChangedAt.current = Math.max(Date.now(), localChangedAt.current + 1);
    pending.current = { id: state.playerId, data: state.save, at: localChangedAt.current };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 250);
    // A linked player pushes a little after the last change.
    const id = state.playerId;
    if (!quiet && state.registry.players.find((p) => p.id === id)?.sync && pushTimer.current === null) {
      pushTimer.current = window.setTimeout(() => { pushTimer.current = null; void syncFns.current.push(id); }, sync.PUSH_DELAY_MS);
    }
  }, [state.save, state.playerId, flush]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    // Skip writes that would not change anything, so two tabs never bounce the same list back and forth.
    if (kv.getItem(saves.REGISTRY_KEY) !== JSON.stringify(state.registry)) saves.saveRegistry(kv, state.registry);
  }, [kv, state.registry]);

  // ----- other tabs -----
  // Two tabs on one device share localStorage. When the other tab changes the player list or this player's save,
  // take its copy instead of later overwriting it with an older one.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea && e.storageArea !== window.localStorage) return;
      const s = stateRef.current;
      if (e.key === saves.REGISTRY_KEY) {
        const registry = saves.loadRegistry(kv);
        if (s.playerId && !registry.players.some((p) => p.id === s.playerId)) {
          pending.current = null;
          dispatch({ type: 'logout', registry, route: playersRoute(registry) });
        } else {
          dispatch({ type: 'registry', registry });
        }
      } else if (s.playerId && e.key === saves.saveKeyFor(s.playerId) && e.newValue) {
        const incoming = saves.loadSave(kv, s.playerId);
        // The other tab's play counts as this device's play: a pull here must not swap it for an older cloud copy.
        localChangedAt.current = Math.max(localChangedAt.current, incoming.savedAt);
        pending.current = null;
        if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
        adopted.current = incoming;
        dispatch({ type: 'replaceSave', save: incoming });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [kv]);

  // ----- actions -----
  const actions = useMemo<Actions>(() => {
    const setRegistry = commitRegistry;
    const withPlayer = (reg: Registry, id: string, fn: (p: Player) => Player): Registry => ({
      ...reg,
      players: reg.players.map((p) => (p.id === id ? fn(p) : p)),
    });
    /** Start playing as a player. `pull: false` when the save has just come from the cloud. */
    const login = (registry: Registry, id: string, save: SaveData, changedAt = save.savedAt, pull = true) => {
      // A change still waiting to go up goes now, before the next player takes over.
      const out = stateRef.current;
      if (pushTimer.current !== null && out.playerId && out.playerId !== id && out.save) {
        void syncFns.current.push(out.playerId, false, { save: out.save, changedAt: localChangedAt.current });
      }
      flush();
      clearPush();
      const now = Date.now();
      const reg = { ...withPlayer(registry, id, (p) => ({ ...p, lastPlayed: now })), active: id };
      baseline.current = baselineFor(save);
      localChangedAt.current = changedAt;
      setSyncNote('');
      setCheckedAt(0);
      dispatch({ type: 'login', registry: reg, playerId: id, save, route: { name: 'home' } });
      stateRef.current = { ...stateRef.current, registry: reg, playerId: id, save };
      // A linked player checks the cloud as soon as they are picked.
      if (pull && reg.players.find((p) => p.id === id)?.sync) void syncFns.current.pull(id);
    };
    const clearPush = () => {
      if (pushTimer.current !== null) { window.clearTimeout(pushTimer.current); pushTimer.current = null; }
    };
    const setLink = (id: string, link: SyncLink | null) => {
      const reg = stateRef.current.registry;
      setRegistry(withPlayer(reg, id, (p) => {
        const next = { ...p };
        delete next.sync;
        return link ? { ...next, sync: link } : next;
      }));
    };

    return {
      navigate: (route) => dispatch({ type: 'navigate', route }),

      createPlayer: (name, color, pin) => {
        const reg0 = stateRef.current.registry;
        if (reg0.players.length >= saves.MAX_PLAYERS) return `This device holds up to ${saves.MAX_PLAYERS} players. Remove one first.`;
        if (pin && !saves.isPin(pin)) return 'A PIN is exactly 4 numbers.';
        const { reg, player } = saves.addPlayer(reg0, uniqueName(reg0.players, name), color, Date.now(), Math.random());
        const withPin = pin ? withPlayer(reg, player.id, (p) => ({ ...p, pin: saves.hashPin(pin, newSalt()) })) : reg;
        const data = saves.newSave();
        saves.writeSave(kv, player.id, data);
        login(withPin, player.id, data);
        return null;
      },

      selectPlayer: (id) => {
        const s = stateRef.current;
        if (id === s.playerId) { dispatch({ type: 'navigate', route: { name: 'home' } }); return; }
        if (!s.registry.players.some((p) => p.id === id)) return;
        login(s.registry, id, settleOpenChecks(saves.loadSave(kv, id)));
      },

      renamePlayer: (id, name) => {
        const clean = name.trim().slice(0, 24);
        if (!clean) return;
        setRegistry(withPlayer(stateRef.current.registry, id, (p) => ({ ...p, name: clean })));
        // The name travels with a synced player: push it soon.
        const s = stateRef.current;
        if (id === s.playerId && s.registry.players.find((p) => p.id === id)?.sync) {
          localChangedAt.current = Math.max(Date.now(), localChangedAt.current + 1);
          if (pushTimer.current === null) pushTimer.current = window.setTimeout(() => { pushTimer.current = null; void syncFns.current.push(id); }, sync.PUSH_DELAY_MS);
        }
      },

      removePlayer: (id) => {
        const s = stateRef.current;
        if (pending.current?.id === id) {
          pending.current = null;
          if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
        } else {
          flush();
        }
        const reg = saves.removePlayer(kv, s.registry, id);
        if (id === s.playerId) dispatch({ type: 'logout', registry: reg, route: playersRoute(reg) });
        else setRegistry(reg);
      },

      setPin: (id, pin) => {
        if (!saves.isPin(pin)) return false;
        setRegistry(withPlayer(stateRef.current.registry, id, (p) => ({ ...p, pin: saves.hashPin(pin, newSalt()) })));
        return true;
      },

      removePin: (id) => {
        setRegistry(withPlayer(stateRef.current.registry, id, (p) => {
          const next = { ...p };
          delete next.pin;
          return next;
        }));
      },

      setLessonRun: (run) => {
        dispatch({ type: 'save', fn: (d) => ({ ...d, lessonRun: run }) });
      },

      markDrilled: (lessonId) => {
        dispatch({ type: 'save', fn: (d) => saves.markDrilled(d, lessonId) });
      },

      completeLesson: (stopId, lessonId) => {
        const lesson = stopById(stopId)?.lessons.find((l) => l.id === lessonId);
        dispatch({
          type: 'save',
          fn: (d) => {
            // The guided boards come first: without them the lesson is not passed, whatever called this.
            if (lesson?.drill?.length && !d.drilled.includes(lessonId)) return d;
            return { ...d, lessonRun: d.lessonRun?.lessonId === lessonId ? null : d.lessonRun, stops: { ...d.stops, [stopId]: mastery.completeLesson(d.stops[stopId], lessonId) } };
          },
        });
      },

      finishCheck: (stopId, kind, items, records) => {
        const s = stateRef.current;
        const stop = stopById(stopId);
        if (!stop || !s.save) return null;
        const before = { ...(s.save.stops[stopId] ?? mastery.emptyProgress()) };
        delete before.openCheck;
        const outcome = mastery.recordCheck(stop, before, kind, records.map((r) => ({ lesson: r.lesson, correct: r.correct })), todayNow());
        dispatch({ type: 'save', fn: (d) => ({ ...d, stops: { ...d.stops, [stopId]: outcome.progress } }) });
        dispatch({ type: 'lastCheck', lastCheck: { stopId, kind, items, records, passed: outcome.passed, missed: outcome.missed } });
        return outcome;
      },

      leaveCheck: (stopId, kind, answered) => {
        const s = stateRef.current;
        const stop = stopById(stopId);
        if (!stop || !s.save || !answered.length) return;
        const before = { ...(s.save.stops[stopId] ?? mastery.emptyProgress()) };
        delete before.openCheck;
        const progress = mastery.recordLeft(stop, before, kind, answered.map((r) => ({ lesson: r.lesson, correct: r.correct })), todayNow());
        dispatch({ type: 'save', fn: (d) => ({ ...d, stops: { ...d.stops, [stopId]: progress } }) });
      },

      checkAnswered: (stopId, kind, answered) => {
        const openCheck = { kind, day: todayNow(), answered: answered.map((r) => ({ lesson: r.lesson, correct: r.correct })) };
        dispatch({ type: 'save', fn: (d) => ({ ...d, stops: { ...d.stops, [stopId]: { ...(d.stops[stopId] ?? mastery.emptyProgress()), openCheck } } }) });
      },

      recordAnswer: ({ skill, firstTry, correct, stop, lesson, help }, opts) => {
        const day = todayNow();
        dispatch({
          type: 'save',
          fn: (d) => {
            let counted = saves.recordAnswer(d, day, skill, firstTry);
            if (help) counted = saves.recordHelp(counted, day, skill, help);
            if (help?.gap) counted = saves.recordGap(counted, help.gap);
            return correct || opts?.fromNotebook ? counted : { ...counted, notebook: notebook.addMiss(counted.notebook, { skill, stop, lesson }, day) };
          },
        });
      },

      fixNote: (skill, correct) => {
        const s = stateRef.current;
        if (!s.save) return false;
        const { cleared } = notebook.recordFix(s.save.notebook, skill, correct, todayNow());
        const day = todayNow();
        dispatch({
          type: 'save',
          fn: (d) => {
            const r = notebook.recordFix(d.notebook, skill, correct, day);
            return { ...d, notebook: r.notebook, fixedCount: d.fixedCount + (r.cleared ? 1 : 0) };
          },
        });
        return cleared;
      },

      addActive: (seconds) => {
        const day = todayNow();
        // Counting time is not play: it is saved, but it does not make this copy newer for sync.
        dispatch({ type: 'save', fn: (d) => { const next = saves.addActive(d, day, seconds); if (next !== d) quietSaves.add(next); return next; } });
      },

      setPatternPath: (path) => {
        dispatch({type: 'save', fn: d => ({...d, patternBridge: {...d.patternBridge, path}})});
      },
      finishPatternBridge: (ids, workshop) => {
        dispatch({type: 'save', fn: d => ({...d, patternBridge: completeBridge(d.patternBridge, ids, workshop)})});
      },
      updateSettings: (patch) => {
        dispatch({ type: 'save', fn: (d) => ({ ...d, settings: { ...d.settings, ...patch } }) });
      },

      importSave: (text, play) => {
        const got = saves.importSave(text.trim());
        if ('error' in got) return { error: got.error };
        const s = stateRef.current;
        if (s.registry.players.length >= saves.MAX_PLAYERS) return { error: `This device holds up to ${saves.MAX_PLAYERS} players. Remove one first.` };
        const name = uniqueName(s.registry.players, got.name);
        const { reg, player } = saves.addPlayer(s.registry, name, got.color, Date.now(), Math.random());
        saves.writeSave(kv, player.id, got.data);
        if (play) login(reg, player.id, got.data);
        else setRegistry({ ...reg, active: s.registry.active });
        return { name };
      },

      exportSave: () => {
        const s = stateRef.current;
        const p = s.registry.players.find((x) => x.id === s.playerId);
        return p && s.save ? saves.exportSave(p, s.save) : null;
      },

      turnOnSync: async () => {
        const s = stateRef.current;
        const id = s.playerId;
        const cfg = syncCfgRef.current ?? (await cfgReady.current);
        if (!id || !cfg || !s.save) return false;
        if (!sync.canSync()) { setNotice(sync.MSG.tooOld); return false; }
        setSyncBusy(true);
        clearPush();
        setLink(id, { code: sync.newSyncCode(), rev: 0, at: 0 });
        const res = await syncFns.current.push(id);
        setSyncBusy(false);
        if (res === 'pushed') { setNotice('Sync is on. Type the code on your other devices.'); return true; }
        setLink(id, null);
        setSyncNote('');
        setNotice('Sync is not on yet: the game could not reach the cloud. Try again in a moment.');
        return false;
      },

      turnOffSync: () => {
        const id = stateRef.current.playerId;
        if (!id) return;
        clearPush();
        setLink(id, null);
        setSyncNote('');
        setCheckedAt(0);
        setNotice('This device no longer syncs this player. The cloud copy stays.');
      },

      syncNow: async () => {
        const id = stateRef.current.playerId;
        if (!id || !stateRef.current.registry.players.find((p) => p.id === id)?.sync) return;
        setSyncBusy(true);
        // A change still waiting goes in this sync: the pull sees it and pushes.
        clearPush();
        const res = await syncFns.current.pull(id);
        setSyncBusy(false);
        if (res === 'same' || res === 'pushed') setNotice('Synced. This device and the cloud have the same progress.');
      },

      linkPlayer: async (typed) => {
        if (/[01io]/i.test(typed)) return 'Sync codes never use 0, 1, I or O. Look at that letter again.';
        const code = sync.normalizeCode(typed);
        if (!sync.validCode(code)) return 'A sync code has 12 letters and numbers, like LQ4K-9TQ2-MHB7.';
        if (sync.codeGame(code) === 'engineering-quest') return 'That code is for Engineering Quest. Logic Quest codes start with LQ.';
        const cfg = syncCfgRef.current ?? (await cfgReady.current);
        if (!cfg) return 'Sync is switched off in this copy of the game.';
        if (!sync.canSync()) return sync.MSG.tooOld;
        const here = stateRef.current.registry.players.find((p) => p.sync?.code === code);
        if (here) return `${here.name} is already on this device. Pick them on the Who’s playing? screen.`;
        if (stateRef.current.registry.players.length >= saves.MAX_PLAYERS) return `This device holds up to ${saves.MAX_PLAYERS} players. Remove one first.`;
        setSyncBusy(true);
        try {
          const remote = await sync.pullSave(cfg.url, code, fetchFn);
          if (!remote) return 'No player found for that code. Check it on the other device: Me → Sync across devices.';
          const got = await sync.readRemote(remote.data);
          if ('error' in got) return got.error;
          const reg0 = stateRef.current.registry;
          if (reg0.players.length >= saves.MAX_PLAYERS) return `This device holds up to ${saves.MAX_PLAYERS} players. Remove one first.`;
          if (reg0.players.some((p) => p.sync?.code === code)) return 'That player is already on this device.';
          const name = uniqueName(reg0.players, got.name);
          const { reg, player } = saves.addPlayer(reg0, name, got.color, Date.now(), Math.random());
          const linked = withPlayer(reg, player.id, (p) => ({ ...p, sync: { code, rev: remote.rev, at: remote.savedAt } }));
          saves.writeSave(kv, player.id, got.data, remote.savedAt);
          lastPull.current = Date.now();
          login(linked, player.id, settleOpenChecks(got.data), remote.savedAt, false);
          setCheckedAt(Date.now());
          setNotice(`${name} is linked. Progress now syncs on this device.`);
          return null;
        } catch (e) {
          const msg = sync.friendly(e);
          return msg === sync.MSG.offline ? 'Could not reach the cloud. Check the connection and try again.' : msg;
        } finally {
          setSyncBusy(false);
        }
      },

      dismissNotice: () => setNotice(''),
    };
  }, [kv, flush, fetchFn, commitRegistry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- cloud sync: pull when a player opens or the app comes back, push a little after every change -----

  /**
   * Replace this device's copy of the active player with the cloud's. False when that player is no longer on screen
   * or no longer synced with this code. Throws (with words for the player) when the cloud copy cannot be read here.
   */
  const adoptRemote = useCallback(async (id: string, code: string, remote: RemoteSave): Promise<boolean> => {
    const got = await sync.readRemote(remote.data);
    if ('error' in got) throw new Error(got.error);
    if (stateRef.current.playerId !== id || !linkedTo(id, code)) return false;
    if (pushTimer.current !== null) { window.clearTimeout(pushTimer.current); pushTimer.current = null; }
    // Drop a pending local write: the cloud copy replaces it.
    if (pending.current?.id === id) pending.current = null;
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    const data = got.data;
    baseline.current = data;
    localChangedAt.current = remote.savedAt;
    saves.writeSave(kv, id, data, remote.savedAt);
    dispatch({ type: 'replaceSave', save: data });
    stateRef.current = { ...stateRef.current, save: data };
    // The player's name and colour travel too (a name taken by another player here is left as it is).
    const reg = stateRef.current.registry;
    const nameFree = !reg.players.some((p) => p.id !== id && p.name.toLowerCase() === got.name.toLowerCase());
    commitRegistry({
      ...reg,
      players: reg.players.map((p) => (p.id === id ? { ...p, color: got.color, name: nameFree ? got.name : p.name, sync: { code, rev: remote.rev, at: remote.savedAt } } : p)),
    });
    setSyncNote('');
    setCheckedAt(Date.now());
    setNotice(`Loaded newer progress from the cloud (saved ${sync.ago(Date.now() - remote.savedAt)}).`);
    return true;
  }, [kv, commitRegistry, linkedTo]);

  /**
   * Send a player's save to the cloud: the active player's current save, or a snapshot taken when the player was
   * switched away from. The cloud records when play last changed that copy.
   */
  const pushNow = useCallback(async (id: string, keepalive = false, snap?: Snapshot): Promise<PushOutcome> => {
    const cfg = syncCfgRef.current ?? (await cfgReady.current);
    const s = stateRef.current;
    const p = s.registry.players.find((x) => x.id === id);
    const shot = snap ?? (s.playerId === id && s.save ? { save: s.save, changedAt: localChangedAt.current } : null);
    if (!cfg || !p?.sync || !shot) return 'failed';
    const { code, rev } = p.sync;
    const changedAt = shot.changedAt || Date.now();
    const active = () => stateRef.current.playerId === id;
    const note = (text: string) => { if (active()) setSyncNote(text); };
    let body: string;
    try { body = await sync.packPlayer(p, shot.save); } catch { note(sync.MSG.trouble); return 'failed'; }
    const done = (newRev: number): PushOutcome => {
      if (!linkedTo(id, code)) return 'failed';
      const cur = stateRef.current.registry;
      commitRegistry({ ...cur, players: cur.players.map((x) => (x.id === id ? { ...x, sync: { code, rev: newRev, at: changedAt } } : x)) });
      if (active()) { setSyncNote(''); setCheckedAt(Date.now()); }
      return 'pushed';
    };
    const res = await sync.pushSave(cfg.url, code, body, rev, changedAt, fetchFn, keepalive);
    if (res.ok) return done(res.rev);
    if (!('conflict' in res)) { note(sync.friendly(res.error)); return 'failed'; }
    const r = res.conflict;
    // Our own copy came back (an earlier push got through, but its answer did not): nothing to take.
    if (r.data === body) return done(r.rev);
    // Sync was turned off here while the push was out: leave the cloud alone.
    if (!linkedTo(id, code)) return 'failed';
    if (r.data && r.savedAt >= changedAt) {
      // Another device played later: take its copy. A player who is not on screen takes it on their next pull.
      if (!active()) return 'failed';
      try { return (await adoptRemote(id, code, r)) ? 'took' : 'failed'; } catch (e) {
        // Never push over a copy this device could not read.
        note(e instanceof Error ? e.message : sync.MSG.trouble);
        return 'failed';
      }
    }
    // This copy is the later one: put it on top of the cloud's.
    const again = await sync.pushSave(cfg.url, code, body, r.rev, changedAt, fetchFn, keepalive);
    if (again.ok) return done(again.rev);
    note('conflict' in again ? sync.MSG.trouble : sync.friendly(again.error));
    return 'failed';
  }, [adoptRemote, commitRegistry, linkedTo, fetchFn]);

  /** Look at the cloud copy for the active player and take it, push ours, or do nothing (sync.reconcile). */
  const pullNow = useCallback(async (id: string): Promise<PullOutcome> => {
    const cfg = syncCfgRef.current ?? (await cfgReady.current);
    const link = stateRef.current.registry.players.find((x) => x.id === id)?.sync;
    if (!cfg || !link) return 'failed';
    lastPull.current = Date.now();
    let remote: RemoteSave | null;
    try {
      remote = await sync.pullSave(cfg.url, link.code, fetchFn);
    } catch (e) {
      if (stateRef.current.playerId === id) setSyncNote(sync.friendly(e));
      return 'failed';
    }
    // The player was switched, or sync turned off, while the pull was out.
    if (stateRef.current.playerId !== id || !linkedTo(id, link.code)) return 'failed';
    const fresh = stateRef.current.registry.players.find((x) => x.id === id)?.sync ?? link;
    const what = sync.reconcile(fresh, localChangedAt.current, remote);
    if (what === 'use-remote' && remote) {
      try {
        return (await adoptRemote(id, fresh.code, remote)) ? 'took' : 'failed';
      } catch (e) {
        setSyncNote(e instanceof Error ? e.message : sync.MSG.trouble);
        return 'failed';
      }
    }
    if (what === 'push') return pushNow(id);
    setSyncNote('');
    setCheckedAt(Date.now());
    return 'same';
  }, [adoptRemote, pushNow, linkedTo, fetchFn]);

  useEffect(() => {
    const queued = <T,>(fn: () => Promise<T>): Promise<T> => {
      const run = syncQueue.current.then(fn, fn);
      syncQueue.current = run.catch(() => undefined);
      return run;
    };
    syncFns.current = { push: (id, keepalive, snap) => queued(() => pushNow(id, keepalive, snap)), pull: (id) => queued(() => pullNow(id)) };
  }, [pushNow, pullNow]);

  // Find the sync server once, then check the cloud for the player already playing.
  useEffect(() => {
    let live = true;
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : './';
    const pr = sync.loadSyncConfig(fetchFn, typeof window === 'undefined' ? undefined : { getItem: (k) => kv.getItem(k) }, base);
    cfgReady.current = pr;
    void pr.then((c) => {
      syncCfgRef.current = c;
      if (!live) return;
      setSyncCfg(c);
      const s = stateRef.current;
      if (c && s.playerId && s.registry.players.find((p) => p.id === s.playerId)?.sync) void syncFns.current.pull(s.playerId);
    });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving: send a pending push now. Coming back after a while: check the cloud.
  useEffect(() => {
    const linked = () => {
      const s = stateRef.current;
      return s.playerId && syncCfgRef.current && s.registry.players.find((p) => p.id === s.playerId)?.sync ? s.playerId : null;
    };
    const flushPush = () => {
      const id = linked();
      if (!id || pushTimer.current === null) return;
      window.clearTimeout(pushTimer.current);
      pushTimer.current = null;
      flush();
      // Straight out, not behind other sync calls: the page may be about to go.
      void pushNow(id, true);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') { flushPush(); return; }
      const id = linked();
      if (id && Date.now() - lastPull.current > sync.PULL_GAP_MS && pushTimer.current === null) void syncFns.current.pull(id);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flushPush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flushPush);
    };
  }, [pushNow, flush]);

  // A notice shows for a moment.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const player = state.registry.players.find((p) => p.id === state.playerId) ?? null;
  const syncInfo = useMemo<SyncInfo>(() => ({ available: !!syncCfg, loading: syncCfg === undefined, busy: syncBusy, note: syncNote, link: player?.sync ?? null, checkedAt }), [syncCfg, syncBusy, syncNote, player, checkedAt]);
  const value = useMemo<Store>(() => ({ state, today, player, save: state.save, actions, kv, sync: syncInfo, notice }), [state, today, player, actions, kv, syncInfo, notice]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>.');
  return s;
}

/** The tab a route belongs to, for the bottom bar. */
export function tabFor(route: Route): Tab | null {
  switch (route.name) {
    case 'home': case 'search': return 'home';
    case 'journey': case 'stop': case 'lesson': case 'check': return 'journey';
    case 'arcade': return 'arcade';
    case 'library': case 'learn': case 'pattern': return 'library';
    case 'me': case 'progress': case 'notebook': case 'grownups': case 'settings': return 'me';
    default: return null;
  }
}

/** Save text as a file download (CSV, JSON). */
export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Where Back goes from a page (not from play screens, which have their own back). Null on Home: Back leaves the app. */
export function parentRoute(route: Route): Route | null {
  switch (route.name) {
    case 'home': case 'players': return null;
    case 'stop': return { name: 'journey' };
    case 'learn': return { name: 'library', kind: 'ideas' };
    case 'pattern': return { name: 'library', kind: 'lab' };
    case 'progress': case 'notebook': case 'grownups': case 'settings': return { name: 'me' };
    default: return { name: 'home' };
  }
}
