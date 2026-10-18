import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  House,
  Inbox,
  ListTodo,
  Menu,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sun,
  Folder,
  Focus,
  RotateCcw,
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Dialog } from '../components/Dialog';
import { subscribeAppUpdate } from '../pwa/updateBus';
import { useVastnote } from '../state/DataProvider';
import { useUi } from '../state/UiProvider';
import { useTheme } from '../theme/ThemeProvider';
import { CaptureDialog } from '../features/capture/CaptureDialog';
import { SearchPanel } from '../features/search/SearchPanel';
import { useReminders } from '../features/notifications/useReminders';

export function AppShell() {
  const { ready, loadError, actionError, dismissActionError, snapshot } = useVastnote();
  const { toasts, dismissToast } = useUi();
  const { resolved, toggle } = useTheme();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [update, setUpdate] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  const openInbox = snapshot?.inbox.filter((item) => item.status === 'open').length ?? 0;

  useReminders(snapshot?.tasks ?? [], Boolean(snapshot?.settings.notificationsEnabled));

  useEffect(() => subscribeAppUpdate(setUpdate), []);

  useEffect(() => {
    const heading = document.querySelector('main h1');
    if (heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable),
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (params.get('capture') !== '1') return;
    setCaptureOpen(true);
    const next = new URLSearchParams(params);
    next.delete('capture');
    setParams(next, { replace: true });
  }, [params, setParams]);

  if (loadError) {
    return (
      <div className="full-message">
        <Logo size={32} />
        <h1>Vastnote can’t open your workspace</h1>
        <p>{loadError}</p>
        <p className="quiet">Local storage may be blocked. Try another browser profile, then export regularly once it works.</p>
      </div>
    );
  }

  const themeLabel = resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="wordmark" aria-label="Vastnote, home">
          <Logo />
          <span>Vastnote</span>
        </NavLink>
        <nav className="nav-list" aria-label="Primary">
          <NavLink to="/" end className="nav-link">
            <House size={18} aria-hidden="true" /> Today
          </NavLink>
          <NavLink to="/inbox" className="nav-link">
            <Inbox size={18} aria-hidden="true" /> Inbox
            {openInbox > 0 ? <span className="count">{openInbox}</span> : null}
          </NavLink>
          <NavLink to="/tasks" className="nav-link">
            <ListTodo size={18} aria-hidden="true" /> Tasks
          </NavLink>
          <NavLink to="/calendar" className="nav-link">
            <Calendar size={18} aria-hidden="true" /> Calendar
          </NavLink>
          <NavLink to="/notes" className="nav-link">
            <NotebookPen size={18} aria-hidden="true" /> Notes
          </NavLink>
          <NavLink to="/projects" className="nav-link">
            <Folder size={18} aria-hidden="true" /> Projects
          </NavLink>
          <NavLink to="/focus" className="nav-link">
            <Focus size={18} aria-hidden="true" /> Focus
          </NavLink>
          <NavLink to="/recover" className="nav-link">
            <RotateCcw size={18} aria-hidden="true" /> Catch up
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button type="button" onClick={() => setSearchOpen(true)}>
            <Search size={18} aria-hidden="true" /> Search
          </button>
          <button type="button" onClick={toggle} aria-label={themeLabel}>
            {resolved === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            Theme
          </button>
          <NavLink to="/settings" className="nav-link">
            <Settings size={18} aria-hidden="true" /> Settings
          </NavLink>
        </div>
      </aside>
      <div className="workspace">
        {update ? (
          <div className="update-banner" role="status">
            <p>A new version of Vastnote is ready.</p>
            <button type="button" className="button button--primary" onClick={() => void update(true)}>
              Refresh
            </button>
          </div>
        ) : null}
        <header className="topbar">
          <NavLink to="/" className="wordmark" aria-label="Vastnote, home">
            <Logo />
            <span>Vastnote</span>
          </NavLink>
          <button type="button" className="icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search size={20} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label={themeLabel} onClick={toggle}>
            {resolved === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button" aria-label="Capture" onClick={() => setCaptureOpen(true)}>
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>
        {actionError ? (
          <div className="banner" role="alert">
            <p>{actionError}</p>
            <button type="button" className="button button--quiet" onClick={dismissActionError}>
              Dismiss
            </button>
          </div>
        ) : null}
        <main id="content">
          {ready ? <Outlet /> : <BootScreen />}
        </main>
        <nav className="tabbar" aria-label="Primary">
          <NavLink to="/" end>
            <House size={18} aria-hidden="true" />
            Today
          </NavLink>
          <NavLink to="/inbox">
            <Inbox size={18} aria-hidden="true" />
            Inbox
            {openInbox > 0 ? <span className="count">{openInbox}</span> : null}
          </NavLink>
          <NavLink to="/tasks">
            <ListTodo size={18} aria-hidden="true" />
            Tasks
          </NavLink>
          <NavLink to="/calendar">
            <Calendar size={18} aria-hidden="true" />
            Calendar
          </NavLink>
          <button type="button" aria-expanded={moreOpen} aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
            <Menu size={18} aria-hidden="true" />
            More
          </button>
        </nav>
      </div>
      {ready ? (
        <>
          <CaptureDialog open={captureOpen} onClose={() => setCaptureOpen(false)} />
          <Dialog open={searchOpen} title="Search" onClose={() => setSearchOpen(false)}>
            <SearchPanel onNavigate={() => setSearchOpen(false)} />
          </Dialog>
          <Dialog open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
            <nav className="menu-list" aria-label="More">
              <NavLink to="/notes" className="more-link" onClick={() => setMoreOpen(false)}>
                <NotebookPen size={18} aria-hidden="true" /> Notes
              </NavLink>
              <NavLink to="/projects" className="more-link" onClick={() => setMoreOpen(false)}>
                <Folder size={18} aria-hidden="true" /> Projects
              </NavLink>
              <NavLink to="/focus" className="more-link" onClick={() => setMoreOpen(false)}>
                <Focus size={18} aria-hidden="true" /> Focus
              </NavLink>
              <NavLink to="/recover" className="more-link" onClick={() => setMoreOpen(false)}>
                Catch up
              </NavLink>
              <NavLink to="/search" className="more-link" onClick={() => setMoreOpen(false)}>
                <Search size={18} aria-hidden="true" /> Search
              </NavLink>
              <NavLink to="/settings" className="more-link" onClick={() => setMoreOpen(false)}>
                <Settings size={18} aria-hidden="true" /> Settings
              </NavLink>
            </nav>
          </Dialog>
        </>
      ) : null}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className="toast">
            {toast.text}
            <button type="button" className="button button--ghost" onClick={() => dismissToast(toast.id)}>
              Dismiss
            </button>
          </p>
        ))}
      </div>
    </div>
  );
}

function BootScreen() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(id);
  }, []);
  if (!visible) return <div className="boot" />;
  return (
    <div className="boot">
      <Logo size={28} />
      <p>Opening your workspace…</p>
    </div>
  );
}
