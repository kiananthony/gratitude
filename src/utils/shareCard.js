// Renders a post as a shareable PNG on the app's brand gradient.
// Sizing: 1080 wide; height grows to fit the content and is capped at a vertical
// story (1920). Layout (centered): Gratitude wordmark → avatar → @username →
// the quoted gratitude → attached photo (if any) → day-coded date.

const W = 1080;
const MAX_H = 1920;
// Gradient corners (match the app's thank-you branding): blue at the top-right,
// teal at the bottom-left.
const TR = [68, 167, 243];
const BL = [121, 190, 205];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function formatDayCode(date) {
  const d = new Date(date);
  return `${WEEKDAYS[d.getDay()]} • ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed so the canvas isn't tainted (bucket CORS must allow this origin)
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn('[shareCard] image failed to load (CORS?):', src); resolve(null); };
    // Cache-bust: if this exact URL was already fetched by a normal <img> on the
    // page (without CORS), the browser may reuse that cached non-CORS response
    // here and the crossOrigin load fails. A unique query param forces a fresh
    // CORS request that includes the Access-Control-Allow-Origin header.
    const bust = (src.includes('?') ? '&' : '?') + '_cors=' + Date.now();
    img.src = src + bust;
  });
}

// Recolour an image (e.g. the blue wordmark) to solid white, preserving its shape.
function whiteMask(img, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0, w, h);
  cx.globalCompositeOperation = 'source-in';
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, w, h);
  return c;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsize(ctx, lines, keep, maxWidth) {
  if (lines.length <= keep) return lines;
  let last = lines[keep - 1];
  while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1);
  return [...lines.slice(0, keep - 1), last + '…'];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateShareCard({ username, gratitude, date, photoURL, postPhotoURL, wordmarkSrc }) {
  await document.fonts.ready;
  const [avatarImg, postImg, wordmarkImg] = await Promise.all([
    photoURL ? loadImage(photoURL) : Promise.resolve(null),
    postPhotoURL ? loadImage(postPhotoURL) : Promise.resolve(null),
    wordmarkSrc ? loadImage(wordmarkSrc) : Promise.resolve(null),
  ]);

  const pad = 96;
  const contentW = W - pad * 2;

  // Layout metrics.
  const topPad = 100;
  const wmH = wordmarkImg ? 66 : 0;
  const gapAfterWm = wordmarkImg ? 62 : 40;
  const avatar = 168;
  const gapAfterAvatar = 28;
  const userFont = 44, userH = 56;
  const gapAfterUser = 56;
  const quoteFont = 58, quoteLH = 80;
  const gapMidPhoto = postImg ? 50 : 0;
  const gapBeforeDate = 54;
  const dateFont = 34, dateH = 44;
  const bottomPad = 96;

  const fixedTop = topPad + wmH + gapAfterWm + avatar + gapAfterAvatar + userH + gapAfterUser;
  const fixedBottom = gapBeforeDate + dateH + bottomPad;
  const middleMax = MAX_H - fixedTop - fixedBottom;

  // Measure + wrap the quote.
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `italic 400 ${quoteFont}px Fraunces, Georgia, serif`;
  let quoteLines = ellipsize(measure, wrapText(measure, `“${gratitude}”`, contentW), postImg ? 6 : 13, contentW);
  let quoteH = quoteLines.length * quoteLH;

  // Photo sizing (cover into contentW), fitting whatever room remains.
  let photoH = 0;
  if (postImg) {
    const aspect = postImg.width / postImg.height;
    const photoMax = Math.max(300, middleMax - quoteH - gapMidPhoto);
    photoH = Math.min(contentW / aspect, photoMax);
    if (quoteH + gapMidPhoto + photoH > middleMax) {
      const linesFit = Math.max(1, Math.floor((middleMax - gapMidPhoto - photoH) / quoteLH));
      quoteLines = ellipsize(measure, quoteLines, linesFit, contentW);
      quoteH = quoteLines.length * quoteLH;
    }
  } else if (quoteH > middleMax) {
    const linesFit = Math.max(1, Math.floor(middleMax / quoteLH));
    quoteLines = ellipsize(measure, quoteLines, linesFit, contentW);
    quoteH = quoteLines.length * quoteLH;
  }

  const needed = fixedTop + quoteH + (postImg ? gapMidPhoto + photoH : 0) + fixedBottom;
  const H = Math.min(MAX_H, Math.round(needed));

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Brand gradient background.
  const g = ctx.createLinearGradient(W, 0, 0, H);
  g.addColorStop(0, `rgb(${TR.join(',')})`);
  g.addColorStop(1, `rgb(${BL.join(',')})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  let y = topPad;

  // Wordmark (white).
  if (wordmarkImg) {
    const wmW = wordmarkImg.width * (wmH / wordmarkImg.height);
    ctx.drawImage(whiteMask(wordmarkImg, wmW, wmH), cx - wmW / 2, y, wmW, wmH);
    y += wmH + gapAfterWm;
  } else {
    y += gapAfterWm;
  }

  // Avatar (centered, white rings).
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, y + avatar / 2, avatar / 2, 0, Math.PI * 2); ctx.clip();
  if (avatarImg) {
    const s = Math.max(avatar / avatarImg.width, avatar / avatarImg.height);
    const dw = avatarImg.width * s, dh = avatarImg.height * s;
    ctx.drawImage(avatarImg, cx - dw / 2, y + avatar / 2 - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(cx - avatar / 2, y, avatar, avatar);
    ctx.fillStyle = '#fff';
    ctx.font = '600 78px Fraunces, Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((username[0] || '?').toUpperCase(), cx, y + avatar / 2 + 4);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, y + avatar / 2, avatar / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, y + avatar / 2, avatar / 2 + 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  y += avatar + gapAfterAvatar;

  // Username.
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 ${userFont}px Fraunces, Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`@${username}`, cx, y + userFont);
  y += userH + gapAfterUser;

  // Quote.
  ctx.font = `italic 400 ${quoteFont}px Fraunces, Georgia, serif`;
  ctx.fillStyle = '#ffffff';
  quoteLines.forEach((line, i) => ctx.fillText(line, cx, y + quoteFont + i * quoteLH));
  y += quoteH;

  // Attached photo (cover into a rounded inset).
  if (postImg) {
    y += gapMidPhoto;
    ctx.save();
    roundRect(ctx, pad, y, contentW, photoH, 32);
    ctx.clip();
    const s = Math.max(contentW / postImg.width, photoH / postImg.height);
    const dw = postImg.width * s, dh = postImg.height * s;
    ctx.drawImage(postImg, cx - dw / 2, y + photoH / 2 - dh / 2, dw, dh);
    ctx.restore();
    roundRect(ctx, pad, y, contentW, photoH, 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    y += photoH;
  }

  // Date, pinned near the bottom.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `400 ${dateFont}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(formatDayCode(date), cx, H - bottomPad);
  ctx.textAlign = 'left';

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export async function shareOrDownloadCard(blob, filename = 'gratitude.png') {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gratitude' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}