/**
 * Find anything (1l). Indexes every key-idea card, lesson, stop title and idea, practice, Pattern Lab event,
 * repair card and setting. Word-prefix and substring matching, with one-typo tolerance on longer words.
 * The best stop match is the top hit. Recent searches show while the field is empty.
 */
import { useMemo, useState } from 'react';
import { viewAll } from '../../engine/journey/mastery';
import type { SaveData } from '../../engine/save/save';
import { STOPS } from '../../content/stops';
import { DESTINATIONS } from '../pattern/bridges';
import { skillName } from '../progressStats';
import { useStore, type Route } from '../store';
import { GIcon, StopArt, type GameIcon } from '../components/kit';

type Group = 'stop' | 'ideas' | 'practice' | 'lab' | 'fix' | 'settings';

export interface Entry {
  group: Group;
  title: string;
  /** Extra text that matches but is not shown. */
  body: string;
  meta: string;
  route: Route;
  stopId?: string;
}

const GROUPS: { group: Exclude<Group, 'stop'>; label: string; tone: string; icon: GameIcon }[] = [
  { group: 'ideas', label: 'Ideas', tone: 'cyan', icon: 'scroll' },
  { group: 'practice', label: 'Practice', tone: 'lime', icon: 'target' },
  { group: 'lab', label: 'Pattern Lab', tone: 'violet', icon: 'medal' },
  { group: 'fix', label: 'Fix', tone: 'orange', icon: 'repair' },
  { group: 'settings', label: 'Settings', tone: 'muted', icon: 'settings' },
];

/** Everything that can be found, for one save. */
export function searchIndex(save: SaveData, today: string): Entry[] {
  const out: Entry[] = [];
  const views = viewAll(STOPS, save.stops, today);
  for (const { stop, view } of views) {
    out.push({ group: 'stop', title: `Stop ${stop.n} · ${stop.title}`, body: stop.idea, meta: view.label, route: { name: 'stop', stopId: stop.id }, stopId: stop.id });
    stop.lessons.forEach((lesson, k) => {
      const go: Route = view.status === 'locked' ? { name: 'stop', stopId: stop.id } : { name: 'lesson', stopId: stop.id, lessonId: lesson.id, from: 'library' };
      out.push({ group: 'ideas', title: lesson.title, body: `${stop.title} lesson ${k + 1}`, meta: `S${stop.n} · L${k + 1}`, route: go });
      for (const card of lesson.ideas) out.push({ group: 'ideas', title: card.title, body: `${card.body.join(' ')} ${lesson.title}`, meta: `S${stop.n} · L${k + 1}`, route: go });
    });
    if (stop.practice) {
      const open = !!save.stops[stop.id]?.passDay;
      out.push({ group: 'practice', title: `${stop.title} puzzles`, body: `practice arcade ${stop.idea}`, meta: open ? 'open' : 'opens at pass', route: open ? { name: 'arcade', practice: stop.id } : { name: 'stop', stopId: stop.id } });
    }
  }
  for (const d of DESTINATIONS) {
    for (const id of d.events) out.push({ group: 'lab', title: `${d.name} · ${id}`, body: `${d.purpose} pattern lab bridge`, meta: save.patternBridge.completed.includes(id) ? 'done ✓' : 'event', route: { name: 'pattern', event: id } });
  }
  out.push({ group: 'lab', title: 'Pattern Workshop', body: 'explorer workshop pattern scout badge notice sort repeat', meta: save.patternBridge.workshop ? 'Pattern Scout ✓' : 'workshop', route: { name: 'pattern', workshop: true } });
  for (const c of Object.values(save.notebook ?? {})) {
    out.push({ group: 'fix', title: skillName(c.skill), body: 'repair quest notebook missed', meta: `Stop ${c.stop}`, route: { name: 'notebook' } });
  }
  const settings: [string, string, Route][] = [
    ['Read aloud', 'speech voice listen', { name: 'settings' }],
    ['Calm timer', 'check timer clock seconds', { name: 'settings' }],
    ['Export or import a save', 'backup file json move device', { name: 'settings' }],
    ['Players & PINs', 'switch player rename pin remove', { name: 'players', mode: 'list' }],
    ['Grown-ups', 'parent teacher minutes first try csv download', { name: 'grownups' }],
    ['Path: Explorer · Trailblazer · Logician', 'age learning path', { name: 'library', kind: 'lab' }],
    ['My progress', 'stats stops passed mastered', { name: 'progress' }],
  ];
  for (const [title, body, route] of settings) out.push({ group: 'settings', title, body, meta: '', route });
  return out;
}

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** 0 when it does not match. Higher is better: title prefix > title word > body word > typo. */
export function score(entry: Entry, query: string): number {
  const q = words(query);
  if (!q.length) return 0;
  const title = words(entry.title);
  const body = words(entry.body);
  let total = 0;
  for (const w of q) {
    let best = 0;
    for (const t of title) best = Math.max(best, t.startsWith(w) ? 4 : t.includes(w) ? 2 : w.length >= 5 && oneEdit(w, t.slice(0, w.length + 1)) ? 1 : 0);
    if (best < 2) for (const t of body) best = Math.max(best, t.startsWith(w) ? 1.5 : w.length >= 5 && oneEdit(w, t) ? 0.5 : 0);
    if (!best) return 0;
    total += best;
  }
  return total + (entry.group === 'stop' ? 0.5 : 0);
}

/** Recent searches for this session (newest first, at most 4). */
let recents: string[] = [];

export function SearchScreen({ route }: { route: Extract<Route, { name: 'search' }> }) {
  const { save, today, actions } = useStore();
  const [q, setQ] = useState(route.q ?? '');
  const index = useMemo(() => (save ? searchIndex(save, today) : []), [save, today]);
  if (!save) return null;

  const hits = q.trim() ? index.map((e) => ({ e, s: score(e, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s) : [];
  const top = hits.find((x) => x.e.group === 'stop')?.e ?? null;
  const open = (e: Entry) => {
    if (q.trim()) recents = [q.trim(), ...recents.filter((r) => r !== q.trim())].slice(0, 4);
    actions.navigate(e.route);
  };

  return (
    <div className="page sl-page">
      <div className="sl-find">
        <label className="sl-find-field">
          <GIcon name="compass" size={16} color="var(--gold)" />
          <span className="sr-only">Find anything</span>
          <input autoFocus value={q} placeholder="An idea, a stop, a puzzle" onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        </label>
        <button type="button" className="sl-link" onClick={() => actions.navigate({ name: 'home' })}>Cancel</button>
      </div>

      {!q.trim() && (
        <>
          {recents.length > 0 && <h3 className="sl-label">Recent</h3>}
          <div className="sl-chips">
            {(recents.length ? recents : ['tie', 'knave', 'before', 'not', 'grid']).map((r) => (
              <button key={r} type="button" className="sl-chip" onClick={() => setQ(r)}>{r}</button>
            ))}
          </div>
          <p className="sl-note">Finds every key idea card, lesson, stop, puzzle type, Pattern Lab event and setting.</p>
        </>
      )}

      {q.trim() && hits.length === 0 && <p className="sl-note">Nothing found for “{q.trim()}”. Try a shorter word.</p>}

      {top && (
        <button type="button" className="sl-tophit" onClick={() => open(top)}>
          {top.stopId && <StopArt stopId={top.stopId} />}
          <span className="sl-row-main">
            <span className="sl-tophit-title">{top.title}</span>
            <span className="sl-tophit-sub">{top.meta}</span>
          </span>
          <span className="sl-tophit-go">OPEN</span>
        </button>
      )}

      {GROUPS.map((g) => {
        const list = hits.filter((x) => x.e.group === g.group).slice(0, 6);
        if (!list.length) return null;
        return (
          <section key={g.group} className="sl-section">
            <h3 className={`sl-label t-${g.tone}`}>{g.label}</h3>
            <div className="sl-find-list">
              {list.map(({ e }, k) => (
                <button key={`${e.title}-${k}`} type="button" className="sl-find-row" onClick={() => open(e)}>
                  <GIcon name={g.icon} size={16} color={`var(--${g.tone === 'orange' ? 'amber' : g.tone === 'muted' ? 'muted' : g.tone})`} />
                  <span className="sl-find-title">{e.title}</span>
                  <span className="sl-find-meta">{e.meta}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
