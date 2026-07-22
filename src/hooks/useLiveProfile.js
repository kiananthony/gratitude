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
        const [snap, postsSnap] = await Promise.all([
          getDoc(doc(db, 'users', id)),
          getDocs(query(collection(db, 'users', id, 'posts'), where('isPublic', '==', true))),
        ]);
        if (cancelled) return;
        const d = snap.data() || {};
        setData({
          id,
          screenName: d.screenName || '',
          motto: d.motto || '',
          mottoVisibility: d.mottoVisibility || 'public',
          photoURL: d.photoURL || null,
          publicPostCount: postsSnap.size,
        });
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [id, skip]);

  return data;
}
