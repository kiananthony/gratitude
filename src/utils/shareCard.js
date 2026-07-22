// Renders a post as a shareable PNG image, matching the iOS "share as image" card:
// a white 340x360 card with the poster's avatar, "@username on:" + the Gratitude
// wordmark, the quoted gratitude text, and the date bottom-right.

const CARD_W = 340;
const CARD_H = 360;
const SCALE = 3; // render at 3x for a crisp share image

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // don't fail the whole card if a photo can't load
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

export async function generateShareCard({ username, gratitude, date, photoURL, wordmarkSrc, accentColor = '#3a9bde' }) {
  await document.fonts.ready;
  const [avatarImg, wordmarkImg] = await Promise.all([
    photoURL ? loadImage(photoURL) : Promise.resolve(null),
    loadImage(wordmarkSrc),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Card background
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 20);
  ctx.fill();

  const pad = 24;
  let y = pad + 12;

  // Avatar (or initial fallback) + "@username on:" + wordmark
  const avatarSize = 64;
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
    ctx.font = '600 26px Fraunces, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username[0] || '?').toUpperCase(), pad + avatarSize / 2, y + avatarSize / 2 + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const textX = pad + avatarSize + 14;
  ctx.fillStyle = '#8e8e93';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillText(`@${username} on:`, textX, y + 22);

  if (wordmarkImg) {
    const wmHeight = 26;
    const wmWidth = wordmarkImg.width * (wmHeight / wordmarkImg.height);
    ctx.drawImage(wordmarkImg, textX, y + 32, wmWidth, wmHeight);
  } else {
    ctx.fillStyle = accentColor;
    ctx.font = '700 24px Fraunces, serif';
    ctx.fillText('Gratitude', textX, y + 54);
  }

  y += avatarSize + 30;

  // Quote
  ctx.fillStyle = '#1c1c1e';
  ctx.font = '500 21px Fraunces, serif';
  const lines = wrapText(ctx, `"${gratitude}"`, CARD_W - pad * 2);
  const lineHeight = 28;
  lines.slice(0, 6).forEach((line, i) => ctx.fillText(line, pad, y + 6 + i * lineHeight));

  // Date, bottom right
  ctx.fillStyle = '#8e8e93';
  ctx.font = '400 12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date, CARD_W - pad, CARD_H - pad + 4);
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
