import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  SEED_USER, SEED_POSTS, SEED_FRIENDS, SEED_REQUESTS, SEED_ACTIVITY, ALL_PEOPLE,
} from '../data/seed.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const KEY = 'gratitude.state.v1';

const DEFAULT_SETTINGS = {
  connectionsEnabled: true,
  defaultTimeline: 'connections',      // 'connections' | 'posts'
  defaultPostVisibility: 'public',     // 'public' | 'private'
  language: 'en',
  colorScheme: 'system',               // 'system' | 'light' | 'dark'
  notifyFriendsPosts: false,
  notifyConnectionRequests: false,
  notifyPostReactions: true,
  dailyReminder: false,
  reminderTime: '08:00',
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function freshState() {
  return {
    loggedIn: false,
    user: { ...SEED_USER },
    posts: SEED_POSTS,
    friends: SEED_FRIENDS,
    requests: SEED_REQUESTS,
    sentRequests: [],
    activity: SEED_ACTIVITY,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = loadState();
    if (!saved) return freshState();
    return { ...freshState(), ...saved, settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) } };
  });

  // Persist
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  // Apply theme to <html data-theme>
  const scheme = state.settings.colorScheme;
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = scheme === 'dark' || (scheme === 'system' && mql.matches);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    if (scheme === 'system') {
      mql.addEventListener?.('change', apply);
      return () => mql.removeEventListener?.('change', apply);
    }
  }, [scheme]);

  const patch = useCallback((updater) => {
    setState((s) => ({ ...s, ...(typeof updater === 'function' ? updater(s) : updater) }));
  }, []);

  const setSetting = useCallback((key, value) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  // ---- Auth (demo) ----
  const login = useCallback((screenName) => {
    setState((s) => ({
      ...s,
      loggedIn: true,
      user: { ...s.user, screenName: screenName?.trim() || s.user.screenName },
    }));
  }, []);
  const logout = useCallback(() => setState((s) => ({ ...s, loggedIn: false })), []);
  const deleteAccount = useCallback(() => setState(() => ({ ...freshState() })), []);

  // ---- Posts ----
  const addPost = useCallback((text, isPublic) => {
    const gratitude = text.trim();
    if (!gratitude) return;
    setState((s) => ({
      ...s,
      posts: [
        { id: 'p' + Math.random().toString(36).slice(2), ownerId: 'me', gratitude, date: Date.now(),
          isPublic: s.settings.connectionsEnabled ? isPublic : false, photoURL: null, heartedBy: [] },
        ...s.posts,
      ],
    }));
  }, []);
  const deletePost = useCallback((id) => setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) })), []);
  const togglePrivacy = useCallback((id) => setState((s) => ({
    ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, isPublic: !p.isPublic } : p)),
  })), []);
  const toggleHeart = useCallback((id) => setState((s) => ({
    ...s,
    posts: s.posts.map((p) => {
      if (p.id !== id) return p;
      const has = p.heartedBy.includes('me');
      return { ...p, heartedBy: has ? p.heartedBy.filter((x) => x !== 'me') : [...p.heartedBy, 'me'] };
    }),
  })), []);
  const updateMotto = useCallback((motto) => setState((s) => ({ ...s, user: { ...s.user, motto } })), []);
  const updateProfile = useCallback((fields) => setState((s) => ({ ...s, user: { ...s.user, ...fields } })), []);

  // ---- Connections ----
  const acceptRequest = useCallback((id) => setState((s) => {
    const req = s.requests.find((r) => r.id === id);
    if (!req) return s;
    return { ...s, requests: s.requests.filter((r) => r.id !== id), friends: [...s.friends, { ...req, state: 'friend' }] };
  }), []);
  const declineRequest = useCallback((id) => setState((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) })), []);
  const removeFriend = useCallback((id) => setState((s) => ({ ...s, friends: s.friends.filter((f) => f.id !== id) })), []);
  const markActivityRead = useCallback(() => setState((s) => ({ ...s, activity: s.activity.map((a) => ({ ...a, read: true })) })), []);

  const peopleById = useMemo(() => {
    const map = { ...ALL_PEOPLE, me: state.user };
    state.friends.forEach((f) => { map[f.id] = { ...map[f.id], ...f }; });
    return map;
  }, [state.user, state.friends]);

  const newActivityCount = state.activity.filter((a) => !a.read).length;
  const badgeCount = newActivityCount + state.requests.length;

  const value = {
    ...state,
    peopleById,
    newActivityCount,
    badgeCount,
    patch, setSetting,
    login, logout, deleteAccount,
    addPost, deletePost, togglePrivacy, toggleHeart, updateMotto, updateProfile,
    acceptRequest, declineRequest, removeFriend, markActivityRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
