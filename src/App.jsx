import { useState } from 'react';
import './App.css';
import { useApp, TEXT_SCALES } from './context/AppContext.jsx';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import Icon from './components/Icon.jsx';
import InstallInstructions from './components/InstallInstructions.jsx';
import Auth from './pages/Auth.jsx';
import Timeline from './pages/Timeline.jsx';
import Connections from './pages/Connections.jsx';
import Account from './pages/Account.jsx';
import logo from './assets/logo.png';
import wordmark from './assets/wordmark.png';

export default function App() {
  const { authReady, loggedIn, settings, badgeCount } = useApp();
  const [tab, setTab] = useState('timeline');
  const install = useInstallPrompt();

  if (!authReady) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={logo} alt="" width={56} height={56}
          style={{ borderRadius: 14, opacity: 0.9, animation: 'fade .6s ease-in-out infinite alternate' }} />
      </div>
    );
  }

  if (!loggedIn) return <div style={{ zoom: TEXT_SCALES[settings.textSize] || 1 }}><Auth /></div>;

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
    ...(settings.connectionsEnabled ? [{ id: 'connections', label: 'Connections', icon: 'people', badge: badgeCount }] : []),
    { id: 'account', label: 'Me', icon: 'personCircle' },
  ];

  // If connections got disabled while on that tab, fall back to timeline.
  const active = tabs.some((t) => t.id === tab) ? tab : 'timeline';

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <nav className="sidebar">
        <div className="brand">
          <img className="logo" src={logo} alt="" />
          <img className="wordmark" src={wordmark} alt="Gratitude" />
        </div>
        {tabs.map((t) => (
          <button key={t.id} className={`nav-item${active === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={22} /> {t.label}
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
          </button>
        ))}
        {install.visible && (
          <button className="nav-item" onClick={install.handleClick}>
            <Icon name="installTray" size={22} /> Install app
          </button>
        )}
      </nav>

      {/* Main content */}
      <main className="content" style={{ zoom: TEXT_SCALES[settings.textSize] || 1 }}>
        <div className="view-enter" key={active} style={{ width: '100%' }}>
          {active === 'timeline' && <Timeline />}
          {active === 'connections' && <Connections />}
          {active === 'account' && <Account />}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={`tab${active === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
            <Icon name={t.icon} size={24} />
            {t.label}
          </button>
        ))}
        {install.visible && (
          <button className="tab" onClick={install.handleClick}>
            <Icon name="installTray" size={24} />
            Install
          </button>
        )}
      </nav>

      <InstallInstructions open={install.instructionsOpen} onClose={install.closeInstructions} platform={install.platform} />
    </div>
  );
}
