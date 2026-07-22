import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from './Icon.jsx';
import wordmark from '../assets/wordmark.png';

// A lightweight first-run walkthrough. Shows mock (fake-data) screens that
// introduce the core ideas: sharing gratitude, a guiding principle, connecting
// with people, and sharing sentiment / viewing profiles.

function MockAvatar({ letter, hue = 210, size = 40, ring = true }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(${hue} 55% 92%)`, color: `hsl(${hue} 45% 40%)`,
      border: ring ? '1.5px solid var(--accent)' : 'none',
      fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: size * 0.42 }}>{letter}</div>
  );
}

function Bubble({ children }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-lg)', padding: '11px 14px',
      boxShadow: 'var(--shadow)', color: 'var(--label)', lineHeight: 1.4, fontSize: '.92rem' }}>{children}</div>
  );
}

function SlideShare() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)',
        border: '1px solid var(--accent)', borderRadius: 'var(--r-xl)', padding: '8px 12px' }}>
        <Icon name="eye" size={18} color="var(--accent)" />
        <span className="muted" style={{ flex: 1, fontSize: '.9rem' }}>Describe your moment of gratitude…</span>
        <Icon name="send" size={18} filled color="var(--accent)" />
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <MockAvatar letter="Y" hue={205} />
        <Bubble>Morning coffee on the balcony, sun on my face ☀️</Bubble>
      </div>
    </div>
  );
}

function SlidePrinciple() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
      <MockAvatar letter="Y" hue={205} size={84} />
      <div className="serif" style={{ fontWeight: 600, fontSize: '1.2rem' }}>@you</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--label-secondary)',
        textAlign: 'center', maxWidth: 260 }}>“Notice one small good thing every day.”</div>
      <div style={{ marginTop: 4, padding: '8px 16px', borderRadius: 999, background: 'var(--accent-soft)',
        color: 'var(--accent)', fontWeight: 600, fontSize: '.82rem' }}>Expressed gratitude 12 times</div>
    </div>
  );
}

function SlideConnect() {
  const rows = [{ l: 'M', n: 'maya', hue: 330 }, { l: 'S', n: 'sam', hue: 150 }, { l: 'L', n: 'liv', hue: 265 }];
  return (
    <div className="card" style={{ width: '100%', overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12,
          borderTop: i ? '1px solid var(--separator)' : 'none' }}>
          <MockAvatar letter={r.l} hue={r.hue} />
          <div style={{ flex: 1, fontWeight: 600 }}>@{r.n}</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)',
            color: 'var(--accent)', borderRadius: 999, padding: '7px 12px', fontSize: '.82rem', fontWeight: 600 }}>
            <Icon name="connect" size={15} /> Connect
          </span>
        </div>
      ))}
    </div>
  );
}

function SlideSentiment() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
      <MockAvatar letter="M" hue={330} />
      <div style={{ position: 'relative', flex: 1 }}>
        <Bubble>Finally finished the painting I started months ago 🎨</Bubble>
        <span style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.15)', color: 'var(--pink)' }}>
          <Icon name="heart" size={16} filled />
        </span>
      </div>
    </div>
  );
}

const SLIDES = [
  { key: 'welcome' },
  { key: 'share', mock: SlideShare },
  { key: 'principle', mock: SlidePrinciple },
  { key: 'connect', mock: SlideConnect },
  { key: 'sentiment', mock: SlideSentiment },
];

export default function Onboarding({ onDone }) {
  const { t } = useApp();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const Mock = slide.mock;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', animation: 'fade .25s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px' }}>
        {!last && (
          <button onClick={onDone} className="muted" style={{ fontSize: '.9rem', fontWeight: 600 }}>
            {t('onb.skip')}
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 28px', gap: 22, maxWidth: 440, margin: '0 auto', width: '100%' }}>
        {slide.key === 'welcome' ? (
          <img src={wordmark} alt="Gratitude" style={{ height: 44, width: 'auto' }} />
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: 150, alignItems: 'center' }}>
            {Mock && <Mock />}
          </div>
        )}
        <div>
          <h2 className="serif" style={{ fontWeight: 600, fontSize: '1.5rem', margin: '0 0 10px' }}>{t(`onb.${slide.key}.title`)}</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.5, fontSize: '1rem' }}>{t(`onb.${slide.key}.body`)}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '20px 28px 34px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, idx) => (
            <span key={idx} style={{ width: idx === i ? 22 : 8, height: 8, borderRadius: 999,
              background: idx === i ? 'var(--accent)' : 'var(--fill)', transition: 'all .2s' }} />
          ))}
        </div>
        <button onClick={() => (last ? onDone() : setI((v) => v + 1))}
          style={{ width: '100%', maxWidth: 360, background: 'var(--accent)', color: '#fff', fontWeight: 600,
            padding: '15px 0', borderRadius: 14, fontSize: '1rem' }}>
          {last ? t('onb.start') : t('onb.next')}
        </button>
      </div>
    </div>
  );
}
