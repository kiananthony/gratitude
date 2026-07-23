import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { Avatar, Popup, GAButton } from './ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { dayAbbrev } from '../utils/dates.js';
import { generateShareCard, shareOrDownloadCard } from '../utils/shareCard.js';
import wordmark from '../assets/wordmark.png';

export default function PostCard({ post, owner, isOwn, meId, tourTag, onToggleHeart, onTogglePrivacy, onDelete, onViewProfile }) {
  const { t, submitReport, user, features } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const sendReport = async () => {
    await submitReport({
      postId: post.id,
      ownerId: post.ownerId,
      ownerScreenName: owner?.screenName || '',
      postText: post.gratitude,
      reason: reportReason,
    });
    setReportReason(''); setReportSent(true);
    setTimeout(() => { setReportOpen(false); setReportSent(false); }, 1200);
  };
  const [lightbox, setLightbox] = useState(false);
  const [sharing, setSharing] = useState(false);
  const hearted = post.heartedBy.includes(meId);
  const lastTap = useRef(0);
  const menuRef = useRef(null);

  // Close the "..." menu on any click/tap outside it, more reliable across
  // browsers and touch devices than relying on the button losing focus.
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', onOutside, true);
    return () => document.removeEventListener('pointerdown', onOutside, true);
  }, [menuOpen]);

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
        wordmarkSrc: wordmark,
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
    <div className="post-card" data-tour={tourTag ? `post-${tourTag}` : undefined} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative', zIndex: menuOpen ? 30 : 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 'none' }}>
        <button data-tour={tourTag ? `post-${tourTag}-avatar` : undefined} onClick={() => onViewProfile?.(owner)} style={{ padding: 0, borderRadius: '50%' }} title={`@${owner?.screenName || ''}`}>
          <Avatar person={owner} size={46} />
        </button>

        {/* Privacy indicator (own posts) and the "..." menu, placed under the avatar,
            close to it, where there's usually room once a post runs to two+ lines. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: -2 }}>
          {isOwn && (
            <span title={post.isPublic ? 'Public' : 'Private'} style={{ display: 'flex', color: post.isPublic ? 'var(--accent)' : 'var(--label-secondary)' }}>
              <Icon name={post.isPublic ? 'eye' : 'eyeSlash'} size={16} />
            </span>
          )}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="icon-btn" data-tour={tourTag ? `post-${tourTag}-menu` : undefined} style={{ width: 26, height: 26, color: 'var(--accent)' }}
              onClick={() => setMenuOpen((v) => !v)} aria-label="More">
              <MoreDots />
            </button>
            {menuOpen && (
              <div className="menu" data-tour={tourTag ? `post-${tourTag}-menudrop` : undefined} style={{
                position: 'absolute', left: 0, top: 30, zIndex: 20, width: 'max-content', minWidth: 176,
                background: 'var(--bg-elevated)', borderRadius: 14, boxShadow: 'var(--shadow-lift)',
                border: '1px solid var(--separator)', overflow: 'hidden', padding: 5,
              }}>
                {isOwn ? (
                  <>
                    <MenuItem icon={post.isPublic ? 'eyeSlash' : 'eye'} label={post.isPublic ? t('post.makePrivate') : t('post.makePublic')} onClick={() => { onTogglePrivacy(); setMenuOpen(false); }} />
                    {features.share && <MenuItem icon="share" label={sharing ? t("post.preparing") : t("post.shareImage")} onClick={() => { shareAsImage(); setMenuOpen(false); }} />}
                    <MenuItem icon="trash" label={t('post.delete')} danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                  </>
                ) : (
                  <>
                    <MenuItem icon="person" label={t('post.view', { name: owner?.screenName || '' })} onClick={() => { onViewProfile?.(owner); setMenuOpen(false); }} />
                    <MenuItem icon="heart" label={hearted ? t('post.removeSentiment') : t('post.addSentiment')} onClick={() => { onToggleHeart(); setMenuOpen(false); }} />
                    <MenuItem icon="warn" label={t('post.report')} onClick={() => { setReportOpen(true); setMenuOpen(false); }} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }} onClick={handleTap}>
          <span aria-hidden style={{
            position: 'absolute', left: -18, top: 3, fontSize: 8, opacity: 0.3, letterSpacing: '.05em',
          }}>{dayAbbrev(new Date(post.date))}</span>

          <div className="bubble" style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--r-lg)', padding: '11px 14px',
            color: 'var(--label)', lineHeight: 1.4, cursor: 'default', wordBreak: 'break-word',
            boxShadow: 'var(--shadow)',
          }}>
            {post.gratitude}
          </div>

          {/* Heart badge, the only heart indicator on the card now; the text/icon
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
          <button onClick={() => setLightbox(true)} style={{ display: 'block', padding: 0, marginTop: 8, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)', width: '100%' }}>
            <img src={post.photoURL} alt="" style={{ width: '100%', height: 230, objectFit: 'cover', display: 'block' }} />
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
              position: 'absolute', top: 0, left: 0, right: 0, height: 90,
              background: 'linear-gradient(to bottom, rgba(0,0,0,.35), transparent)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            }}>
              <img src={wordmark} alt="Gratitude" style={{
                height: 28, width: 'auto', display: 'block',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35)) drop-shadow(0 0 1px rgba(255,255,255,.9)) drop-shadow(0 0 5px rgba(255,255,255,.55))',
              }} />
            </div>
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

      <Popup open={reportOpen} onClose={() => setReportOpen(false)}>
        <h3 className="serif" style={{ margin: '0 30px 12px 0', fontWeight: 600 }}>{t('post.report.title')}</h3>
        {reportSent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon name="checkCircle" size={40} /></div>
            <p className="muted" style={{ margin: 0 }}>{t('post.report.thanks')}</p>
          </div>
        ) : (
          <>
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 2 }}>@{owner?.screenName || 'unknown'}</div>
              <div className="muted" style={{ fontSize: '.85rem', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>“{post.gratitude}”</div>
            </div>
            <p className="muted" style={{ marginTop: 0, fontSize: '.88rem' }}>{t('post.report.prompt')}</p>
            <textarea value={reportReason} maxLength={2000} onChange={(e) => setReportReason(e.target.value)} rows={4}
              placeholder={t('post.report.placeholder')}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 16, padding: 14, color: 'var(--label)', fontSize: '1rem', resize: 'vertical', outline: 'none', marginBottom: 12 }} />
            <GAButton text={t('post.report.send')} color="var(--red)" onClick={sendReport} />
          </>
        )}
      </Popup>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, fontSize: '.9rem',
        textAlign: 'left', whiteSpace: 'nowrap', color: danger ? 'var(--red)' : 'var(--label)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--fill)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      <Icon name={icon} size={17} /> <span>{label}</span>
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
