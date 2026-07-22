import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, deleteUser, updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy,
  onSnapshot, getDocs, Timestamp, arrayUnion, arrayRemove, deleteField, limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, initAnalytics } from '../firebase.js';
import { makeT } from '../i18n.js';
import { enablePush, disablePush, listenForegroundMessages, pushSupported } from '../push.js';
import { compressImage } from '../utils/image.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Settings that live on the user's Firestore document (shared with iOS)...
const FIRESTORE_SETTINGS = {
  connectionsEnabled: true,
  defaultTimeline: 'connections',
  defaultPostVisibility: 'public',
  notifyFriendsPosts: false,
  notifyConnectionRequests: false,
  notifyPostReactions: false,
  dailyReminder: false,
  reminderTime: '08:00',
};
// ...and settings that are device-local (matching the iOS @AppStorage prefs).
const LOCAL_PREFS = { colorScheme: 'light', language: 'en', textSize: 'small' };
export const TEXT_SCALES = { small: 0.85, medium: 0.92, large: 1 };
const PREFS_KEY = 'gratitude.prefs.v1';
const SEEN_KEY = 'gratitude.activitySeen.v1';

const tsToMs = (t) => (t?.toMillis ? t.toMillis() : (typeof t === 'number' ? t : Date.now()));
const loadLocal = (key, fallback) => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...fallback }; } };

export function AppProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState(null);
  const [authUser, setAuthUser] = useState(null);       // firebase auth user (email)
  const [userDoc, setUserDoc] = useState(null);          // users/{uid} document data
  const [ownPosts, setOwnPosts] = useState([]);
  const [friendPosts, setFriendPosts] = useState({});    // { friendId: Post[] }
  const [friends, setFriends] = useState([]);            // [uid]
  const [received, setReceived] = useState([]);          // [uid]
  const [sent, setSent] = useState([]);                  // [uid]
  const [notifications, setNotifications] = useState([]);// [{id,fromUserId,postId,date}]
  const [usersInfo, setUsersInfo] = useState({});        // { uid: {id,screenName,motto,photoURL} }
  const [prefs, setPrefs] = useState(() => loadLocal(PREFS_KEY, LOCAL_PREFS));
  const [activitySeen, setActivitySeen] = useState(() => Number(localStorage.getItem(SEEN_KEY) || 0));

  const friendPostUnsubs = useRef({});

  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);

  // --- Auth state ---
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setAuthUser(u); setUid(u?.uid || null); setAuthReady(true);
    if (!u) { // clear everything on sign-out
      backfilledRef.current = false;
      setUserDoc(null); setOwnPosts([]); setFriendPosts({}); setFriends([]);
      setReceived([]); setSent([]); setNotifications([]); setUsersInfo({});
    }
  }), []);

  // --- Subscriptions that depend on the signed-in uid ---
  useEffect(() => {
    if (!uid) return;
    const unsubs = [];
    unsubs.push(onSnapshot(doc(db, 'users', uid), (s) => setUserDoc(s.exists() ? s.data() : {})));
    unsubs.push(onSnapshot(collection(db, 'friends', uid, 'userFriends'), (s) => setFriends(s.docs.map((d) => d.id))));
    unsubs.push(onSnapshot(collection(db, 'friendRequests', uid, 'received'), (s) => setReceived(s.docs.map((d) => d.id))));
    unsubs.push(onSnapshot(collection(db, 'friendRequests', uid, 'sent'), (s) => setSent(s.docs.map((d) => d.id))));
    unsubs.push(onSnapshot(query(collection(db, 'users', uid, 'posts'), orderBy('date', 'desc')), (s) =>
      setOwnPosts(s.docs.map((d) => normalizePost(d.data(), d.id, uid)))));
    unsubs.push(onSnapshot(collection(db, 'users', uid, 'notifications'), (s) =>
      setNotifications(s.docs.map((d) => ({ id: d.id, fromUserId: d.data().fromUserId, postId: d.data().postId, date: tsToMs(d.data().timestamp) })))));
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  // --- Per-friend public-post listeners (rebuilt when the friends list changes) ---
  useEffect(() => {
    if (!uid) return;
    const current = friendPostUnsubs.current;
    Object.keys(current).forEach((fid) => {
      if (!friends.includes(fid)) { current[fid](); delete current[fid]; setFriendPosts((p) => { const n = { ...p }; delete n[fid]; return n; }); }
    });
    friends.forEach((fid) => {
      if (current[fid]) return;
      current[fid] = onSnapshot(
        query(collection(db, 'users', fid, 'posts'), where('isPublic', '==', true)),
        (s) => setFriendPosts((p) => ({ ...p, [fid]: s.docs.map((d) => normalizePost(d.data(), d.id, fid)) })),
        () => {}
      );
    });
  }, [uid, friends]);

  useEffect(() => () => { Object.values(friendPostUnsubs.current).forEach((u) => u()); }, []);

  // --- Resolve screen names / mottos / photos for self, friends, and notification senders ---
  useEffect(() => {
    const need = new Set([uid, ...friends, ...sent, ...received, ...notifications.map((n) => n.fromUserId)].filter(Boolean));
    const missing = [...need].filter((id) => !usersInfo[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => {
        try { const s = await getDoc(doc(db, 'users', id)); const d = s.data() || {};
          return [id, { id, screenName: d.screenName || '', motto: d.motto || '', mottoVisibility: d.mottoVisibility || 'public', photoURL: d.photoURL || null }]; }
        catch { return [id, { id, screenName: '', motto: '', mottoVisibility: 'public', photoURL: null }]; }
      }));
      if (!cancelled) setUsersInfo((prev) => { const next = { ...prev }; entries.forEach(([id, v]) => (next[id] = v)); return next; });
    })();
    return () => { cancelled = true; };
  }, [uid, friends, sent, received, notifications, usersInfo]); // eslint-disable-line

  // --- Derived state ---
  const posts = useMemo(() => {
    const map = {};
    [...ownPosts, ...Object.values(friendPosts).flat()].forEach((p) => (map[p.id] = p));
    return Object.values(map).sort((a, b) => b.date - a.date);
  }, [ownPosts, friendPosts]);

  const settings = useMemo(() => {
    const fromDoc = {}; Object.keys(FIRESTORE_SETTINGS).forEach((k) => (fromDoc[k] = userDoc?.[k] ?? FIRESTORE_SETTINGS[k]));
    // Only overlay keys that are *currently* device-local. Older builds stored
    // dailyReminder/reminderTime locally; ignoring stale keys here ensures the
    // Firestore value (now the source of truth) wins.
    const local = {}; Object.keys(LOCAL_PREFS).forEach((k) => { if (k in prefs) local[k] = prefs[k]; });
    return { ...fromDoc, ...local };
  }, [userDoc, prefs]);

  const user = useMemo(() => ({
    id: uid,
    email: authUser?.email || userDoc?.email || '',
    screenName: userDoc?.screenName || '',
    motto: userDoc?.motto || '',
    mottoVisibility: userDoc?.mottoVisibility || 'public',
    challenge: userDoc?.challenge || '',
    userType: userDoc?.userType || 'Member',
    hasPremium: userDoc?.hasPremium ?? true,
    isDeveloper: userDoc?.isDeveloper || false,
    photoURL: userDoc?.photoURL || null,
  }), [uid, authUser, userDoc]);

  const peopleById = useMemo(() => {
    const map = { ...usersInfo };
    if (uid) map[uid] = { ...(map[uid] || {}), ...user };
    return map;
  }, [usersInfo, uid, user]);

  const friendObjs = useMemo(() => friends.map((id) => usersInfo[id] || { id, screenName: '' }), [friends, usersInfo]);
  const requestObjs = useMemo(() => received.map((id) => usersInfo[id] || { id, screenName: '' }), [received, usersInfo]);
  const sentRequestObjs = useMemo(() => sent.map((id) => usersInfo[id] || { id, screenName: '' }), [sent, usersInfo]);

  const activity = useMemo(() => {
    const seen = new Set();
    return notifications
      .slice()
      .sort((a, b) => b.date - a.date)
      .filter((n) => { const k = `${n.fromUserId}_${n.postId}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((n) => {
        const post = ownPosts.find((p) => p.id === n.postId);
        return {
          id: n.id,
          fromUserId: n.fromUserId,
          fromScreenName: usersInfo[n.fromUserId]?.screenName || 'Someone',
          postId: n.postId,
          postText: post?.gratitude || null,
          postPhotoURL: post?.photoURL || null,
          date: n.date, read: n.date <= activitySeen,
        };
      });
  }, [notifications, usersInfo, activitySeen, ownPosts]);

  const newActivityCount = activity.filter((a) => !a.read).length;
  const badgeCount = newActivityCount + received.length;

  // --- Theme ---
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = prefs.colorScheme === 'dark' || (prefs.colorScheme === 'system' && mql.matches);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    if (prefs.colorScheme === 'system') { mql.addEventListener?.('change', apply); return () => mql.removeEventListener?.('change', apply); }
  }, [prefs.colorScheme]);

  // ===== Actions =====

  // Auth
  const signIn = useCallback(async (identifier, password) => {
    const id = identifier.trim();
    try {
      let email = id;
      if (!id.includes('@')) {
        // Resolve username → email via the public, get-only `usernames` lookup
        // (readable before sign-in). Existing accounts get their entry written
        // on their next email login, so fall back to that message if missing.
        const snap = await getDoc(doc(db, 'usernames', id.toLowerCase()));
        if (!snap.exists() || !snap.data()?.email) return 'Screen name not found. Try your email, or sign in with email once to enable username login.';
        email = snap.data().email;
      }
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (e) { return friendlyError(e); }
  }, []);

  const signUp = useCallback(async ({ screenName, email, password }) => {
    const name = screenName.trim().toLowerCase();
    try {
      // Check availability against the public usernames lookup — the users
      // collection can't be queried before sign-in (rules require auth).
      const taken = await getDoc(doc(db, 'usernames', name));
      if (taken.exists()) return 'This username is already taken.';
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: email.trim(), screenName: name, connectionsEnabled: true, hasPremium: true, createdAt: Timestamp.now(),
      }, { merge: true });
      // Public username → email lookup so this account can log in by username.
      await setDoc(doc(db, 'usernames', name), { uid: cred.user.uid, email: email.trim() });
      return null;
    } catch (e) { return friendlyError(e); }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try { await sendPasswordResetEmail(auth, email.trim()); return null; } catch (e) { return friendlyError(e); }
  }, []);

  const logout = useCallback(async () => { try { await disablePush(uid); } catch { /* ignore */ } return signOut(auth); }, [uid]);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'posts'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(auth.currentUser);
    } catch (e) {
      if (e?.code === 'auth/requires-recent-login') alert('Please log out and back in, then delete your account again.');
      else console.error(e);
    }
  }, [uid]);

  // Posts
  const addPost = useCallback(async (text, isPublic, imageFile) => {
    const gratitude = text.trim();
    if (!gratitude || !uid) return;
    const id = (globalThis.crypto?.randomUUID?.() || 'p' + Math.random().toString(36).slice(2));
    let photoURL = null;
    if (imageFile) {
      const optimized = await compressImage(imageFile, { maxDim: 1280, quality: 0.8, maxBytes: 400 * 1024 });
      const r = ref(storage, `posts/${uid}/${id}.jpg`);
      await uploadBytes(r, optimized, { contentType: 'image/jpeg' });
      photoURL = await getDownloadURL(r);
    }
    await setDoc(doc(db, 'users', uid, 'posts', id), {
      gratitude, date: Timestamp.now(), isPublic: settings.connectionsEnabled ? isPublic : false, heartedBy: [],
      ...(photoURL ? { photoURL } : {}),
    });
  }, [uid, settings.connectionsEnabled]);

  const deletePost = useCallback(async (id) => {
    if (!uid) return;
    const post = ownPosts.find((p) => p.id === id);
    if (post?.photoURL) { try { await deleteObject(ref(storage, post.photoURL)); } catch { /* ignore */ } }
    await deleteDoc(doc(db, 'users', uid, 'posts', id));
  }, [uid, ownPosts]);

  const togglePrivacy = useCallback(async (id) => {
    if (!uid) return;
    const post = ownPosts.find((p) => p.id === id);
    if (!post) return;
    await updateDoc(doc(db, 'users', uid, 'posts', id), { isPublic: !post.isPublic });
  }, [uid, ownPosts]);

  const toggleHeart = useCallback(async (id) => {
    const post = posts.find((p) => p.id === id);
    if (!post || !uid || post.ownerId === uid) return; // cannot heart own post (matches iOS)
    const pref = doc(db, 'users', post.ownerId, 'posts', id);
    const hearted = post.heartedBy.includes(uid);
    await updateDoc(pref, { heartedBy: hearted ? arrayRemove(uid) : arrayUnion(uid) });
    try {
      // Deterministic id → one heart notification per (sender, post), so
      // toggling sentiment on/off never accumulates duplicates in Activity.
      const notifRef = doc(db, 'users', post.ownerId, 'notifications', `heart_${uid}_${id}`);
      if (!hearted) {
        await setDoc(notifRef, { type: 'heart', fromUserId: uid, postId: id, timestamp: Timestamp.now() });
      } else {
        await deleteDoc(notifRef);
      }
    } catch { /* notification is best-effort */ }
  }, [posts, uid]);

  // Profile
  const updateMotto = useCallback((motto) => setDoc(doc(db, 'users', uid), { motto }, { merge: true }), [uid]);
  const updateProfile = useCallback((fields) => {
    const patch = { ...fields };
    if (patch.screenName) patch.screenName = patch.screenName.trim().toLowerCase();
    const p = setDoc(doc(db, 'users', uid), patch, { merge: true });
    // Keep the public username lookup in sync when the screen name changes.
    if (patch.screenName && authUser?.email) {
      setDoc(doc(db, 'usernames', patch.screenName), { uid, email: authUser.email }, { merge: true }).catch(() => {});
    }
    return p;
  }, [uid, authUser]);

  const uploadProfilePhoto = useCallback(async (file) => {
    if (!uid || !file) return;
    const optimized = await compressImage(file, { maxDim: 512, quality: 0.85, maxBytes: 100 * 1024 });
    // Unique path per upload → a fresh, clean download URL every time (so the
    // Avatar and the image cache always pick up the new photo), with no query-
    // string hacks that can break the URL.
    const path = `profilePictures/${uid}_${Date.now()}.jpg`;
    const r = ref(storage, path);
    await uploadBytes(r, optimized, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(r);
    const prevPath = userDoc?.photoPath || null;
    await setDoc(doc(db, 'users', uid), { photoURL: url, photoPath: path }, { merge: true });
    try { await updateAuthProfile(auth.currentUser, { photoURL: url }); } catch { /* ignore */ }
    // Remove the previous file(s) so we don't accumulate orphans.
    if (prevPath && prevPath !== path) { try { await deleteObject(ref(storage, prevPath)); } catch { /* ignore */ } }
    try { await deleteObject(ref(storage, `profilePictures/${uid}.jpg`)); } catch { /* ignore legacy */ }
  }, [uid, userDoc]);

  const removeProfilePhoto = useCallback(async () => {
    if (!uid) return;
    const path = userDoc?.photoPath;
    if (path) { try { await deleteObject(ref(storage, path)); } catch { /* ignore */ } }
    try { await deleteObject(ref(storage, `profilePictures/${uid}.jpg`)); } catch { /* ignore legacy */ }
    await setDoc(doc(db, 'users', uid), { photoURL: deleteField(), photoPath: deleteField() }, { merge: true });
    try { await updateAuthProfile(auth.currentUser, { photoURL: '' }); } catch { /* ignore */ }
  }, [uid, userDoc]);

  // Settings
  const setSetting = useCallback((key, value) => {
    if (key in FIRESTORE_SETTINGS) { if (uid) setDoc(doc(db, 'users', uid), { [key]: value }, { merge: true }); }
    else setPrefs((p) => ({ ...p, [key]: value }));
    // Turning on any notification-related setting registers this device for push.
    const NOTIFY_KEYS = ['notifyFriendsPosts', 'notifyConnectionRequests', 'notifyPostReactions', 'dailyReminder'];
    if (value === true && NOTIFY_KEYS.includes(key) && uid) enablePush(uid);
  }, [uid]);

  // Ensure this account has a public usernames→email entry (lazy backfill for
  // accounts created before username login existed). Runs once when the profile
  // is available; idempotent, owner-only write.
  const backfilledRef = useRef(false);
  useEffect(() => {
    const email = authUser?.email;
    const name = userDoc?.screenName;
    if (!uid || !email || !name || backfilledRef.current) return;
    backfilledRef.current = true;
    setDoc(doc(db, 'usernames', String(name).toLowerCase()), { uid, email }, { merge: true }).catch(() => {});
  }, [uid, authUser, userDoc]);

  // Register push on load if the person already has notifications enabled and
  // has previously granted permission (so returning users keep receiving them).
  useEffect(() => {
    if (!uid || !pushSupported()) return;
    const anyOn = userDoc && (userDoc.notifyFriendsPosts || userDoc.notifyConnectionRequests
      || userDoc.notifyPostReactions || userDoc.dailyReminder);
    if (anyOn && Notification.permission === 'granted') enablePush(uid);
    const unsubP = listenForegroundMessages();
    return () => { unsubP.then?.((fn) => fn && fn()); };
  }, [uid, userDoc]);

  // Connections
  const searchUsers = useCallback(async (q) => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const snap = await getDocs(query(collection(db, 'users'), where('connectionsEnabled', '==', true), limit(60)));
    return snap.docs
      .map((d) => ({ id: d.id, screenName: d.data().screenName || '', motto: d.data().motto || '', photoURL: d.data().photoURL || null }))
      .filter((u) => u.id !== uid && !friends.includes(u.id) && u.screenName.includes(term));
  }, [uid, friends]);

  const sendRequest = useCallback(async (otherId) => {
    if (!uid || otherId === uid) return;
    await setDoc(doc(db, 'friendRequests', uid, 'sent', otherId), { status: 'pending' });
    await setDoc(doc(db, 'friendRequests', otherId, 'received', uid), { status: 'pending' });
  }, [uid]);

  const acceptRequest = useCallback(async (senderId) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'friendRequests', uid, 'received', senderId));
    await deleteDoc(doc(db, 'friendRequests', senderId, 'sent', uid));
    await setDoc(doc(db, 'friends', uid, 'userFriends', senderId), { since: Timestamp.now() });
    await setDoc(doc(db, 'friends', senderId, 'userFriends', uid), { since: Timestamp.now() });
  }, [uid]);

  const declineRequest = useCallback(async (senderId) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'friendRequests', uid, 'received', senderId));
    await deleteDoc(doc(db, 'friendRequests', senderId, 'sent', uid));
  }, [uid]);

  const cancelRequest = useCallback(async (otherId) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'friendRequests', uid, 'sent', otherId));
    await deleteDoc(doc(db, 'friendRequests', otherId, 'received', uid));
  }, [uid]);

  const removeFriend = useCallback(async (friendId) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'friends', uid, 'userFriends', friendId));
    await deleteDoc(doc(db, 'friends', friendId, 'userFriends', uid));
  }, [uid]);

  const markActivityRead = useCallback(() => {
    const now = Date.now(); setActivitySeen(now); localStorage.setItem(SEEN_KEY, String(now));
  }, []);

  // --- Feedback ---
  const submitFeedback = useCallback(async (text) => {
    const body = (text || '').trim();
    if (!body || !uid) return;
    await addDoc(collection(db, 'feedback'), {
      fromUserId: uid,
      fromScreenName: userDoc?.screenName || '',
      text: body.slice(0, 2000),
      platform: 'web',
      createdAt: Timestamp.now(),
    });
  }, [uid, userDoc]);

  // Developers can review submitted feedback.
  const [feedbackList, setFeedbackList] = useState([]);
  useEffect(() => {
    if (!uid || !userDoc?.isDeveloper) { setFeedbackList([]); return; }
    const unsub = onSnapshot(
      query(collection(db, 'feedback'), orderBy('createdAt', 'desc')),
      (s) => setFeedbackList(s.docs.map((d) => ({ id: d.id, fromUserId: d.data().fromUserId, fromScreenName: d.data().fromScreenName || '', text: d.data().text || '', platform: d.data().platform || '', date: tsToMs(d.data().createdAt) }))),
      () => {}
    );
    return () => unsub();
  }, [uid, userDoc?.isDeveloper]);

  const t = useMemo(() => makeT(settings.language), [settings.language]);

  const value = {
    authReady, loggedIn: !!uid, user, posts, settings, peopleById, t,
    friends: friendObjs, requests: requestObjs, sentRequests: sentRequestObjs, activity, newActivityCount, badgeCount,
    signIn, signUp, resetPassword, logout, deleteAccount,
    addPost, deletePost, togglePrivacy, toggleHeart,
    updateMotto, updateProfile, uploadProfilePhoto, removeProfilePhoto, setSetting,
    searchUsers, sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend, markActivityRead,
    submitFeedback, feedbackList,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function normalizePost(data, id, ownerId) {
  return {
    id, ownerId,
    gratitude: data.gratitude || '',
    date: tsToMs(data.date),
    isPublic: !!data.isPublic,
    photoURL: data.photoURL || null,
    heartedBy: Array.isArray(data.heartedBy) ? data.heartedBy : [],
  };
}

function friendlyError(e) {
  const c = e?.code || '';
  const map = {
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/user-not-found': 'No account found for those details.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect username or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[c] || e?.message || 'Something went wrong. Please try again.';
}
