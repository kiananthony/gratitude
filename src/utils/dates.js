// ISO-week helpers to match the SwiftUI grouping (yearForWeekOfYear + weekOfYear).

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

export function weekRange(year, week) {
  // Monday of the ISO week
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = (simple.getUTCDay() + 6) % 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dow);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `Week ${week} · ${fmt(monday)} – ${fmt(sunday)}`;
}

export function dayAbbrev(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2).toUpperCase();
}

// Group posts: { year: { week: Post[] } }, all sorted descending by date.
export function groupPosts(posts) {
  const sorted = [...posts].sort((a, b) => b.date - a.date);
  const byYear = {};
  for (const p of sorted) {
    const { year, week } = isoWeek(new Date(p.date));
    (byYear[year] ||= {});
    (byYear[year][week] ||= []).push(p);
  }
  return byYear;
}

export function relativeDay(ts) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
