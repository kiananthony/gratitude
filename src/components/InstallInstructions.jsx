import Icon from './Icon.jsx';
import { Sheet } from './ui.jsx';

const STEPS = {
  'ios-safari': [
    { icon: 'share', text: 'Tap the Share icon in Safari’s toolbar.' },
    { icon: 'addToHome', text: 'Scroll down and tap “Add to Home Screen”.' },
  ],
  'ios-chrome': [
    { icon: 'kebabH', text: 'Tap the ••• menu.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen” (scroll down if you don’t see it right away).' },
  ],
  'ios-firefox': [
    { icon: 'kebabH', text: 'Tap the ••• menu.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen” (scroll down if you don’t see it right away).' },
  ],
  'ios-edge': [
    { icon: 'kebabH', text: 'Tap the ••• menu.' },
    { icon: 'share', text: 'Tap “Share”.' },
    { icon: 'addToHome', text: 'Tap “Add to Home Screen” (scroll down if you don’t see it right away).' },
  ],
  'android-chrome': [
    { icon: 'kebab', text: 'Tap the ⋮ menu in the top right.' },
    { icon: 'addToHome', text: 'Tap “Add to Home screen” or “Install app”.' },
  ],
  'android-edge': [
    { icon: 'kebab', text: 'Tap the ⋮ menu.' },
    { icon: 'addToHome', text: 'Tap “Add to phone” or “Install app”.' },
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
    { icon: 'installTray', text: 'Click the install icon at the right edge of the address bar (or the ••• menu → “Apps” → “Install this site as an app”).' },
  ],
  'desktop-safari': [
    { icon: 'kebabH', text: 'Open the File menu in the menu bar.' },
    { icon: 'addToHome', text: 'Choose “Add to Dock”.' },
  ],
  'desktop-firefox': [
    { icon: 'kebab', text: 'Firefox on desktop doesn’t support installing web apps yet, try Chrome, Edge, or Safari instead, or just bookmark this page.' },
  ],
  'desktop-other': [
    { icon: 'installTray', text: 'Look for an “Install” or “Add to Home screen” option in your browser’s menu.' },
  ],
};

export default function InstallInstructions({ open, onClose, platform }) {
  const steps = STEPS[platform] || STEPS['desktop-other'];
  return (
    <Sheet open={open} onClose={onClose} title="Add Gratitude to your home screen">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flex: 'none', background: 'var(--fill)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 700, color: 'var(--label-secondary)',
            }}>
              {i + 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, paddingTop: 2 }}>
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
    </Sheet>
  );
}
