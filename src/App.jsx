import { useState, useEffect, useRef } from 'react';
import './App.css';
import { useApp, TEXT_SCALES } from './context/AppContext.jsx';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { useSlidingIndicator } from './hooks/useSlidingIndicator.js';
import Icon from './components/Icon.jsx';
import InstallInstructions from './components/InstallInstructions.jsx';
import Auth from './pages/Auth.jsx';
import Timeline from './pages/Timeline.jsx';
import Connections from './pages/Connections.jsx';
import Account from './pages/Account.jsx';
import Developer from './pages/Developer.jsx';
import Tour from './components/Tour.jsx';
import { ProfileCard, Popup } from './components/ui.jsx';
import logo from './assets/logo.png';
import wordmark from './assets/wordmark.png';

export default function App() {
  const { authReady, loggedIn, settings, user, badgeCount, features, posts, enableAllNotifications, removeOnboardingBuddy, onboardingBuddyId, t } = useApp();
  const [tab, setTab] = useState('timeline');
  const [tourActive, setTourActive] = useState(false);
  const [tourIsOnboarding, setTourIsOnboarding] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);

  // Optionally show the tour to new members once per account (developer flag).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!authReady || !loggedIn || !user.id || !features.tourForNewMembers) return;
    const key = `gratitude.tour.seen.${user.id}`;
    let seen = true;
    try { seen = localStorage.getItem(key) === '1'; } catch { seen = true; }
    autoStartedRef.current = true;
    if (seen) return;
    try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    // Small delay so the timeline (and the freshly-created welcome post) mount first.
    const timer = setTimeout(() => { setTourIsOnboarding(true); setTab('timeline'); setTourActive(true); }, 500);
    return () => clearTimeout(timer);
  }, [authReady, loggedIn, user.id, features.tourForNewMembers]);

  const finishTour = () => {
    setTourActive(false);
    setProfilePreview(null);
    closeAnyPostMenu();
    setTab('timeline'); // always land back on the home timeline
    if (tourIsOnboarding) { removeOnboardingBuddy(); setTourIsOnboarding(false); }
  };
  const tourAction = (action) => {
    if (action === 'enableNotifications') enableAllNotifications();
    else if (action === 'openBuddyProfile') { if (onboardingBuddyId) setProfilePreview({ id: onboardingBuddyId }); }
    else if (action === 'openWelcomeMenu') openWelcomeMenu(6);
    else if (action === 'closePreview') { setProfilePreview(null); closeAnyPostMenu(); }
  };
  // Programmatically open the welcome post's "..." menu (retries while it mounts).
  function openWelcomeMenu(n) {
    const el = document.querySelector('[data-tour="post-welcome-menu"]');
    if (el) { el.click(); }
    else if (n > 0) setTimeout(() => openWelcomeMenu(n - 1), 160);
  }
  // Close any open post menu by simulating an outside pointer event.
  function closeAnyPostMenu() {
    try { document.dispatchEvent(new Event('pointerdown')); } catch { /* ignore */ }
  }

  const tourSteps = [
    { tab: 'timeline', selector: '[data-tour="composer"]', titleKey: 'tour.write.title', bodyKey: 'tour.write.body' },
    { tab: 'timeline', selector: '[data-tour="post-welcome"]', titleKey: 'tour.yourpost.title', bodyKey: 'tour.yourpost.body' },
    { tab: 'timeline', selector: null, noDim: true, enterAction: 'openWelcomeMenu', titleKey: 'tour.postmenu.title', bodyKey: 'tour.postmenu.body' },
    { tab: 'timeline', selector: '[data-tour="post-buddy"]', titleKey: 'tour.sentiment.title', bodyKey: 'tour.sentiment.body' },
    { tab: 'timeline', selector: null, noDim: true, enterAction: 'openBuddyProfile', titleKey: 'tour.viewprofile.title', bodyKey: 'tour.viewprofile.body' },
    { tab: 'timeline', selector: '[data-tour="nav-connections"]', titleKey: 'tour.nav.title', bodyKey: 'tour.nav.body' },
    { tab: 'connections', selector: '[data-tour="activity-first"]', titleKey: 'tour.activity.title', bodyKey: 'tour.activity.body' },
    { tab: 'connections', selector: '[data-tour="nav-account"]', titleKey: 'tour.me.title', bodyKey: 'tour.me.body' },
    { tab: 'account', selector: '[data-tour="guiding-principle"]', titleKey: 'tour.principle.title', bodyKey: 'tour.principle.body' },
    ...(features.dashboard ? [{ tab: 'account', selector: '[data-tour="dashboard"]', titleKey: 'tour.dashboard.title', bodyKey: 'tour.dashboard.body' }] : []),
    ...(features.themes ? [{ tab: 'account', selector: '[data-tour="themes"]', titleKey: 'tour.themes.title', bodyKey: 'tour.themes.body' }] : []),
    { tab: 'account', selector: '[data-tour="notifications"]', confirm: true, action: 'enableNotifications', titleKey: 'tour.notify.title', bodyKey: 'tour.notify.body' },
    { titleKey: 'tour.finish.title', bodyKey: 'tour.finish.body' },
  ];
  const install = useInstallPrompt();

  const tabs = [
    { id: 'timeline', label: t('nav.timeline'), icon: 'timeline' },
    ...(settings.connectionsEnabled ? [{ id: 'connections', label: t('nav.connections'), icon: 'people', badge: badgeCount }] : []),
    { id: 'account', label: t('nav.me'), icon: 'personCircle' },
    ...(user.isDeveloper ? [{ id: 'developer', label: 'Dev', icon: 'code' }] : []),
  ];

  // If connections got disabled while on that tab, fall back to timeline.
  const active = tabs.some((t) => t.id === tab) ? tab : 'timeline';

  // Show a "scroll to top" button once the person has scrolled down a bit.
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollToTop = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); } };

  // Hooks must run unconditionally on every render, so these come before the
  // early returns below even though they're only rendered once logged in.
  const sidebarInd = useSlidingIndicator(active);
  const tabbarInd = useSlidingIndicator(active);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={logo} alt="" width={56} height={56}
          style={{ borderRadius: 14, opacity: 0.9, animation: 'fade .6s ease-in-out infinite alternate' }} />
      </div>
    );
  }

  if (!loggedIn) return <div style={{ zoom: TEXT_SCALES[settings.textSize] || 1 }}><Auth install={install} /></div>;

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <nav className="sidebar" ref={sidebarInd.containerRef}>
        <div className="brand">
          <img className="logo" src={logo} alt="" />
          <img className="wordmark" src={wordmark} alt="Gratitude" />
        </div>

        {sidebarInd.rect && (
          <div className="nav-indicator" style={{
            transform: `translate(${sidebarInd.rect.left}px, ${sidebarInd.rect.top}px)`,
            width: sidebarInd.rect.width, height: sidebarInd.rect.height,
          }} />
        )}
        {tabs.map((t) => (
          <button key={t.id} data-tour={`nav-${t.id}`} ref={sidebarInd.setItemRef(t.id)} className={`nav-item${active === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={22} /> {t.label}
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
          </button>
        ))}
        {install.visible && (
          <button className="nav-item" onClick={install.handleClick}>
            <Icon name="installTray" size={22} /> {t('nav.install')}
          </button>
        )}
      </nav>

      {/* Main content */}
      <main className="content" style={{ zoom: TEXT_SCALES[settings.textSize] || 1 }}>
        <div className="view-enter" key={active} style={{ width: '100%' }}>
          {active === 'timeline' && <Timeline />}
          {active === 'connections' && <Connections />}
          {active === 'account' && <Account />}
          {active === 'developer' && <Developer onStartTour={() => { setTourIsOnboarding(false); setTourActive(true); }} />}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar" ref={tabbarInd.containerRef}>
        {tabbarInd.rect && (
          <div className="tab-indicator" style={{
            transform: `translate(${tabbarInd.rect.left}px, ${tabbarInd.rect.top}px)`,
            width: tabbarInd.rect.width, height: tabbarInd.rect.height,
          }} />
        )}
        {tabs.map((t) => (
          <button key={t.id} data-tour={`nav-${t.id}`} ref={tabbarInd.setItemRef(t.id)} className={`tab${active === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
            <Icon name={t.icon} size={24} />
            {t.label}
          </button>
        ))}
        {install.visible && (
          <button className="tab" onClick={install.handleClick}>
            <Icon name="installTray" size={24} />
            {t('nav.install.short')}
          </button>
        )}
      </nav>

      <InstallInstructions open={install.instructionsOpen} onClose={install.closeInstructions} platform={install.platform} />

      {showScrollTop && (
        <button onClick={scrollToTop} aria-label="Scroll to top" className="scroll-top-btn">
          <Icon name="chevronR" size={22} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      )}

      {tourActive && (
        <Tour steps={tourSteps} zoom={TEXT_SCALES[settings.textSize] || 1}
          onNavigate={setTab} onAction={tourAction} onDone={finishTour} />
      )}

      <Popup open={!!profilePreview} onClose={() => setProfilePreview(null)} align="top">
        {profilePreview && <ProfileCard profile={profilePreview} posts={posts} />}
      </Popup>
    </div>
  );
}
