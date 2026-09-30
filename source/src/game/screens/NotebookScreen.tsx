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
}

/** The notebook page itself, without the store (tested on its own). */
export function NotebookList({ notebook, today, stops, onFix }: NotebookListProps) {
  const groups = notebookGroups(notebook);
  const open = Object.keys(notebook).length;
  const ready = fixableCards(notebook, today, stops).length;
  const stopOf = (n: number) => stops.find((s) => s.n === n);

  return (
    <div className="page">
      <div className="stack" style={{ gap: 6 }}>
        <h2 className="page-title">NOTEBOOK</h2>
        <p className="soft-text">{NOTEBOOK_INTRO.join(' ')}</p>
      </div>

      <section className="panel" aria-labelledby="nb-ready-title">
        <h3 id="nb-ready-title" className="next-title">
          {open === 0 ? 'Your notebook is empty' : ready ? `Repair quests: ${ready} ready` : 'Nothing is ready right now'}
        </h3>
        <p className="soft-text">
          {open === 0
            ? 'When you miss a question, it shows up here.'
            : ready
              ? 'Each one is a new question on an idea you missed.'
              : 'Each card below shows the day it will be ready.'}
        </p>
        {ready > 0 && (
          <button type="button" className="btn primary block big" onClick={onFix}>
            Fix the ready ones
          </button>
        )}
      </section>

      {groups.map(({ stop, cards }) => {
        const def = stopOf(stop);
        return (
          <section key={stop} className="stack" aria-labelledby={`nb-stop-${stop}`}>
            <h3 id={`nb-stop-${stop}`} className="section-title">
              STOP {stop}{def ? ` · ${def.title.toUpperCase()}` : ''}
            </h3>
            <ul className="nb-list">
              {cards.map((c) => {
                const later = !canFix(c, stops);
                const now = c.due <= today && !later;
                const k = def ? def.lessons.findIndex((l) => l.id === c.lesson) : -1;
                const lesson = k >= 0 && def ? `Lesson ${k + 1} · ${def.lessons[k].title}` : '';
                return (
                  <li key={c.skill} className={`nb-card${now ? ' is-ready' : ''}`}>
                    <div className="grow stack" style={{ gap: 2 }}>
                      <span className="nb-skill">{upperFirst(skillName(c.skill))}</span>
                      {lesson && <span className="small soft-text">{lesson}</span>}
                      <span className="small muted">
                        Fixes done: {c.fixes} of {FIXES_TO_CLEAR}
                      </span>
                    </div>
                    <span className={`chip${now ? ' amber' : ''}`}>{later ? 'In a later version' : readyLabel(c.due, today)}</span>
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
  return <NotebookList notebook={save.notebook} today={today} stops={STOPS} onFix={() => actions.navigate({ name: 'notebook', fix: true })} />;
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

