import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Moon, CloudMoon, Home, PenLine, BookOpen, ChartNoAxesColumn, Settings,
  ArrowRight, ArrowLeft, Sparkles, Heart, Search, Trash2, Copy, Download,
  Check, Menu, X, Globe, Sun, Monitor, LogOut, UserRound, Mail, Lock, Eye,
  EyeOff, Clock3, Plus, Bookmark, Cloud, SlidersHorizontal, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from 'firebase/auth';
import './styles.css';

/* ============================================================
   1. API HELPER
   ============================================================ */

async function apiRequest(url, options = {}, currentUser) {
  const token = await currentUser.getIdToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status})`);
  }
  return result;
}

/* ============================================================
   2. FIREBASE SETUP
   ============================================================ */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebase = Object.values(firebaseConfig).every(Boolean);
const auth = hasFirebase ? getAuth(initializeApp(firebaseConfig)) : null;

/* ============================================================
   3. CONSTANTS & SMALL HELPERS
   ============================================================ */

const moods = ['Mysterious', 'Magical', 'Calm', 'Romantic', 'Exciting', 'Eerie', 'Nostalgic', 'Surreal'];
const genres = ['Fantasy', 'Adventure', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Magical realism', 'Slice of life'];
const languages = ['English', 'Malayalam', 'Hindi', 'Tamil', 'Spanish', 'French'];

const keyFor = (u) => 'dreamcontinuator-v3-' + (u?.uid || 'guest');

const getSaved = (k) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const uid = () => crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2);

const date = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/* ============================================================
   4. MAIN APP COMPONENT
   ============================================================ */

function App() {
  /* ---------- 4.1 State: navigation & auth ---------- */
  const [page, setPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(!!auth);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  /* ---------- 4.2 State: dreams & studio ---------- */
  const [dreams, setDreams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [dream, setDream] = useState('');
  const [mood, setMood] = useState('Mysterious');
  const [genre, setGenre] = useState('Fantasy');
  const [length, setLength] = useState('Medium');
  const [language, setLanguage] = useState('English');
  const [creativity, setCreativity] = useState(70);
  const [busy, setBusy] = useState(false);
  const [aiProvider, setAiProvider] = useState('');
  const [error, setError] = useState('');

  /* ---------- 4.3 State: archive & UI ---------- */
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Moods');
  const [sort, setSort] = useState('newest');
  const [dark, setDark] = useState(localStorage.getItem('dc-theme') !== 'light');
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');

  const active = !!user || guest;
  const storageKey = keyFor(user);

  /* ---------- 4.4 Effects ---------- */

  // Firebase auth listener
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
  }, []);

  // Load dreams (MongoDB when signed in, localStorage for guests)
  useEffect(() => {
    let cancelled = false;
    setSelected(null);

    if (user) {
      setDreams([]);
      apiRequest('/api/dreams', {}, user)
        .then((data) => {
          if (!cancelled) setDreams(data.dreams || []);
        })
        .catch((e) => {
          if (!cancelled) setError('Could not load your MongoDB archive: ' + e.message);
        });
    } else {
      setDreams(guest ? getSaved(storageKey) : []);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.uid, guest]);

  // Persist guest dreams locally
  useEffect(() => {
    if (guest && !user) {
      localStorage.setItem(storageKey, JSON.stringify(dreams));
    }
  }, [dreams, storageKey, guest, user]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('dc-theme', dark ? 'dark' : 'light');
  }, [dark]);

  /* ---------- 4.5 Navigation helpers ---------- */

  const go = (p) => {
    setPage(p);
    setMenu(false);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enter = () => {
    if (active) go('dashboard');
    else go('auth');
  };

  const newDream = () => {
    setDream('');
    setTitle('');
    setMood('Mysterious');
    setGenre('Fantasy');
    go('studio');
  };

  const view = (d) => {
    setSelected(d);
    go('reader');
  };

  /* ---------- 4.6 Derived data ---------- */

  const visible = useMemo(
    () =>
      dreams
        .filter(
          (d) =>
            (d.title + ' ' + d.dream + ' ' + d.continuation).toLowerCase().includes(search.toLowerCase()) &&
            (filter === 'All Moods' || d.mood === filter)
        )
        .sort((a, b) =>
          sort === 'oldest'
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt)
        ),
    [dreams, search, filter, sort]
  );

  /* ---------- 4.7 Dream CRUD ---------- */

  const updateDream = async (id, change) => {
    if (user) {
      try {
        await apiRequest('/api/dreams', { method: 'PATCH', body: JSON.stringify({ id, change }) }, user);
      } catch (e) {
        setError('Could not update dream: ' + e.message);
        return;
      }
    }
    setDreams((ds) => ds.map((d) => (d.id === id ? { ...d, ...change } : d)));
    setSelected((d) => (d?.id === id ? { ...d, ...change } : d));
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this dream permanently?')) return;

    if (user) {
      try {
        await apiRequest('/api/dreams', { method: 'DELETE', body: JSON.stringify({ id }) }, user);
      } catch (e) {
        setError('Could not delete dream: ' + e.message);
        return;
      }
    }

    setDreams((ds) => ds.filter((d) => d.id !== id));
    if (selected?.id === id) go('archive');
  };

  /* ---------- 4.8 Export / copy ---------- */

  const exportDream = (d) => {
    const blob = new Blob(
      [`${d.title}\n\nMY DREAM\n${d.dream}\n\nTHE CONTINUATION\n${d.continuation}`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-${d.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard unavailable. Select and copy the text manually.');
    }
  };

  /* ---------- 4.9 AI generation ---------- */

  async function generate() {
    if (dream.trim().length < 20) {
      setError('Please describe at least 20 characters of your dream.');
      return;
    }

    setError('');
    setBusy(true);
    setAiProvider('');

    try {
      const response = await fetch('/api/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dream: dream.trim(),
          mood,
          genre,
          length,
          language,
          creativity: 0.3 + (creativity / 100) * 1.1,
        }),
      });

      const data = await response.json().catch(() => ({
        error: 'AI endpoint did not return JSON. Check the server console and API configuration.',
      }));
      if (!response.ok) throw Error(data.error || 'Dream generation failed');

      const d = {
        id: uid(),
        title: title.trim() || 'An Untitled Dream',
        dream: dream.trim(),
        continuation: data.continuation,
        mood,
        genre,
        language,
        createdAt: new Date().toISOString(),
        favorite: false,
      };

      if (user) {
        await apiRequest('/api/dreams', { method: 'POST', body: JSON.stringify({ dream: d }) }, user);
      }

      setDreams((ds) => [d, ...ds]);
      setAiProvider(data.provider || 'AI');
      view(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 4.10 Auth actions ---------- */

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError('');

    if (!auth) {
      setAuthError('Firebase is not configured. Select Continue as Guest, or add Firebase environment variables.');
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setGuest(false);
      go('dashboard');
    } catch (e) {
      setAuthError(e.message.replace('Firebase:', '').replace(/\(auth\//, '('));
    }
  }

  async function google() {
    setAuthError('');
    if (!auth) {
      setAuthError('Configure Firebase first, or continue as guest.');
      return;
    }
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setGuest(false);
      go('dashboard');
    } catch (e) {
      setAuthError(e.message);
    }
  }

  const logout = async () => {
    if (auth && user) await signOut(auth);
    setGuest(false);
    go('landing');
  };

  /* ---------- 4.11 Sidebar config ---------- */

  const sidebar = [
    ['dashboard', Home, 'Home'],
    ['studio', PenLine, 'Dream Studio'],
    ['archive', BookOpen, 'My Dreams'],
    ['analytics', ChartNoAxesColumn, 'Analytics'],
    ['settings', Settings, 'Settings'],
  ];

  /* ---------- 4.12 Render ---------- */

  return (
    <div className={dark ? 'app dark' : 'app light'}>
      <div className="starfield" />
      <div className="sky-glow" />

      {/* ================= PUBLIC TOP BAR ================= */}
      {(!active || page === 'landing' || page === 'auth') && (
        <header className="topbar">
          <button className="logo" onClick={() => go('landing')}>
            <img src="/dream-logo.png" alt="" className="brand-icon" width={36} height={36} />
            <span>Dream<em>Continuator</em></span>
          </button>

          <nav>
            <button onClick={() => go('landing')}>Home</button>
            <button
              onClick={() => {
                go('landing');
                setTimeout(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
            >
              Features
            </button>
            <button
              onClick={() => {
                go('landing');
                setTimeout(() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
            >
              How it Works
            </button>
          </nav>

          <button className="pill primary small" onClick={enter}>
            {active ? 'Dashboard' : 'Get Started'} <ArrowRight size={16} />
          </button>
        </header>
      )}

      {/* ================= LANDING PAGE ================= */}
      {page === 'landing' && (
        <>
          <section className="landing">

            <div className="landing-content">
              <div className="eyebrow">✦ YOUR STORIES ARE STILL WAITING ✦</div>
              <h1>Dream<em>Continuator</em></h1>
              <h2>Your Dreams Don’t Have to End</h2>
              <p>
                Continue the stories your sleep left unfinished.
                <br />
                Write your interrupted dream, and let AI imagine what happens next.
              </p>
              <button className="pill primary hero-btn" onClick={enter}>
                Continue Your Dream <Sparkles size={17} />
              </button>
            </div>

          </section>

          <section className="landing-section" id="features">
            <div className="section-label">DISCOVER THE MAGIC</div>
            <h2>Every dream has another chapter.</h2>
            <div className="feature-grid">
              <Feature icon={PenLine} title="Write your dream" desc="Capture every fleeting detail before it fades." />
              <Feature icon={Sparkles} title="AI story continuation" desc="Imagine the next chapter in your own style." />
              <Feature icon={BookOpen} title="Your dream archive" desc="Revisit the worlds you've created." />
            </div>
          </section>

          <section className="landing-section" id="how">
            <div className="section-label">HOW IT WORKS</div>
            <h2>Remember. Imagine. Continue.</h2>
            <p className="center-text">
              Describe your dream, customize the mood and genre, and generate a fictional continuation in seconds.
            </p>
            <button className="pill primary" onClick={enter}>
              Start Dreaming <ArrowRight size={16} />
            </button>
          </section>
        </>
      )}

      {/* ================= AUTH PAGE ================= */}
      {page === 'auth' && (
        <section className="auth-page">
          <div className="auth-story">
            <CloudMoon size={48} />
            <h1>
              Welcome {authMode === 'login' ? 'Back' : 'To Your'}
              <br />
              Dream World
            </h1>
            <p>Sign in to continue your dreams, explore your archive, and create new continuations.</p>
            <div className="auth-cloud" />
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'selected' : ''}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Login
              </button>
              <button
                className={authMode === 'signup' ? 'selected' : ''}
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={submitAuth}>
              <label className="icon-input">
                <Mail size={17} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="icon-input">
                <Lock size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>

              {authError && <p className="error">{authError}</p>}

              <button className="pill primary wide" type="submit">
                {authMode === 'login' ? 'Login' : 'Create Account'} <ArrowRight size={17} />
              </button>
            </form>

            <p className="or">or continue with</p>

            <button className="google" onClick={google}>
              <span>G</span> Continue with Google
            </button>

            <button
              className="guest"
              onClick={() => { setGuest(true); go('dashboard'); }}
            >
              Continue as Guest <ArrowRight size={14} />
            </button>

            <p className="auth-foot">
              Firebase sign-in stores your dreams in MongoDB. Guest mode saves on this browser only.
            </p>
          </div>
        </section>
      )}

      {/* ================= APP SHELL (signed in / guest) ================= */}
      {active && !['landing', 'auth'].includes(page) && (
        <div className="shell">
          {/* ---------- Sidebar ---------- */}
          <aside className={menu ? 'sidebar mobile-open' : 'sidebar'}>
            <button className="side-logo" onClick={() => go('dashboard')}>
              <img src="/dream-logo.png" alt="" className="brand-icon" width={32} height={32} />
              <span>Dream<em>Continuator</em></span>
            </button>

            <div className="side-nav">
              {sidebar.map(([p, Icon, label]) => (
                <button
                  key={p}
                  className={page === p || (p === 'archive' && page === 'reader') ? 'current' : ''}
                  onClick={() => go(p)}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <div className="side-user">
              <div className="avatar"><UserRound size={20} /></div>
              <div>
                <strong>{user?.displayName || user?.email?.split('@')[0] || 'Dreamer'}</strong>
                <span>{user ? 'Signed in' : 'Guest account'}</span>
              </div>
              <button title="Log out" onClick={logout}><LogOut size={17} /></button>
            </div>
          </aside>

          {/* ---------- Main content ---------- */}
          <div className="content">
            {/* Mobile bar */}
            <div className="mobile-bar">
              <button onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
              <strong>DreamContinuator</strong>
              <button onClick={newDream}><Plus size={20} /></button>
            </div>

            {/* ---------- DASHBOARD ---------- */}
            {page === 'dashboard' && (
              <>
                <div className="dash-heading">
                  <div>
                    <h1>Good Evening, Dreamer <span>🌙</span></h1>
                    <p>Ready to continue another dream?</p>
                  </div>
                  <div className="mini-moon">☾</div>
                </div>

                <div className="quick-grid">
                  <button className="quick" onClick={newDream}>
                    <PenLine size={27} />
                    <span>
                      <strong>Create New Dream</strong>
                      <small>Write an interrupted dream</small>
                    </span>
                  </button>

                  <button className="quick" onClick={() => go('archive')}>
                    <BookOpen size={29} />
                    <span>
                      <strong>My Dreams</strong>
                      <small>View your dream archive</small>
                    </span>
                  </button>

                  <button className="quick" onClick={() => go('analytics')}>
                    <ChartNoAxesColumn size={29} />
                    <span>
                      <strong>Dream Insights</strong>
                      <small>Your dream patterns and moods</small>
                    </span>
                  </button>
                </div>

                <div className="section-head">
                  <h2>Recent Dreams</h2>
                  <button onClick={() => go('archive')}>View All <ArrowRight size={16} /></button>
                </div>

                <div className="card-grid">
                  {dreams.slice(0, 6).map((d) => (
                    <DreamCard
                      key={d.id}
                      d={d}
                      view={view}
                      favorite={() => updateDream(d.id, { favorite: !d.favorite })}
                    />
                  ))}
                </div>

                {!dreams.length && (
                  <div className="empty recent-empty">
                    <CloudMoon size={38} />
                    <h2>No dreams yet</h2>
                    <p>Write your first dream to begin your own archive.</p>
                    <button className="pill primary" onClick={newDream}>
                      Create First Dream <Sparkles size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ---------- DREAM STUDIO ---------- */}
            {page === 'studio' && (
              <>
                <div className="page-heading">
                  <PenLine size={31} />
                  <div>
                    <h1>Dream Studio</h1>
                    <p>Tell us about your interrupted dream, and let’s continue it together.</p>
                  </div>
                </div>

                <div className="studio-grid">
                  <div className="dream-editor">
                    <label htmlFor="dream-title">DREAM TITLE <span>(OPTIONAL)</span></label>
                    <input
                      id="dream-title"
                      placeholder="e.g. The Flying Castle"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={90}
                    />

                    <label htmlFor="dream-body">YOUR DREAM</label>
                    <textarea
                      id="dream-body"
                      placeholder="Describe your dream (what you saw, felt, and where it ended)..."
                      value={dream}
                      onChange={(e) => setDream(e.target.value)}
                      maxLength={6000}
                    />
                    <div className="counter">{dream.length} / 6000</div>
                  </div>

                  <div className="customize">
                    <Field icon={CloudMoon} label="Mood / Vibe">
                      <select value={mood} onChange={(e) => setMood(e.target.value)}>
                        {moods.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </Field>

                    <Field icon={BookOpen} label="Genre">
                      <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                        {genres.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </Field>

                    <Field icon={SlidersHorizontal} label="Length">
                      <select value={length} onChange={(e) => setLength(e.target.value)}>
                        {['Short', 'Medium', 'Long'].map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </Field>

                    <Field icon={Globe} label="Language">
                      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                        {languages.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </Field>

                    <div className="range-label">Creativity <span>{creativity}%</span></div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={creativity}
                      onChange={(e) => setCreativity(Number(e.target.value))}
                    />
                  </div>
                </div>

                {error && <p className="error" role="alert">{error}</p>}

                <div className="studio-bottom">
                  <div className="hourglass">⌛</div>
                  <button
                    className="pill primary"
                    disabled={busy || dream.trim().length < 20}
                    onClick={generate}
                  >
                    {busy ? (
                      <><RefreshCw className="spin" size={17} /> Weaving your story...</>
                    ) : (
                      <>Continue My Dream <Sparkles size={17} /></>
                    )}
                  </button>
                </div>

                <p className="fine-print">
                  <ShieldCheck size={14} /> AI creates fiction; it cannot recover actual dreams.
                </p>
              </>
            )}

            {/* ---------- READER ---------- */}
            {page === 'reader' && selected && (
              <>
                <button className="back" onClick={() => go('archive')}>
                  <ArrowLeft size={17} /> Back to My Dreams
                </button>

                <div className="reader-heading">
                  <CloudMoon size={27} />
                  <h1>{selected.title} — Continued</h1>
                  <button
                    className="heart"
                    onClick={() => updateDream(selected.id, { favorite: !selected.favorite })}
                  >
                    <Heart fill={selected.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="reader-grid">
                  <div
                    className="story-image"
                    style={{ backgroundImage: `url('/${selected.image || 'castle.png'}')` }}
                  />

                  <article className="story-content">
                    <div className="story-overline">THE DREAM YOU REMEMBER</div>
                    <p>{selected.dream}</p>

                    <div className="story-overline continuation-label">✦ THE DREAM CONTINUES ✦</div>
                    {selected.continuation.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
                  </article>
                </div>

                <div className="reader-tools">
                  <button onClick={() => updateDream(selected.id, { favorite: !selected.favorite })}>
                    <Bookmark size={17} />{selected.favorite ? 'Favorited' : 'Save to Favorites'}
                  </button>

                  <button onClick={() => copy(selected.continuation)}>
                    {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Copied' : 'Copy'}
                  </button>

                  <button onClick={() => exportDream(selected)}>
                    <Download size={17} /> Download
                  </button>

                  <button
                    className="pill primary"
                    onClick={() => {
                      setDream(selected.dream + '\n\n' + selected.continuation);
                      setTitle(selected.title + ' — Chapter 2');
                      setMood(selected.mood);
                      setGenre(selected.genre);
                      setLanguage(selected.language);
                      go('studio');
                    }}
                  >
                    Continue Further <Sparkles size={16} />
                  </button>
                </div>

                {error && <p className="error">{error}</p>}
              </>
            )}

            {/* ---------- ARCHIVE ---------- */}
            {page === 'archive' && (
              <>
                <div className="page-heading">
                  <BookOpen size={30} />
                  <div>
                    <h1>My Dreams</h1>
                    <p>All your dreams and continuations in one place.</p>
                  </div>
                </div>

                <div className="archive-filters">
                  <label className="searchbox">
                    <Search size={18} />
                    <input
                      placeholder="Search dreams..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>

                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option>All Moods</option>
                    {moods.map((x) => <option key={x}>{x}</option>)}
                  </select>

                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>

                {visible.length ? (
                  <div className="archive-list">
                    {visible.map((d) => (
                      <div className="archive-item" key={d.id}>
                        <div
                          className="archive-thumb"
                          style={{ backgroundImage: `url('/${d.image || 'castle-card.png'}')` }}
                        />
                        <button className="archive-info" onClick={() => view(d)}>
                          <strong>{d.title}</strong>
                          <span><b>{d.genre}</b> <b>{d.mood}</b></span>
                        </button>
                        <time>{date(d.createdAt)}</time>
                        <button
                          className="heart"
                          onClick={() => updateDream(d.id, { favorite: !d.favorite })}
                        >
                          <Heart size={19} fill={d.favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button className="icon-btn" title="Delete dream" onClick={() => remove(d.id)}>
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <CloudMoon size={44} />
                    <h2>{dreams.length ? 'No dreams match your search' : 'Your dream archive is waiting'}</h2>
                    <p>
                      {dreams.length
                        ? 'Try another search or filter.'
                        : 'Your dream stories will appear here when you create them.'}
                    </p>
                    <button className="pill primary" onClick={newDream}>
                      Create a Dream <Plus size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ---------- ANALYTICS ---------- */}
            {page === 'analytics' && (
              <>
                <div className="page-heading">
                  <ChartNoAxesColumn size={30} />
                  <div>
                    <h1>Dream Insights</h1>
                    <p>A little window into the stories you've imagined.</p>
                  </div>
                </div>

                <div className="stats-grid">
                  <div><strong>{dreams.length}</strong><span>Total Dreams</span></div>
                  <div><strong>{dreams.filter((d) => d.favorite).length}</strong><span>Favorites</span></div>
                  <div><strong>{new Set(dreams.map((d) => d.genre)).size}</strong><span>Genres Explored</span></div>
                </div>

                <h2 className="subheading">Your Dream Moods</h2>

                {dreams.length ? (
                  moods
                    .filter((m) => dreams.some((d) => d.mood === m))
                    .map((m) => (
                      <div className="mood-row" key={m}>
                        <span>{m}</span>
                        <div>
                          <i
                            style={{
                              width: `${(dreams.filter((d) => d.mood === m).length / dreams.length) * 100}%`,
                            }}
                          />
                        </div>
                        <strong>{dreams.filter((d) => d.mood === m).length}</strong>
                      </div>
                    ))
                ) : (
                  <div className="empty">Create your first dream to see insights here.</div>
                )}
              </>
            )}

            {/* ---------- SETTINGS ---------- */}
            {page === 'settings' && (
              <>
                <div className="page-heading">
                  <Settings size={30} />
                  <div>
                    <h1>Settings</h1>
                    <p>Make your dream space feel like home.</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <nav className="settings-nav" aria-label="Settings sections">
                    {[
                      ['general', Settings, 'General'],
                      ['language', Globe, 'Language'],
                      ['appearance', Sun, 'Appearance'],
                      ['account', UserRound, 'Account'],
                    ].map(([tab, Icon, label]) => (
                      <button
                        type="button"
                        key={tab}
                        className={settingsTab === tab ? 'selected' : ''}
                        aria-current={settingsTab === tab ? 'page' : undefined}
                        onClick={() => setSettingsTab(tab)}
                      >
                        <Icon size={18} /> {label}
                      </button>
                    ))}
                  </nav>

                  <div className="settings-panel">
                    {settingsTab === 'general' && (
                      <>
                        <h2>General Settings</h2>
                        <p className="settings-description">Manage your dream-writing preferences.</p>
                        <div className="settings-line">
                          <div><strong>Dream language</strong><small>Language used for AI continuations</small></div>
                          <select aria-label="Dream language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            {languages.map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                        <div className="settings-line">
                          <div><strong>Appearance</strong><small>Choose how DreamContinuator looks</small></div>
                          <button className="outline-btn" onClick={() => setSettingsTab('appearance')}>Change theme</button>
                        </div>
                        <p className="fine-print">Dream continuations are fictional AI-generated stories.</p>
                      </>
                    )}

                    {settingsTab === 'language' && (
                      <>
                        <h2>Language</h2>
                        <p className="settings-description">Choose the default language for your next dream continuation.</p>
                        <div className="settings-line">
                          <label htmlFor="dream-language-setting">Dream continuation language</label>
                          <select id="dream-language-setting" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            {languages.map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                        <p className="fine-print">This changes the language of generated stories, not the interface text.</p>
                      </>
                    )}

                    {settingsTab === 'appearance' && (
                      <>
                        <h2>Appearance</h2>
                        <p className="settings-description">Customize the atmosphere of your dream space.</p>
                        <div className="theme-heading">Theme</div>
                        <div className="theme-choices">
                          <button type="button" className={dark ? 'selected' : ''} aria-pressed={dark} onClick={() => setDark(true)}>
                            <Moon size={22} /> Dark
                          </button>
                          <button type="button" className={!dark ? 'selected' : ''} aria-pressed={!dark} onClick={() => setDark(false)}>
                            <Sun size={22} /> Light
                          </button>
                        </div>
                      </>
                    )}

                    {settingsTab === 'account' && (
                      <>
                        <h2>Account</h2>
                        <div className="settings-line">
                          <div>
                            <strong>{user?.displayName || user?.email || 'Guest account'}</strong>
                            <small>{user ? 'Signed in with Firebase' : 'Guest — stored on this device'}</small>
                          </div>
                          <button type="button" onClick={logout} className="outline-btn">Sign out</button>
                        </div>
                        <p className="fine-print">{user ? 'Your signed-in dreams are stored in MongoDB.' : 'Guest dreams are saved only in this browser.'}</p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   5. PRESENTATIONAL COMPONENTS
   ============================================================ */

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="feature">
      <Icon size={27} />
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="field">
      <span><Icon size={17} />{label}</span>
      {children}
    </label>
  );
}

function DreamCard({ d, view, favorite }) {
  return (
    <article className="dream-card">
      <button
        className="dream-photo"
        onClick={() => view(d)}
        style={{ backgroundImage: `url('/${d.image || 'castle-card.png'}')` }}
        aria-label={`Read ${d.title}`}
      />
      <div className="dream-card-body">
        <button className="card-title" onClick={() => view(d)}>{d.title}</button>
        <p>{`Continued ${date(d.createdAt)}`}</p>
        <button className="heart" onClick={favorite} aria-label="Favorite dream">
          <Heart size={19} fill={d.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
}

/* ============================================================
   6. MOUNT
   ============================================================ */

createRoot(document.getElementById('root')).render(<App />);