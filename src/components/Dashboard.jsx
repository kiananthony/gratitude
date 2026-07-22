import { useMemo, useState } from 'react';
import { useApp, TEXT_SCALES } from '../context/AppContext.jsx';
import { Segmented } from './ui.jsx';
import Icon from './Icon.jsx';

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthKey = (y, m) => y * 12 + m;

function intensity(count) {
  if (!count) return { bg: 'var(--fill-strong)', op: 1 };
  const op = Math.min(0.28 + count * 0.28, 1);
  return { bg: 'var(--accent)', op };
}

function Cell({ count, size, radius = 4, isToday, todayMark = 'outline', placeholder }) {
  if (placeholder) {
    return (
      <div style={{
        width: size?.w, height: size?.h || size?.w, aspectRatio: size?.w ? undefined : '1',
        borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--label-tertiary)', opacity: 0.35,
      }}>
        <svg width="55%" height="55%" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      </div>
    );
  }
  const { bg, op } = intensity(count);
  // Year view uses tiny chevrons above/below (they overflow the cell so they
  // need no extra grid spacing); week/month use a simple outline ring.
  if (isToday && todayMark === 'chevron') {
    const chev = (pos) => (
      <svg width="7" height="4" viewBox="0 0 7 4" style={{ position: 'absolute', left: '50%', transform: `translateX(-50%) rotate(${pos === 'top' ? 0 : 180}deg)`, [pos]: -5 }} aria-hidden>
        <path d="M1 1l2.5 2L6 1" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    return (
      <div style={{ position: 'relative', width: size?.w, height: size?.h || size?.w }}>
        {chev('top')}{chev('bottom')}
        <div title={count ? `${count} posts` : 'Today'} style={{ background: bg, opacity: op, borderRadius: radius, width: '100%', height: '100%' }} />
      </div>
    );
  }
  return (
    <div title={count ? `${count} post${count > 1 ? 's' : ''}` : 'No posts'}
      style={{
        background: bg, opacity: op, borderRadius: radius, width: size?.w, height: size?.h || size?.w,
        aspectRatio: size?.w ? undefined : '1', boxSizing: 'border-box',
        outline: isToday ? '2px solid var(--accent)' : 'none', outlineOffset: isToday ? 1 : 0,
      }} />
  );
}

export default function Dashboard() {
  const { posts, user, settings, t } = useApp();
  const [period, setPeriod] = useState('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  const ownPosts = useMemo(() => posts.filter((p) => p.ownerId === user.id), [posts, user.id]);
  const counts = useMemo(() => {
    const m = {};
    ownPosts.forEach((p) => { const k = dayKey(new Date(p.date)); m[k] = (m[k] || 0) + 1; });
    return m;
  }, [ownPosts]);
  const firstPostDate = useMemo(
    () => (ownPosts.length ? startOfDay(new Date(Math.min(...ownPosts.map((p) => p.date)))) : null),
    [ownPosts]
  );

  const today = startOfDay(new Date());

  // Cancel out the app-wide text-size zoom so the dashboard's grid stays a
  // consistent, predictable size regardless of that setting.
  const inverseScale = 1 / (TEXT_SCALES[settings.textSize] || 1);

  if (Object.keys(counts).length === 0) {
    return (
      <div style={{ padding: '4px 2px' }}>
        <p style={{ color: 'var(--accent)', fontWeight: 600, margin: '0 0 4px' }}>{t('dash.start')}</p>
        <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>{t('dash.startSub')}</p>
      </div>
    );
  }

  return (
    <div style={{ zoom: inverseScale }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <Segmented value={period} onChange={setPeriod}
          options={[{ value: 'week', label: t('dash.week') }, { value: 'month', label: t('dash.month') }, { value: 'year', label: t('dash.year') }]} />
      </div>
      {period === 'week' && <WeekView counts={counts} today={today} firstPostDate={firstPostDate} offset={weekOffset} setOffset={setWeekOffset} />}
      {period === 'month' && <MonthView counts={counts} today={today} firstPostDate={firstPostDate} offset={monthOffset} setOffset={setMonthOffset} />}
      {period === 'year' && <YearView counts={counts} today={today} firstPostDate={firstPostDate} offset={yearOffset} setOffset={setYearOffset} />}
      <Legend />
    </div>
  );
}

function NavHeader({ text, onPrev, onNext, canPrev, canNext }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 2 }}>
      <button className="icon-btn" style={{ width: 26, height: 26, opacity: canPrev ? 1 : 0.3 }} onClick={onPrev} disabled={!canPrev} aria-label="Earlier">
        <Icon name="chevronL" size={15} />
      </button>
      <div style={{ fontWeight: 500, fontSize: '.9rem', minWidth: 130, textAlign: 'center' }}>{text}</div>
      <button className="icon-btn" style={{ width: 26, height: 26, opacity: canNext ? 1 : 0.3 }} onClick={onNext} disabled={!canNext} aria-label="Later">
        <Icon name="chevronR" size={15} />
      </button>
    </div>
  );
}

function WeekView({ counts, today, firstPostDate, offset, setOffset }) {
  const dow = (today.getDay() + 6) % 7;
  const currentMonday = new Date(today); currentMonday.setDate(today.getDate() - dow);
  const monday = new Date(currentMonday); monday.setDate(currentMonday.getDate() - offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });

  const earliestMonday = useMemo(() => {
    if (!firstPostDate) return currentMonday;
    const fdow = (firstPostDate.getDay() + 6) % 7;
    const m = new Date(firstPostDate); m.setDate(firstPostDate.getDate() - fdow);
    return m;
  }, [firstPostDate]); // eslint-disable-line
  const canPrev = monday > earliestMonday;
  const canNext = offset > 0;

  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <>
      <NavHeader
        text={`${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        onPrev={() => setOffset((o) => o + 1)} onNext={() => setOffset((o) => Math.max(0, o - 1))}
        canPrev={canPrev} canNext={canNext}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 6 }}>
        {labels.map((l, i) => <div key={i} className="tertiary" style={{ textAlign: 'center', fontSize: '.7rem' }}>{l}</div>)}
        {days.map((d) => <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: '100%', h: 92 }} radius={7} isToday={dayKey(d) === dayKey(today)} />)}
      </div>
    </>
  );
}

function MonthView({ counts, today, firstPostDate, offset, setOffset }) {
  const base = monthKey(today.getFullYear(), today.getMonth()) - offset;
  const y = Math.floor(base / 12), m = ((base % 12) + 12) % 12;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthOffset0 = (first.getDay() + 6) % 7; // Monday-first
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cells = [];
  for (let i = 0; i < monthOffset0; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const earliestKey = firstPostDate ? monthKey(firstPostDate.getFullYear(), firstPostDate.getMonth()) : monthKey(today.getFullYear(), today.getMonth());
  const canPrev = base - 1 >= earliestKey;
  const canNext = offset > 0;

  return (
    <>
      <NavHeader
        text={first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        onPrev={() => setOffset((o) => o + 1)} onNext={() => setOffset((o) => Math.max(0, o - 1))}
        canPrev={canPrev} canNext={canNext}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginTop: 6 }}>
        {labels.map((l, i) => <div key={'h' + i} className="tertiary" style={{ textAlign: 'center', fontSize: '.7rem' }}>{l}</div>)}
        {cells.map((d, i) => d
          ? <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: '100%', h: 26 }} isToday={dayKey(d) === dayKey(today)} />
          : <div key={'e' + i} />)}
      </div>
    </>
  );
}

// Every month row gets the same 31 columns, so the grid stays rectangular -
// months with fewer days show faint crossed-out cells for the days that
// don't exist (Feb 29–31, and the 31sts that other months don't have).
function YearView({ counts, today, firstPostDate, offset, setOffset }) {
  const year = today.getFullYear() - offset;
  const months = Array.from({ length: 12 }, (_, m) => {
    const dim = new Date(year, m + 1, 0).getDate();
    return { m, dim, days: Array.from({ length: dim }, (_, d) => new Date(year, m, d + 1)) };
  });
  const M = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  const earliestYear = firstPostDate ? firstPostDate.getFullYear() : today.getFullYear();
  const canPrev = year > earliestYear;
  const canNext = offset > 0;

  return (
    <>
      <NavHeader
        text={String(year)}
        onPrev={() => setOffset((o) => o + 1)} onNext={() => setOffset((o) => Math.max(0, o - 1))}
        canPrev={canPrev} canNext={canNext}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
        {months.map(({ m, dim, days }) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="tertiary" style={{ width: 14, fontSize: '.72rem', flex: 'none' }}>{M[m]}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(31, 7px)', gap: 3 }}>
              {days.map((d) => <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: 7, h: 7 }} radius={2} isToday={dayKey(d) === dayKey(today)} todayMark="chevron" />)}
              {Array.from({ length: 31 - dim }).map((_, i) => <Cell key={'ph' + i} placeholder size={{ w: 7, h: 7 }} radius={2} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Legend() {
  const { t } = useApp();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 }}>
      <span className="tertiary" style={{ fontSize: '.72rem' }}>{t('dash.less')}</span>
      {[0, 1, 2, 3].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: 2, ...(() => { const i = intensity(c); return { background: i.bg, opacity: i.op }; })() }} />)}
      <span className="tertiary" style={{ fontSize: '.72rem' }}>{t('dash.more')}</span>
    </div>
  );
}
