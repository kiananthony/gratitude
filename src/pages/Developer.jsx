import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/Icon.jsx';
import { Segmented, Toggle, Popup, GAButton } from '../components/ui.jsx';

function Section({ title, footer, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      {title && <div className="section-title">{title}</div>}
      <div className="card" style={{ padding: 16 }}>{children}</div>
      {footer && <p className="muted" style={{ fontSize: '.78rem', padding: '8px 6px 0', margin: 0, opacity: .9 }}>{footer}</p>}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {children}
    </div>
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

export default function Developer({ onStartTour }) {
  const { features, setAppConfigValue, feedbackList, reportsList, t } = useApp();
  const [feedbackDetail, setFeedbackDetail] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const cfg = features.config;

  return (
    <div className="page">
      <div className="page-inner">
        <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 600, margin: '4px 0 14px' }}>Developer</h1>

        {/* Onboarding tour */}
        <Section title="Onboarding tour" footer="Play it yourself any time, or show it automatically to people the first time they sign in.">
          <button onClick={() => onStartTour?.()}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill)', color: 'var(--label)', padding: '12px 14px', borderRadius: 10, fontWeight: 600, width: '100%', fontSize: '1rem', fontFamily: 'inherit', marginBottom: 6 }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="play" size={18} /></span> Play tour now
          </button>
          <Row label="Show tour to new members">
            <Toggle checked={cfg.tourForNewMembers} onChange={(v) => setAppConfigValue('tourForNewMembers', v)} />
          </Row>
        </Section>

        {/* Feature flags */}
        <Section title="Features" footer="Choose who can use each optional feature. “Premium” includes developers.">
          <div style={{ marginBottom: 14 }}>
            <div className="muted" style={{ fontSize: '.85rem', marginBottom: 6 }}>Gratitude dashboard</div>
            <Segmented options={AUDIENCE} value={cfg.featureDashboard} onChange={(v) => setAppConfigValue('featureDashboard', v)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="muted" style={{ fontSize: '.85rem', marginBottom: 6 }}>Themes</div>
            <Segmented options={AUDIENCE} value={cfg.featureThemes} onChange={(v) => setAppConfigValue('featureThemes', v)} />
          </div>
          <div>
            <div className="muted" style={{ fontSize: '.85rem', marginBottom: 6 }}>Photos in posts</div>
            <Segmented options={AUDIENCE} value={cfg.featurePostImages} onChange={(v) => setAppConfigValue('featurePostImages', v)} />
          </div>
        </Section>

        {/* Feedback */}
        <Section title="Feedback" footer="Feedback submitted by users. Tap an item to see the full message.">
          {feedbackList.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>No feedback yet.</p>
          ) : feedbackList.slice(0, 40).map((fb, i) => (
            <button key={fb.id} onClick={() => setFeedbackDetail(fb)}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '11px 2px', borderTop: i ? '1px solid var(--separator)' : 'none' }}>
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

        {/* Reports */}
        <Section title="Reported posts" footer="Posts reported by users. Tap an item for the full report.">
          {reportsList.length === 0 ? (
            <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>No reports yet.</p>
          ) : reportsList.slice(0, 40).map((r, i) => (
            <button key={r.id} onClick={() => setReportDetail(r)}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '11px 2px', borderTop: i ? '1px solid var(--separator)' : 'none' }}>
              <span style={{ color: 'var(--red)', display: 'flex', flex: 'none', marginTop: 1 }}><Icon name="warn" size={16} /></span>
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
      </div>

      <Popup open={!!feedbackDetail} onClose={() => setFeedbackDetail(null)}>
        {feedbackDetail && (
          <div>
            <h3 className="serif" style={{ margin: '0 30px 8px 0', fontWeight: 600 }}>Feedback</h3>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>@{feedbackDetail.fromScreenName || 'unknown'}</div>
            <div className="tertiary" style={{ fontSize: '.78rem', marginBottom: 14, wordBreak: 'break-all' }}>{fbDateFull(feedbackDetail.date)} · {feedbackDetail.fromUserId}</div>
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '50vh', overflow: 'auto' }}>{feedbackDetail.text}</div>
          </div>
        )}
      </Popup>

      <Popup open={!!reportDetail} onClose={() => setReportDetail(null)}>
        {reportDetail && (
          <div>
            <h3 className="serif" style={{ margin: '0 30px 8px 0', fontWeight: 600 }}>Reported post</h3>
            <div style={{ fontSize: '.82rem', marginBottom: 4 }}>Reported user: <span style={{ fontWeight: 600 }}>@{reportDetail.postOwnerScreenName || 'unknown'}</span></div>
            <div style={{ fontSize: '.82rem', marginBottom: 4 }}>Reported by: <span style={{ fontWeight: 600 }}>@{reportDetail.reporterScreenName || 'unknown'}</span></div>
            <div className="tertiary" style={{ fontSize: '.78rem', marginBottom: 14, wordBreak: 'break-all' }}>{fbDateFull(reportDetail.date)} · post {reportDetail.postId}</div>
            {reportDetail.postText && <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 12, marginBottom: 10, fontStyle: 'italic' }}>“{reportDetail.postText}”</div>}
            <div className="section-title" style={{ padding: '0 0 4px' }}>Reason</div>
            <div style={{ background: 'rgba(255,59,48,0.08)', borderRadius: 12, padding: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'auto' }}>{reportDetail.reason || '-'}</div>
          </div>
        )}
      </Popup>
    </div>
  );
}
