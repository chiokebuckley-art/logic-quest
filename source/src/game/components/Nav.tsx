/** Bottom tab bar: Journey, Learn, Arcade, Progress. */
import { tabFor, useStore, type Route, type Tab } from '../store';
import { Icon, type IconName } from './Icon';

const TABS: { tab: Tab; label: string; icon: IconName; route: Route }[] = [
  { tab: 'journey', label: 'Journey', icon: 'journey', route: { name: 'journey' } },
  { tab: 'learn', label: 'Learn', icon: 'learn', route: { name: 'learn' } },
  { tab: 'arcade', label: 'Arcade', icon: 'arcade', route: { name: 'arcade' } },
  { tab: 'progress', label: 'Progress', icon: 'progress', route: { name: 'progress' } },
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
          <Icon name={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
