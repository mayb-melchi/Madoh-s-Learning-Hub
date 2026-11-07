import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getUser, setAuth, logout } from '../api';
import { LayoutDashboard, BookOpen, FileText, ScrollText, Calendar, HelpCircle, RotateCcw, Megaphone, User, Bot, Search, Bell, LogOut, ArrowLeft, X, Menu } from 'lucide-react';
import Onboarding from './Onboarding';

const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

const UserContext = createContext();
export function useUser() { return useContext(UserContext); }

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/courses', label: 'My Courses', icon: BookOpen },
  { path: '/materials', label: 'Learning Materials', icon: FileText },
  { path: '/past-questions', label: 'Pre-Bar Past Questions', icon: ScrollText },
  { path: '/tutorials', label: 'Tutorials', icon: Calendar },
  { path: '/quizzes', label: 'Quizzes & Practice', icon: HelpCircle, disabled: true },
  { path: '/revision', label: 'Revision Centre', icon: RotateCcw, disabled: true },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/profile', label: 'Profile & Settings', icon: User },
  { path: '/study-assistant', label: 'Study Assistant', icon: Bot, disabled: true },
];

function SearchDropdown({ query, onClose, navigate }) {
  const [results, setResults] = useState(null);
  const ref = useRef();

  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      api(`/search?q=${encodeURIComponent(query)}`).then(setResults);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!results || query.length < 2) return null;
  const total = results.materials.length + results.courses.length + (results.tutorials?.length || 0);

  return (
    <div className="search-dropdown" ref={ref}>
      {total === 0 && <div className="search-empty">No results for "{query}"</div>}
      {results.courses.length > 0 && (
        <div className="search-section">
          <div className="search-section-title">Courses</div>
          {results.courses.map(c => (
            <div key={c.id} className="search-result" onClick={() => { navigate(`/courses/${c.id}`); onClose(); }}>
              <BookOpen size={14} /> <span>{c.title}</span>
            </div>
          ))}
        </div>
      )}
      {results.materials.length > 0 && (
        <div className="search-section">
          <div className="search-section-title">Materials</div>
          {results.materials.map(m => (
            <div key={m.id} className="search-result" onClick={() => { navigate(m.category === 'past_question' ? '/past-questions' : '/materials'); onClose(); }}>
              <FileText size={14} /> <span>{m.title}</span>
            </div>
          ))}
        </div>
      )}
      {results.tutorials?.length > 0 && (
        <div className="search-section">
          <div className="search-section-title">Tutorials</div>
          {results.tutorials.map(t => (
            <div key={t.id} className="search-result" onClick={() => { navigate('/tutorials'); onClose(); }}>
              <Calendar size={14} /> <span>{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef();

  useEffect(() => {
    api('/notifications').then(data => { setNotifications(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="notification-panel" ref={ref}>
      <div className="notification-header">
        <strong>Notifications</strong>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
      {loading && <div className="notification-item"><div className="notification-text">Loading...</div></div>}
      {!loading && notifications.length === 0 && <div className="notification-item"><div className="notification-text" style={{ color: 'var(--text-muted)' }}>No notifications yet.</div></div>}
      {notifications.map(n => (
        <div key={n.id} className="notification-item unread">
          <div className="notification-text">{n.text}</div>
          <div className="notification-time">{timeAgo(n.time)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themePreference, setThemePreference] = useState(() => localStorage.getItem('gsl_theme') || 'system');

  useEffect(() => {
    localStorage.setItem('gsl_theme', themePreference);
    function applyTheme() {
      if (themePreference === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', sys);
      } else {
        document.documentElement.setAttribute('data-theme', themePreference);
      }
    }
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [themePreference]);

  useEffect(() => { setShowSearch(false); setSearchQuery(''); setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      api('/auth/me').then(data => {
        if (!cancelled && data?.token && data?.user) {
          setAuth(data.token, data.user);
          setUser(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.user)) return data.user;
            return prev;
          });
        }
      });
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    function onFocus() { refresh(); }
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [location.pathname]);

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference }}>
    <UserContext.Provider value={user}>
    <div className="app-layout" key={JSON.stringify(user?.courseRoles || {})}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-crest">ML</div>
          <h1>Madoh's Learning Hub</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon, disabled }) => (
            disabled ? (
              <span key={path} className="nav-item disabled">
                <Icon size={18} />
                {label}
                <span className="nav-badge">Soon</span>
              </span>
            ) : (
              <Link key={path} to={path} className={location.pathname.startsWith(path) ? 'active' : ''}>
                <Icon size={18} />
                {label}
              </Link>
            )
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{user?.avatar_initials || 'U'}</div>
          <div className="user-info">
            <div className="name">{user?.full_name}</div>
            <div className="id">{user?.id}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          {location.pathname !== '/dashboard' && (
            <button className="back-btn" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} /> Home
            </button>
          )}
          <div className="search-bar">
            <Search />
            <input
              type="text"
              placeholder="Search courses, materials, topics..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(''); setShowSearch(false); }}>
                <X size={14} />
              </button>
            )}
            {showSearch && <SearchDropdown query={searchQuery} onClose={() => setShowSearch(false)} navigate={navigate} />}
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
            {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
      <Onboarding />
    </div>
    </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
