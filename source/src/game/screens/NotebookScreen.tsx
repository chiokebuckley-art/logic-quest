/**
 * The Wrong-Answer Notebook ("repair quests"). The list: what the notebook is, how many cards are ready, and
 * every open card grouped by stop with its skill and the day it is ready. "Fix the ready ones" opens the
 * fixing run (route { name: 'notebook', fix: true }), which hides the tab bar like practice does.
 */
import { useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import { canFix, FIXES_TO_CLEAR, fixableCards, type NoteCard, type Notebook } from '../../engine/notebook';
import type { StopDef } from '../../engine/types';
import { STOPS } from '../../content/stops';
import { readyLabel, skillName } from '../progressStats';
import { useStore, type Route } from '../store';
import { NotebookRunner } from '../components/NotebookRunner';
import { PageHead } from '../components/kit';

type NotebookRoute = Extract<Route, { name: 'notebook' }>;

export const NOTEBOOK_INTRO = [
  'When you miss a question, it goes into your notebook as a repair quest.',
  'A repair quest is a new question about the same idea.',
  'Get it right on the first try three times, a few days apart, and the card is cleared.',
];

const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Open cards grouped by stop (stop order), each group sorted by the day it is ready, then by skill. */
export function notebookGroups(notebook: Notebook): { stop: number; cards: NoteCard[] }[] {
  const byStop = new Map<number, NoteCard[]>();
  for (const c of Object.values(notebook)) byStop.set(c.stop, [...(byStop.get(c.stop) ?? []), c]);
  return [...byStop.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stop, cards]) => ({ stop, cards: cards.sort((a, b) => (a.due === b.due ? a.skill.localeCompare(b.skill) : a.due < b.due ? -1 : 1)) }));
}

export interface NotebookListProps {
  notebook: Notebook;
  today: string;
  stops: readonly StopDef[];
  onFix(): void;
  /** Cards cleared so far (for the Fixed chip). */
  fixed?: number;
  onBack?(): void;
}

type Filter = 'ready' | 'waiting' | null;

/** The notebook page itself, without the store (tested on its own). */
export function NotebookList({ notebook, today, stops, onFix, fixed = 0, onBack }: NotebookListProps) {
  const [filter, setFilter] = useState<Filter>(null);
  const groups = notebookGroups(notebook);
  const open = Object.keys(notebook).length;
  const ready = fixableCards(notebook, today, stops).length;
  const stopOf = (n: number) => stops.find((s) => s.n === n);
  const isReady = (c: NoteCard) => c.due <= today && canFix(c, stops);

  return (
    <div className="page sl-page">
      <PageHead title="Repair quests" sub={NOTEBOOK_INTRO.join(' ')} back={onBack ? 'Me' : undefined} onBack={onBack} />

      {ready > 0 ? (
        <section className="sl-repair big" aria-labelledby="nb-ready-title">
          <span className="sl-repair-n" aria-hidden="true">{ready}</span>
          <span className="sl-repair-text">
            <h3 id="nb-ready-title" className="sl-repair-title"><span className="sr-only">Repair quests: {ready} ready. </span><span aria-hidden="true">ready now</span></h3>
            <span className="sl-repair-sub">~{ready} {ready === 1 ? 'minute' : 'minutes'} · no clock · each one is a new question</span>
          </span>
          <button type="button" className="sl-repair-go" onClick={onFix} aria-label="Fix the ready ones">FIX ▸</button>
        </section>
      ) : (
        <section className="sl-card" aria-labelledby="nb-ready-title">
          <h3 id="nb-ready-title" className="sl-card-title">{open === 0 ? 'Your notebook is empty' : 'Nothing is ready right now'}</h3>
          <p className="sl-sub">{open === 0 ? 'When you miss a question, it shows up here.' : 'Each card below shows the day it will be ready.'}</p>
        </section>
      )}

      {open > 0 && (
        <div className="sl-chips" role="group" aria-label="Show">
          <button type="button" className="sl-chip c-gold" aria-pressed={filter === 'ready'} onClick={() => setFilter(filter === 'ready' ? null : 'ready')}>Ready {ready}</button>
          <button type="button" className="sl-chip c-gold" aria-pressed={filter === 'waiting'} onClick={() => setFilter(filter === 'waiting' ? null : 'waiting')}>Waiting {open - ready}</button>
          <span className="sl-chip">Fixed {fixed}</span>
        </div>
      )}

      {groups.map(({ stop, cards }) => {
        const def = stopOf(stop);
        const shown = cards.filter((c) => (filter === 'ready' ? isReady(c) : filter === 'waiting' ? !isReady(c) : true));
        if (!shown.length) return null;
        return (
          <section key={stop} className="sl-section" aria-labelledby={`nb-stop-${stop}`}>
            <h3 id={`nb-stop-${stop}`} className="sl-label">
              STOP {stop}{def ? ` · ${def.title.toUpperCase()}` : ''}
            </h3>
            <ul className="sl-nb-list">
              {shown.map((c) => {
                const later = !canFix(c, stops);
                const now = c.due <= today && !later;
                const k = def ? def.lessons.findIndex((l) => l.id === c.lesson) : -1;
                const lesson = k >= 0 && def ? `Lesson ${k + 1} · ${def.lessons[k].title}` : '';
                return (
                  <li key={c.skill} className={`sl-nb-card${now ? ' is-ready' : ''}`}>
                    <div className="sl-nb-top">
                      <span className="sl-nb-title">{upperFirst(skillName(c.skill))}</span>
                      <span className={`sl-nb-tag ${later ? 'later' : now ? 'ready' : 'waiting'}`}>{later ? 'In a later version' : now ? 'Ready' : 'Waiting'}</span>
                    </div>
                    <span className="sl-row-sub">{[lesson, later ? '' : readyLabel(c.due, today)].filter(Boolean).join(' · ')}</span>
                    <span className="sr-only">Fixes done: {c.fixes} of {FIXES_TO_CLEAR}</span>
                    <span className="sl-segs" aria-hidden="true">
                      {Array.from({ length: FIXES_TO_CLEAR }, (_, i) => <i key={i} className={i < c.fixes ? 'on' : ''} />)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function NotebookScreen({ route }: { route: NotebookRoute }) {
  const { save, today, actions } = useStore();
  if (!save) return null;
  if (route.fix) return <FixView />;
  return <NotebookList notebook={save.notebook} today={today} stops={STOPS} fixed={save.fixedCount ?? 0} onBack={() => actions.navigate({ name: 'me' })} onFix={() => actions.navigate({ name: 'notebook', fix: true })} />;
}

/** Fixing the cards that are ready now. The list is taken once, when fixing starts. */
function FixView() {
  const { player, save, today, actions } = useStore();
  const [cards] = useState(() => (save ? fixableCards(save.notebook, today, STOPS) : []));
  const [seed] = useState(() => seedFor(player?.id ?? 'guest', 'notebook', Date.now()));
  if (!save) return null;
  return (
    <div className="page-play">
      <NotebookRunner
        cards={cards}
        stops={STOPS}
        seed={seed}
        readAloud={save.settings.readAloud}
        onFix={(card, r) => {
          actions.recordAnswer(r, { fromNotebook: true });
          return actions.fixNote(card.skill, r.correct && r.firstTry);
        }}
        onExit={() => actions.navigate({ name: 'notebook' })}
      />
    </div>
  );
}
