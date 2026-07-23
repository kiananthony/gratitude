import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import { Segmented, Popup, Toggle, Avatar, ProfileCard } from '../components/ui.jsx';

function Section({ title, footer, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      {title && <div className="section-title">{title}</div>}
      <div className="card" style={{ padding: 16 }}>{children}</div>
      {footer && <p className="muted" style={{ fontSize: '.78rem', padding: '8px 6px 0', margin: 0, opacity: .9 }}>{footer}</p>}
    </section>
  );
}

function fbDate(ms) {
  if (!ms) return '';
  const d = new Date(ms); const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
function fbDateFull(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AUDIENCE = [
  { value: 'all', label: 'Everyone' },
  { value: 'premium', label: 'Premium' },
  { value: 'dev', label: 'Devs' },
  { value: 'off', label: 'Off' },
];
const STATUS = [
  { value: 'received', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'handled', label: 'Done' },
];
const STATUS_COLOR = { received: '#ff3b30', in_progress: 'var(--accent)', handled: '#34c759' };

function StatusDot({ status }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[status] || 'var(--label-tertiary)', flex: 'none' }} />;
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ flex: '1 1 90px', minWidth: 90, background: 'var(--bg)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--label)', lineHeight: 1.1 }}>{value}</div>
      <div className="muted" style={{ fontSize: '.76rem', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Developer() {
  const {
    features, setAppConfigValue, feedbackList, reportsList,
    fetchAllUsers, fetchAllPosts, setUserPremium, setUserDeveloper, adminDeleteUser, setReportStatus, setFeedbackStatus, deleteReport, deleteFeedback,
  } = useApp();
  const cfg = features.config;

  const [users, setUsers] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberDetail, setMemberDetail] = useState(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const [feedbackDetail, setFeedbackDetail] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [announce, setAnnounce] = useState(cfg.announcement || '');
  const [announceSaved, setAnnounceSaved] = useState(false);
  const [delArm, setDelArm] = useState(false);

  const DeleteBtn = ({ onConfirm }) => (
    <button onClick={() => { if (delArm) { onConfirm(); } else { setDelArm(true); } }}
      style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '.88rem',
        background: delArm ? '#ff3b30' : 'var(--fill)', color: delArm ? '#fff' : '#ff3b30' }}>
      {delArm ? 'Tap again to permanently delete' : 'Delete'}
    </button>
  );

  const openMember = (u) => { setConfirmName(''); setDeleteErr(''); setMemberDetail(u); };
  const patchUser = (id, patch) => {
    setUsers((prev) => (prev || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setMemberDetail((m) => (m && m.id === id ? { ...m, ...patch } : m));
  };
  const toggleDeveloper = (u, value) => {
    patchUser(u.id, { isDeveloper: value });
    setUserDeveloper(u.id, value).catch(() => patchUser(u.id, { isDeveloper: !value }));
  };
  const deleteMember = async () => {
    if (!memberDetail) return;
    setDeleting(true); setDeleteErr('');
    try {
      await adminDeleteUser(memberDetail.id);
      setUsers((prev) => (prev || []).filter((x) => x.id !== memberDetail.id));
      setMemberDetail(null);
    } catch (e) {
      setDeleteErr(e?.message || 'Delete failed.');
    } finally { setDeleting(false); }
  };

  useEffect(() => {
    let alive = true;
    fetchAllUsers().then((u) => alive && setUsers(u)).catch(() => alive && setUsers([]));
    fetchAllPosts().then((p) => alive && setPostCount(p.length)).catch(() => alive && setPostCount(null));
    return () => { alive = false; };
  }, [fetchAllUsers, fetchAllPosts]);
  useEffect(() => { setAnnounce(cfg.announcement || ''); }, [cfg.announcement]);

  const insights = useMemo(() => {
    const list = users || [];
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return {
      members: list.length,
      premium: list.filter((u) => u.hasPremium).length,
      newWeek: list.filter((u) => u.createdAt && u.createdAt >= weekAgo).length,
      openReports: reportsList.filter((r) => r.status !== 'handled').length,
      newFeedback: feedbackList.filter((f) => f.status !== 'handled').length,
    };
  }, [users, reportsList, feedbackList]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const list = users || [];
    return (q ? list.filter((u) => u.screenName.toLowerCase().includes(q)) : list).slice(0, 200);
  }, [users, memberQuery]);

  const togglePremium = (u, value) => {
    patchUser(u.id, { hasPremium: value });
    setUserPremium(u.id, value).catch(() => patchUser(u.id, { hasPremium: !value }));
  };

  const saveAnnouncement = () => {
    setAppConfigValue('announcement', announce.trim());
    setAnnounceSaved(true);
    setTimeout(() => setAnnounceSaved(false), 1800);
  };

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600, margin: '4px 0 14px' }}>Developer</h1>

        <Section title="App insights" footer="Live counts across the whole app.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Members" value={users == null ? '…' : insights.members} accent />
            <Stat label="Premium" value={users == null ? '…' : insights.premium} />
            <Stat label="New this week" value={users == null ? '…' : insights.newWeek} />
            <Stat label="Public posts" value={postCount == null ? '…' : postCount} />
            <Stat label="Open reports" value={insights.openReports} />
            <Stat label="New feedback" value={insights.newFeedback} />
          </div>
        </Section>

        <Section title="Features" footer="Choose who can use each feature. Premium includes developers.">
          {[
            ['Gratitude dashboard', 'featureDashboard'],
            ['Themes', 'featureThemes'],
            ['Photos in posts', 'featurePostImages'],
            ['Share post to social media', 'featureShare'],
          ].map(([label, key], i) => (
            <div key={key} style={{ marginBottom: i < 3 ? 14 : 0 }}>
              <div className="muted" style={{ fontSize: '.85rem', marginBottom: 6 }}>{label}</div>
              <Segmented full options={AUDIENCE} value={cfg[key]} onChange={(v) => setAppConfigValue(key, v)} />
            </div>
          ))}
        </Section>

        <Section title="Announcement banner" footer="Preview: shown only to developers for now. Leave empty to hide it.">
          <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} rows={2}
            placeholder="e.g. New themes just dropped"
            style={{ width: '100%', resize: 'vertical', background: 'var(--bg)', border: '1px solid var(--separator)', borderRadius: 12, padding: '10px 12px', color: 'var(--label)', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={saveAnnouncement}
            style={{ marginTop: 10, background: 'var(--accent)', color: '#fff', fontWeight: 600, padding: '10px 16px', borderRadius: 10, fontSize: '.9rem' }}>
            {announceSaved ? 'Saved' : 'Save banner'}
          </button>
        </Section>

        <Section title={`Members${users ? ` (${users.length})` : ''}`} footer="Toggle premium for any member. Changes apply instantly.">
          <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Search members"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--separator)', borderRadius: 10, padding: '9px 12px', color: 'var(--label)', fontSize: '.95rem', outline: 'none', marginBottom: 6 }} />
          {users == null ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: '8px 0 0' }}>Loading members…</p>
          ) : filteredMembers.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: '8px 0 0' }}>No members found.</p>
          ) : filteredMembers.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px', borderTop: i ? '1px solid var(--separator)' : 'none' }}>
              <button onClick={() => openMember(u)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textAlign: 'left', padding: 0 }}>
                <Avatar person={u} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{u.screenName || 'unknown'}{u.isDeveloper && <span style={{ color: 'var(--accent)', fontSize: '.72rem', marginLeft: 6 }}>dev</span>}
                  </div>
                  <div className="tertiary" style={{ fontSize: '.72rem' }}>{u.createdAt ? `joined ${fbDate(u.createdAt)}` : ''}</div>
                </div>
              </button>
              <span className="muted" style={{ fontSize: '.72rem' }}>Premium</span>
              <Toggle checked={u.hasPremium} onChange={(v) => togglePremium(u, v)} />
            </div>
          ))}
        </Section>

        <Section title="Reported posts" footer="Tap a report to view details and set its status.">
          {reportsList.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>No reports yet.</p>
          ) : reportsList.slice(0, 60).map((r, i) => (
            <button key={r.id} onClick={() => { setDelArm(false); setReportDetail(r); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', width: '100%', padding: '11px 2px', borderTop: i ? '1px solid var(--separator)' : 'none' }}>
              <StatusDot status={r.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.82rem', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>@{r.postOwnerScreenName || 'unknown'}</span>
                  <span className="tertiary" style={{ marginLeft: 8, fontSize: '.75rem' }}>{fbDate(r.date)}</span>
                </div>
                <div className="muted" style={{ fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || r.postText}</div>
              </div>
              <Icon name="chevronR" size={16} color="var(--label-tertiary)" />
            </button>
          ))}
        </Section>

        <Section title="Feedback" footer="Tap an item to read it and set its status.">
          {feedbackList.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>No feedback yet.</p>
          ) : feedbackList.slice(0, 60).map((fb, i) => (
            <button key={fb.id} onClick={() => { setDelArm(false); setFeedbackDetail(fb); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', width: '100%', padding: '11px 2px', borderTop: i ? '1px solid var(--separator)' : 'none' }}>
              <StatusDot status={fb.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.82rem', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>@{fb.fromScreenName || 'unknown'}</span>
                  <span className="tertiary" style={{ marginLeft: 8, fontSize: '.75rem' }}>{fbDate(fb.date)}</span>
                </div>
                <div className="muted" style={{ fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.text}</div>
              </div>
              <Icon name="chevronR" size={16} color="var(--label-tertiary)" />
            </button>
          ))}
        </Section>
      </div>

      <Popup open={!!memberDetail} onClose={() => setMemberDetail(null)}>
        {memberDetail && (
          <div>
            <ProfileCard profile={memberDetail} hideCount />
            <div style={{ marginTop: 8, borderTop: '1px solid var(--separator)', paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontWeight: 500 }}>Premium</span>
                <Toggle checked={memberDetail.hasPremium} onChange={(v) => togglePremium(memberDetail, v)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--separator)' }}>
                <span style={{ fontWeight: 500 }}>Developer</span>
                <Toggle checked={memberDetail.isDeveloper} onChange={(v) => toggleDeveloper(memberDetail, v)} />
              </div>
            </div>

            <div style={{ marginTop: 14, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontWeight: 600, color: '#ff3b30', marginBottom: 4 }}>Delete account</div>
              <div className="muted" style={{ fontSize: '.82rem', marginBottom: 10, lineHeight: 1.45 }}>
                Permanently removes @{memberDetail.screenName}'s login and all their data. This can't be undone. Type <b>{memberDetail.screenName}</b> to confirm.
              </div>
              <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder="Type the username"
                autoCapitalize="none" autoCorrect="off"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--separator)', borderRadius: 10, padding: '9px 12px', color: 'var(--label)', fontSize: '.95rem', outline: 'none', marginBottom: 10 }} />
              {deleteErr && <div style={{ color: '#ff3b30', fontSize: '.8rem', marginBottom: 8 }}>{deleteErr}</div>}
              <button
                onClick={deleteMember}
                disabled={deleting || confirmName.trim().toLowerCase() !== (memberDetail.screenName || '').toLowerCase()}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: '.92rem',
                  background: (deleting || confirmName.trim().toLowerCase() !== (memberDetail.screenName || '').toLowerCase()) ? 'var(--fill)' : '#ff3b30',
                  color: (deleting || confirmName.trim().toLowerCase() !== (memberDetail.screenName || '').toLowerCase()) ? 'var(--label-tertiary)' : '#fff',
                }}>
                {deleting ? 'Deleting…' : 'Delete this account'}
              </button>
            </div>
          </div>
        )}
      </Popup>

      <Popup open={!!feedbackDetail} onClose={() => setFeedbackDetail(null)}>
        {feedbackDetail && (
          <div>
            <h3 className="serif" style={{ margin: '0 30px 8px 0', fontWeight: 600 }}>Feedback</h3>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>@{feedbackDetail.fromScreenName || 'unknown'}</div>
            <div className="tertiary" style={{ fontSize: '.78rem', marginBottom: 14, wordBreak: 'break-all' }}>{fbDateFull(feedbackDetail.date)}</div>
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'auto', marginBottom: 16 }}>{feedbackDetail.text}</div>
            <div className="section-title" style={{ padding: '0 0 6px' }}>Status</div>
            <Segmented full options={STATUS} value={feedbackDetail.status}
              onChange={(v) => { setFeedbackStatus(feedbackDetail.id, v); setFeedbackDetail({ ...feedbackDetail, status: v }); }} />
            <DeleteBtn onConfirm={() => { deleteFeedback(feedbackDetail.id); setFeedbackDetail(null); }} />
          </div>
        )}
      </Popup>

      <Popup open={!!reportDetail} onClose={() => setReportDetail(null)}>
        {reportDetail && (
          <div>
            <h3 className="serif" style={{ margin: '0 30px 8px 0', fontWeight: 600 }}>Reported post</h3>
            <div style={{ fontSize: '.82rem', marginBottom: 4 }}>Reported user: <span style={{ fontWeight: 600 }}>@{reportDetail.postOwnerScreenName || 'unknown'}</span></div>
            <div style={{ fontSize: '.82rem', marginBottom: 4 }}>Reported by: <span style={{ fontWeight: 600 }}>@{reportDetail.reporterScreenName || 'unknown'}</span></div>
            <div className="tertiary" style={{ fontSize: '.78rem', marginBottom: 14, wordBreak: 'break-all' }}>{fbDateFull(reportDetail.date)}</div>
            {reportDetail.postText && <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 12, marginBottom: 10, fontStyle: 'italic' }}>“{reportDetail.postText}”</div>}
            <div className="section-title" style={{ padding: '0 0 4px' }}>Reason</div>
            <div style={{ background: 'rgba(255,59,48,0.08)', borderRadius: 12, padding: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '30vh', overflow: 'auto', marginBottom: 16 }}>{reportDetail.reason || '-'}</div>
            <div className="section-title" style={{ padding: '0 0 6px' }}>Status</div>
            <Segmented full options={STATUS} value={reportDetail.status}
              onChange={(v) => { setReportStatus(reportDetail.id, v); setReportDetail({ ...reportDetail, status: v }); }} />
            <DeleteBtn onConfirm={() => { deleteReport(reportDetail.id); setReportDetail(null); }} />
          </div>
        )}
      </Popup>
    </div>
  );
}
