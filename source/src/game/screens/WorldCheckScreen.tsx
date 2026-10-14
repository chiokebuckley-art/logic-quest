/**
 * A world check in the Kid Journey (docs/KID-JOURNEY.md §2), then its result. The questions come from the world's
 * rounds (several seeds, no scaffolded or fixed items, one new id per round, no two alike); every answer must be
 * right. A pass builds the world's building (and, for the band's last world, earns the grade badge: the ceremony
 * shows once). A miss names the rounds to play again; "Learn it again" opens the round and comes back here. In kid mode
 * (Grades 1 to 3) the result is compact, in the band's word budget: "Not yet." with one row per missed round, or "You
 * built it!" with the building.
 */
import { useEffect, useRef, useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import type { Item } from '../../engine/types';
import { bandOfWorld, gradeById, worldById, type WorldDef } from '../../content/grades';
import { stopById } from '../../content/stops';
import { roundsToRedo, worldCheckItems, worldCheckOpen } from '../kid';
import { lessonById } from '../observatory';
import { useStore, type LastWorldCheck, type Route } from '../store';
import { CheckRunner } from '../components/CheckRunner';
import { MissedItem } from '../components/CheckResult';
import { PlayHeader } from '../components/ItemView';
import { Building } from '../components/KidJourney';
import { PICTO_WORDS, Pictogram } from '../components/Pictogram';
import { ReadAloudButton } from '../components/ReadAloud';
import { PlayIcon } from '../components/ThingCard';
import type { AnswerRecord } from '../components/contracts';
import { KidModeContext, checkSeconds, kidModeOf, useKidMode } from '../kidMode';
import { asSentence } from '../speech';
import { CHECK_SECONDS } from './CheckScreen';
import { sayRoundStart } from '../kidPlay';

type WorldCheckRoute = Extract<Route, { name: 'worldcheck' }>;

/** The note over the first question of a world check. */
export const WORLD_CHECK_NOTE = 'Every answer must be right. A miss sends you back to that round, then new questions.';
/** The note on the kid "Ready?" screen (Grades 1 to 3), in the band's word budget. */
export const WORLD_CHECK_KID_NOTE = 'Get every one right.';

export function WorldCheckScreen({ route }: { route: WorldCheckRoute }) {
  const { state, player, save, actions } = useStore();
  const world = worldById(route.worldId);
  const band = bandOfWorld(route.worldId);
  const last = state.lastWorldCheck && state.lastWorldCheck.worldId === route.worldId ? state.lastWorldCheck : null;
  const showResult = !!route.result && !!last;
  const toMap = () => actions.navigate({ name: 'journey', track: 'grades' });

  // Drawn once, on the first render; the seed includes the try and the moment, so a retry brings new questions.
  const [items] = useState<Item[] | null>(() => {
    // Locked until every round has a star, and after a miss until every missed round is played again.
    if (showResult || !world || !band || !save || !player || !worldCheckOpen(save, world)) return null;
    const tries = save.kid.worlds[world.id]?.tries ?? 0;
    // In kid mode an item with a kid-only alternate is asked as that alternate, and the result keeps the same item.
    return worldCheckItems(world, gradeById(band).check.items, seedFor(player.id, world.id, tries, Date.now()), kidModeOf(save));
  });

  const recorded = useRef(0);
  const recordNew = (answered: AnswerRecord[]) => {
    for (const r of answered.slice(recorded.current)) actions.recordAnswer(r);
    recorded.current = Math.max(recorded.current, answered.length);
  };

  if (!world || !band || !save) return <NotOpen onBack={toMap} />;

  if (showResult && last) {
    return (
      <KidModeContext.Provider value={kidModeOf(save)}>
        <div className="page-play">
          <WorldCheckResult
            world={world}
            result={last}
            readAloud={save.settings.readAloud}
            onLearnAgain={(lessonId) => {
              // The round opens fresh on its first card: start reading it from this tap.
              sayRoundStart(save, lessonId, true);
              actions.navigate({ name: 'lesson', stopId: lessonId.split('.')[0], lessonId, from: 'worldcheck' });
            }}
            onDone={toMap}
          />
        </div>
      </KidModeContext.Provider>
    );
  }

  const stop = items?.[0] ? stopById(items[0].lesson.split('.')[0]) : undefined;
  if (!items || !items.length || !stop) return <NotOpen redo={!!world && roundsToRedo(save, world).length > 0} onBack={toMap} />;

  const kidMode = kidModeOf(save);
  return (
    <KidModeContext.Provider value={kidMode}>
      <div className="page-play">
        <CheckRunner
          stop={stop}
          kind="pass"
          header={{ over: `${gradeById(band).label} · ${world.title}`, title: 'World check' }}
          note={kidMode ? WORLD_CHECK_KID_NOTE : WORLD_CHECK_NOTE}
          ready={!!kidMode}
          items={items}
          timeLimit={checkSeconds(save, CHECK_SECONDS)}
          readAloud={save.settings.readAloud}
          onProgress={recordNew}
          onFinish={(records) => {
            recordNew(records);
            const out = actions.finishWorldCheck(world.id, items, records);
            actions.navigate(out?.badge ? { name: 'badge', grade: out.badge } : { name: 'worldcheck', worldId: world.id, result: true });
          }}
          onExit={(answered) => {
            recordNew(answered);
            toMap();
          }}
        />
      </div>
    </KidModeContext.Provider>
  );
}

interface WorldCheckResultProps {
  world: WorldDef;
  result: LastWorldCheck;
  readAloud: boolean;
  onLearnAgain(lessonId: string): void;
  onDone(): void;
}

/**
 * A world check's result: all right builds the world's building; a miss lists each round to play again. Kid mode
 * draws the compact result (KidWorldCheckResult); classic play keeps the full one with the missed questions.
 */
export function WorldCheckResult(props: WorldCheckResultProps) {
  return useKidMode() ? <KidWorldCheckResult {...props} /> : <ClassicWorldCheckResult {...props} />;
}

/** The missed rounds of a world check, in the world's order: their number in the world and their title. */
export function missedRounds(world: WorldDef, missed: readonly string[]): { id: string; k: number; title: string }[] {
  return world.rounds.filter((id) => missed.includes(id)).map((id) => ({ id, k: world.rounds.indexOf(id) + 1, title: lessonById(id)?.title ?? id }));
}

/**
 * The world check's result in kid mode (Grades 1 to 3), in the band's word budget. A pass: "You built it!", the
 * building and one button. A miss: "Not yet." with the big question picture, "Play these again." and one big tile per
 * missed round showing its number in the world (its title is read aloud and announced; a tap opens the round and comes
 * back here), then an icon button back to the map; no list of missed questions. Two sentences and a digit per round,
 * so it fits Grade 1 with every round of a world missed.
 */
function KidWorldCheckResult({ world, result, readAloud, onLearnAgain, onDone }: WorldCheckResultProps) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  const rows = missedRounds(world, result.missed);
  if (result.passed) {
    return (
      <div className="play-root">
        <section className="play-card kid-star-screen kid-wc-result is-pass" aria-labelledby="kid-wc-title">
          <div className="kid-feedback-top">
            <span />
            {readAloud && <ReadAloudButton text={() => ['You built it!', asSentence(`The ${world.title} ${PICTO_WORDS[world.building]}`)]} />}
          </div>
          <h2 className="play-idea-title kid-star-title" id="kid-wc-title" ref={headRef} tabIndex={-1}>
            You built it!
          </h2>
          <div className="kid-pic">
            <Building world={world} built size={120} />
          </div>
          <button type="button" className="play-btn play-btn--primary play-btn--block kid-big-btn" onClick={onDone}>
            Back to the map
          </button>
        </section>
      </div>
    );
  }
  return (
    <div className="play-root">
      <section className="play-card kid-star-screen kid-wc-result is-notyet" aria-labelledby="kid-wc-title">
        <div className="kid-feedback-top">
          <span />
          {readAloud && <ReadAloudButton text={() => ['Not yet.', 'Play these again.', ...rows.map((r) => asSentence(`Round ${r.k}: ${r.title}`))]} />}
        </div>
        <h2 className="play-idea-title kid-star-title" id="kid-wc-title" ref={headRef} tabIndex={-1}>
          Not yet.
        </h2>
        <div className="kid-pic">
          <Pictogram name="question" size={96} decorative />
        </div>
        <p className="kid-line-small" id="kid-wc-again">Play these again.</p>
        <ul className="kid-wc-rows kid-tiles kid-tiles--many" aria-labelledby="kid-wc-again">
          {rows.map((r) => (
            <li key={r.id} className="kid-wc-row">
              <button type="button" className="kid-tile kid-wc-tile" aria-label={`Round ${r.k}: ${r.title}. Learn it again.`} onClick={() => onLearnAgain(r.id)}>
                <span className="kid-wc-num" aria-hidden="true">{r.k}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="play-btn play-btn--ghost play-btn--block kid-big-btn kid-wc-back" aria-label="Back to the map" title="Back to the map" onClick={onDone}>
          <PlayIcon name="back" size={24} />
        </button>
      </section>
    </div>
  );
}

/** The classic result (no kid mode): the score, the building or the missed questions of each round to play again. */
function ClassicWorldCheckResult({ world, result, readAloud, onLearnAgain, onDone }: WorldCheckResultProps) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  const { items, records, passed, missed } = result;
  const right = items.filter((_, i) => records[i]?.correct).length;
  return (
    <div className="play-root">
      <PlayHeader over={world.title} title="World check" onBack={onDone} backLabel="Back to the map" />
      <div className={`play-result-hero ${passed ? 'is-pass' : 'is-notyet'}`}>
        <h2 className={`play-score-head ${passed ? 'is-pass' : 'is-notyet'}`} ref={headRef} tabIndex={-1}>
          {passed ? 'Passed' : `Not yet · ${right} of ${items.length}`}
        </h2>
        {passed && <Building world={world} built size={72} />}
        <p className="play-body">{passed ? `You built the ${world.title} ${PICTO_WORDS[world.building]}!` : 'Every answer must be right.'}</p>
      </div>
      {!passed &&
        missed.map((id) => {
          const title = lessonById(id)?.title ?? id;
          const mine = items.map((item, i) => ({ item, record: records[i] })).filter((x) => x.item.lesson === id && !x.record?.correct);
          return (
            <section key={id} className="play-card play-missed-group" aria-labelledby={`wc-missed-${id}`}>
              <span className="play-kicker play-kicker--amber">Round to play again</span>
              <h3 className="play-subhead" id={`wc-missed-${id}`}>Round {world.rounds.indexOf(id) + 1} · {title}</h3>
              <ul className="play-missed-list">
                {mine.map((w) => <MissedItem key={w.item.id} item={w.item} record={w.record} readAloud={readAloud} />)}
              </ul>
              <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={() => onLearnAgain(id)}>
                Learn it again
              </button>
            </section>
          );
        })}
      <button type="button" className={`play-btn ${passed ? 'play-btn--primary' : 'play-btn--ghost'} play-btn--block`} onClick={onDone}>
        Back to the map
      </button>
    </div>
  );
}

function NotOpen({ onBack, redo = false }: { onBack(): void; redo?: boolean }) {
  return (
    <div className="page">
      <p className="soft-text">{redo ? 'Play the missed rounds first.' : 'This check opens when every round has a star.'}</p>
      <button type="button" className="btn primary" onClick={onBack}>Back to the map</button>
    </div>
  );
}
