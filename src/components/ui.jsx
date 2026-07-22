import { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import Icon from './Icon.jsx';
import { useLiveProfile } from '../hooks/useLiveProfile.js';
import { useApp } from '../context/AppContext.jsx';
import wordmark from '../assets/wordmark.png';

// GAButton — filled or text style
export function GAButton({ text, onClick, disabled, icon, color, style = 'filled', size, children }) {
  if (style === 'text') {
    return (
      <button className={`btn-text${size === 'sm' ? ' btn-text--sm' : ''}`} onClick={onClick} disabled={disabled}
        style={color ? { color } : undefined}>
        {text || children}
      </button>
    );
  }
  return (
    <button className={`btn${icon ? ' btn--icon-left' : ''}`} onClick={onClick} disabled={disabled}
      style={color ? { background: color } : undefined}>
      {icon && <Icon name={icon} size={20} filled />}
      {text || children}
    </button>
  );
}

// GATextField — with optional validation + secure toggle
export function GATextField({
  placeholder, value, onChange, type = 'text', secure = false,
  validate, autoComplete, onEnter,
}) {
  const err = validate && value ? validate(value) : null;
  const showError = !!(err && !err.isValid && err.errorMessage);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          className={`field${showError ? ' field--error' : ''}`}
          placeholder={placeholder}
          type={secure ? 'password' : type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        />
        {validate && value && !showError && (
          <span style={{ position: 'absolute', right: 14, color: 'var(--green)', display: 'flex' }}>
            <Icon name="checkCircle" size={20} />
          </span>
        )}
      </div>
      {showError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: '.8rem', padding: '0 4px' }}>
          <Icon name="warn" size={14} /> {err.errorMessage}
        </div>
      )}
    </div>
  );
}

// Avatar — circular, accent ring, initial fallback
export function Avatar({ person, size = 48, ring = true }) {
  const name = person?.screenName || '';
  const initial = name ? name[0].toUpperCase() : '?';
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const photoURL = person?.photoURL || null;
  const [loaded, setLoaded] = useState(false);
  // Reset the loaded flag whenever the photo itself changes (new upload, different person).
  useEffect(() => { setLoaded(false); }, [photoURL]);

  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: photoURL ? 'var(--fill)' : `hsl(${hue} 55% 92%)`,
      color: `hsl(${hue} 45% 40%)`,
      border: ring ? '1.5px solid var(--accent)' : 'none',
      fontWeight: 600, fontSize: size * 0.42, userSelect: 'none',
      fontFamily: 'var(--font-serif)',
      overflow: 'hidden',
    }}>
      {photoURL ? (
        <>
          <img src={photoURL} alt="" onLoad={() => setLoaded(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: loaded ? 1 : 0, transition: 'opacity .25s ease',
            }} />
          {!loaded && <AvatarLoader size={size} />}
        </>
      ) : initial}
    </div>
  );
}

// Blue circles pulsing inward — shown in place of a profile picture while it loads.
function AvatarLoader({ size }) {
  const ringCount = 3;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <span key={i} className="avatar-loader-ring" style={{
          width: size * 0.8, height: size * 0.8,
          animationDelay: `${i * 0.4}s`,
        }} />
      ))}
      <span className="avatar-loader-dot" style={{ width: size * 0.14, height: size * 0.14 }} />
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="track" /><span className="thumb" />
    </label>
  );
}

export function Segmented({ options, value, onChange, disabled }) {
  const wrapRef = useRef(null);
  const btnRefs = useRef({});
  const [indicator, setIndicator] = useState(null);

  const measure = () => {
    const wrap = wrapRef.current;
    const btn = btnRefs.current[value];
    if (!wrap || !btn) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({ left: btnRect.left - wrapRect.left, width: btnRect.width });
  };

  useLayoutEffect(() => { measure(); }, [value, options.length]); // eslint-disable-line
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [value]); // eslint-disable-line

  return (
    <div className="segmented" role="tablist" ref={wrapRef}
      style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      {indicator && (
        <span className="segmented-indicator" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />
      )}
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value}
          ref={(el) => { btnRefs.current[o.value] = el; }}
          className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

// Profile preview — shown in a Sheet when tapping a person (avatar, row, or
// post author). Shared by Timeline and Connections so it looks the same everywhere.
export function ProfileCard({ profile, isSelf = false, posts = [] }) {
  const { t } = useApp();
  const live = useLiveProfile(profile.id, { skip: isSelf });
  const merged = { ...profile, ...(live || {}) };
  const count = live ? live.publicPostCount : posts.filter((p) => p.ownerId === profile.id && p.isPublic).length;
  const AV = 140;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 14 }}>
      <img src={wordmark} alt="Gratitude" style={{ height: 30, width: 'auto', marginBottom: 28, opacity: .95 }} />

      {/* Avatar with a thicker inner border and two thinner concentric outer rings. */}
      <div style={{ position: 'relative', width: AV, height: AV, flex: 'none', marginBottom: 4 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2.5px solid var(--accent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: -7, borderRadius: '50%', border: '1.25px solid var(--accent)', opacity: .45, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1px solid var(--accent)', opacity: .22, pointerEvents: 'none' }} />
        <Avatar person={merged} size={AV} ring={false} />
      </div>

      <h2 className="serif" style={{ margin: '18px 0 2px', fontWeight: 600, fontSize: '1.5rem' }}>@{merged.screenName}</h2>
      {isSelf && <div className="tertiary" style={{ fontSize: '.8rem' }}>{t('profile.thisIsYou')}</div>}
      {merged.motto && (isSelf || merged.mottoVisibility !== 'private') && (
        <p className="muted" style={{ maxWidth: 340, margin: '10px 0 0', fontSize: '1rem', lineHeight: 1.45, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>“{merged.motto}”</p>
      )}
      <div style={{
        marginTop: 18, padding: '10px 18px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)',
        fontWeight: 600, fontSize: '.88rem',
      }}>
        {t('profile.expressed', { n: count, times: count === 1 ? t('profile.time') : t('profile.times') })}
      </div>
    </div>
  );
}

// Quick preview of a single post — used when tapping a post reference from
// somewhere that isn't the main feed (like an Activity row).
export function PostPreview({ post, owner }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 6 }}>
      <Avatar person={owner} size={64} />
      <div style={{ fontWeight: 600, marginTop: 8 }}>@{owner?.screenName || ''}</div>
      {post.photoURL && (
        <img src={post.photoURL} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, marginTop: 12 }} />
      )}
      <p className="serif" style={{ margin: '14px 0 0', fontSize: '1.05rem', lineHeight: 1.45, fontWeight: 500 }}>“{post.gratitude}”</p>
      <div className="tertiary" style={{ marginTop: 10, fontSize: '.78rem' }}>
        {new Date(post.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
// Small centered popup with a close button — used for quick previews (like a
// profile card) where a full bottom sheet would be overkill.
export function Popup({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      animation: 'fade .15s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', background: 'var(--bg-elevated)', borderRadius: 24,
        padding: '28px 24px 24px', maxWidth: 360, width: '100%', boxShadow: 'var(--shadow-lift)',
        animation: 'popIn .22s cubic-bezier(.2,.9,.25,1.15)',
      }}>
        <button onClick={onClose} aria-label="Close" className="icon-btn"
          style={{ position: 'absolute', top: 10, right: 10, background: 'var(--fill)', width: 32, height: 32 }}>
          <Icon name="xmark" size={15} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 60,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fade .2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="sheet-panel" style={{
        background: 'var(--bg)', width: '100%', maxWidth: 520,
        borderRadius: '22px 22px 0 0', padding: '10px 0 max(20px, env(safe-area-inset-bottom))',
        boxShadow: 'var(--shadow-lift)', maxHeight: '88vh', overflow: 'auto',
        animation: 'slideUp .28s cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--label-tertiary)', margin: '6px auto 12px' }} />
        {title && <h3 style={{ margin: '0 20px 12px', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>{title}</h3>}
        <div style={{ padding: '0 20px' }}>{children}</div>
      </div>
    </div>
  );
}
