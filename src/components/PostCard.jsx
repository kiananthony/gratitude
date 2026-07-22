import { useState, useRef } from 'react';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { dayAbbrev } from '../utils/dates.js';

export default function PostCard({ post, owner, isOwn, onToggleHeart, onTogglePrivacy, onDelete, onViewProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hearted = post.heartedBy.includes('me');
  const lastTap = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) onToggleHeart(); // double-tap to heart
    lastTap.current = now;
  };

  return (
    <div className="post-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative' }}>
      <button onClick={() => onViewProfile?.(owner)} style={{ padding: 0, borderRadius: '50%' }} title={`@${owner?.screenName || ''}`}>
        <Avatar person={owner} size={46} />
      </button>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }} onClick={handleTap}>
          <span aria-hidden style={{
            position: 'absolute', left: -13, top: 3, fontSize: 8, opacity: 0.3, letterSpacing: '.05em',
          }}>{dayAbbrev(new Date(post.date))}</span>

          <div className="bubble" style={{
            background: 'var(--fill)', borderRadius: 'var(--r-lg)', padding: '11px 14px',
            color: 'var(--label)', lineHeight: 1.4, cursor: 'default', wordBreak: 'break-word',
          }}>
            {post.gratitude}
          </div>

          {hearted && (
            <span className="heart-pop" style={{
              position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
              width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,.12)', color: 'var(--pink)',
            }}>
              <Icon name="heart" size={15} filled />
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, paddingLeft: 2 }}>
          {isOwn && (
            <span className="tertiary" title={post.isPublic ? 'Public' : 'Private'} style={{ display: 'flex' }}>
              <Icon name={post.isPublic ? 'eye' : 'eyeSlash'} size={14} />
            </span>
          )}
          {!isOwn && (
            <button className="react-btn" onClick={onToggleHeart}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: hearted ? 'var(--pink)' : 'var(--label-secondary)', fontSize: '.78rem', padding: '2px 4px' }}>
              <Icon name="heart" size={14} filled={hearted} />
              {hearted ? 'Sentiment shared' : 'Share sentiment'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--label-tertiary)' }}
              onClick={() => setMenuOpen((v) => !v)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} aria-label="More">
              <MoreDots />
            </button>
            {menuOpen && (
              <div className="menu" style={{
                position: 'absolute', right: 0, top: 34, zIndex: 20, minWidth: 168,
                background: 'var(--bg-elevated)', borderRadius: 14, boxShadow: 'var(--shadow-lift)',
                border: '1px solid var(--separator)', overflow: 'hidden', padding: 5,
              }}>
                {isOwn ? (
                  <>
                    <MenuItem icon={post.isPublic ? 'eyeSlash' : 'eye'} label={post.isPublic ? 'Make private' : 'Make public'} onClick={() => { onTogglePrivacy(); setMenuOpen(false); }} />
                    <MenuItem icon="trash" label="Delete" danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                  </>
                ) : (
                  <>
                    <MenuItem icon="person" label={`@${owner?.screenName || ''}`} onClick={() => { onViewProfile?.(owner); setMenuOpen(false); }} />
                    <MenuItem icon="heart" label={hearted ? 'Remove sentiment' : 'Share sentiment'} onClick={() => { onToggleHeart(); setMenuOpen(false); }} />
                    <MenuItem icon="warn" label="Report" onClick={() => setMenuOpen(false)} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, fontSize: '.9rem',
        color: danger ? 'var(--red)' : 'var(--label)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--fill)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      <Icon name={icon} size={17} /> {label}
    </button>
  );
}

function MoreDots() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}
