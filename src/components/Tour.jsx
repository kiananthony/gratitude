import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';

// Developer-only coach-mark tour. Dims the screen, spotlights real UI elements
// (switching tabs + scrolling them into view), and shows a tooltip that always
// stays fully on-screen.

function findEl(selector) {
  const els = [...document.querySelectorAll(selector)];
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.offsetParent !== null;
  }) || null;
}

export default function Tour({ steps, zoom = 1, onNavigate, onAction, onDone }) {
  const { t } = useApp();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const factorRef = useRef(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // The page content is rendered with CSS `zoom`. Some browsers (Chrome) report
  // getBoundingClientRect already scaled by zoom; others (Safari) report the
  // un-zoomed layout box. This overlay lives outside the zoomed container, so we
  // work out which case we're in and scale the measured rect to real screen px.
  const getFactor = useCallback(() => {
    if (factorRef.current != null) return factorRef.current;
    let f = 1;
    try {
      const c = document.querySelector('.content');
      if (c && c.offsetWidth) {
        const probe = c.getBoundingClientRect().width / c.offsetWidth; // ~zoom (Chrome) or ~1 (Safari)
        const reportsVisual = Math.abs(probe - zoom) < Math.abs(probe - 1);
        f = reportsVisual ? 1 : zoom;
      }
    } catch { f = 1; }
    factorRef.current = f;
    return f;
  }, [zoom]);

  // On step change: go to the step's tab, then jump it into view (instant, so we
  // never measure mid-animation).
  useEffect(() => {
    if (!step) return;
    factorRef.current = null; // re-probe after layout settles
    if (step.tab && onNavigate) onNavigate(step.tab);
    const scrollIn = () => {
      const el = findEl(step.selector);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    };
    const t1 = setTimeout(scrollIn, 60);
    const t2 = setTimeout(scrollIn, 260);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [i, step, onNavigate]);

  const measure = useCallback(() => {
    const el = step && findEl(step.selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const f = getFactor();
    setRect({ top: r.top * f, left: r.left * f, width: r.width * f, height: r.height * f });
  }, [step, getFactor]);

  useLayoutEffect(() => {
    measure();
    const timers = [100, 320, 620].map((ms) => setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const iv = setInterval(measure, 400);
    return () => { timers.forEach(clearTimeout); clearInterval(iv); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [measure]);

  // Skip a step whose target genuinely can't be found (after tab switch).
  useEffect(() => {
    if (!step) return;
    const to = setTimeout(() => { if (!findEl(step.selector)) (last ? onDone() : setI((v) => v + 1)); }, 1000);
    return () => clearTimeout(to);
  }, [step, last, onDone]);

  if (!step) return null;

  const pad = 6;
  const spot = rect ? {
    top: rect.top - pad, left: rect.left - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
  } : null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const desktop = vw >= 860;
  const topInset = 'max(70px, env(safe-area-inset-top))';
  const bottomInset = desktop ? 40 : 'calc(120px + env(safe-area-inset-bottom, 0px))';

  // Put the tooltip in whichever half is OPPOSITE the spotlight, anchored to the
  // top or bottom of the screen so it's always fully visible and never overlaps
  // the highlighted element or the tab bar.
  const spotCenter = spot ? spot.top + spot.height / 2 : vh / 2;
  const placeBottom = spotCenter < vh / 2;
  const tipStyle = spot ? {
    position: 'fixed', left: 16, right: 16, maxWidth: 380, margin: '0 auto',
    ...(placeBottom ? { bottom: bottomInset } : { top: topInset }),
  } : { position: 'fixed', left: 16, right: 16, top: '36%', maxWidth: 380, margin: '0 auto' };

  const advance = () => (last ? onDone() : setI((v) => v + 1));
  const confirmYes = () => { onAction?.(step.action); advance(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div onClick={step.confirm ? undefined : advance} style={{ position: 'absolute', inset: 0 }} />

      {spot ? (
        <div style={{
          position: 'fixed', top: spot.top, left: spot.left, width: spot.width, height: spot.height,
          borderRadius: 14, boxShadow: '0 0 0 9999px rgba(0,0,0,.62)', pointerEvents: 'none',
          outline: '2px solid var(--accent)', outlineOffset: 0, transition: 'all .25s ease',
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
            {step.confirm ? (
              <>
                <button onClick={advance} className="muted" style={{ fontSize: '.85rem', fontWeight: 600, padding: '6px 6px' }}>
                  {t('tour.notNow')}
                </button>
                <button onClick={confirmYes}
                  style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: 10, fontSize: '.9rem' }}>
                  {t('tour.yes')}
                </button>
              </>
            ) : (
              <>
                {!last && (
                  <button onClick={onDone} className="muted" style={{ fontSize: '.85rem', fontWeight: 600, padding: '6px 4px' }}>
                    {t('tour.skip')}
                  </button>
                )}
                <button onClick={advance}
                  style={{ background: 'var(--accent)', color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: 10, fontSize: '.9rem' }}>
                  {last ? t('tour.done') : t('tour.next')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
