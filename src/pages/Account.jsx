import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import Dashboard from '../components/Dashboard.jsx';
import { Avatar, Toggle, GAButton, GATextField, Sheet } from '../components/ui.jsx';

const STOPWORDS = new Set('a an and the to of for in on at my me i you it its is was were be been so just really very with without that this these those had have has as but or from your our their they them he she we am are not no yay day today felt feel like about into over under out up down again more most some any all'.split(' '));

function Section({ title, plus, children, footer }) {
  return (
    <section style={{ marginBottom: 26 }}>
      {title && <div className="section-title">{plus && <span className="plus-badge">+</span>}{title}</div>}
      <div className="card" style={{ padding: 16 }}>{children}</div>
      {footer && <p className="muted" style={{ fontSize: '.78rem', padding: '8px 6px 0', margin: 0, opacity: .9 }}>{footer}</p>}
    </section>
  );
}

function Row({ label, children, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', minHeight: 40 }}>
      <div style={{ minWidth: 0 }}>
        <div>{label}</div>
        {sub && <div className="muted" style={{ fontSize: '.78rem' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function PillSelect({ value, options, onChange, disabled }) {
  return (
    <div className="segmented" style={{ opacity: disabled ? .5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export default function Account() {
  const {
    user, posts, settings, setSetting, updateMotto, updateProfile,
    uploadProfilePhoto, removeProfilePhoto, logout, deleteAccount,
  } = useApp();
  const [editMotto, setEditMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState(user.motto);
  const [editProfile, setEditProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.screenName);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onPickPhoto = (e) => { const f = e.target.files?.[0]; if (f) uploadProfilePhoto(f); e.target.value = ''; };

  const themes = useMemo(() => {
    const freq = {};
    posts.filter((p) => p.ownerId === user.id).forEach((p) => {
      p.gratitude.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).forEach((w) => {
        if (w.length >= 4 && !STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [posts]);

  const c = settings.connectionsEnabled;

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600, margin: '4px 0 18px' }}>Me</h1>

        {/* Profile */}
        <Section title="Profile">
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <label style={{ position: 'relative', cursor: 'pointer', flex: 'none' }} title="Change photo">
              <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
              <Avatar person={user} size={76} />
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '0.75px solid var(--accent)', opacity: .25 }} />
              <span style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-elevated)' }}>
                <Icon name="camera" size={13} />
              </span>
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={() => { setNameDraft(user.screenName); setEditProfile(true); }}
                style={{ display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem' }}><Icon name="person" size={16} /> {user.screenName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem' }} className="muted"><Icon name="envelope" size={16} /> {user.email}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem', color: 'var(--accent)' }}><Icon name="plusCircle" size={16} /> {user.userType}</span>
              </button>
              {user.photoURL && (
                <button className="btn-text btn-text--sm" style={{ color: 'var(--label-secondary)', paddingLeft: 0, marginTop: 4 }}
                  onClick={removeProfilePhoto}>Remove photo</button>
              )}
            </div>
          </div>
          <button onClick={() => { setMottoDraft(user.motto); setEditMotto(true); }}
            style={{ marginTop: 14, textAlign: 'left', width: '100%', display: 'block' }}>
            <div className="section-title" style={{ padding: '0 0 4px' }}>Guiding Principle</div>
            <div className="muted" style={{ fontSize: '.85rem' }}>{user.motto || 'Set your guiding principle'}</div>
          </button>
        </Section>

        {/* Dashboard */}
        <Section title="Gratitude Dashboard" plus><Dashboard /></Section>

        {/* Themes */}
        <Section title="My Themes" plus>
          {themes.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>Not enough data yet. Start posting to see your most-used words!</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {themes.map(([word, count], i) => {
                const shade = 0.45 + ((themes.length - 1 - i) / Math.max(1, themes.length - 1)) * 0.55;
                return (
                  <span key={word} title={`Used ${count} time${count > 1 ? 's' : ''}`}
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', opacity: shade + .25,
                      padding: '6px 12px', borderRadius: 9, fontSize: `${0.85 + count * 0.06}rem` }}>
                    {word}
                  </span>
                );
              })}
            </div>
          )}
        </Section>

        {/* Connections */}
        <Section title="Connections"
          footer="The social feature to share gratitude with people you care about. If you just want to log gratitude by yourself, turn it off — this hides your profile from search results.">
          <Row label="Enable Connections feature">
            <Toggle checked={c} onChange={(v) => setSetting('connectionsEnabled', v)} />
          </Row>
        </Section>

        {/* Preferences */}
        <Section title="Preferences"
          footer="Change the language for app menus and text. Some features may require reloading to fully apply.">
          <Row label="Default timeline">
            <PillSelect disabled={!c} value={settings.defaultTimeline} onChange={(v) => setSetting('defaultTimeline', v)}
              options={[{ value: 'connections', label: 'Connections' }, { value: 'posts', label: 'My posts' }]} />
          </Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label="Default post visibility">
            <PillSelect disabled={!c} value={settings.defaultPostVisibility} onChange={(v) => setSetting('defaultPostVisibility', v)}
              options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
          </Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label="Language">
            <PillSelect value={settings.language} onChange={(v) => setSetting('language', v)}
              options={[{ value: 'en', label: 'English' }, { value: 'nl', label: 'Nederlands' }]} />
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" footer="Change the app's color scheme to Light, Dark, or follow the system setting.">
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {[
              { value: 'system', label: 'System', icon: 'half' },
              { value: 'light', label: 'Light', icon: 'sun' },
              { value: 'dark', label: 'Dark', icon: 'moon' },
            ].map((o) => {
              const active = settings.colorScheme === o.value;
              return (
                <button key={o.value} onClick={() => setSetting('colorScheme', o.value)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 0', borderRadius: 12,
                    background: active ? 'var(--accent-soft)' : 'var(--fill)', color: active ? 'var(--accent)' : 'var(--label)',
                    fontWeight: active ? 600 : 400, fontSize: '.85rem', transition: 'all .18s' }}>
                  <Icon name={o.icon} size={24} filled={o.icon === 'moon'} /> {o.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row label="Friends' posts"><Toggle disabled={!c} checked={settings.notifyFriendsPosts} onChange={(v) => setSetting('notifyFriendsPosts', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label="Connection requests"><Toggle disabled={!c} checked={settings.notifyConnectionRequests} onChange={(v) => setSetting('notifyConnectionRequests', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label="Post reactions"><Toggle disabled={!c} checked={settings.notifyPostReactions} onChange={(v) => setSetting('notifyPostReactions', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label="Daily gratitude reminder">
            <Toggle checked={settings.dailyReminder} onChange={(v) => setSetting('dailyReminder', v)} />
          </Row>
          {settings.dailyReminder && (
            <Row label="Reminder time">
              <input type="time" value={settings.reminderTime} onChange={(e) => setSetting('reminderTime', e.target.value)}
                style={{ background: 'var(--fill)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--label)', fontSize: '.9rem' }} />
            </Row>
          )}
        </Section>

        {/* App info */}
        <Section title="App Info" footer="Hosting an app is not free. A little contribution helps keep Gratitude free.">
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '1.1rem' }}>Gratitude+</div>
          <div className="muted" style={{ fontSize: '.85rem', marginBottom: 12 }}>Version 1.0.0 (web)</div>
          <a href="https://buymeacoffee.com/milestoneapps" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--pink-soft)', color: 'var(--label)', padding: '12px 14px', borderRadius: 10, fontWeight: 600, marginBottom: 10 }}>
            <span style={{ color: 'var(--pink)', display: 'flex' }}><Icon name="heart" size={18} filled /></span> Donate
          </a>
          <a href="https://buymeacoffee.com/milestoneapps" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-soft)', color: 'var(--label)', padding: '12px 14px', borderRadius: 10, fontWeight: 600 }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="plus" size={18} /></span> Become +Member
          </a>
        </Section>

        {/* Danger zone */}
        <Section footer="Deleting your account is permanent and cannot be undone. All your data will be lost.">
          <button onClick={logout} style={{ color: 'var(--accent)', fontWeight: 600, padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <Icon name="logout" size={18} /> Log out
          </button>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <button onClick={() => setConfirmDelete(true)} style={{ color: 'var(--red)', fontWeight: 600, padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <Icon name="trash" size={18} /> Delete account
          </button>
        </Section>

        <p className="tertiary" style={{ textAlign: 'center', fontSize: '.75rem', paddingBottom: 8 }}>
          Made with care · a web port of the Gratitude iOS app
        </p>
      </div>

      {/* Sheets */}
      <Sheet open={editMotto} onClose={() => setEditMotto(false)} title="Guiding Principle">
        <textarea value={mottoDraft} maxLength={150} onChange={(e) => setMottoDraft(e.target.value)} rows={3}
          placeholder="Set your guiding principle"
          style={{ width: '100%', background: 'var(--fill)', border: '1px solid var(--accent)', borderRadius: 16, padding: 14, color: 'var(--label)', fontSize: '1rem', resize: 'vertical', outline: 'none' }} />
        <div className="tertiary" style={{ textAlign: 'right', fontSize: '.75rem', margin: '4px 2px 14px' }}>{mottoDraft.length}/150</div>
        <GAButton text="Save" onClick={() => { updateMotto(mottoDraft.trim()); setEditMotto(false); }} />
      </Sheet>

      <Sheet open={editProfile} onClose={() => setEditProfile(false)} title="Edit profile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="section-title" style={{ padding: '0 0 6px' }}>Screen name</div>
            <GATextField placeholder="Username" value={nameDraft} onChange={setNameDraft} />
          </div>
          <GAButton text="Save" onClick={() => { updateProfile({ screenName: nameDraft.trim() || user.screenName }); setEditProfile(false); }} />
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account?">
        <p className="muted" style={{ marginTop: 0 }}>This resets all demo data on this device and cannot be undone.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <GAButton text="Delete everything" color="var(--red)" onClick={() => { deleteAccount(); setConfirmDelete(false); }} />
          <GAButton style="text" text="Cancel" onClick={() => setConfirmDelete(false)} />
        </div>
      </Sheet>
    </div>
  );
}
