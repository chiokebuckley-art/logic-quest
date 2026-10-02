/** Bottom tab bar: Home, Journey, Arcade, Library, Me. */
import { tabFor, useStore, type Route, type Tab } from '../store';
import { GIcon, type GameIcon } from './kit';

const TABS: { tab: Tab; label: string; icon: GameIcon; route: Route }[] = [
  { tab: 'home', label: 'Home', icon: 'star', route: { name: 'home' } },
  { tab: 'journey', label: 'Journey', icon: 'map', route: { name: 'journey' } },
  { tab: 'arcade', label: 'Arcade', icon: 'target', route: { name: 'arcade' } },
  { tab: 'library', label: 'Library', icon: 'book', route: { name: 'library' } },
  { tab: 'me', label: 'Me', icon: 'dashboard', route: { name: 'me' } },
];

export function Nav() {
  const { state, actions } = useStore();
  const active = tabFor(state.route);
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.tab}
          type="button"
          className="nav-tab"
          aria-current={active === t.tab ? 'page' : undefined}
          onClick={() => actions.navigate(t.route)}
        >
          <GIcon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
