// Renders a post as a shareable PNG image, in the style of the iOS "share as
// image" card: a white card with the poster's avatar, "@username on:" + the
// Gratitude wordmark, the quoted gratitude text, an optional photo preview,
// and a day-coded date. Sized to fit the content, capped to the viewport.

const SCALE = 3; // render at 3x for a crisp share image
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function formatDayCode(date) {
  const d = new Date(date);
  return `${WEEKDAYS[d.getDay()]} • ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // don't fail the whole card if an image can't load
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
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

export async function generateShareCard({ username, gratitude, date, photoURL, postPhotoURL, wordmarkSrc, accentColor = '#3a9bde' }) {
  await document.fonts.ready;
  const [avatarImg, wordmarkImg, postImg] = await Promise.all([
    photoURL ? loadImage(photoURL) : Promise.resolve(null),
    loadImage(wordmarkSrc),
    postPhotoURL ? loadImage(postPhotoURL) : Promise.resolve(null),
  ]);

  // Card width fits the viewport (never wider than the screen) but otherwise
  // matches the original card's proportions.
  const viewportW = (typeof window !== 'undefined' && window.innerWidth) || 400;
  const viewportH = (typeof window !== 'undefined' && window.innerHeight) || 800;
  const CARD_W = Math.max(280, Math.min(360, viewportW * 0.9));
  const MAX_H = viewportH * 0.85;

  const pad = 24;
  const contentW = CARD_W - pad * 2;
  const avatarSize = 60;

  // Measure with a throwaway canvas at 1x so layout math is in CSS pixels.
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  mctx.font = '500 21px Fraunces, serif';
  let quoteLines = wrapText(mctx, `"${gratitude}"`, contentW);
  const lineHeight = 27;

  const headerH = avatarSize + 26;
  const photoH = postImg ? Math.min(160, contentW * 0.62) : 0;
  const footerH = 30;
  const gaps = 14 + (postImg ? 12 : 0);

  // If the quote would push the card past the viewport height cap, clamp the
  // number of lines shown and ellipsize the last one, rather than growing forever.
  const available = MAX_H - pad * 2 - headerH - photoH - footerH - gaps;
  const maxLines = Math.max(2, Math.floor(available / lineHeight));
  if (quoteLines.length > maxLines) {
    let last = quoteLines[maxLines - 1];
    while (mctx.measureText(last + '…').width > contentW && last.length > 1) last = last.slice(0, -1);
    quoteLines = [...quoteLines.slice(0, maxLines - 1), last + '…'];
  }
  const quoteH = quoteLines.length * lineHeight;

  const CARD_H = Math.min(MAX_H, pad * 2 + headerH + quoteH + gaps + photoH + footerH);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Card background
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 20);
  ctx.fill();

  let y = pad + 6;

  // Avatar + "@username on:" (lighter weight) + wordmark
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, pad, y, avatarSize, avatarSize);
    ctx.restore();
  } else {
    ctx.fillStyle = accentColor + '22';
    ctx.beginPath();
    ctx.arc(pad + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.font = '600 24px Fraunces, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username[0] || '?').toUpperCase(), pad + avatarSize / 2, y + avatarSize / 2 + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const textX = pad + avatarSize + 14;
  ctx.fillStyle = '#8e8e93';
  ctx.font = '500 14px Inter, sans-serif'; // lighter than before
  ctx.fillText(`@${username} on:`, textX, y + 20);

  if (wordmarkImg) {
    const wmHeight = 24;
    const wmWidth = wordmarkImg.width * (wmHeight / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, textX, y + 28, wmWidth, wmHeight);
  } else {
    ctx.fillStyle = accentColor;
    ctx.font = '700 22px Fraunces, serif';
    ctx.fillText('Gratitude', textX, y + 48);
  }

  y += headerH;

  // Quote
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '500 21px Fraunces, serif';
  quoteLines.forEach((line, i) => ctx.fillText(line, pad, y + 6 + i * lineHeight));
  y += quoteH + 14;

  // Attached photo preview, if the post had one
  if (postImg) {
    const ratio = postImg.width / postImg.height;
    let drawW = contentW, drawH = drawW / ratio;
    if (drawH > photoH) { drawH = photoH; drawW = drawH * ratio; }
    const dx = pad + (contentW - drawW) / 2;
    ctx.save();
    roundRect(ctx, dx, y, drawW, drawH, 10);
    ctx.clip();
    ctx.drawImage(postImg, dx, y, drawW, drawH);
    ctx.restore();
    y += photoH + 12;
  }

  // Date, day-coded, bottom right
  ctx.fillStyle = '#8e8e93';
  ctx.font = '400 12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatDayCode(date), CARD_W - pad, CARD_H - pad + 6);
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
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
