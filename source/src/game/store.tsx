import { completeBridge, type AgePath } from './pattern/bridges';
/**
 * The app store: the player registry, the active player's save, and which screen is showing.
 * React context + useReducer. The reducer is pure; action helpers compute anything that needs the
 * clock or randomness (days, PIN salts, new ids) and do the localStorage side effects.
 * The save is written 250 ms after the last change, and at once when the page is hidden.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import * as mastery from '../engine/journey/mastery';
import type { CheckKind, CheckOutcome } from '../engine/journey/mastery';
import * as saves from '../engine/save/save';
import * as notebook from '../engine/notebook';
import type { KV, Player, Registry, SaveData, Settings } from '../engine/save/save';
import type { Item } from '../engine/types';
import { stopById } from '../content/stops';
import type { AnswerRecord } from './components/contracts';

// ---------- routes ----------

/** Where a lesson was opened from, so finishing or leaving it goes back there. */
export type LessonFrom = 'journey' | 'learn' | 'check' | 'stop' | 'library' | 'home';

/** The Library's kind filter. */
export type LibraryKind = 'all' | 'ideas' | 'practice' | 'lab' | 'soon';

export type Route =
  | { name: 'players'; mode?: 'list' | 'new' | 'import'; pinFor?: string }
  | { name: 'pattern'; workshop?: boolean; event?: string }
  | { name: 'home' }
  | { name: 'journey'; track?: 'main' | 'side' }
  /** One page per stop: lessons, checks, practice, Pattern Lab events and repair cards. */
  | { name: 'stop'; stopId: string }
  | { name: 'library'; kind?: LibraryKind }
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
  | { name: 'settings' };

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

/** A check left open by a reload or a closed app counts as leaving it (see mastery.settleOpenCheck). */
function settleOpenChecks(save: SaveData): SaveData {
  let stops: SaveData['stops'] | null = null;
  for (const [id, p] of Object.entries(save.stops)) {
    const stop = stopById(id);
    if (!p.openCheck || !stop) continue;
    stops ??= { ...save.stops };
    stops[id] = mastery.settleOpenCheck(stop, p, mastery.journeyDay(Date.now()));
  }
  return stops ? { ...save, stops } : save;
}

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
}

export interface Store {
  state: State;
  /** The Journey day right now (updated every 30 s). */
  today: string;
  player: Player | null;
  save: SaveData | null;
  actions: Actions;
  /** The storage behind the store, for reading other players' saves (player cards). */
  kv: KV;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, kv: kvProp }: { children: ReactNode; kv?: KV }) {
  const kv = useMemo(() => kvProp ?? browserKV(), [kvProp]);
  const [state, dispatch] = useReducer(reducer, kv, initState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [today, setToday] = useState(todayNow);
  useEffect(() => {
    const t = window.setInterval(() => setToday((d) => (d === todayNow() ? d : todayNow())), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // ----- autosave -----
  const pending = useRef<{ id: string; data: SaveData } | null>(null);
  const timer = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    const p = pending.current;
    pending.current = null;
    if (p) saves.writeSave(kv, p.id, p.data);
  }, [kv]);

  // A save that just arrived from another tab is already in storage: do not write it straight back.
  const adopted = useRef<SaveData | null>(null);
  useEffect(() => {
    if (!state.playerId || !state.save) return;
    if (adopted.current === state.save) return;
    pending.current = { id: state.playerId, data: state.save };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 250);
  }, [state.save, state.playerId, flush]);

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
    const setRegistry = (registry: Registry) => dispatch({ type: 'registry', registry });
    const withPlayer = (reg: Registry, id: string, fn: (p: Player) => Player): Registry => ({
      ...reg,
      players: reg.players.map((p) => (p.id === id ? fn(p) : p)),
    });
    const login = (registry: Registry, id: string, save: SaveData) => {
      flush();
      const now = Date.now();
      const reg = { ...withPlayer(registry, id, (p) => ({ ...p, lastPlayed: now })), active: id };
      dispatch({ type: 'login', registry: reg, playerId: id, save, route: { name: 'home' } });
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
        dispatch({ type: 'save', fn: (d) => saves.addActive(d, day, seconds) });
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
    };
  }, [kv, flush]);

  const player = state.registry.players.find((p) => p.id === state.playerId) ?? null;
  const value = useMemo<Store>(() => ({ state, today, player, save: state.save, actions, kv }), [state, today, player, actions, kv]);
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
