import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, Segmented, Popup, ProfileCard, PostPreview } from '../components/ui.jsx';
import { useLiveProfile } from '../hooks/useLiveProfile.js';
import { relativeDay } from '../utils/dates.js';

export default function Connections() {
  const {
    friends, requests, activity, newActivityCount, sentRequests, user, posts, peopleById, cancelRequest,
    acceptRequest, declineRequest, removeFriend, markActivityRead, searchUsers, sendRequest, t,
  } = useApp();
  const [tab, setTab] = useState('activity');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const inviteFriends = async () => {
    const url = window.location.origin;
    const uname = user.screenName ? `@${user.screenName}` : 'A friend';
    const text = `${uname} is inviting you to share what you're grateful for on Gratitude+ 🌿`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gratitude+', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      }
    } catch { /* share cancelled or unavailable */ }
  };

  useEffect(() => { if (tab === 'activity') markActivityRead(); }, [tab, markActivityRead]);

  // Debounced async search against Firestore.
  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchUsers(term)); } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600, margin: '4px 0 14px' }}>{t('connections.title')}</h1>

        <div className="search" data-tour="connections-search" style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xl)', padding: '4px 14px', minHeight: 52, marginBottom: 18,
        }}>
          <Icon name="search" size={18} color="var(--label-secondary)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('connections.search')}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--label)', fontSize: '1rem', padding: '10px 2px' }} />
          {query && <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setQuery('')}><Icon name="xmark" size={15} /></button>}
        </div>

        {query ? (
          <>
            <div className="section-title">{t('connections.searchResults')}</div>
            {searching ? (
              <p className="muted" style={{ padding: '20px 4px' }}>{t('connections.searching')}</p>
            ) : results.length === 0 ? (
              <p className="muted" style={{ padding: '20px 4px' }}>{t('connections.noneFound', { q: query })}</p>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {results.map((u, i) => (
                  <PersonRow key={u.id} person={u} divider={i > 0} action="add"
                    pending={sentRequests.some((r) => r.id === u.id)} onConnect={() => sendRequest(u.id)} onViewProfile={() => setProfile(u)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
              <Segmented
                value={tab} onChange={setTab}
                options={[
                  { value: 'activity', label: `${t('connections.tab.activity')}${newActivityCount ? ` (${newActivityCount})` : ''}` },
                  { value: 'friends', label: `${t('connections.tab.friends')} (${friends.length})` },
                  { value: 'requests', label: `${t('connections.tab.requests')}${requests.length ? ` (${requests.length})` : ''}` },
                ]}
              />
              <button onClick={inviteFriends} title="Invite friends" aria-label="Invite friends"
                style={{ flex: 'none', width: 44, height: 38, borderRadius: 12, background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={inviteCopied ? 'check' : 'userPlus'} size={20} />
              </button>
            </div>

            {tab === 'friends' && (
              friends.length ? (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {friends.map((f, i) => <PersonRow key={f.id} person={f} divider={i > 0} action="remove" onRemove={() => removeFriend(f.id)} onViewProfile={() => setProfile(f)} />)}
                </div>
              ) : <Empty text={t('connections.emptyFriends')} />
            )}

            {tab === 'requests' && (
              <>
                {requests.length ? (
                  <div className="card" style={{ overflow: 'hidden', marginBottom: sentRequests.length ? 22 : 0 }}>
                    {requests.map((r, i) => (
                      <div key={r.id} style={{ borderTop: i ? '1px solid var(--separator)' : 'none' }}>
                        <PersonRow person={r} action="respond" onAccept={() => acceptRequest(r.id)} onDecline={() => declineRequest(r.id)} onViewProfile={() => setProfile(r)} />
                      </div>
                    ))}
                  </div>
                ) : !sentRequests.length && <Empty text={t('connections.noRequests')} icon="userPlus" />}

                {sentRequests.length > 0 && (
                  <>
                    <div className="section-title">{t('connections.sent')}</div>
                    <div className="card" style={{ overflow: 'hidden' }}>
                      {sentRequests.map((r, i) => (
                        <PersonRow key={r.id} person={r} divider={i > 0} action="cancel" onCancel={() => cancelRequest(r.id)} onViewProfile={() => setProfile(r)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'activity' && (
              activity.length ? (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {activity.map((a, i) => (
                    <div key={a.id} data-tour={i === 0 ? 'activity-first' : undefined} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderTop: i ? '1px solid var(--separator)' : 'none' }}>
                      <button onClick={() => setProfile(peopleById[a.fromUserId] || { id: a.fromUserId, screenName: a.fromScreenName })}
                        style={{ position: 'relative', padding: 0, borderRadius: '50%', flex: 'none' }}>
                        <ActivityAvatar fromUserId={a.fromUserId} fromScreenName={a.fromScreenName} cached={peopleById[a.fromUserId]} />
                        <span style={{
                          position: 'absolute', right: -3, bottom: -3, width: 17, height: 17, borderRadius: '50%',
                          background: a.type === 'welcome' ? 'var(--accent)' : 'var(--pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid var(--bg-elevated)',
                        }}>
                          <Icon name={a.type === 'welcome' ? 'sparkle' : 'heart'} size={9} filled />
                        </span>
                      </button>
                      <button onClick={() => a.type === 'welcome' ? setProfile(peopleById[a.fromUserId] || { id: a.fromUserId, screenName: a.fromScreenName }) : setViewPost(posts.find((p) => p.id === a.postId) || { gratitude: a.postText, photoURL: a.postPhotoURL, date: a.date })}
                        style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: 0 }}>
                        {a.type === 'welcome' ? (
                          <div style={{ fontSize: '.94rem' }}>
                            <strong>@{a.fromScreenName}</strong> {t('connections.welcomeActivity')}
                          </div>
                        ) : (
                          <div style={{ fontSize: '.94rem' }}>
                            <strong>@{a.fromScreenName}</strong> {t('connections.sentimentOn')}{!a.postText && '.'}
                          </div>
                        )}
                        {a.postText && (
                          <div className="muted" style={{ fontSize: '.85rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            “{a.postText}”
                          </div>
                        )}
                        <div className="tertiary" style={{ fontSize: '.78rem', marginTop: 3 }}>{relativeDay(a.date)}</div>
                      </button>
                      {a.postPhotoURL && (
                        <img src={a.postPhotoURL} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : <Empty text={t('connections.noActivity')} icon="clock" />
            )}
          </>
        )}
      </div>

      <Popup open={!!profile} onClose={() => setProfile(null)}>
        {profile && <ProfileCard profile={profile} isSelf={profile.id === user.id} posts={posts} />}
      </Popup>

      <Popup open={!!viewPost} onClose={() => setViewPost(null)}>
        {viewPost && <PostPreview post={viewPost} owner={user} />}
      </Popup>
    </div>
  );
}

function PersonRow({ person, divider, action, onAccept, onDecline, onRemove, onConnect, onCancel, onViewProfile, pending }) {
  const { t } = useApp();
  const [requested, setRequested] = useState(false);
  const isPending = pending || requested;
  const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };
  return (
    <div onClick={() => onViewProfile?.()} role="button" tabIndex={0}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderTop: divider ? '1px solid var(--separator)' : 'none', cursor: 'pointer' }}>
      <Avatar person={person} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>@{person.screenName}</div>
        {person.motto && <div className="muted" style={{ fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.motto}</div>}
      </div>
      {action === 'add' && (
        isPending ? (
          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--fill)', color: 'var(--label-secondary)', borderRadius: 999, padding: '7px 12px',
            fontSize: '.82rem', fontWeight: 600, flex: 'none' }}>
            <Icon name="check" size={15} /> {t('connections.requested')}
          </span>
        ) : (
          <button className="icon-btn" onClick={stop(() => { setRequested(true); onConnect?.(); })}
            title={t('connections.connect')}
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon name="connect" size={20} />
          </button>
        )
      )}
      {action === 'remove' && (
        <button className="icon-btn" onClick={stop(onRemove)} title="Remove"
          style={{ background: 'rgba(255,59,48,0.10)', color: 'var(--red)' }}>
          <Icon name="disconnect" size={20} />
        </button>
      )}
      {action === 'respond' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }} onClick={stop(onAccept)} title="Accept"><Icon name="check" size={20} /></button>
          <button className="icon-btn" style={{ background: 'var(--fill)' }} onClick={stop(onDecline)} title="Decline"><Icon name="xmark" size={18} /></button>
        </div>
      )}
      {action === 'cancel' && (
        <button className="icon-btn" onClick={stop(onCancel)} title="Cancel request"
          style={{ background: 'var(--fill)', color: 'var(--label-secondary)' }}>
          <Icon name="xmark" size={18} />
        </button>
      )}
    </div>
  );
}

function ActivityAvatar({ fromUserId, fromScreenName, cached }) {
  // Don't depend solely on the app-wide passive cache, fetch this person's
  // profile directly by ID, same as the profile popup does, so the avatar is
  // never stuck showing a placeholder just because of resolution timing.
  const live = useLiveProfile(fromUserId, { skip: !!cached?.photoURL });
  const person = live || cached || { id: fromUserId, screenName: fromScreenName };
  return <Avatar person={person} size={38} />;
}

function Empty({ text, icon = 'people' }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 30px', color: 'var(--label-tertiary)' }}>
      <Icon name={icon} size={44} />
      <p className="muted" style={{ marginTop: 14, maxWidth: 300, marginInline: 'auto' }}>{text}</p>
    </div>
  );
}
