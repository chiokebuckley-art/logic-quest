import { BridgeProgressCard } from '../pattern/PatternBridge';
/** Progress: counts for the player, and a Grown-ups view with time, skills and a CSV download. */
import { useState } from 'react';
import { viewAll } from '../../engine/journey/mastery';
import { statsCsv } from '../../engine/save/save';
import { STOPS, stopById } from '../../content/stops';
import {
  DAILY_GOAL_MINUTES, firstTryWinsThisWeek, fileSlug, minutesByDay, minutesOn, needsPractice, pathDot, percent,
  shortDay, skillLabel, skillRows, stopCounts, strongSkills, totalMinutes, totals, type DayMinutes, type PathDot, type SkillRow,
} from '../progressStats';
import { downloadText, useStore } from '../store';
import { Icon } from '../components/Icon';
import { TodayMeter } from './JourneyScreen';

type View = 'me' | 'grown';
const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

export function ProgressScreen() {
  const [view, setView] = useState<View>('me');
  return (
    <div className="page">
      <div className="row between wrap" style={{ gap: 8 }}>
        <h2 className="page-title">PROGRESS</h2>
        <div className="seg pill" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === 'me'} onClick={() => setView('me')}>My Progress</button>
          <button type="button" role="radio" aria-checked={view === 'grown'} onClick={() => setView('grown')}>Grown-ups</button>
        </div>
      </div>
      <BridgeProgressCard />
      {view === 'me' ? <MyProgress /> : <GrownUps />}
    </div>
  );
}

// ---------- My Progress ----------

const DOT_WORD: Record<PathDot, string> = {
  gold: 'Locked in',
  passed: 'Passed',
  current: 'You are here',
  locked: 'Not open yet',
  soon: 'Coming soon',
};

function MyProgress() {
  const { save, today, actions } = useStore();
  if (!save) return null;
  const counts = stopCounts(save.stops);
  const wins = firstTryWinsThisWeek(save.stats, today);
  const views = viewAll(STOPS, save.stops, today);
  const dots = views.map(({ stop, view }) => ({ stop, dot: pathDot(view.status) }));
  const here = dots.find((d) => d.dot === 'current');
  const minutes = minutesOn(save.active, today);
  const open = Object.keys(save.notebook ?? {}).length;
  const summary = `${counts.mastered ? `${counts.mastered} mastered, ` : ''}${counts.lockedIn} ${counts.lockedIn === 1 ? 'stop' : 'stops'} locked in, ${counts.passed} passed${here ? `, you are on Stop ${here.stop.n}` : ''}, out of ${STOPS.length}`;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="tiles four">
        <Tile value={wins} label="first-try wins this week" color="var(--teal-soft)" />
        <Tile value={counts.passed} label={counts.passed === 1 ? 'stop passed' : 'stops passed'} color="var(--amber-soft)" />
        <Tile value={counts.lockedIn} label={counts.lockedIn === 1 ? 'stop locked in' : 'stops locked in'} color="var(--gold-soft)" />
        <button type="button" className="tile tile-btn" onClick={() => actions.navigate({ name: 'notebook' })}>
          <span className="tile-value" style={{ color: 'var(--cyan)' }}>{open}</span>
          <span className="tile-label">
            {open === 1 ? 'repair quest' : 'repair quests'}
            <span className="sr-only">. Open the notebook.</span>
          </span>
        </button>
      </div>
      {counts.mastered > 0 && (
        <p className="soft-text" style={{ fontSize: 14 }}>
          <strong style={{ color: 'var(--text)' }}>{counts.mastered} {counts.mastered === 1 ? 'stop is' : 'stops are'} mastered:</strong> passed three times, the last about a week later.
        </p>
      )}

      <section className="panel" style={{ gap: 8 }}>
        <p>You played <strong>{minutes} of {DAILY_GOAL_MINUTES} minutes</strong> today.</p>
        <TodayMeter seconds={save.active[today] ?? 0} />
      </section>

      <section className="panel soft" aria-labelledby="path-title" style={{ gap: 10 }}>
        <h3 id="path-title" className="section-title">YOUR JOURNEY</h3>
        <div className="path-strip" role="img" aria-label={summary}>
          {dots.map(({ stop, dot }) => <div key={stop.id} className={`path-dot ${dot}`} title={`Stop ${stop.n}: ${DOT_WORD[dot]}`} />)}
        </div>
        <div className="legend" aria-hidden="true">
          <span><i style={{ background: 'var(--brass)' }} />Locked in</span>
          <span><i style={{ background: 'var(--teal)' }} />Passed</span>
          <span><i style={{ background: 'var(--amber)' }} />You are here</span>
          <span><i style={{ background: '#64748b' }} />Not open yet</span>
          <span><i style={{ background: '#334155' }} />Coming soon</span>
        </div>
        {here ? (
          <p className="soft-text" style={{ fontSize: 14 }}>
            You are here: <strong style={{ color: 'var(--text)' }}>Stop {here.stop.n} · {here.stop.title}</strong>{/[.?!]$/.test(here.stop.title) ? '' : '.'}
          </p>
        ) : (
          <p className="soft-text" style={{ fontSize: 14 }}>You have done every open stop. New stops are coming soon.</p>
        )}
      </section>
    </div>
  );
}

function Tile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="tile">
      <span className="tile-value" style={color ? { color } : undefined}>{value}</span>
      <span className="tile-label">{label}</span>
    </div>
  );
}

// ---------- Grown-ups ----------

function GrownUps() {
  const { save, today, player, actions } = useStore();
  const [range, setRange] = useState<Range>(7);
  if (!save || !player) return null;

  const days = minutesByDay(save.active, today, range);
  const rows = skillRows(save.stats, today, range);
  const t = totals(save.stats, today, range);
  const rate = percent(t.firstTry, t.answered);
  const weak = needsPractice(rows);
  const strong = strongSkills(rows);
  const counts = stopCounts(save.stops);

  const practiceRoute = (skill: string) => {
    const stop = stopById(skill.split('.')[0]);
    return stop?.practice && save.stops[stop.id]?.passDay ? stop.id : null;
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        <div className="pills" role="radiogroup" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} aria-label={`Last ${r} days`} onClick={() => setRange(r)}>
              {r} d
            </button>
          ))}
        </div>
        <div className="grow" />
        <button
          type="button"
          className="btn"
          onClick={() => downloadText(`logic-quest-${fileSlug(player.name)}-${today}.csv`, statsCsv(save), 'text/csv')}
        >
          <Icon name="download" size={18} /> Download CSV
        </button>
      </div>

      <div className="tiles">
        <Tile value={totalMinutes(save.active, today, range)} label="minutes" />
        <Tile value={rate === null ? '–' : `${rate}%`} label="right first try" />
        <Tile value={`${counts.lockedIn} / ${STOPS.length}`} label={counts.mastered ? `stops locked in (${counts.mastered} mastered)` : 'stops locked in'} />
      </div>

      <section className="panel soft" aria-labelledby="nb-title" style={{ gap: 6 }}>
        <h3 id="nb-title" className="section-title">WRONG-ANSWER NOTEBOOK</h3>
        <div className="row between wrap" style={{ gap: 8 }}>
          <p>
            <strong>Notebook: {Object.keys(save.notebook ?? {}).length} open, {save.fixedCount ?? 0} cleared</strong>
          </p>
          <button type="button" className="btn" aria-label="Open the notebook" onClick={() => actions.navigate({ name: 'notebook' })}>Open</button>
        </div>
        <p className="small muted">
          Each missed question becomes a card. A card is cleared after three first-try answers on new questions, a few days apart.
        </p>
      </section>

      <section className="panel soft" aria-labelledby="minutes-title" style={{ gap: 8 }}>
        <h3 id="minutes-title" className="section-title">MINUTES PER DAY</h3>
        <MinutesChart days={days} range={range} />
      </section>

      <section className="panel soft" aria-labelledby="skills-title" style={{ gap: 8 }}>
        <h3 id="skills-title" className="section-title">SKILLS</h3>
        {rows.length === 0 ? (
          <p className="muted">No answers in these days yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">Skill</th><th scope="col" className="num">Answered</th><th scope="col" className="num">First try</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.skill}>
                    <td>{skillLabel(r.skill)}</td>
                    <td className="num">{r.answered}</td>
                    <td className="num">{percent(r.firstTry, r.answered)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel soft" aria-labelledby="weak-title" style={{ gap: 8, borderColor: 'rgba(255, 179, 71, 0.4)' }}>
        <h3 id="weak-title" className="section-title" style={{ color: 'var(--amber-soft)' }}>NEEDS PRACTICE</h3>
        {weak.length === 0 ? (
          <p className="muted small">Nothing yet. A skill shows here after 5 answers with under 70% right on the first try.</p>
        ) : (
          weak.map((r) => <SkillLine key={r.skill} row={r} practice={practiceRoute(r.skill)} onPractice={(id) => actions.navigate({ name: 'arcade', practice: id })} />)
        )}
      </section>

      <section className="panel soft" aria-labelledby="strong-title" style={{ gap: 6, borderColor: 'rgba(45, 212, 191, 0.4)' }}>
        <h3 id="strong-title" className="section-title" style={{ color: 'var(--teal-soft)' }}>STRONG</h3>
        {strong.length === 0 ? (
          <p className="muted small">Nothing yet. A skill shows here after 5 answers with 80% or more right on the first try.</p>
        ) : (
          strong.map((r) => (
            <div key={r.skill} className="row between" style={{ fontSize: 14 }}>
              <span>{skillLabel(r.skill)}</span>
              <span className="soft-text" style={{ fontWeight: 700 }}>{r.firstTry} of {r.answered} · {percent(r.firstTry, r.answered)}%</span>
            </div>
          ))
        )}
      </section>

      <p className="small muted">
        “First try” means the first answer to a question was right. Needs practice: 5 or more answers, under 70% first try.
        Strong: 5 or more answers, 80% or more.
      </p>
    </div>
  );
}

function SkillLine({ row, practice, onPractice }: { row: SkillRow; practice: string | null; onPractice(stopId: string): void }) {
  const label = skillLabel(row.skill);
  return (
    <div className="row">
      <div className="grow stack" style={{ gap: 0, lineHeight: 1.3 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span className="small soft-text">{row.firstTry} of {row.answered} right first try ({percent(row.firstTry, row.answered)}%)</span>
      </div>
      {practice && (
        <button type="button" className="btn primary" aria-label={`Practice: ${label}`} onClick={() => onPractice(practice)}>Practice</button>
      )}
    </div>
  );
}

/** One teal column per day (single series, so no legend), hover tips, and a table view. */
function MinutesChart({ days, range }: { days: DayMinutes[]; range: Range }) {
  const max = Math.max(0, ...days.map((d) => d.minutes));
  const top = Math.max(max, 5);
  const total = days.reduce((s, d) => s + d.minutes, 0);
  const best = days.reduce<DayMinutes | null>((b, d) => (d.minutes > (b?.minutes ?? 0) ? d : b), null);
  const label = total === 0
    ? `Minutes per day, last ${range} days: no play yet.`
    : `Minutes per day, last ${range} days. ${total} minutes in all. Most in one day: ${best?.minutes} on ${best ? shortDay(best.day) : ''}.`;

  return (
    <>
      <div className="row between small muted">
        <span>Most: {max} min</span>
        <span>Goal: {DAILY_GOAL_MINUTES} min a day</span>
      </div>
      <div className="bars" role="img" aria-label={label}>
        {days.map((d) => (
          <div key={d.day} className="bar-col" title={`${shortDay(d.day)}: ${d.minutes} min`}>
            <i style={{ height: `${d.minutes ? Math.max(4, (d.minutes / top) * 100) : 0}%` }} />
            <span className="bar-tip" aria-hidden="true">{shortDay(d.day)}: {d.minutes} min</span>
          </div>
        ))}
      </div>
      <div className="bars-axis" aria-hidden="true">
        <span>{shortDay(days[0]?.day ?? '')}</span>
        <span>{shortDay(days[days.length - 1]?.day ?? '')}</span>
      </div>
      <details>
        <summary>Show as a table</summary>
        <table className="table">
          <thead><tr><th scope="col">Day</th><th scope="col" className="num">Minutes</th></tr></thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day}><td>{shortDay(d.day)}</td><td className="num">{d.minutes}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

