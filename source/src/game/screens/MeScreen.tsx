/**
 * Me (1i): who is playing, three counts, and the rows that lead to repair quests, progress, Pattern Lab badges,
 * players, grown-ups, play settings and save files.
 */
import { useState } from 'react';
import { fixableCards } from '../../engine/notebook';
import { STOPS } from '../../content/stops';
import { percent, stopCounts, streakDays, totals } from '../progressStats';
import { useStore } from '../store';
import { initial } from '../components/Hud';
import { GIcon, Row } from '../components/kit';
import type { AgePath } from '../pattern/bridges';

const PATHS: AgePath[] = ['Explorer', 'Trailblazer', 'Logician'];

export function MeScreen() {
  const { save, player, today, state, actions } = useStore();
  const [paths, setPaths] = useState(false);
  if (!save || !player) return null;
  const counts = stopCounts(save.stops);
  const t = totals(save.stats, today, 3650);
  const rate = percent(t.firstTry, t.answered);
  const streak = streakDays(save.active, today);
  const ready = fixableCards(save.notebook ?? {}, today, STOPS).length;
  const open = Object.keys(save.notebook ?? {}).length;
  const bridge = save.patternBridge;
  const badges = [bridge.workshop && 'Pattern Scout', bridge.evidenceScout && 'Evidence Scout'].filter(Boolean) as string[];
  const names = state.registry.players.map((p) => p.name).join(', ');

  return (
    <div className="page sl-page">
      <section className="sl-me-hero">
        <span className="sl-avatar xl" style={{ background: player.color }} aria-hidden="true">{initial(player.name)}</span>
        <h2 className="sl-me-name">{player.name}</h2>
        <div className="sl-me-path">{bridge.path} path · 🔥 {streak}-day streak</div>
        <div className="sl-chips center">
          <button type="button" className="sl-chip" onClick={() => actions.navigate({ name: 'players', mode: 'list' })}>Switch player</button>
          <button type="button" className="sl-chip" aria-expanded={paths} onClick={() => setPaths(!paths)}>Change path</button>
        </div>
        {paths && (
          <div className="sl-chips center" role="radiogroup" aria-label="Learning path">
            {PATHS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={bridge.path === p} className="sl-chip c-violet" onClick={() => { actions.setPatternPath(p); setPaths(false); }}>{p}</button>
            ))}
          </div>
        )}
      </section>

      <div className="sl-tiles">
        <div className="sl-tile"><span className="sl-tile-n t-gold">{counts.passed}</span><span>{counts.passed === 1 ? 'stop passed' : 'stops passed'}</span></div>
        <div className="sl-tile"><span className="sl-tile-n t-mint">{counts.mastered}</span><span>mastered</span></div>
        <div className="sl-tile"><span className="sl-tile-n t-cyan">{rate === null ? '–' : `${rate}%`}</span><span>first-try</span></div>
      </div>

      <div className="sl-list">
        <Row lead={<GIcon name="brain" color="var(--amber)" />} title="Repair quests" meta={ready ? `${ready} ready ›` : `${open} open ›`} metaTone={ready ? 'orange' : 'muted'} onClick={() => actions.navigate({ name: 'notebook' })} />
        <Row lead={<GIcon name="gauge" color="var(--lime)" />} title="My progress" meta="by stop & day ›" metaTone="muted" onClick={() => actions.navigate({ name: 'progress' })} />
        <Row lead={<GIcon name="medal" color="var(--violet)" />} title="Pattern Lab badges" meta={`${badges.length ? badges.join(', ') : 'none yet'} ›`} metaTone="muted" onClick={() => actions.navigate({ name: 'library', kind: 'lab' })} />
        <Row lead={<GIcon name="home" color="var(--cyan)" />} title="Players & PINs" meta={<span className="sl-ellipsis">{names} ›</span>} metaTone="muted" onClick={() => actions.navigate({ name: 'players', mode: 'list' })} />
        <Row lead={<GIcon name="cloud-sync" color="var(--teal)" />} title="Sync across devices" meta={player.sync ? 'on ›' : 'off ›'} metaTone="muted" onClick={() => actions.navigate({ name: 'settings', section: 'sync' })} />
        <Row lead={<GIcon name="lab" color="var(--gold)" />} title="Grown-ups" meta="check ›" metaTone="muted" onClick={() => actions.navigate({ name: 'grownups' })} />
        <Row lead={<GIcon name="settings" color="var(--text-2)" />} title="Read aloud · calm timer" meta={`${save.settings.readAloud ? 'on' : 'off'} · ${save.settings.timer ? 'on' : 'off'} ›`} metaTone="muted" onClick={() => actions.navigate({ name: 'settings' })} />
        <Row lead={<GIcon name="scroll" color="var(--text-2)" />} title="Export / import" meta="JSON ›" metaTone="muted" onClick={() => actions.navigate({ name: 'settings' })} />
      </div>
    </div>
  );
}
