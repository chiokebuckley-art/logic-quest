/** "Who's playing?": pick a player (with PIN pad), make a new one, import a save, or link a synced player. */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { COLORS, MAX_PLAYERS, checkPin, isPin, loadSave, type Player } from '../../engine/save/save';
import { CODE_LENGTH, CODE_PREFIX, normalizeCode } from '../../engine/save/sync';
import { STOPS } from '../../content/stops';
import { frontierStop } from '../progressStats';
import { useStore, type Route } from '../store';
import { Icon } from '../components/Icon';
import { initial } from '../components/Hud';

type PlayersRoute = Extract<Route, { name: 'players' }>;
type Mode = 'list' | 'new' | 'import' | 'link';

const COLOR_NAMES: Record<string, string> = {
  '#9d6bff': 'Purple',
  '#3cff9d': 'Teal',
  '#ff7a1a': 'Orange',
  '#22e6ff': 'Sky blue',
  '#f472b6': 'Pink',
  '#ffc93c': 'Gold',
};

export function PlayersScreen({ route }: { route: PlayersRoute }) {
  const { state, player: current, save: currentSave, actions, kv } = useStore();
  const players = state.registry.players;
  const [mode, setMode] = useState<Mode>(players.length ? (route.mode ?? 'list') : 'new');
  const [pinFor, setPinFor] = useState<string | null>(route.pinFor ?? null);

  // Nobody left (for example after removing the last player): go straight to New player.
  const shown: Mode = players.length ? mode : mode === 'import' || mode === 'link' ? mode : 'new';
  const pinPlayer = pinFor ? players.find((p) => p.id === pinFor) ?? null : null;

  const stopNumbers = useMemo(() => {
    const ids = STOPS.filter((s) => !s.observatory).map((s) => s.id);
    const out: Record<string, number> = {};
    for (const p of players) {
      const data = p.id === current?.id && currentSave ? currentSave : loadSave(kv, p.id);
      out[p.id] = frontierStop(ids, data.stops);
    }
    return out;
  }, [players, current, currentSave, kv]);

  const choose = (p: Player) => {
    if (p.pin && p.id !== current?.id) setPinFor(p.id);
    else actions.selectPlayer(p.id);
  };

  if (pinPlayer) {
    return (
      <div className="page">
        <PinPad player={pinPlayer} onOk={() => actions.selectPlayer(pinPlayer.id)} onCancel={() => setPinFor(null)} />
      </div>
    );
  }

  if (shown === 'new') return <NewPlayer first={!players.length} onCancel={() => setMode('list')} onImport={() => setMode('import')} onLink={() => setMode('link')} />;
  if (shown === 'import') return <ImportSave onCancel={() => setMode(players.length ? 'list' : 'new')} />;
  if (shown === 'link') return <LinkPlayer onCancel={() => setMode(players.length ? 'list' : 'new')} />;

  return (
    <div className="page">
      <h2 className="page-title">WHO’S PLAYING?</h2>
      <p className="soft-text">Tap your name to play.</p>
      <div className="player-grid">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            className="player-card"
            aria-label={`${p.name}, Stop ${stopNumbers[p.id] ?? 1}${p.pin ? ', has a PIN' : ''}${p.sync ? ', synced' : ''}${p.id === current?.id ? ', playing now' : ''}`}
            onClick={() => choose(p)}
          >
            <span className="avatar lg" style={{ background: p.color }} aria-hidden="true">{initial(p.name)}</span>
            <span className="player-name">{p.name}</span>
            <span className="row small soft-text" style={{ gap: 6 }}>
              Stop {stopNumbers[p.id] ?? 1}
              {p.pin && <Icon name="lock" size={14} />}
              {p.sync && <Icon name="cloud" size={14} />}
            </span>
          </button>
        ))}
        {players.length < MAX_PLAYERS && (
          <button type="button" className="player-card add" onClick={() => setMode('new')}>
            <Icon name="plus" size={28} />
            <span className="player-name">New player</span>
          </button>
        )}
      </div>
      {players.length >= MAX_PLAYERS && <p className="small muted">This device holds up to {MAX_PLAYERS} players.</p>}
      <div className="row wrap">
        <button type="button" className="btn ghost" onClick={() => setMode('import')}>
          <Icon name="upload" size={18} /> Import a save
        </button>
        {players.length < MAX_PLAYERS && <LinkButton onClick={() => setMode('link')} />}
        {current && (
          <button type="button" className="btn ghost" onClick={() => actions.navigate({ name: 'journey' })}>
            <Icon name="back" size={18} /> Back to {current.name}’s Journey
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- PIN pad ----------

function PinPad({ player, onOk, onCancel }: { player: Player; onOk(): void; onCancel(): void }) {
  const [digits, setDigits] = useState('');
  const [misses, setMisses] = useState(0);
  const okRef = useRef(onOk);
  okRef.current = onOk;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  const press = (d: string) => setDigits((x) => (x.length >= 4 ? x : x + d));
  const back = () => setDigits((x) => x.slice(0, -1));

  useEffect(() => {
    if (digits.length < 4) return;
    if (checkPin(player, digits)) okRef.current();
    else {
      setMisses((m) => m + 1);
      setDigits('');
    }
  }, [digits, player]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Escape') cancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <section className="panel" aria-labelledby="pin-title" style={{ alignItems: 'center', textAlign: 'center', gap: 16 }}>
      <span className="avatar lg" style={{ background: player.color }} aria-hidden="true">{initial(player.name)}</span>
      <h2 id="pin-title" className="section-title" style={{ fontSize: 15 }}>HI, {player.name.toUpperCase()}</h2>
      <p className="soft-text">Type your PIN. It is your secret 4-number code.</p>
      <div key={misses} className={`pin-dots${misses ? ' shake' : ''}`} role="img" aria-label={`${digits.length} of 4 numbers typed`}>
        {[0, 1, 2, 3].map((i) => <i key={i} className={i < digits.length ? 'on' : ''} />)}
      </div>
      <p role="status" aria-live="polite" className="error" style={{ minHeight: 20 }}>
        {misses ? 'That PIN does not match. Try again.' : ''}
      </p>
      <div className="pin-pad">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} className="pin-key blank" aria-hidden="true" />
          ) : k === 'del' ? (
            <button key={i} type="button" className="pin-key" aria-label="Delete" onClick={back}>
              <Icon name="backspace" size={24} />
            </button>
          ) : (
            <button key={i} type="button" className="pin-key" onClick={() => press(k)}>{k}</button>
          ),
        )}
      </div>
      <p className="small muted">Forgot it? Ask a grown-up. They can reset it in Settings.</p>
      <button type="button" className="btn ghost" onClick={onCancel}>Back to players</button>
    </section>
  );
}

// ---------- New player ----------

function NewPlayer({ first, onCancel, onImport, onLink }: { first: boolean; onCancel(): void; onImport(): void; onLink(): void }) {
  const { state, actions } = useStore();
  const used = new Set(state.registry.players.map((p) => p.color));
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(COLORS.find((c) => !used.has(c)) ?? COLORS[0]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Type a name first.'); return; }
    if (pin && !isPin(pin)) { setError('A PIN is exactly 4 numbers. Or leave it empty.'); return; }
    const err = actions.createPlayer(name, color, pin || undefined);
    if (err) setError(err);
  };

  return (
    <div className="page">
      {first ? (
        <div className="stack">
          <div className="kicker">Welcome</div>
          <h2 className="page-title" style={{ fontSize: 20 }}>LOGIC QUEST</h2>
          <p className="soft-text">Logic is how you work out what must be true. Make your player to start.</p>
        </div>
      ) : (
        <h2 className="page-title">NEW PLAYER</h2>
      )}
      <form className="panel" onSubmit={submit} noValidate>
        <div className="row">
          <span className="avatar lg" style={{ background: color }} aria-hidden="true">{initial(name || '?')}</span>
          <label className="field grow">
            Your name
            <input className="input" value={name} maxLength={24} autoComplete="off" onChange={(e) => { setName(e.target.value); setError(''); }} />
          </label>
        </div>
        <div className="field">
          <span id="color-label">Pick a color</span>
          <div className="swatches" role="radiogroup" aria-labelledby="color-label">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={COLOR_NAMES[c] ?? c}
                className="swatch"
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <label className="field">
          PIN (you can skip this)
          <input
            className="input pin"
            value={pin}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
          />
          <span className="small muted">A PIN is a secret 4-number code. It stops others from playing as you.</span>
        </label>
        <p role="alert" className="error">{error}</p>
        <button type="submit" className="btn primary block big">Start playing</button>
        <div className="row wrap">
          {!first && <button type="button" className="btn ghost" onClick={onCancel}>Back to players</button>}
          <button type="button" className="btn ghost" onClick={onImport}>
            <Icon name="upload" size={18} /> Import a save
          </button>
          <LinkButton onClick={onLink} />
        </div>
      </form>
    </div>
  );
}

// ---------- Import ----------

export function ImportBox({ play, onDone }: { play: boolean; onDone?(name: string): void }) {
  const { actions } = useStore();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (raw: string) => {
    const got = actions.importSave(raw, play);
    if ('error' in got) setMsg({ ok: false, text: got.error });
    else {
      setMsg({ ok: true, text: play ? `Welcome back, ${got.name}.` : `Added ${got.name}. Switch player to play as ${got.name}.` });
      setText('');
      onDone?.(got.name);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { setMsg({ ok: false, text: 'That file is too big to be a save file.' }); return; }
    try { run(await file.text()); } catch { setMsg({ ok: false, text: 'That file could not be read.' }); }
  };

  return (
    <div className="stack">
      <label className="field">
        Pick a save file
        <input className="input" type="file" accept=".json,application/json" style={{ paddingTop: 9 }} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      <label className="field">
        Or paste the save text here
        <textarea className="textarea" value={text} spellCheck={false} onChange={(e) => { setText(e.target.value); setMsg(null); }} />
      </label>
      <button type="button" className="btn" disabled={!text.trim()} onClick={() => run(text)}>
        <Icon name="upload" size={18} /> Import
      </button>
      <p role="status" aria-live="polite" className={msg?.ok ? 'ok-text' : 'error'}>{msg?.text ?? ''}</p>
    </div>
  );
}

function ImportSave({ onCancel }: { onCancel(): void }) {
  return (
    <div className="page">
      <h2 className="page-title">IMPORT A SAVE</h2>
      <p className="soft-text">A save file holds one player’s progress. This adds that player to this device.</p>
      <div className="panel">
        <ImportBox play />
      </div>
      <button type="button" className="btn ghost" onClick={onCancel}>Back</button>
    </div>
  );
}

// ---------- Link a synced player ----------

/** Shown only when this copy of the game can sync. */
function LinkButton({ onClick }: { onClick(): void }) {
  const { sync } = useStore();
  if (!sync.available) return null;
  return (
    <button type="button" className="btn ghost" onClick={onClick}>
      <Icon name="cloud" size={18} /> Link a player from another device
    </button>
  );
}

function LinkPlayer({ onCancel }: { onCancel(): void }) {
  const { sync, actions } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const ready = normalizeCode(code).length === CODE_LENGTH;
  // Codes never use 0, 1, I or O (they look like other letters), so say so as soon as one is typed.
  const odd = /[01IO]/.test(code);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const err = await actions.linkPlayer(code);
    if (err) setError(err);
  };

  return (
    <div className="page">
      <h2 className="page-title">LINK A PLAYER</h2>
      <p className="soft-text">Play as the same player here and on another device. Progress syncs both ways.</p>
      {sync.loading || sync.available ? (
        <form className="panel" onSubmit={(e) => void submit(e)} noValidate>
          <p className="small soft-text">
            On the other device, pick the player and open <b>Me</b> → <b>Sync across devices</b>. Turn sync on there, then type the code it shows.
          </p>
          <label className="field">
            Sync code
            <input
              className="input sync-input"
              value={code}
              placeholder={`${CODE_PREFIX}4K-9TQ2-MHB7`}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            />
          </label>
          <p role="alert" className="error">{error || (odd ? 'Sync codes never use 0, 1, I or O. Look at that letter again.' : '')}</p>
          <button type="submit" className="btn primary block big" disabled={!ready || odd || sync.busy}>
            {sync.busy ? 'Linking…' : 'Link player'}
          </button>
        </form>
      ) : (
        <p className="panel small soft-text">Sync is switched off in this copy of the game. Use a save file instead: Import a save.</p>
      )}
      <button type="button" className="btn ghost" onClick={onCancel}>Back</button>
    </div>
  );
}
