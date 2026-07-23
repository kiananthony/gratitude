import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';

// Fetches a user's profile + public post count directly from Firestore by id,
// rather than relying on whatever happens to already be cached client-side
// (usersInfo resolution can lag, and a friend's posts are only loaded if a
// per-friend listener happens to be set up for them). Used by ProfileCard so
// the popup is always correct regardless of what the caller already has.
export function useLiveProfile(id, { skip = false } = {}) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id || skip) { setData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        if (cancelled) return;
        const d = snap.data() || {};
        // Public post count. Prefer the indexed query; if the isPublic index is
        // missing/rebuilding, fall back to reading all posts and counting public.
        let publicPostCount = 0;
        try {
          const ps = await getDocs(query(collection(db, 'users', id, 'posts'), where('isPublic', '==', true)));
          publicPostCount = ps.size;
        } catch {
          const ps = await getDocs(collection(db, 'users', id, 'posts'));
          publicPostCount = ps.docs.filter((x) => x.data().isPublic).length;
        }
        if (cancelled) return;
        setData({
          id,
          screenName: d.screenName || '',
          motto: d.motto || '',
          mottoVisibility: d.mottoVisibility || 'public',
          photoURL: d.photoURL || null,
          publicPostCount,
        });
      } catch (err) {
        console.error('[useLiveProfile] failed to load profile for', id, err);
        if (!cancelled) setData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [id, skip]);

  return data;
}
