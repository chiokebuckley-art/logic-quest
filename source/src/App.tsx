import { PatternBridgeScreen } from './game/pattern/PatternBridge';
import { useEffect, useRef } from 'react';
import { StoreProvider, parentRoute, useStore, type Route } from './game/store';
import { Hud } from './game/components/Hud';
import { Nav } from './game/components/Nav';
import { BACK_EVENT } from './game/components/ItemView';
import { useActiveTime } from './game/hooks/useActiveTime';
import { useUpdateCheck } from './game/hooks/useUpdateCheck';
import { PlayersScreen } from './game/screens/PlayersScreen';
import { JourneyScreen } from './game/screens/JourneyScreen';
import { HomeScreen } from './game/screens/HomeScreen';
import { StopScreen } from './game/screens/StopScreen';
import { LibraryScreen } from './game/screens/LibraryScreen';
import { MeScreen } from './game/screens/MeScreen';
import { SearchScreen } from './game/screens/SearchScreen';
import { LessonScreen } from './game/screens/LessonScreen';
import { CheckScreen } from './game/screens/CheckScreen';
import { ArcadeScreen } from './game/screens/ArcadeScreen';
import { GrownUpsScreen, ProgressScreen } from './game/screens/ProgressScreen';
import { NotebookScreen } from './game/screens/NotebookScreen';
import { SettingsScreen } from './game/screens/SettingsScreen';

/** Lesson, check, practice and notebook-fixing screens hide the tab bar. The Players screen has none either. */
function hidesNav(route: Route): boolean {
  return route.name === 'players' || playing(route);
}

/** Lessons, checks, practice and notebook fixes draw their own back header, so the game's top bar steps aside. */
function playing(route: Route): boolean {
  return route.name === 'lesson' || route.name === 'check' || (route.name === 'arcade' && !!route.practice) || (route.name === 'notebook' && !!route.fix);
}

/**
 * The phone's Back button (or the browser's) inside the app. One history entry sits above the page:
 *  - in a lesson, check, practice or notebook fix, Back acts like the screen's own back arrow (a check asks before leaving);
 *  - on any other page, Back goes to its parent (a stop page to the Journey, Me's pages to Me, a tab to Home);
 *  - on Home (or Players), Back is let through, so a second Back leaves the app.
 */
function useDeviceBack(route: Route, signedIn: boolean, go: (r: Route) => void) {
  const routeRef = useRef(route);
  routeRef.current = route;
  const guarded = useRef(false);
  const home = parentRoute(route) === null;

  useEffect(() => {
    if (typeof window === 'undefined' || guarded.current || home) return;
    try { window.history.pushState({ lqGuard: true }, ''); guarded.current = true; } catch { /* history blocked */ }
  }, [home, route]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      guarded.current = false;
      const r = routeRef.current;
      const parent = parentRoute(r);
      if (!parent) return;
      try { window.history.pushState({ lqGuard: true }, ''); guarded.current = true; } catch { /* history blocked */ }
      if (playing(r)) window.dispatchEvent(new Event(BACK_EVENT));
      else if (signedIn) go(parent);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [signedIn, go]);
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'players': return <PlayersScreen route={route} />;
    case 'pattern': return <PatternBridgeScreen route={route} />;
    case 'home': return <HomeScreen />;
    case 'journey': return <JourneyScreen route={route} />;
    case 'stop': return <StopScreen route={route} />;
    case 'library': return <LibraryScreen route={route} />;
    case 'learn': return <LibraryScreen route={{ name: 'library', kind: 'ideas' }} />;
    case 'me': return <MeScreen />;
    case 'grownups': return <GrownUpsScreen />;
    case 'search': return <SearchScreen route={route} />;
    case 'lesson': return <LessonScreen route={route} />;
    case 'check': return <CheckScreen route={route} />;
    case 'arcade': return <ArcadeScreen route={route} />;
    case 'progress': return <ProgressScreen />;
    case 'notebook': return <NotebookScreen route={route} />;
    case 'settings': return <SettingsScreen />;
  }
}

function Shell() {
  const { state, player, save, actions } = useStore();
  const update = useUpdateCheck();
  useActiveTime(!!player, actions.addActive);

  // Nobody is playing: only Players and (device-level) Settings can show.
  const route: Route = player || state.route.name === 'players' || state.route.name === 'settings'
    ? state.route
    : { name: 'players', mode: state.registry.players.length ? 'list' : 'new' };

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo?.({ top: 0 }); }, [state.routeSeq]);

  useDeviceBack(route, !!player, actions.navigate);

  const reduceMotion = !!save?.settings.reduceMotion;
  const showNav = !!player && !hidesNav(route);
  return (
    <div className={`app${showNav ? '' : ' immersive'}${reduceMotion ? ' reduce-motion' : ''}`}>
      {!player && <Hud />}
      {update.available && (
        <button type="button" className="update-banner" onClick={update.reload}>
          A new version of Logic Quest is ready. Tap to update.
        </button>
      )}
      <main className="app-main" ref={mainRef}>
        <Screen key={state.routeSeq} route={route} />
      </main>
      {showNav && <Nav />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
