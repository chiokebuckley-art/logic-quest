/** Hosts a stop check (pass, lock-in or week check) and then its result. */
import { useRef, useState } from 'react';
import { seedFor, viewAll } from '../../engine/journey/mastery';
import { createRng } from '../../engine/rng';
import type { Item } from '../../engine/types';
import { STOPS, stopById } from '../../content/stops';
import { useStore, type Route } from '../store';
import { CheckRunner } from '../components/CheckRunner';
import { CheckResult } from '../components/CheckResult';
import type { AnswerRecord } from '../components/contracts';

type CheckRoute = Extract<Route, { name: 'check' }>;

/** Seconds per check question when the grown-up timer is on. */
export const CHECK_SECONDS = 90;

export function CheckScreen({ route }: { route: CheckRoute }) {
  const { state, player, save, today, actions } = useStore();
  const stop = stopById(route.stopId);
  const last = state.lastCheck && state.lastCheck.stopId === route.stopId ? state.lastCheck : null;
  const view = save ? viewAll(STOPS, save.stops, today).find((v) => v.stop.id === route.stopId)?.view : undefined;
  const showResult = !!route.result && !!last;
  const open = !showResult && !!view && view.due === route.kind;

  // Built once, on the first render. The seed includes the attempt and the moment the check opened, so a retry
  // is new and so is a check that was left partway and opened again (no previewing the questions).
  const [items] = useState<Item[] | null>(() => {
    if (!open || !stop?.check || !player || !save) return null;
    const attempts = save.stops[stop.id]?.attempts ?? 0;
    return stop.check(createRng(seedFor(player.id, stop.id, route.kind, attempts, Date.now())));
  });

  // Each answer counts (answer stats and the notebook) as soon as it is given, so a check closed partway still
  // keeps its misses. `recorded` is how many of the answers so far have been counted.
  const recorded = useRef(0);
  const recordNew = (answered: AnswerRecord[]) => {
    for (const r of answered.slice(recorded.current)) actions.recordAnswer(r);
    recorded.current = Math.max(recorded.current, answered.length);
  };

  const toJourney = () => actions.navigate({ name: 'journey' });

  if (!stop || !save) return <NotOpen onBack={toJourney} />;

  if (showResult && last) {
    // Only lessons still to redo keep their "Learn this again" button and show in the retry note.
    const notYet = save.stops[stop.id]?.notYet;
    const missed = last.passed ? [] : last.missed.filter((id) => !notYet?.redone.includes(id));
    return (
      <div className="page-play">
        <CheckResult
          stop={stop}
          kind={last.kind}
          items={last.items}
          records={last.records}
          passed={last.passed}
          missed={missed}
          onLearnAgain={(lessonId) => actions.navigate({ name: 'lesson', stopId: stop.id, lessonId, from: 'check' })}
          onDone={toJourney}
        />
      </div>
    );
  }

  if (!items || items.length === 0) return <NotOpen onBack={toJourney} />;

  return (
    <div className="page-play">
      <CheckRunner
        stop={stop}
        kind={route.kind}
        items={items}
        timeLimit={save.settings.timer ? CHECK_SECONDS : null}
        readAloud={save.settings.readAloud}
        onFinish={(records) => {
          recordNew(records);
          actions.finishCheck(stop.id, route.kind, items, records);
          actions.navigate({ name: 'check', stopId: stop.id, kind: route.kind, result: true });
        }}
        onProgress={(answered) => {
          recordNew(answered);
          actions.checkAnswered(stop.id, route.kind, answered);
        }}
        onExit={(answered) => {
          recordNew(answered);
          actions.leaveCheck(stop.id, route.kind, answered);
          toJourney();
        }}
      />
    </div>
  );
}

function NotOpen({ onBack }: { onBack(): void }) {
  return (
    <div className="page">
      <p className="soft-text">This check is not open right now.</p>
      <button type="button" className="btn primary" onClick={onBack}>Back to the Journey</button>
    </div>
  );
}

