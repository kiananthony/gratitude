import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import Icon from './Icon.jsx';

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
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: person?.photoURL ? `center/cover url(${person.photoURL})` : `hsl(${hue} 55% 92%)`,
      color: `hsl(${hue} 45% 40%)`,
      border: ring ? '1.5px solid var(--accent)' : 'none',
      fontWeight: 600, fontSize: size * 0.42, userSelect: 'none',
      fontFamily: 'var(--font-serif)',
      overflow: 'hidden',
    }}>
      {!person?.photoURL && initial}
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

export function Segmented({ options, value, onChange }) {
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
    <div className="segmented" role="tablist" ref={wrapRef}>
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

// Simple modal / sheet
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
