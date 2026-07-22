import { useMemo, useState, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import Dashboard from '../components/Dashboard.jsx';
import { Avatar, Toggle, GAButton, GATextField, Sheet, Segmented } from '../components/ui.jsx';
import wordmark from '../assets/wordmark.png';

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

export default function Account() {
  const {
    user, posts, settings, setSetting, updateProfile,
    uploadProfilePhoto, removeProfilePhoto, logout, deleteAccount, t,
  } = useApp();
  const [editMotto, setEditMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState(user.motto);
  const [mottoVisDraft, setMottoVisDraft] = useState(user.mottoVisibility || 'public');
  const [editProfile, setEditProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.screenName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const photoInputRef = useRef(null);

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
        <h1 style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 18px' }}>
          <span className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600 }}>{t('account.my')}</span>
          <img src={wordmark} alt="Gratitude" style={{ height: 'clamp(1.35rem, 4.2vw, 1.7rem)', width: 'auto' }} />
        </h1>

        {/* Profile */}
        <Section title={t('account.profile')}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', flex: 'none' }}>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
              <button onClick={() => photoInputRef.current?.click()} title={t('account.changePhoto')} style={{ padding: 0, borderRadius: '50%', display: 'block' }}>
                <Avatar person={user} size={76} />
              </button>
              <span onClick={() => photoInputRef.current?.click()} style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-elevated)', cursor: 'pointer' }}>
                <Icon name="camera" size={13} />
              </span>
              {user.photoURL && (
                <button onClick={removeProfilePhoto} title={t('account.removePhoto')} style={{ position: 'absolute', left: -2, top: -2, width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-elevated)' }}>
                  <Icon name="trash" size={12} />
                </button>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={() => { setNameDraft(user.screenName); setEditProfile(true); }}
                style={{ display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem', fontWeight: 600 }}><Icon name="person" size={16} /> {user.screenName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem' }} className="muted"><Icon name="envelope" size={16} /> {user.email}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem', color: 'var(--accent)' }}><Icon name="plusCircle" size={16} /> {user.hasPremium ? t('account.member.plus') : t('account.member.basic')}</span>
              </button>
            </div>
          </div>
          <button onClick={() => { setMottoDraft(user.motto); setMottoVisDraft(user.mottoVisibility || 'public'); setEditMotto(true); }}
            style={{ marginTop: 14, textAlign: 'left', width: '100%', display: 'block' }}>
            <div className="section-title" style={{ padding: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t('account.guidingPrinciple')}
              <Icon name={user.mottoVisibility === 'private' ? 'eyeSlash' : 'eye'} size={13} color="var(--label-tertiary)" />
            </div>
            <div className="muted" style={{ fontSize: '.9rem', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{user.motto || t('account.setGuidingPrinciple')}</div>
          </button>
        </Section>

        {/* Dashboard + Themes — premium features */}
        {user.hasPremium && (
          <>
            <Section title={t('account.dashboard')} plus><Dashboard /></Section>

            <Section title={t('account.themes')} plus>
              {themes.length === 0 ? (
                <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>{t('account.themes.empty')}</p>
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
          </>
        )}

        {/* Connections */}
        <Section title={t('account.connections')}
          footer={t('account.connections.footer')}>
          <Row label={t('account.connections.enable')}>
            <Toggle checked={c} onChange={(v) => setSetting('connectionsEnabled', v)} />
          </Row>
        </Section>

        {/* Preferences */}
        <Section title={t('account.preferences')}
          footer={t('account.preferences.footer')}>
          <Row label={t('account.defaultTimeline')}>
            <Segmented disabled={!c} value={settings.defaultTimeline} onChange={(v) => setSetting('defaultTimeline', v)}
              options={[{ value: 'connections', label: t('account.opt.connections') }, { value: 'posts', label: t('account.opt.myposts') }]} />
          </Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label={t('account.defaultVisibility')}>
            <Segmented disabled={!c} value={settings.defaultPostVisibility} onChange={(v) => setSetting('defaultPostVisibility', v)}
              options={[{ value: 'public', label: t('account.opt.public') }, { value: 'private', label: t('account.opt.private') }]} />
          </Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label={t('account.language')}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select value={settings.language} onChange={(e) => setSetting('language', e.target.value)}
                style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                  background: 'var(--fill)', border: 'none', borderRadius: 10, padding: '8px 34px 8px 14px',
                  color: 'var(--label)', fontSize: '.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="en">English</option>
                <option value="nl">Nederlands</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="pl">Polski</option>
                <option value="hu">Magyar</option>
              </select>
              <span style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--label-secondary)', display: 'flex' }}>
                <Icon name="chevronR" size={14} style={{ transform: 'rotate(90deg)' }} />
              </span>
            </div>
          </Row>
        </Section>

        {/* Appearance */}
        <Section title={t('account.appearance')} footer={t('account.appearance.footer')}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {[
              { value: 'system', label: t('account.theme.system'), icon: 'half' },
              { value: 'light', label: t('account.theme.light'), icon: 'sun' },
              { value: 'dark', label: t('account.theme.dark'), icon: 'moon' },
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
          <div style={{ borderTop: '1px solid var(--separator)', margin: '16px 0' }} />
          <Row label={t('account.textSize')}>
            <Segmented
              value={settings.textSize} onChange={(v) => setSetting('textSize', v)}
              options={[
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
              ]}
            />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title={t('account.notifications')}>
          <Row label={t('account.notif.friends')}><Toggle disabled={!c} checked={settings.notifyFriendsPosts} onChange={(v) => setSetting('notifyFriendsPosts', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label={t('account.notif.requests')}><Toggle disabled={!c} checked={settings.notifyConnectionRequests} onChange={(v) => setSetting('notifyConnectionRequests', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label={t('account.notif.reactions')}><Toggle disabled={!c} checked={settings.notifyPostReactions} onChange={(v) => setSetting('notifyPostReactions', v)} /></Row>
          <div style={{ borderTop: '1px solid var(--separator)' }} />
          <Row label={t('account.notif.daily')}>
            <Toggle checked={settings.dailyReminder} onChange={(v) => setSetting('dailyReminder', v)} />
          </Row>
          {settings.dailyReminder && (
            <Row label={t('account.notif.time')}>
              <input type="time" value={settings.reminderTime} onChange={(e) => setSetting('reminderTime', e.target.value)}
                style={{ background: 'var(--fill)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--label)', fontSize: '.9rem' }} />
            </Row>
          )}
        </Section>

        {/* App info */}
        <Section title={t('account.appInfo')} footer={t('account.appInfo.footer')}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem' }}>Gratitude+</div>
          <div className="muted" style={{ fontSize: '.85rem', marginBottom: 12 }}>{t('account.version')}</div>
          <a href="https://buymeacoffee.com/gratitude.by.kian" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--pink-soft)', color: 'var(--label)', padding: '12px 14px', borderRadius: 10, fontWeight: 600 }}>
            <span style={{ color: 'var(--pink)', display: 'flex' }}><Icon name="heart" size={18} filled /></span> {t('account.donate')}
          </a>
        </Section>

        {/* Account actions */}
        <Section footer={t('account.deleteFooter')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%',
              background: 'var(--fill)', color: 'var(--label)', fontWeight: 600, padding: '13px 0', borderRadius: 12, fontSize: '.95rem' }}>
              <Icon name="logout" size={18} /> {t('account.logout')}
            </button>
            <button onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%',
              background: 'rgba(255,59,48,0.10)', color: 'var(--red)', fontWeight: 600, padding: '13px 0', borderRadius: 12, fontSize: '.95rem' }}>
              <Icon name="trash" size={17} /> {t('account.deleteAccount')}
            </button>
          </div>
        </Section>

        <p className="tertiary" style={{ textAlign: 'center', fontSize: '.75rem', paddingBottom: 8 }}>
          {t('account.madeWith')}
        </p>
      </div>

      {/* Sheets */}
      <Sheet open={editMotto} onClose={() => setEditMotto(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, flex: 1 }}>{t('account.guidingPrinciple')}</h3>
          <span className="tertiary" style={{ fontSize: '.78rem' }}>{mottoDraft.length}/150</span>
          <button onClick={() => setMottoVisDraft((v) => (v === 'public' ? 'private' : 'public'))}
            title={mottoVisDraft === 'public' ? 'Public — visible to others' : 'Private — visible only to you'}
            style={{ display: 'flex', color: mottoVisDraft === 'public' ? 'var(--accent)' : 'var(--label-tertiary)' }}>
            <Icon name={mottoVisDraft === 'public' ? 'eye' : 'eyeSlash'} size={18} />
          </button>
        </div>
        <textarea value={mottoDraft} maxLength={150} onChange={(e) => setMottoDraft(e.target.value)} rows={3}
          placeholder={t('account.setGuidingPrinciple')}
          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: 16, padding: 14, color: 'var(--label)', fontSize: '1rem', resize: 'vertical', outline: 'none' }} />
        <div className="tertiary" style={{ fontSize: '.75rem', margin: '6px 2px 14px' }}>
          {mottoVisDraft === 'public' ? t('account.publicHint') : t('account.privateHint')}
        </div>
        <GAButton text={t('account.save')} onClick={() => { updateProfile({ motto: mottoDraft.trim(), mottoVisibility: mottoVisDraft }); setEditMotto(false); }} />
      </Sheet>

      <Sheet open={editProfile} onClose={() => setEditProfile(false)} title={t('account.editProfile')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="section-title" style={{ padding: '0 0 6px' }}>{t('account.screenName')}</div>
            <GATextField placeholder={t('account.username')} value={nameDraft} onChange={setNameDraft} />
          </div>
          <GAButton text={t('account.save')} onClick={() => { updateProfile({ screenName: nameDraft.trim() || user.screenName }); setEditProfile(false); }} />
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('account.delete.title')}>
        <p className="muted" style={{ marginTop: 0 }}>{t('account.delete.body')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <GAButton text={t('account.delete.confirm')} color="var(--red)" onClick={() => { deleteAccount(); setConfirmDelete(false); }} />
          <GAButton style="text" text={t('account.cancel')} onClick={() => setConfirmDelete(false)} />
        </div>
      </Sheet>
    </div>
  );
}
