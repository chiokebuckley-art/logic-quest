/** Settings: the player, play options, sync, save files, players on this device, and the version. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { checkPin, isPin, type Player, type Settings } from '../../engine/save/save';
import { ago, canSync, formatCode, MSG } from '../../engine/save/sync';
import { fileSlug } from '../progressStats';
import { downloadText, useStore } from '../store';
import { CURRENT_BUILD, useUpdateCheck } from '../hooks/useUpdateCheck';
import { Icon } from '../components/Icon';
import { initial } from '../components/Hud';
import { ImportBox } from './PlayersScreen';
import { PageHead } from '../components/kit';

export function SettingsScreen() {
  const { player, save, actions } = useStore();
  return (
    <div className="page sl-page">
      <div className="row between">
        {player ? <PageHead title="Settings" sub="Player, play options, sync, save files, players" back="Me" onBack={() => actions.navigate({ name: 'me' })} /> : <h2 className="page-title">SETTINGS</h2>}
        {!player && (
          <button type="button" className="btn ghost" onClick={() => actions.navigate({ name: 'players', mode: 'list' })}>
            <Icon name="back" size={18} /> Players
          </button>
        )}
      </div>
      {player && save && <YouPanel player={player} />}
      {player && save && <PlayPanel settings={save.settings} onChange={actions.updateSettings} plain={save.evidence.plain} onPlain={actions.setPlainLabels} />}
      {player && save && <SyncPanel player={player} />}
      <SavePanel />
      <DevicePlayers />
      <AboutPanel />
    </div>
  );
}

// ---------- the active player ----------

function YouPanel({ player }: { player: Player }) {
  const { actions } = useStore();
  const [name, setName] = useState(player.name);
  const [pin, setPin] = useState('');
  const [current, setCurrent] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Changing or removing a PIN needs the PIN itself. A forgotten PIN is a job for a grown-up (below).
  const knowsPin = !player.pin || checkPin(player, current);

  const rename = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setMsg({ ok: false, text: 'Type a name first.' }); return; }
    actions.renamePlayer(player.id, name);
    setMsg({ ok: true, text: 'Name saved.' });
  };
  const savePin = (e: FormEvent) => {
    e.preventDefault();
    if (!isPin(pin)) { setMsg({ ok: false, text: 'A PIN is exactly 4 numbers.' }); return; }
    if (!knowsPin) { setMsg({ ok: false, text: 'Type your current PIN first.' }); return; }
    actions.setPin(player.id, pin);
    setPin('');
    setCurrent('');
    setMsg({ ok: true, text: 'PIN saved. You will need it next time.' });
  };

  return (
    <section className="panel" aria-labelledby="you-title">
      <div className="row">
        <span className="avatar lg" style={{ background: player.color }} aria-hidden="true">{initial(player.name)}</span>
        <div className="grow">
          <h3 id="you-title" className="section-title">PLAYER</h3>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{player.name}</div>
        </div>
        <button type="button" className="btn ghost" onClick={() => actions.navigate({ name: 'players', mode: 'list' })}>
          <Icon name="user" size={18} /> Switch player
        </button>
      </div>

      <form className="row" onSubmit={rename} style={{ alignItems: 'flex-end' }}>
        <label className="field grow">
          Name
          <input className="input" value={name} maxLength={24} autoComplete="off" onChange={(e) => { setName(e.target.value); setMsg(null); }} />
        </label>
        <button type="submit" className="btn" disabled={name.trim() === player.name || !name.trim()}>Rename</button>
      </form>

      <form className="row wrap" onSubmit={savePin} style={{ alignItems: 'flex-end' }}>
        {player.pin && (
          <label className="field">
            Current PIN
            <input
              className="input pin"
              value={current}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              onChange={(e) => { setCurrent(e.target.value.replace(/\D/g, '').slice(0, 4)); setMsg(null); }}
            />
          </label>
        )}
        <label className="field">
          {player.pin ? 'New PIN' : 'Set a PIN (4 numbers)'}
          <input
            className="input pin"
            value={pin}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setMsg(null); }}
          />
        </label>
        <button type="submit" className="btn" disabled={pin.length !== 4}>
          <Icon name="key" size={18} /> {player.pin ? 'Change PIN' : 'Save PIN'}
        </button>
        {player.pin && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (!knowsPin) { setMsg({ ok: false, text: 'Type your current PIN first.' }); return; }
              actions.removePin(player.id);
              setCurrent('');
              setMsg({ ok: true, text: 'PIN removed.' });
            }}
          >
            Remove PIN
          </button>
        )}
      </form>
      <p className="small muted">A PIN is a secret 4-number code. It stops others from playing as you.</p>
      <p role="status" aria-live="polite" className={msg?.ok ? 'ok-text' : 'error'}>{msg?.text ?? ''}</p>
    </section>
  );
}

// ---------- play options ----------

function Toggle({ label, note, on, onChange }: { label: string; note: string; on: boolean; onChange(v: boolean): void }) {
  const id = `sw-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="switch-row">
      <div className="grow">
        <div id={id} style={{ fontWeight: 700 }}>{label}</div>
        <div className="small soft-text" id={`${id}-note`}>{note}</div>
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-labelledby={id}
        aria-describedby={`${id}-note`}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

function PlayPanel({ settings, onChange, plain, onPlain }: { settings: Settings; onChange(patch: Partial<Settings>): void; plain: boolean; onPlain(v: boolean): void }) {
  return (
    <section className="panel" aria-labelledby="play-title">
      <h3 id="play-title" className="section-title">PLAY</h3>
      <Toggle label="Check timer" note="Grown-ups: a calm time limit on check questions. It is 90 seconds, or up to 3 minutes for big puzzles." on={settings.timer} onChange={(v) => onChange({ timer: v })} />
      <Toggle label="Read aloud" note="Shows a speaker button that reads the words out loud." on={settings.readAloud} onChange={(v) => onChange({ readAloud: v })} />
      <Toggle label="Reduce motion" note="Turns off moving effects, like shakes and slides." on={settings.reduceMotion} onChange={(v) => onChange({ reduceMotion: v })} />
      <Toggle label="Plain labels for grown-ups" note="The Pattern Observatory names its places Repeating units, Growth rules, Functions, Cycles, Spatial rules and Evidence instead of Star Chain, Rule Machine and the rest. Same skills." on={plain} onChange={onPlain} />
    </section>
  );
}

// ---------- cloud sync ----------

function SyncPanel({ player }: { player: Player }) {
  const { state, sync, actions } = useStore();
  const [ask, setAsk] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [copied, setCopied] = useState('');
  const ref = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const offRef = useRef<HTMLButtonElement>(null);
  const link = sync.link;

  // Me (or Grown-ups) → Sync across devices lands here. A frame later, after the page has scrolled to the top.
  const jump = state.route.name === 'settings' && state.route.section === 'sync';
  useEffect(() => {
    if (!jump) return;
    const f = window.requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(f);
  }, [jump]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied('Copied.');
    } catch {
      setCopied('Copy did not work here. Write the code down instead.');
    }
  };
  // Focus goes back to the panel's heading when the part that had it goes away.
  const turnOn = () => { setAsk(false); headRef.current?.focus(); void actions.turnOnSync(); };

  return (
    <section className="panel" id="sync" aria-labelledby="sync-title" ref={ref}>
      <h3 id="sync-title" className="section-title" ref={headRef} tabIndex={-1}>SYNC ACROSS DEVICES</h3>
      {sync.loading ? (
        <p className="small soft-text">Looking for the sync server…</p>
      ) : !sync.available ? (
        <p className="small soft-text">Sync is switched off in this copy of the game. Use the save file below to move to another device.</p>
      ) : !canSync() ? (
        <p className="small soft-text">{MSG.tooOld}</p>
      ) : link ? (
        <>
          <p className="small soft-text">
            {player.name} syncs with the cloud. On another phone, tablet or computer, open Logic Quest and tap <b>Me</b> → <b>Switch player</b> → <b>Link a player from another device</b>. On a new device, that button is on the first screen. Then type this code.
          </p>
          <p className="sync-code"><span className="sr-only">Sync code: </span>{formatCode(link.code)}</p>
          <div className="row wrap">
            <button type="button" className="btn" onClick={() => void copy(link.code)}>
              <Icon name="copy" size={18} /> Copy code
            </button>
            <button type="button" className="btn" disabled={sync.busy} onClick={() => void actions.syncNow()}>
              <Icon name="refresh" size={18} /> {sync.busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn ghost" ref={offRef} onClick={() => setConfirmOff(true)}>Turn off</button>
          </div>
          {confirmOff && (
            <div className="panel flat" role="alertdialog" aria-labelledby="sync-off-q" style={{ gap: 10 }}>
              <p id="sync-off-q">Stop syncing {player.name} on this device? The cloud copy stays, and other devices keep syncing.</p>
              <div className="row wrap">
                <button type="button" className="btn danger" autoFocus onClick={() => { setConfirmOff(false); actions.turnOffSync(); headRef.current?.focus(); }}>Yes, turn off</button>
                <button type="button" className="btn ghost" onClick={() => { setConfirmOff(false); offRef.current?.focus(); }}>Keep syncing</button>
              </div>
            </div>
          )}
          <p className="small muted">
            {sync.checkedAt ? `Last synced ${ago(Date.now() - sync.checkedAt)}. ` : ''}Keep the code private: anyone who has it can play as {player.name}. A PIN stays on each device, so set one on the other device too.
          </p>
          <p role="status" aria-live="polite" className="small soft-text">{[copied, sync.note].filter(Boolean).join(' ')}</p>
        </>
      ) : (
        <>
          <p className="small soft-text">
            Play as {player.name} on more than one phone, tablet or computer. Turn sync on here, then type the code it shows on the other device. Each device checks the cloud when the game opens and saves to it as you play. The newest save wins.
          </p>
          <p className="small muted">The cloud keeps {player.name}’s name, color and progress, never the PIN.</p>
          {ask ? (
            <GrownUpGate autoFocus onOpen={turnOn} />
          ) : (
            <button type="button" className="btn primary" disabled={sync.busy} onClick={() => setAsk(true)}>
              <Icon name="cloud" size={18} /> {sync.busy ? 'Connecting…' : `Turn on sync for ${player.name}`}
            </button>
          )}
          <p role="status" aria-live="polite" className="small soft-text">{sync.note}</p>
        </>
      )}
    </section>
  );
}

// ---------- save files ----------

function SavePanel() {
  const { player, today, actions } = useStore();
  const exportNow = () => {
    const text = actions.exportSave();
    if (text && player) downloadText(`logic-quest-${fileSlug(player.name)}-${today}.json`, text, 'application/json');
  };
  return (
    <section className="panel" aria-labelledby="save-title">
      <h3 id="save-title" className="section-title">SAVE FILE</h3>
      <p className="small soft-text">A save file holds one player’s progress. Use it to move to another device, or to keep a copy.</p>
      {player && (
        <button type="button" className="btn" onClick={exportNow}>
          <Icon name="download" size={18} /> Download {player.name}’s save
        </button>
      )}
      <details>
        <summary>Import a save (adds a player)</summary>
        <ImportBox play={false} />
      </details>
    </section>
  );
}

// ---------- every player on this device ----------

/**
 * A grown-up check before anyone can remove a PIN or a player. Like the PIN itself, it slows down a curious
 * sibling rather than being real security: a two-digit times two-digit sum, typed in.
 */
export function GrownUpGate({ onOpen, autoFocus = false }: { onOpen(): void; autoFocus?: boolean }) {
  const pair = () => [13 + Math.floor(Math.random() * 17), 13 + Math.floor(Math.random() * 17)] as const;
  const [[a, b], setQ] = useState(pair);
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer) === a * b) { onOpen(); return; }
    setQ(pair());
    setAnswer('');
    setMsg('That is not it. Here is a new one.');
  };
  return (
    <form className="stack" onSubmit={submit}>
      <p className="small soft-text">This part is for grown-ups. To open it, work out the answer.</p>
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <label className="field">
          What is {a} × {b}?
          <input className="input" value={answer} inputMode="numeric" autoComplete="off" maxLength={4} autoFocus={autoFocus} onChange={(e) => { setAnswer(e.target.value.replace(/\D/g, '')); setMsg(''); }} />
        </label>
        <button type="submit" className="btn" disabled={!answer}>Open</button>
      </div>
      <p role="status" aria-live="polite" className="error">{msg}</p>
    </form>
  );
}

function DevicePlayers() {
  const { state, actions } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);
  const players = state.registry.players;
  if (!players.length) return null;

  if (!open) {
    return (
      <section className="panel soft" aria-labelledby="device-title">
        <h3 id="device-title" className="section-title">GROWN-UPS: PLAYERS ON THIS DEVICE</h3>
        <GrownUpGate onOpen={() => setOpen(true)} />
      </section>
    );
  }

  return (
    <section className="panel soft" aria-labelledby="device-title">
      <h3 id="device-title" className="section-title">GROWN-UPS: PLAYERS ON THIS DEVICE</h3>
      <p className="small soft-text">Remove a forgotten PIN here, or remove a player and their save.</p>
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {players.map((p) => (
          <li key={p.id} className="stack" style={{ gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--line-soft)' }}>
            <div className="row wrap">
              <div className="row" style={{ flex: '1 1 140px', minWidth: 0 }}>
                <span className="avatar" style={{ background: p.color }} aria-hidden="true">{initial(p.name)}</span>
                <span className="grow stack" style={{ gap: 0, lineHeight: 1.3 }}>
                  <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  {p.pin && <span className="small muted">Has a PIN</span>}
                </span>
              </div>
              <div className="row">
                {p.pin && (
                  <button type="button" className="btn ghost" aria-label={`Remove ${p.name}’s PIN`} onClick={() => { actions.removePin(p.id); setMsg(`${p.name}’s PIN is removed.`); }}>
                    Remove PIN
                  </button>
                )}
                <button type="button" className="btn danger" aria-label={`Remove ${p.name}`} onClick={() => setConfirm(p.id)}>
                  <Icon name="trash" size={18} /> Remove
                </button>
              </div>
            </div>
            {confirm === p.id && (
              <div className="panel flat" role="alertdialog" aria-labelledby={`rm-${p.id}`} style={{ gap: 10 }}>
                <p id={`rm-${p.id}`}>Remove {p.name}? This deletes {p.name}’s progress on this device. You cannot undo this.</p>
                <div className="row wrap">
                  <button
                    type="button"
                    className="btn danger"
                    autoFocus
                    onClick={() => { const name = p.name; setConfirm(null); actions.removePlayer(p.id); setMsg(`${name} is removed.`); }}
                  >
                    Yes, remove {p.name}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>Keep {p.name}</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="ok-text">{msg}</p>
    </section>
  );
}

// ---------- version ----------

function AboutPanel() {
  const update = useUpdateCheck();
  const [asked, setAsked] = useState(false);
  const built = CURRENT_BUILD.builtAt ? new Date(CURRENT_BUILD.builtAt) : null;

  let status = '';
  if (asked && !update.checking) {
    if (update.available) status = 'A new version is ready.';
    else if (update.failed || !update.remote) status = 'Could not check right now. Try again later.';
    else status = 'You have the newest version.';
  }

  return (
    <section className="panel soft" aria-labelledby="about-title">
      <h3 id="about-title" className="section-title">ABOUT</h3>
      <p>
        Logic Quest version <strong>{CURRENT_BUILD.version}</strong>
        {built && !Number.isNaN(built.getTime()) && <span className="small muted"> · built {built.toLocaleDateString()}</span>}
      </p>
      <div className="row wrap">
        <button type="button" className="btn" disabled={update.checking} onClick={() => { setAsked(true); void update.check(); }}>
          <Icon name="refresh" size={18} /> {update.checking ? 'Checking…' : 'Check for updates'}
        </button>
        {update.available && (
          <button type="button" className="btn teal" onClick={update.reload}>Update now</button>
        )}
      </div>
      <p role="status" aria-live="polite" className="small soft-text">{status}</p>
    </section>
  );
}
