import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Composer from '../components/Composer.jsx';
import PostCard from '../components/PostCard.jsx';
import Icon from '../components/Icon.jsx';
import { Segmented, Popup, ProfileCard } from '../components/ui.jsx';
import { groupPosts, weekRange, isoWeek } from '../utils/dates.js';

export default function Timeline() {
  const { posts, peopleById, settings, user, toggleHeart, togglePrivacy, deletePost, fetchAllPosts, onboardingBuddyId, t } = useApp();
  const [filter, setFilter] = useState(settings.defaultTimeline === 'posts' ? 'own' : 'connections');
  const [profile, setProfile] = useState(null);
  const [allPosts, setAllPosts] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allError, setAllError] = useState(false);

  useEffect(() => {
    if (!settings.connectionsEnabled && filter !== 'all') setFilter('own');
  }, [settings.connectionsEnabled]);

  // Moderator overview (developers): load every user's public posts.
  useEffect(() => {
    if (filter !== 'all' || !user.isDeveloper) return;
    setLoadingAll(true); setAllError(false);
    fetchAllPosts()
      .then((p) => setAllPosts(p))
      .catch((e) => { console.error('[moderator all-posts] query failed:', e); setAllPosts([]); setAllError(true); })
      .finally(() => setLoadingAll(false));
  }, [filter, user.isDeveloper, fetchAllPosts]);

  const displayed = useMemo(() => {
    if (filter === 'all') return allPosts || [];
    if (filter === 'own') return posts.filter((p) => p.ownerId === user.id);
    return posts.filter((p) => p.isPublic || p.ownerId === user.id);
  }, [posts, filter, user.id, allPosts]);

  const grouped = useMemo(() => groupPosts(displayed), [displayed]);
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const topYear = displayed.length ? isoWeek(new Date([...displayed].sort((a, b) => b.date - a.date)[0].date)).year : null;

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 5vw, 2.1rem)', fontWeight: 600, margin: '4px 0 14px', lineHeight: 1.15 }}>
          {t('timeline.heading.pre')} <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--accent)', textUnderlineOffset: 4, textDecorationThickness: 2 }}>{t('timeline.heading.grateful')}</span> {t('timeline.heading.post')}
        </h1>

        <Composer />

        <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0 6px' }}>
          <span className="serif" style={{ fontSize: '1.9rem', fontWeight: 600 }}>{topYear || ''}</span>
          <div style={{ flex: 1 }} />
          {(settings.connectionsEnabled || user.isDeveloper) && (
            <Segmented
              value={filter} onChange={setFilter}
              options={[
                ...(settings.connectionsEnabled ? [{ value: 'connections', label: '', icon: <Icon name="people" size={17} /> }] : []),
                { value: 'own', label: '', icon: <Icon name="person" size={17} /> },
                ...(user.isDeveloper ? [{ value: 'all', label: '', icon: <Icon name="globe" size={17} /> }] : []),
              ]}
            />
          )}
        </div>

        {displayed.length === 0 ? (
          filter === 'all' ? (
            <div className="muted" style={{ padding: '48px 12px', textAlign: 'center', lineHeight: 1.5 }}>
              {loadingAll ? 'Loading every public post…'
                : allError ? 'Could not load posts. Make sure the moderator rules and the posts index are deployed in Firebase.'
                : 'No public posts yet.'}
            </div>
          ) : (
            <EmptyState own={filter === 'own'} t={t} />
          )
        ) : (
          years.map((year) => (
            <div key={year}>
              {Object.keys(grouped[year]).map(Number).sort((a, b) => b - a).map((week) => (
                <section key={week} style={{ marginBottom: 18 }}>
                  <div className="muted" style={{ fontSize: '.76rem', margin: '10px 2px 8px' }}>
                    {weekRange(year, week)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {grouped[year][week].map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        owner={peopleById[post.ownerId]}
                        meId={user.id}
                        isOwn={post.ownerId === user.id}
                        tourTag={post.welcome && post.ownerId === user.id ? 'welcome' : (onboardingBuddyId && post.ownerId === onboardingBuddyId ? 'buddy' : null)}
                        onToggleHeart={() => toggleHeart(post.id)}
                        onTogglePrivacy={() => togglePrivacy(post.id)}
                        onDelete={() => deletePost(post.id)}
                        onViewProfile={(p) => p?.id && setProfile(p)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))
        )}
      </div>

      <Popup open={!!profile} onClose={() => setProfile(null)}>
        {profile && (
          <ProfileCard profile={profile} isSelf={profile.id === user.id} posts={posts} />
        )}
      </Popup>
    </div>
  );
}

function EmptyState({ own, t }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 30px', color: 'var(--label-tertiary)' }}>
      <Icon name={own ? 'note' : 'people'} size={48} />
      <p className="muted" style={{ fontWeight: 600, marginTop: 14 }}>
        {own ? t('timeline.empty.own') : t('timeline.empty.connections')}
      </p>
    </div>
  );
}
