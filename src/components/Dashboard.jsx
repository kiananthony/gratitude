import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Segmented } from './ui.jsx';

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function intensity(count) {
  if (!count) return { bg: 'var(--fill-strong)', op: 1 };
  const op = Math.min(0.28 + count * 0.28, 1);
  return { bg: 'var(--accent)', op };
}

function Cell({ count, size, radius = 4 }) {
  const { bg, op } = intensity(count);
  return (
    <div title={count ? `${count} post${count > 1 ? 's' : ''}` : 'No posts'}
      style={{ background: bg, opacity: op, borderRadius: radius, width: size?.w, height: size?.h || size?.w, aspectRatio: size?.w ? undefined : '1' }} />
  );
}

export default function Dashboard() {
  const { posts, user } = useApp();
  const [period, setPeriod] = useState('week');

  const counts = useMemo(() => {
    const m = {};
    posts.filter((p) => p.ownerId === user.id).forEach((p) => {
      const k = dayKey(new Date(p.date));
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [posts]);

  const today = startOfDay(new Date());

  if (Object.keys(counts).length === 0) {
    return (
      <div style={{ padding: '4px 2px' }}>
        <p style={{ color: 'var(--accent)', fontWeight: 600, margin: '0 0 4px' }}>Start expressing your gratitude!</p>
        <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>Once you've added some posts, you'll see your positivity stats and patterns here.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <Segmented value={period} onChange={setPeriod}
          options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
      </div>
      {period === 'week' && <WeekView counts={counts} today={today} />}
      {period === 'month' && <MonthView counts={counts} today={today} />}
      {period === 'year' && <YearView counts={counts} today={today} />}
      <Legend />
    </div>
  );
}

function WeekView({ counts, today }) {
  // Current ISO-ish week starting Monday
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - dow);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <>
      <DateLabel text={`${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 6 }}>
        {labels.map((l, i) => <div key={i} className="tertiary" style={{ textAlign: 'center', fontSize: '.7rem' }}>{l}</div>)}
        {days.map((d) => <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: '100%', h: 92 }} radius={7} />)}
      </div>
    </>
  );
}

function MonthView({ counts, today }) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(today.getFullYear(), today.getMonth(), d));
  return (
    <>
      <DateLabel text={today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginTop: 6 }}>
        {labels.map((l, i) => <div key={'h' + i} className="tertiary" style={{ textAlign: 'center', fontSize: '.7rem' }}>{l}</div>)}
        {cells.map((d, i) => d ? <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: '100%', h: 26 }} /> : <div key={'e' + i} />)}
      </div>
    </>
  );
}

function YearView({ counts, today }) {
  const year = today.getFullYear();
  const months = Array.from({ length: 12 }, (_, m) => {
    const dim = new Date(year, m + 1, 0).getDate();
    return { m, days: Array.from({ length: dim }, (_, d) => new Date(year, m, d + 1)) };
  });
  const M = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <>
      <DateLabel text={String(year)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
        {months.map(({ m, days }) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="tertiary" style={{ width: 14, fontSize: '.72rem' }}>{M[m]}</span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {days.map((d) => <Cell key={dayKey(d)} count={counts[dayKey(d)] || 0} size={{ w: 9, h: 9 }} radius={2} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DateLabel({ text }) {
  return <div style={{ textAlign: 'center', fontWeight: 500, fontSize: '.9rem', marginBottom: 2 }}>{text}</div>;
}

function Legend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 }}>
      <span className="tertiary" style={{ fontSize: '.72rem' }}>Less</span>
      {[0, 1, 2, 3].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: 2, ...(() => { const i = intensity(c); return { background: i.bg, opacity: i.op }; })() }} />)}
      <span className="tertiary" style={{ fontSize: '.72rem' }}>More</span>
    </div>
  );
}
