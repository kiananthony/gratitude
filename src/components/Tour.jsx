import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';

// A coach-mark tour that walks people through the real UI: it switches tabs,
// scrolls each target element into view, dims the screen, and spotlights the
// element with a tooltip pointing at it.

function findEl(selector) {
  const els = [...document.querySelectorAll(selector)];
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.offsetParent !== null;
  }) || null;
}

export default function Tour({ steps, onNavigate, onDone }) {
  const { t } = useApp();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // When the step changes: navigate to its tab and scroll the target into view.
  useEffect(() => {
    if (!step) return;
    if (step.tab && onNavigate) onNavigate(step.tab);
    const scrollIn = () => {
      const el = findEl(step.selector);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const t1 = setTimeout(scrollIn, 90);
    const t2 = setTimeout(scrollIn, 320);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [i, step, onNavigate]);

  const measure = useCallback(() => {
    const el = step && findEl(step.selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    measure();
    const timers = [120, 340, 640].map((ms) => setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const iv = setInterval(measure, 400);
    return () => { timers.forEach(clearTimeout); clearInterval(iv); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [measure]);

  // If a target genuinely can't be found (after tab switch + scroll), skip it.
  useEffect(() => {
    if (!step) return;
    const to = setTimeout(() => { if (!findEl(step.selector)) (last ? onDone() : setI((v) => v + 1)); }, 900);
    return () => clearTimeout(to);
  }, [step, last, onDone]);

  if (!step) return null;

  const pad = 8;
  const spot = rect ? {
    top: rect.top - pad, left: rect.left - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
  } : null;

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = !spot || (spot.top + spot.height + 170 < vh);
  const tipStyle = spot ? {
    position: 'fixed',
    top: below ? spot.top + spot.height + 12 : undefined,
    bottom: below ? undefined : (vh - spot.top + 12),
    left: 16, right: 16, maxWidth: 380, margin: '0 auto',
  } : { position: 'fixed', left: 16, right: 16, bottom: 40, maxWidth: 380, margin: '0 auto' };

  const advance = () => (last ? onDone() : setI((v) => v + 1));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div onClick={advance} style={{ position: 'absolute', inset: 0 }} />

      {spot ? (
        <div style={{
          position: 'fixed', top: spot.top, left: spot.left, width: spot.width, height: spot.height,
          borderRadius: 14, boxShadow: '0 0 0 9999px rgba(0,0,0,.62)', pointerEvents: 'none',
          outline: '2px solid var(--accent)', outlineOffset: 0, transition: 'all .28s ease',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.62)', pointerEvents: 'none' }} />
      )}

      <div style={{ ...tipStyle }} onClick={(e) => e.stopPropagation()}>
        <div className="card" style={{ padding: 18, boxShadow: 'var(--shadow-lift)' }}>
          <h3 className="serif" style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '1.15rem' }}>{t(step.titleKey)}</h3>
          <p className="muted" style={{ margin: 0, lineHeight: 1.45, fontSize: '.92rem' }}>{t(step.bodyKey)}</p>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {steps.map((_, idx) => (
                <span key={idx} style={{ width: idx === i ? 18 : 7, height: 7, borderRadius: 999,
                  background: idx === i ? 'var(--accent)' : 'var(--fill)', transition: 'all .2s' }} />
              ))}
            </div>
            <button onClick={onDone} className="muted" style={{ fontSize: '.85rem', fontWeight: 600, padding: '6px 4px' }}>
              {t('tour.skip')}
            </button>
            <button onClick={advance}
              style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: 10, fontSize: '.9rem' }}>
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
