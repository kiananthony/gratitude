// Renders a post as a shareable PNG on the app's brand gradient.
// Sizing: 1080 wide; height grows to fit the content and is capped at a vertical
// story (1920). Layout #3: Gratitude wordmark → photo (hero) → avatar badge on
// the photo's edge → @username → quoted gratitude → date → gratitude-plus.app.
// Posts without a photo fall back to a centered stack.

const W = 1080;
const MAX_H = 1920;
const BL = [54, 120, 224];   // top-right: deep blue
const MID = [60, 200, 246];  // middle: bright cyan
const TR = [110, 226, 206];  // bottom-left: teal
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
  const cx = W / 2;
  const LINK = 'gratitude-plus.app';

  // Shared metrics.
  const topPad = 90;
  const wmH = wordmarkImg ? 84 : 0;
  const gapAfterWm = wordmarkImg ? 56 : 34;
  const userFont = 44, userH = 56;
  const gapAfterUser = 48;
  const quoteFont = 52, quoteLH = 72;
  const gapBeforeDate = 48;
  const dateFont = 32, dateH = 40;
  const gapLink = 12, linkFont = 30, linkH = 38;
  const bottomPad = 86;
  const bottomBlock = gapBeforeDate + dateH + gapLink + linkH + bottomPad;

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `italic 400 ${quoteFont}px Fraunces, Georgia, serif`;

  const drawAvatar = (ctx, ccx, ccy, r, ringW) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, Math.PI * 2); ctx.clip();
    if (avatarImg) {
      const s = Math.max((r * 2) / avatarImg.width, (r * 2) / avatarImg.height);
      const dw = avatarImg.width * s, dh = avatarImg.height * s;
      ctx.drawImage(avatarImg, ccx - dw / 2, ccy - dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ccx - r, ccy - r, r * 2, r * 2);
      ctx.fillStyle = '#5aa8d6';
      ctx.font = `600 ${Math.round(r * 0.95)}px Fraunces, Georgia, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((username[0] || '?').toUpperCase(), ccx, ccy + 2);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = ringW; ctx.stroke();
  };
  const drawBottom = (ctx, H) => {
      ctx.textAlign = 'center';
      // Link pinned to the bottom; date sits a clear gap above it.
      const linkBaseline = H - bottomPad;
      const dateBaseline = linkBaseline - linkH - gapLink;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `400 ${dateFont}px Fraunces, Georgia, serif`;
      ctx.fillText(formatDayCode(date), cx, dateBaseline);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `400 ${linkFont}px Fraunces, Georgia, serif`;
      ctx.fillText(LINK, cx, linkBaseline);
      ctx.textAlign = 'left';
  };
  const paintBg = (ctx, H) => {
    const g = ctx.createLinearGradient(W, 0, 0, H);
    g.addColorStop(0, `rgb(${TR.join(',')})`);
    g.addColorStop(0.5, `rgb(${MID.join(',')})`);
    g.addColorStop(1, `rgb(${BL.join(',')})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const drawWordmark = (ctx, y) => {
    if (!wordmarkImg) return;
    const wmW = wordmarkImg.width * (wmH / wordmarkImg.height);
    ctx.drawImage(whiteMask(wordmarkImg, wmW, wmH), cx - wmW / 2, y, wmW, wmH);
  };
  const drawQuote = (ctx, lines, y) => {
    ctx.font = `italic 400 ${quoteFont}px Fraunces, Georgia, serif`;
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => ctx.fillText(line, cx, y + quoteFont + i * quoteLH));
    ctx.textAlign = 'left';
  };

  let canvas = document.createElement('canvas');
  canvas.width = W;

  if (postImg) {
    // ---- Layout #3: photo hero + avatar badge overlapping the photo's edge ----
    const r = 98, ringW = 4;
    const gapAfterAvatar = 34;
    let quoteLines = ellipsize(measure, wrapText(measure, `“${gratitude}”`, contentW), 5, contentW);
    let quoteH = quoteLines.length * quoteLH;

    const fixedTop = topPad + wmH + gapAfterWm;
    const belowPhoto = r + gapAfterAvatar + userH + gapAfterUser + quoteH + bottomBlock;
    const maxPhotoH = MAX_H - fixedTop - belowPhoto;
    const photoH = Math.max(320, Math.min(860, maxPhotoH));
    const H = Math.round(fixedTop + photoH + belowPhoto);

    canvas.height = Math.min(MAX_H, H);
    const ctx = canvas.getContext('2d');
    paintBg(ctx, canvas.height);

    let y = topPad;
    drawWordmark(ctx, y); y += wmH + gapAfterWm;
    const photoTop = y;
    ctx.save();
    roundRect(ctx, pad, photoTop, contentW, photoH, 32); ctx.clip();
    const s = Math.max(contentW / postImg.width, photoH / postImg.height);
    const dw = postImg.width * s, dh = postImg.height * s;
    ctx.drawImage(postImg, cx - dw / 2, photoTop + photoH / 2 - dh / 2, dw, dh);
    ctx.restore();
    roundRect(ctx, pad, photoTop, contentW, photoH, 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 2; ctx.stroke();

    const badgeCy = photoTop + photoH;
    drawAvatar(ctx, cx, badgeCy, r, ringW);
    ctx.beginPath(); ctx.arc(cx, badgeCy, r + 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    y = badgeCy + r + gapAfterAvatar;

    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `500 ${userFont}px Fraunces, Georgia, serif`;
    ctx.fillText(`@${username}`, cx, y + userFont); ctx.textAlign = 'left';
    y += userH + gapAfterUser;

    drawQuote(ctx, quoteLines, y);
    drawBottom(ctx, canvas.height);
  } else {
    // ---- Fallback: centered stack (no photo) ----
    const avatar = 200, ringW = 4;
    const gapAfterAvatar = 30;
    const fixedTop = topPad + wmH + gapAfterWm + avatar + gapAfterAvatar + userH + gapAfterUser;
    const middleMax = MAX_H - fixedTop - bottomBlock;
    let quoteLines = ellipsize(measure, wrapText(measure, `“${gratitude}”`, contentW), 13, contentW);
    if (quoteLines.length * quoteLH > middleMax) {
      quoteLines = ellipsize(measure, quoteLines, Math.max(1, Math.floor(middleMax / quoteLH)), contentW);
    }
    const quoteH = quoteLines.length * quoteLH;
    const H = Math.min(MAX_H, Math.round(fixedTop + quoteH + bottomBlock));

    canvas.height = H;
    const ctx = canvas.getContext('2d');
    paintBg(ctx, H);

    let y = topPad;
    drawWordmark(ctx, y); y += wmH + gapAfterWm;
    drawAvatar(ctx, cx, y + avatar / 2, avatar / 2, ringW);
    ctx.beginPath(); ctx.arc(cx, y + avatar / 2, avatar / 2 + 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    y += avatar + gapAfterAvatar;

    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `500 ${userFont}px Fraunces, Georgia, serif`;
    ctx.fillText(`@${username}`, cx, y + userFont); ctx.textAlign = 'left';
    y += userH + gapAfterUser;

    drawQuote(ctx, quoteLines, y);
    drawBottom(ctx, H);
  }

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