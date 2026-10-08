import { useEffect, useRef, useState } from 'react';
import { useStore, type Route } from '../store';
import { viewAll } from '../../engine/journey/mastery';
import { STOPS } from '../../content/stops';
import { stopRoute } from '../screens/JourneyScreen';
import { ROUTINE, DESTINATIONS, makeRound, type AgePath, type Question, type Token } from './bridges';

export const art = (name: string) => `${import.meta.env.BASE_URL}artwork/pl-${name}.webp`;
export function RoutineChip({ step }: { step?: number }) {
  return <ol className="pl-routine" aria-label="Thinking routine">{ROUTINE.map((word, i) =>
    <li key={word} aria-current={step === i ? 'step' : undefined}><img src={art(`icon-${word.toLowerCase()}`)} alt="" />{word}</li>)}</ol>;
}
export function DestinationArt({ stopId }: { stopId: string }) {
  const destination = DESTINATIONS.find(d => d.stop === stopId);
  return destination ? <img className="pl-stop-art" src={art(`bridge-${destination.art}`)} alt="" loading="lazy" /> : null;
}
export function BridgeProgressCard() {
  const { save } = useStore();
  if (!save) return null;
  const p = save.patternBridge;
  return <section className="panel pl-progress"><h3>Pattern bridges</h3><p>Optional preparation · {p.completed.length + (p.workshop ? 1 : 0)} preparation activities completed</p>
    <div className="pl-badges">{p.workshop && <figure><img src={art('badge-pattern-scout')} alt="" /><figcaption>Pattern Scout</figcaption></figure>}
      {p.evidenceScout && <figure><img src={art('badge-evidence-scout')} alt="" /><figcaption>Evidence Scout</figcaption></figure>}</div>
    <p className="small soft-text">Bridge badges show preparation. Logic Quest stop checks, Proof, and Junior Badge requirements stay separate.</p></section>;
}
export function PatternBridgeHome({ open = false }: { open?: boolean } = {}) {
  const { save, actions, today } = useStore();
  if (!save) return null;
  const p = save.patternBridge;
  const views = viewAll(STOPS, save.stops, today);
  return <section className="pl-home" aria-labelledby="pl-title"><details open={open || undefined}><summary id="pl-title">Pattern bridges · Workshop and activities</summary>
    <div className="row between wrap"><div><div className="kicker">Engineering Quest connection</div><h2>Choose your preparation</h2></div>
    <label className="pl-path">Learning path<select aria-label="Learning path" value={p.path} onChange={e => actions.setPatternPath(e.target.value as AgePath)}>
      {(['Explorer','Trailblazer','Logician'] as const).map(path => <option key={path}>{path}</option>)}</select></label></div>
    <p>Practice a shared way to think. Keep learning statements, operators, and proof in your Journey.</p>
    {p.path === 'Explorer' && <div className="pl-workshop-card"><picture><source media="(max-width: 480px)" srcSet={art('pattern-workshop-portrait')} /><img src={art('pattern-workshop-landscape')} alt="An invention workshop with an empty scanner and conveyor" /></picture>
      <div><h3>Pattern Workshop</h3><p>Optional · about 5–8 minutes. Notice, sort, repeat, and ask for another case.</p>
      <button className="btn primary" onClick={() => actions.navigate({name:'pattern',workshop:true})}>{p.workshop ? 'Replay Workshop' : 'Enter Workshop'}</button>
      <p className="small soft-text">You can continue straight to Signal Camp in the Journey. The Workshop is preparation, not a stop check.</p></div></div>}
    <div className="pl-destinations">{DESTINATIONS.filter(d => (d.paths as readonly string[]).includes(p.path)).map(d => {
      const v = views.find(v => v.stop.id === d.stop); const go = v && v.view.status !== 'locked' && v.view.status !== 'soon' ? stopRoute(v.stop,v.view) : null;
      return <article key={d.name} className="pl-destination"><img src={art(`bridge-${d.art}`)} alt="" loading="lazy" />
        <div><h3>{d.name}</h3><p>{d.purpose}</p><div className="pl-event-buttons">{d.events.map((id,i) => <button key={id} className="btn" onClick={() => actions.navigate({name:'pattern',event:id})}>
          {p.completed.includes(id) ? 'Replay' : 'Try'} {i+1}<span className="sr-only">: {d.name}, {id}</span>{p.completed.includes(id) && <span aria-label="completed"> ✓</span>}</button>)}</div>
        {go ? <button className="pl-core-link" onClick={() => actions.navigate(go)}>Open the stop: {v?.stop.title}</button> : <p className="small soft-text">{v?.view.status === 'soon' ? 'Full Journey destination coming later. These are preparation activities.' : 'Pass the earlier Journey checks to open the full stop.'}</p>}</div></article>;
    })}</div>
    <RoutineChip />
    <p className="small soft-text">The full 12-unit Pattern Lab belongs in Engineering Quest. These bridges cover overlapping skills only.</p>
  </details></section>;
}

function ExactTokens({ tokens }: { tokens: Token[] }) {
  return <div className={`pl-tokens${tokens.length >= 6 ? ' pl-sequence' : ''}`} aria-label="Evidence objects in order">{tokens.map((t,i) => <figure key={i}><svg viewBox="0 0 80 80" role="img" aria-label={t.label ?? `${t.color} ${t.shape}`}>
    {t.shape === 'circle' ? <circle cx="40" cy="40" r="29" fill={t.color === 'teal' ? '#167d88' : '#dca231'} stroke="#14263e" strokeWidth="3" /> : t.shape === 'square' ? <rect x="11" y="11" width="58" height="58" fill={t.color === 'teal' ? '#167d88' : '#dca231'} stroke="#14263e" strokeWidth="3" /> : <path d="M40 8 L73 68 H7 Z" fill={t.color === 'teal' ? '#167d88' : '#dca231'} stroke="#14263e" strokeWidth="3" />}
    </svg><figcaption>{t.label}</figcaption></figure>)}</div>;
}
export function PatternBridgeScreen({ route }: { route: Extract<Route,{name:'pattern'}> }) {
  const { save, actions } = useStore();
  const ids = route.workshop ? ['workshop-notice','workshop-sort','workshop-repeat','workshop-uncertain'] : [route.event ?? 'SC-01'];
  const [seed] = useState(() => Date.now());
  const [roundIndex,setRoundIndex] = useState(0);
  const [step,setStep] = useState(0);
  const [selected,setSelected] = useState('');
  const [feedback,setFeedback] = useState<{right:boolean;why:string}|null>(null);
  const [done,setDone] = useState(false);
  const [misses,setMisses] = useState(0);
  /** First tries per round: the round's first question answered right on the first go, so bridges count as practice. */
  const roundMisses = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [paused,setPaused] = useState(false);
  useEffect(() => { heading.current?.focus({preventScroll:true}); },[roundIndex,step,done]);
  const round = makeRound(ids[roundIndex],seed+roundIndex);
  const d = DESTINATIONS.find(d => d.events.some(e => e === route.event));
  const advance = () => {
    setSelected('');setFeedback(null);
    if(step<5) {setStep(step+1);return;}
    if(!route.workshop) actions.recordBridgeFirst(ids[roundIndex], roundMisses.current === 0);
    roundMisses.current = 0;
    if(roundIndex<ids.length-1) {setRoundIndex(roundIndex+1);setStep(0);return;}
    actions.finishPatternBridge(route.workshop ? [] : ids,!!route.workshop);setDone(true);
  };
  // Notice (0) and Compare (2) show text; Describe (1), Test (3), Predict (4) and Explain (5) ask. The test result shows once the
  // prediction is right (so the learner commits first) and again under Explain.
  const question: Question | null = step===1?round.describe:step===3?round.test:step===4?round.predict:step===5?round.explain:null;
  if(!save) return null;
  return <div className={`page pl-investigation pl-${save.patternBridge.path.toLowerCase()}`}>
    <div className="row between"><button className="btn" onClick={() => actions.navigate(route.event && d ? {name:'stop',stopId:d.stop} : {name:'library',kind:'lab'})}>{route.event && d ? 'Back to the stop' : 'Back to Pattern Lab'}</button>
      {!done && <button className="btn" onClick={() => setPaused(!paused)}>{paused?'Resume':'Calm Check'}</button>}</div>
    <div className="pl-scene"><picture>{route.workshop && <source media="(max-width:480px)" srcSet={art('pattern-workshop-portrait')} />}
      <img src={art(route.workshop?'pattern-workshop-landscape':`bridge-${d?.art ?? 'signal-camp'}`)} alt="" /></picture>
      <div className="pl-scene-title">{route.workshop?'Pattern Workshop':d?.name}<span>{route.workshop?`${roundIndex+1} of ${ids.length} investigations`:`${route.event} · preparation`}</span></div></div>
    {paused ? <section className="pl-work"><img className="pl-calm" src={art('calm-check')} alt="A learner pauses calmly" /><h2>Pause and check</h2><p>Take your time. Look again at what is known, and what still needs a test.</p><button className="btn primary" onClick={() => setPaused(false)}>Resume investigation</button></section> : done ?
      <section className="pl-work" aria-live="polite"><h2 ref={heading} tabIndex={-1}>Investigation complete</h2><p>{route.workshop?'You earned the Pattern Scout preparation badge.':'Your bridge activity is saved.'}</p>
        {route.workshop && <img className="pl-earned" src={art('badge-pattern-scout')} alt="Pattern Scout badge" />}
        {save.patternBridge.evidenceScout && <img className="pl-earned" src={art('badge-evidence-scout')} alt="Evidence Scout badge" />}
        <p>{misses ? `You revised ${misses} ${misses===1?'answer':'answers'} using evidence. Revising is part of learning.` : 'You checked each claim against the evidence.'}</p>
        <p>Continue your Journey for Logic Quest stop checks. Bridge activities do not award Proof or Junior Badge completion.</p>
        <button className="btn primary" onClick={() => actions.navigate(d ? {name:'stop',stopId:d.stop} : {name:'journey'})}>Continue Journey</button></section> : <>
      <RoutineChip step={step} />
      <section className="pl-work"><div className="kicker">{ROUTINE[step]}</div><h2 ref={heading} tabIndex={-1}>{round.title}</h2>
        <div className="pl-evidence"><p>{round.evidence}</p>{round.tokens && <ExactTokens tokens={round.tokens} />}</div>
        {step===0 && <p>Notice only what is shown. Do not add an unseen rule.</p>}
        {step===2 && <p>{round.compare}</p>}
        {step===5 && <div className="pl-result"><h3>Test result</h3><p>{round.reveal}</p></div>}
        {question && <fieldset className="pl-question"><legend>{question.prompt}</legend>{question.options.map(option => <label key={option}><input type="radio" name="bridge-answer" value={option} checked={selected===option} disabled={!!feedback?.right} onChange={() => {setSelected(option);setFeedback(null);}} /><span>{option}</span></label>)}</fieldset>}
        {feedback && <div role="status" className="pl-feedback"><strong>{feedback.right?'Your answer fits.':'Check the evidence again.'}</strong><p>{feedback.why}</p></div>}
        {step===4 && feedback?.right && <div className="pl-result"><h3>Test result</h3><p>{round.reveal}</p></div>}
        {question && !feedback?.right ? <button className="btn primary" disabled={!selected} onClick={() => {const right=selected===question.answer;setFeedback({right,why:question.why});if(!right){setMisses(m=>m+1);roundMisses.current+=1;}}}>Check against evidence</button> : <button className="btn primary" onClick={advance}>{step===5?(roundIndex===ids.length-1?'Finish investigation':'Next investigation'):`Continue to ${ROUTINE[step+1]}`}</button>}
      </section></>}
  </div>;
}
