import Icon from './Icon.jsx';
import wordmark from '../assets/wordmark.png';

const STEPS = {
  'ios-safari': [
    { icon: 'kebabH', text: 'Tap the ••• (more) button in Safari’s toolbar.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'chevronD', text: 'Tap “View More” (the ⌄ chevron) to see all options.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen”.' },
  ],
  'ios-chrome': [
    { icon: 'kebabH', text: 'Tap the ••• menu (bottom-right in Chrome).' },
    { icon: 'share', text: 'Tap “Share…”.' },
    { icon: 'kebabH', text: 'Swipe up / tap “View More” to see all options.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen”, then “Add”.' },
  ],
  'ios-firefox': [
    { icon: 'kebabH', text: 'Tap the ••• menu.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen”, then “Add” (swipe up if you don’t see it).' },
  ],
  'ios-edge': [
    { icon: 'kebabH', text: 'Tap the ••• menu.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen”, then “Add” (swipe up if you don’t see it).' },
  ],
  'android-chrome': [
    { icon: 'kebab', text: 'Tap the ⋮ menu in the top right.' },
    { icon: 'addToHome', text: 'Tap “Add to Home screen” or “Install app”, then confirm.' },
  ],
  'android-edge': [
    { icon: 'kebab', text: 'Tap the ⋮ menu.' },
    { icon: 'addToHome', text: 'Tap “Add to phone” or “Install app”, then confirm.' },
  ],
  'android-samsung': [
    { icon: 'kebabH', text: 'Tap the ≡ menu.' },
    { icon: 'addToHome', text: 'Tap “Add page to” → “Home screen”.' },
  ],
  'android-firefox': [
    { icon: 'kebab', text: 'Tap the ⋮ menu.' },
    { icon: 'addToHome', text: 'Tap “Install” or “Add to Home screen”.' },
  ],
  'android-other': [
    { icon: 'kebab', text: 'Open your browser’s menu.' },
    { icon: 'addToHome', text: 'Look for “Add to Home screen” or “Install app”.' },
  ],
  'desktop-chrome': [
    { icon: 'installTray', text: 'Click the install icon at the right edge of the address bar (or the ⋮ menu → “Install Gratitude…”).' },
  ],
  'desktop-edge': [
    { icon: 'installTray', text: 'Click the install icon at the right edge of the address bar (or ••• menu → “Apps” → “Install this site as an app”).' },
  ],
  'desktop-safari': [
    { icon: 'kebabH', text: 'Open the File menu in the menu bar.' },
    { icon: 'addToHome', text: 'Choose “Add to Dock”.' },
  ],
  'desktop-firefox': [
    { icon: 'kebab', text: 'Firefox on desktop doesn’t support installing web apps yet — try Chrome, Edge, or Safari, or just bookmark this page.' },
  ],
  'desktop-other': [
    { icon: 'installTray', text: 'Look for an “Install” or “Add to Home screen” option in your browser’s menu.' },
  ],
};

export default function InstallInstructions({ open, onClose, platform }) {
  if (!open) return null;
  const steps = STEPS[platform] || STEPS['desktop-other'];
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'var(--scrim)',
      display: 'flex', flexDirection: 'column', animation: 'fadeIn .15s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-elevated)', color: 'var(--label)',
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 24px',
        boxShadow: '0 10px 34px rgba(0,0,0,.24)', maxHeight: '88vh', overflowY: 'auto',
        animation: 'slideDownIn .3s cubic-bezier(.2,.85,.25,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <img src={wordmark} alt="Gratitude" style={{ height: 30, width: 'auto', display: 'block' }} />
          <button onClick={onClose} aria-label="Close" style={{
            width: 34, height: 34, borderRadius: '50%', flex: 'none', background: 'var(--fill)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label-secondary)',
          }}>
            <Icon name="xmark" size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 18px', color: 'var(--label-secondary)', fontSize: '.92rem', lineHeight: 1.4 }}>
          Add it to your home screen for the full app experience.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flex: 'none', background: 'var(--fill)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 700, color: 'var(--label-secondary)',
              }}>
                {i + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, paddingTop: 1 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flex: 'none', background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                }}>
                  <Icon name={s.icon} size={19} />
                </div>
                <p style={{ margin: 0, fontSize: '.94rem', lineHeight: 1.4 }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
