// Renders a post as a shareable PNG sized for an Instagram story (9:16).
// Layout: poster avatar + Gratitude wordmark above their @username, the quoted
// gratitude text, the attached photo (if any) filling the remaining height
// (cropped), and a day-coded date at the bottom.

const STORY_W = 1080;
const STORY_H = 1920;
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
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
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
  const [avatarImg, postImg, wordmarkImg] = await Promise.all([
    photoURL ? loadImage(photoURL) : Promise.resolve(null),
    postPhotoURL ? loadImage(postPhotoURL) : Promise.resolve(null),
    wordmarkSrc ? loadImage(wordmarkSrc) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const pad = 96;
  const contentW = STORY_W - pad * 2;
  const avatarSize = 132;

  // ---- Header: avatar + (wordmark above @username) ----
  let y = 150;
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, pad, y, avatarSize, avatarSize);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(pad + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor; ctx.lineWidth = 3; ctx.stroke();
  } else {
    ctx.fillStyle = accentColor + '22';
    ctx.beginPath();
    ctx.arc(pad + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.font = '600 60px Fraunces, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((username[0] || '?').toUpperCase(), pad + avatarSize / 2, y + avatarSize / 2 + 4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  const textX = pad + avatarSize + 34;
  // Wordmark logo above the username
  if (wordmarkImg) {
    const wmH = 40;
    const wmW = wordmarkImg.width * (wmH / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, textX, y + 30, wmW, wmH);
  }
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '600 52px Fraunces, serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`@${username}`, textX, y + 118);

  y += avatarSize + 70; // margin below header before the quote

  // ---- Quote ----
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '500 56px Fraunces, serif';
  const lineHeight = 74;
  let quoteLines = wrapText(ctx, `"${gratitude}"`, contentW);
  // With a photo, cap the quote so the image gets room; without, allow more.
  const maxQuoteLines = postImg ? 5 : 12;
  if (quoteLines.length > maxQuoteLines) {
    let last = quoteLines[maxQuoteLines - 1];
    while (ctx.measureText(last + '…').width > contentW && last.length > 1) last = last.slice(0, -1);
    quoteLines = [...quoteLines.slice(0, maxQuoteLines - 1), last + '…'];
  }
  quoteLines.forEach((line, i) => ctx.fillText(line, pad, y + i * lineHeight));
  y += quoteLines.length * lineHeight + 40;

  // ---- Attached photo: fill remaining height down to the date, cropped ----
  const dateY = STORY_H - 90;
  if (postImg) {
    const photoTop = y;
    const photoBottom = dateY - 50;
    const photoH = Math.max(200, photoBottom - photoTop);
    ctx.save();
    roundRect(ctx, pad, photoTop, contentW, photoH, 28);
    ctx.clip();
    // cover
    const scale = Math.max(contentW / postImg.width, photoH / postImg.height);
    const dw = postImg.width * scale, dh = postImg.height * scale;
    const dx = pad + (contentW - dw) / 2, dy = photoTop + (photoH - dh) / 2;
    ctx.drawImage(postImg, dx, dy, dw, dh);
    ctx.restore();
  }

  // ---- Date (day-coded), bottom center ----
  ctx.fillStyle = '#8e8e93';
  ctx.font = '400 34px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatDayCode(date), STORY_W / 2, dateY);
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
