// Lightweight SF-Symbol-equivalent icon set. Stroke icons scale with `size`.
// `filled` variants are used where the iOS app used the `.fill` symbol.

const P = {
  timeline: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="7" y1="9" x2="7" y2="9.01" /><line x1="10" y1="9" x2="17" y2="9" /><line x1="7" y1="13" x2="7" y2="13.01" /><line x1="10" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="7" y2="17.01" /><line x1="10" y1="17" x2="14" y2="17" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" /><path d="M16 5.3a3.2 3.2 0 0 1 0 6.1" /><path d="M17.5 14.2a5.5 5.5 0 0 1 3 5.3" /></>,
  person: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  personCircle: <><circle cx="12" cy="12" r="9.2" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18.4a6 6 0 0 1 11 0" /></>,
  send: <path d="M4 12 20 4l-6 16-2.6-6.4L4 12Z" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeSlash: <><path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1M21.5 12S18 18.5 12 18.5c-1.6 0-3-.4-4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><line x1="3" y1="3" x2="21" y2="21" /></>,
  heart: <path d="M12 20s-7.5-4.6-9.8-9.2C.9 8.1 2 5 5 5c2 0 3.2 1.3 4 2.4C9.8 6.3 11 5 13 5c3 0 4.1 3.1 2.8 5.8C13.5 15.4 12 20 12 20Z" />,
  photo: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10" r="1.6" /><path d="m4 17 4.5-4.5 3.5 3 3-3L20 17" /></>,
  xmark: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" /></>,
  warn: <><path d="M12 3 22 20H2L12 3Z" /><line x1="12" y1="10" x2="12" y2="14.5" /><line x1="12" y1="17.5" x2="12" y2="17.51" /></>,
  share: <><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" /></>,
  envelope: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  plusCircle: <><circle cx="12" cy="12" r="9" /><line x1="12" y1="8.5" x2="12" y2="15.5" /><line x1="8.5" y1="12" x2="15.5" y2="12" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><line x1="16" y1="16" x2="21" y2="21" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.8 2.8L16 9.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><line x1="12" y1="2.5" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="21.5" /><line x1="2.5" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="21.5" y2="12" /><line x1="5.4" y1="5.4" x2="7.1" y2="7.1" /><line x1="16.9" y1="16.9" x2="18.6" y2="18.6" /><line x1="5.4" y1="18.6" x2="7.1" y2="16.9" /><line x1="16.9" y1="7.1" x2="18.6" y2="5.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  half: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" stroke="none" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  chevronR: <path d="m9 6 6 6-6 6" />,
  chevronL: <path d="m15 6-6 6 6 6" />,
  note: <><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><line x1="8.5" y1="8" x2="15.5" y2="8" /><line x1="8.5" y1="12" x2="15.5" y2="12" /><line x1="8.5" y1="16" x2="12.5" y2="16" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  logout: <><path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M9 12h11" /><path d="m16 8 4 4-4 4" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><line x1="18" y1="7" x2="18" y2="13" /><line x1="15" y1="10" x2="21" y2="10" /></>,
  clockActivity: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  camera: <><path d="M5 8h2.5l1.2-2h6.6L16.5 8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13.5" r="3.2" /></>,
  connect: <><path d="M9.5 14.5 14.5 9.5" /><path d="M8 16.5 5.6 18.9a3 3 0 0 1-4.2-4.2L3.8 12.3" /><path d="M16 8l2.4-2.4a3 3 0 0 1 4.2 4.2L20.2 12.2" /></>,
  disconnect: <><path d="M9.5 14.5 11 13" /><path d="M14.5 9.5 13 11" /><path d="M8 16.5 5.6 18.9a3 3 0 0 1-4.2-4.2L3.8 12.3" /><path d="M16 8l2.4-2.4a3 3 0 0 1 4.2 4.2L20.2 12.2" /><line x1="3" y1="3" x2="21" y2="21" /></>,
  kebab: <><circle cx="12" cy="6" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" /></>,
  kebabH: <><circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  addToHome: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><line x1="12" y1="9" x2="12" y2="15" /><line x1="9" y1="12" x2="15" y2="12" /></>,
  installTray: <><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 18h14" /></>,
};

export default function Icon({ name, size = 22, filled = false, color, strokeWidth = 1.8, style, className }) {
  const path = P[name] || null;
  const filledIcons = { heart: true, send: true };
  const isFilled = filled && filledIcons[name];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ color, flex: 'none', ...style }} className={className} aria-hidden="true"
    >
      {path}
    </svg>
  );
}
