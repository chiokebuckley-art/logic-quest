/**
 * The Pattern Observatory's evidence checks on one place: the independent check (6 fresh items, 5 right, no hints),
 * a delayed review (4 fresh items, 3 right, about 2 days, 1 week and 3 to 4 weeks after the lesson), or a place's
 * 3-item primer (a quick showing of a skill a place needs). No timer, no hints, no feedback until the end; leaving
 * early discards the run (it is never a "try" against the learner).
 */
import { useRef, useState } from 'react';
import { EVIDENCE, profileOf } from '../../engine/evidence';
import { seedFor } from '../../engine/journey/mastery';
import { looks } from '../../engine/fresh';
import { createRng } from '../../engine/rng';
import type { Item, LessonDef, StopDef } from '../../engine/types';
import { stopById } from '../../content/stops';
import { useStore, type EvidenceKind, type Route } from '../store';
import { Dots, ItemView, PlayHeader, type DotState } from '../components/ItemView';
import { EvidenceProfile } from '../components/EvidenceProfile';
import type { AnswerRecord } from '../components/contracts';
import { placeNeeds, placeTitle } from '../observatory';

type EvidenceRoute = Extract<Route, { name: 'evidence' }>;

export const EVIDENCE_TITLE: Record<EvidenceKind, string> = { independent: 'Independent check', review: 'Review', primer: 'Primer' };

/** Fresh items for a place: the lesson's own builder, else distinct items from its practice packs over several seeds. */
export function evidenceItems(stop: StopDef, lesson: LessonDef, kind: EvidenceKind, stage: 1 | 2 | 3, seed: number): Item[] {
  const rng = createRng(seed);
  if (kind === 'primer') return (lesson.primer?.(rng) ?? []).slice(0, EVIDENCE.primer.items);
  const own = kind === 'independent' ? lesson.independent?.(rng) : lesson.review?.(rng, stage);
  const want = kind === 'independent' ? EVIDENCE.independent.items : EVIDENCE.review.items;
  if (own && own.length) return own.slice(0, want);
  const out: Item[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 40 && out.length < want; i++) {
    const pack = [...lesson.practice(createRng(seed + i * 104729)), ...(stop.check?.(createRng(seed + i * 7919)).filter((x) => x.lesson === lesson.id) ?? [])];
    for (const x of pack) {
      if (out.length >= want) break;
      if (x.workFirst || x.fixed || seen.has(looks(x))) continue;
      seen.add(looks(x));
      out.push({ ...x, id: `${lesson.id}-${kind}${stage}-${out.length + 1}` });
    }
  }
  return out;
}

export function EvidenceScreen({ route }: { route: EvidenceRoute }) {
  const { player, save, today, actions } = useStore();
  const stop = stopById(route.stopId);
  const lesson = stop?.lessons.find((l) => l.id === route.lessonId);
  const back = () => actions.navigate({ name: 'stop', stopId: route.stopId });
  const le = save?.evidence.lessons[route.lessonId];
  const stage = Math.min(3, Math.max(1, (le?.retained.stage ?? 0) + 1)) as 1 | 2 | 3;
  const [items] = useState<Item[]>(() => {
    if (!stop || !lesson || !save) return [];
    const profile = profileOf(save.evidence, lesson.id, today);
    const open = route.kind === 'independent' ? profile.independentDue : route.kind === 'review' ? profile.reviewDue : !!lesson.primer && placeNeeds(lesson, save).length > 0;
    if (!open) return [];
    return evidenceItems(stop, lesson, route.kind, stage, seedFor(player?.id ?? 'guest', lesson.id, route.kind, Date.now()));
  });
  const [i, setI] = useState(0);
  const [done, setDone] = useState<{ right: number } | null>(null);
  const records = useRef<AnswerRecord[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!stop || !lesson || !save) return <NotOpen onBack={back} />;
  const title = EVIDENCE_TITLE[route.kind];
  const plain = save.evidence.plain;
  const name = placeTitle(lesson, plain);
  if (!items.length) return <NotOpen onBack={back} what={`The ${title.toLowerCase()} for ${name} is not open right now.`} />;

  const answered = (r: AnswerRecord) => {
    records.current = [...records.current.slice(0, i), r];
    actions.recordAnswer(r);
    actions.recordEvidence(r, route.kind === 'primer' ? 'primer' : route.kind === 'review' ? 'review' : 'check');
    if (i + 1 < items.length) {
      setI(i + 1);
      rootRef.current?.scrollIntoView?.({ block: 'start' });
      return;
    }
    const right = records.current.filter((x) => x.correct).length;
    actions.finishEvidence(lesson.id, route.kind, right, items.length);
    setDone({ right });
  };

  if (done) {
    const need = route.kind === 'independent' ? EVIDENCE.independent.need : route.kind === 'review' ? EVIDENCE.review.need : EVIDENCE.primer.need;
    const passed = done.right >= need;
    const profile = profileOf(save.evidence, lesson.id, today);
    return (
      <div className="page-play">
        <div className="play-root">
          <PlayHeader over={`${stop.title} · ${name}`} title={title} onBack={back} backLabel="Back to the stop" />
          <section className="play-card" aria-labelledby="ev-done">
            <span className="play-kicker">{passed ? 'Shown' : 'Not this time'}</span>
            <h2 id="ev-done" className="play-idea-title">{done.right} of {items.length} right</h2>
            <p className="play-body">
              {route.kind === 'primer'
                ? passed ? `That shows the skill ${name} needs. The place is open.` : `Not all right yet. Do the lesson it names first, or try the primer again later.`
                : route.kind === 'independent'
                  ? passed ? 'Fresh questions, no hints, on your own. That is independent evidence.' : `Independent needs ${need} of ${items.length}. That is fine: the lesson is still complete. Try again on another day.`
                  : passed ? `Still there after the gap. Retained, stage ${profile.retained} of 3.` : `Not quite this time. The ideas can come back; another review opens tomorrow.`}
            </p>
            {route.kind !== 'primer' && <EvidenceProfile profile={profile} />}
            <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={back}>Back to the stop</button>
          </section>
        </div>
      </div>
    );
  }

  const dots: DotState[] = items.map((_, k) => (k < i ? 'done' : k === i ? 'now' : 'todo'));
  return (
    <div className="page-play">
      <div className="play-root" ref={rootRef}>
        <PlayHeader over={`${stop.title} · ${name}`} title={title} onBack={back} backLabel="Leave (nothing is counted)" />
        <div className="play-progress">
          <Dots states={dots} label={`Question ${i + 1} of ${items.length}`} />
          <span className="play-muted">No timer · no hints</span>
        </div>
        {i === 0 && (
          <p className="play-note">
            {route.kind === 'independent'
              ? `Fresh questions on your own: ${EVIDENCE.independent.need} of ${items.length} right shows this is yours. No hints here, and nothing is lost if it is not today.`
              : route.kind === 'review'
                ? `A few fresh questions after a gap: ${EVIDENCE.review.need} of ${items.length} right keeps this retained.`
                : `Three quick questions on a skill this place needs. All right opens the place now.`}
          </p>
        )}
        <ItemView key={items[i].id} item={items[i]} mode="check" readAloud={save.settings.readAloud} timeLimit={null} kicker={`Question ${i + 1} of ${items.length}`} nextLabel={i + 1 < items.length ? 'Next' : 'Finish'} onDone={answered} />
      </div>
    </div>
  );
}

function NotOpen({ onBack, what = 'This check is not open right now.' }: { onBack(): void; what?: string }) {
  return (
    <div className="page">
      <p className="soft-text">{what}</p>
      <button type="button" className="btn primary" onClick={onBack}>Back to the stop</button>
    </div>
  );
}
