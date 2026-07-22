import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { dayAbbrev } from '../utils/dates.js';
import { generateShareCard, shareOrDownloadCard } from '../utils/shareCard.js';

export default function PostCard({ post, owner, isOwn, meId, onToggleHeart, onTogglePrivacy, onDelete, onViewProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [sharing, setSharing] = useState(false);
  const hearted = post.heartedBy.includes(meId);
  const lastTap = useRef(0);

  const shareAsImage = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await generateShareCard({
        username: owner?.screenName || '',
        gratitude: post.gratitude,
        date: post.date,
        photoURL: owner?.photoURL || null,
        postPhotoURL: post.photoURL || null,
      });
      if (blob) await shareOrDownloadCard(blob, `gratitude-${post.id}.png`);
    } finally { setSharing(false); }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) onToggleHeart(); // double-tap to heart
    lastTap.current = now;
  };

  return (
    <div className="post-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative', zIndex: menuOpen ? 30 : 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 'none' }}>
        <button onClick={() => onViewProfile?.(owner)} style={{ padding: 0, borderRadius: '50%' }} title={`@${owner?.screenName || ''}`}>
          <Avatar person={owner} size={46} />
        </button>

        {/* Privacy indicator (own posts) and the "..." menu — placed under the avatar,
            where there's usually room once a post runs to two or more lines. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isOwn && (
            <span className="tertiary" title={post.isPublic ? 'Public' : 'Private'} style={{ display: 'flex' }}>
              <Icon name={post.isPublic ? 'eye' : 'eyeSlash'} size={14} />
            </span>
          )}
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" style={{ width: 26, height: 26, color: 'var(--label-tertiary)' }}
              onClick={() => setMenuOpen((v) => !v)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} aria-label="More">
              <MoreDots />
            </button>
            {menuOpen && (
              <div className="menu" style={{
                position: 'absolute', left: 0, top: 30, zIndex: 20, minWidth: 168,
                background: 'var(--bg-elevated)', borderRadius: 14, boxShadow: 'var(--shadow-lift)',
                border: '1px solid var(--separator)', overflow: 'hidden', padding: 5,
              }}>
                {isOwn ? (
                  <>
                    <MenuItem icon={post.isPublic ? 'eyeSlash' : 'eye'} label={post.isPublic ? 'Make private' : 'Make public'} onClick={() => { onTogglePrivacy(); setMenuOpen(false); }} />
                    <MenuItem icon="share" label={sharing ? 'Preparing…' : 'Share as image'} onClick={() => { shareAsImage(); setMenuOpen(false); }} />
                    <MenuItem icon="trash" label="Delete" danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                  </>
                ) : (
                  <>
                    <MenuItem icon="person" label={`@${owner?.screenName || ''}`} onClick={() => { onViewProfile?.(owner); setMenuOpen(false); }} />
                    <MenuItem icon="heart" label={hearted ? 'Remove sentiment' : 'Share sentiment'} onClick={() => { onToggleHeart(); setMenuOpen(false); }} />
                    <MenuItem icon="share" label={sharing ? 'Preparing…' : 'Share as image'} onClick={() => { shareAsImage(); setMenuOpen(false); }} />
                    <MenuItem icon="warn" label="Report" onClick={() => setMenuOpen(false)} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }} onClick={handleTap}>
          <span aria-hidden style={{
            position: 'absolute', left: -13, top: 3, fontSize: 8, opacity: 0.3, letterSpacing: '.05em',
          }}>{dayAbbrev(new Date(post.date))}</span>

          <div className="bubble" style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--r-lg)', padding: '11px 14px',
            color: 'var(--label)', lineHeight: 1.4, cursor: 'default', wordBreak: 'break-word',
            boxShadow: 'var(--shadow)',
          }}>
            {post.gratitude}
          </div>

          {/* Heart badge — the only heart indicator on the card now; the text/icon
              row that used to sit below the post was redundant with this. */}
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

        {post.photoURL && (
          <button onClick={() => setLightbox(true)} style={{ display: 'block', padding: 0, marginTop: 8, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)', maxWidth: 260 }}>
            <img src={post.photoURL} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
          </button>
        )}
      </div>

      {lightbox && post.photoURL && createPortal(
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'linear-gradient(to bottom, var(--glass-bg-top), var(--glass-bg-bottom))',
          backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          animation: 'fade .18s ease',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'relative', maxWidth: '92vw', maxHeight: '82vh', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.45)',
          }}>
            <img src={post.photoURL} alt="" style={{ display: 'block', maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain' }} />
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, padding: '32px 18px 16px',
              background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent)',
              color: '#fff', fontFamily: 'var(--font-serif)', fontSize: '1.02rem', lineHeight: 1.4,
            }}>
              {post.gratitude}
            </div>
            <button onClick={() => setLightbox(false)} aria-label="Close" style={{
              position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="xmark" size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}
