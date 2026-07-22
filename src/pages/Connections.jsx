import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import { Avatar, Segmented } from '../components/ui.jsx';
import { relativeDay } from '../utils/dates.js';

export default function Connections() {
  const {
    friends, requests, activity, newActivityCount, sentRequests,
    acceptRequest, declineRequest, removeFriend, markActivityRead, searchUsers, sendRequest,
  } = useApp();
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
        <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600, margin: '4px 0 14px' }}>Connections</h1>

        <div className="search" style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill)', borderRadius: 'var(--r-md)', padding: '0 14px', height: 44, marginBottom: 18,
        }}>
          <Icon name="search" size={18} color="var(--label-secondary)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search screenname"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--label)', fontSize: '1rem' }} />
          {query && <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setQuery('')}><Icon name="xmark" size={15} /></button>}
        </div>

        {query ? (
          <>
            <div className="section-title">Search results</div>
            {searching ? (
              <p className="muted" style={{ padding: '20px 4px' }}>Searching…</p>
            ) : results.length === 0 ? (
              <p className="muted" style={{ padding: '20px 4px' }}>No one found for “{query}”.</p>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {results.map((u, i) => (
                  <PersonRow key={u.id} person={u} divider={i > 0} action="add"
                    pending={sentRequests.includes(u.id)} onConnect={() => sendRequest(u.id)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <Segmented
                value={tab} onChange={setTab}
                options={[
                  { value: 'activity', label: `Activity${newActivityCount ? ` (${newActivityCount})` : ''}` },
                  { value: 'friends', label: `Friends (${friends.length})` },
                  { value: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` },
                ]}
              />
            </div>

            {tab === 'friends' && (
              friends.length ? (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {friends.map((f, i) => <PersonRow key={f.id} person={f} divider={i > 0} action="remove" onRemove={() => removeFriend(f.id)} />)}
                </div>
              ) : <Empty text="The beauty of positivity is that it's free to share — start connecting with others!" />
            )}

            {tab === 'requests' && (
              requests.length ? (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {requests.map((r, i) => (
                    <div key={r.id} style={{ borderTop: i ? '1px solid var(--separator)' : 'none' }}>
                      <PersonRow person={r} action="respond" onAccept={() => acceptRequest(r.id)} onDecline={() => declineRequest(r.id)} />
                    </div>
                  ))}
                </div>
              ) : <Empty text="You have no requests at the moment." icon="userPlus" />
            )}

            {tab === 'activity' && (
              activity.length ? (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {activity.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderTop: i ? '1px solid var(--separator)' : 'none' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--pink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink)' }}>
                        <Icon name="heart" size={18} filled />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.94rem' }}><strong>@{a.fromScreenName}</strong> {a.text}</div>
                        <div className="tertiary" style={{ fontSize: '.78rem' }}>{relativeDay(a.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty text="No recent activity." icon="clock" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PersonRow({ person, divider, action, onAccept, onDecline, onRemove, onConnect, pending }) {
  const [requested, setRequested] = useState(false);
  const isPending = pending || requested;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderTop: divider ? '1px solid var(--separator)' : 'none' }}>
      <Avatar person={person} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>@{person.screenName}</div>
        {person.motto && <div className="muted" style={{ fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.motto}</div>}
      </div>
      {action === 'add' && (
        <button className="btn" style={{ width: 'auto', height: 36, padding: '0 16px', fontSize: '.85rem', opacity: isPending ? 0.6 : 1 }}
          onClick={() => { setRequested(true); onConnect?.(); }} disabled={isPending}>{isPending ? 'Requested' : 'Connect'}</button>
      )}
      {action === 'remove' && (
        <button className="btn-text" style={{ color: 'var(--label-secondary)' }} onClick={onRemove}>Remove</button>
      )}
      {action === 'respond' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }} onClick={onAccept} title="Accept"><Icon name="check" size={20} /></button>
          <button className="icon-btn" style={{ background: 'var(--fill)' }} onClick={onDecline} title="Decline"><Icon name="xmark" size={18} /></button>
        </div>
      )}
    </div>
  );
}

function Empty({ text, icon = 'people' }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 30px', color: 'var(--label-tertiary)' }}>
      <Icon name={icon} size={44} />
      <p className="muted" style={{ marginTop: 14, maxWidth: 300, marginInline: 'auto' }}>{text}</p>
    </div>
  );
}
