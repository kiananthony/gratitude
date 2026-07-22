import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Composer from '../components/Composer.jsx';
import PostCard from '../components/PostCard.jsx';
import Icon from '../components/Icon.jsx';
import { Segmented, Avatar, Sheet } from '../components/ui.jsx';
import { groupPosts, weekRange, isoWeek } from '../utils/dates.js';

export default function Timeline() {
  const { posts, peopleById, settings, toggleHeart, togglePrivacy, deletePost } = useApp();
  const [filter, setFilter] = useState(settings.defaultTimeline === 'posts' ? 'own' : 'connections');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!settings.connectionsEnabled) setFilter('own');
  }, [settings.connectionsEnabled]);

  const displayed = useMemo(() => {
    if (filter === 'own') return posts.filter((p) => p.ownerId === 'me');
    return posts.filter((p) => p.isPublic);
  }, [posts, filter]);

  const grouped = useMemo(() => groupPosts(displayed), [displayed]);
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const topYear = displayed.length ? isoWeek(new Date([...displayed].sort((a, b) => b.date - a.date)[0].date)).year : null;

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 5vw, 2.1rem)', fontWeight: 600, margin: '4px 0 14px', lineHeight: 1.15 }}>
          What are you <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--accent)', textUnderlineOffset: 4, textDecorationThickness: 2 }}>grateful</span> for today?
        </h1>

        <Composer />

        <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0 6px' }}>
          <span className="serif" style={{ fontSize: '1.9rem', fontWeight: 600 }}>{topYear || ''}</span>
          <div style={{ flex: 1 }} />
          {settings.connectionsEnabled && (
            <Segmented
              value={filter} onChange={setFilter}
              options={[
                { value: 'connections', label: '', icon: <Icon name="people" size={17} /> },
                { value: 'own', label: '', icon: <Icon name="person" size={17} /> },
              ]}
            />
          )}
        </div>

        {displayed.length === 0 ? (
          <EmptyState own={filter === 'own'} />
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
                        isOwn={post.ownerId === 'me'}
                        onToggleHeart={() => toggleHeart(post.id)}
                        onTogglePrivacy={() => togglePrivacy(post.id)}
                        onDelete={() => deletePost(post.id)}
                        onViewProfile={(p) => p?.id !== 'me' && setProfile(p)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))
        )}
      </div>

      <Sheet open={!!profile} onClose={() => setProfile(null)}>
        {profile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 10 }}>
            <Avatar person={profile} size={92} />
            <h2 className="serif" style={{ margin: '14px 0 2px', fontWeight: 600 }}>@{profile.screenName}</h2>
            {profile.motto && <p className="muted" style={{ maxWidth: 320, margin: '4px 0 0' }}>“{profile.motto}”</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function EmptyState({ own }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 30px', color: 'var(--label-tertiary)' }}>
      <Icon name={own ? 'note' : 'people'} size={48} />
      <p className="muted" style={{ fontWeight: 600, marginTop: 14 }}>
        {own ? 'Start posting your gratitude moments' : 'Connect with others to see their posts'}
      </p>
    </div>
  );
}
