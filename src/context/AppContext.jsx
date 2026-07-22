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

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Settings that live on the user's Firestore document (shared with iOS)...
const FIRESTORE_SETTINGS = {
  connectionsEnabled: true,
  defaultTimeline: 'connections',
  defaultPostVisibility: 'public',
  notifyFriendsPosts: false,
  notifyConnectionRequests: false,
  notifyPostReactions: true,
};
// ...and settings that are device-local (matching the iOS @AppStorage prefs).
const LOCAL_PREFS = { colorScheme: 'system', language: 'en', dailyReminder: false, reminderTime: '08:00', textSize: 'medium' };
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
  }, [uid, friends, sent, received, notifications]); // eslint-disable-line

  // --- Derived state ---
  const posts = useMemo(() => {
    const map = {};
    [...ownPosts, ...Object.values(friendPosts).flat()].forEach((p) => (map[p.id] = p));
    return Object.values(map).sort((a, b) => b.date - a.date);
  }, [ownPosts, friendPosts]);

  const settings = useMemo(() => {
    const fromDoc = {}; Object.keys(FIRESTORE_SETTINGS).forEach((k) => (fromDoc[k] = userDoc?.[k] ?? FIRESTORE_SETTINGS[k]));
    return { ...fromDoc, ...prefs };
  }, [userDoc, prefs]);

  const user = useMemo(() => ({
    id: uid,
    email: authUser?.email || userDoc?.email || '',
    screenName: userDoc?.screenName || '',
    motto: userDoc?.motto || '',
    mottoVisibility: userDoc?.mottoVisibility || 'public',
    challenge: userDoc?.challenge || '',
    userType: userDoc?.userType || 'Member',
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

  const activity = useMemo(() => notifications
    .map((n) => {
      const post = ownPosts.find((p) => p.id === n.postId);
      return {
        id: n.id,
        fromScreenName: usersInfo[n.fromUserId]?.screenName || 'Someone',
        postId: n.postId,
        postText: post?.gratitude || null,
        postPhotoURL: post?.photoURL || null,
        date: n.date, read: n.date <= activitySeen,
      };
    })
    .sort((a, b) => b.date - a.date), [notifications, usersInfo, activitySeen, ownPosts]);

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
        const snap = await getDocs(query(collection(db, 'users'), where('screenName', '==', id.toLowerCase()), limit(1)));
        if (snap.empty) return 'Screen name not found.';
        email = snap.docs[0].data().email;
      }
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (e) { return friendlyError(e); }
  }, []);

  const signUp = useCallback(async ({ screenName, email, password }) => {
    const name = screenName.trim().toLowerCase();
    try {
      const exists = await getDocs(query(collection(db, 'users'), where('screenName', '==', name), limit(1)));
      if (!exists.empty) return 'This username is already taken.';
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: email.trim(), screenName: name, connectionsEnabled: true, createdAt: Timestamp.now(),
      }, { merge: true });
      return null;
    } catch (e) { return friendlyError(e); }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try { await sendPasswordResetEmail(auth, email.trim()); return null; } catch (e) { return friendlyError(e); }
  }, []);

  const logout = useCallback(() => signOut(auth), []);

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
      const r = ref(storage, `posts/${uid}/${id}.jpg`);
      await uploadBytes(r, imageFile, { contentType: imageFile.type || 'image/jpeg' });
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
      if (!hearted) {
        await addDoc(collection(db, 'users', post.ownerId, 'notifications'),
          { type: 'heart', fromUserId: uid, postId: id, timestamp: Timestamp.now() });
      } else {
        const snap = await getDocs(query(collection(db, 'users', post.ownerId, 'notifications'), where('postId', '==', id)));
        await Promise.all(snap.docs.filter((d) => d.data().type === 'heart' && d.data().fromUserId === uid).map((d) => deleteDoc(d.ref)));
      }
    } catch { /* notification is best-effort */ }
  }, [posts, uid]);

  // Profile
  const updateMotto = useCallback((motto) => setDoc(doc(db, 'users', uid), { motto }, { merge: true }), [uid]);
  const updateProfile = useCallback((fields) => {
    const patch = { ...fields };
    if (patch.screenName) patch.screenName = patch.screenName.trim().toLowerCase();
    return setDoc(doc(db, 'users', uid), patch, { merge: true });
  }, [uid]);

  const uploadProfilePhoto = useCallback(async (file) => {
    if (!uid || !file) return;
    const r = ref(storage, `profilePictures/${uid}.jpg`);
    await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
    const url = await getDownloadURL(r);
    await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true });
    try { await updateAuthProfile(auth.currentUser, { photoURL: url }); } catch { /* ignore */ }
  }, [uid]);

  const removeProfilePhoto = useCallback(async () => {
    if (!uid) return;
    try { await deleteObject(ref(storage, `profilePictures/${uid}.jpg`)); } catch { /* ignore */ }
    await setDoc(doc(db, 'users', uid), { photoURL: deleteField() }, { merge: true });
  }, [uid]);

  // Settings
  const setSetting = useCallback((key, value) => {
    if (key in FIRESTORE_SETTINGS) { if (uid) setDoc(doc(db, 'users', uid), { [key]: value }, { merge: true }); }
    else setPrefs((p) => ({ ...p, [key]: value }));
  }, [uid]);

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

  const value = {
    authReady, loggedIn: !!uid, user, posts, settings, peopleById,
    friends: friendObjs, requests: requestObjs, sentRequests: sentRequestObjs, activity, newActivityCount, badgeCount,
    signIn, signUp, resetPassword, logout, deleteAccount,
    addPost, deletePost, togglePrivacy, toggleHeart,
    updateMotto, updateProfile, uploadProfilePhoto, removeProfilePhoto, setSetting,
    searchUsers, sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend, markActivityRead,
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
