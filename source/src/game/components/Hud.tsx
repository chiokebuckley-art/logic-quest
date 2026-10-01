/** Top bar: the game name, the day streak, the player chip (opens Players) and Settings. */
import { streakDays } from '../progressStats';
import { useStore } from '../store';
import { Icon } from './Icon';

export function Hud() {
  const { state, player, save, today, actions } = useStore();
  const streak = save ? streakDays(save.active, today) : 0;
  const onSettings = state.route.name === 'settings';
  return (
    <header className="hud">
      <h1 className="hud-title">LOGIC QUEST</h1>
      <div className="hud-spacer" />
      {player && save && (
        <div className="hud-streak" title="Days in a row with at least one minute of play">
          <Icon name="flame" size={18} />
          <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
          <span className="sr-only"> in a row</span>
        </div>
      )}
      {player && (
        <button
          type="button"
          className="hud-player"
          aria-label={`Switch player (${player.name})`}
          onClick={() => actions.navigate({ name: 'players', mode: 'list' })}
        >
          <span className="avatar" style={{ background: player.color }} aria-hidden="true">{initial(player.name)}</span>
          <span className="hud-player-name">{player.name}</span>
        </button>
      )}
      <button
        type="button"
        className="hud-icon-btn"
        aria-label="Settings"
        aria-current={onSettings ? 'page' : undefined}
        onClick={() => actions.navigate({ name: 'settings' })}
      >
        <Icon name="settings" size={20} />
      </button>
    </header>
  );
}

/** First letter of a name, for avatars. */
export function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
