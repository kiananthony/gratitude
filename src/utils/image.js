// Downscale + re-encode an image on the client before upload, so we store small
// JPEGs (tens of KB) instead of multi-megabyte camera originals. Falls back to
// the original file if anything goes wrong, so an upload never fails because of
// compression.

async function loadBitmap(file) {
  // createImageBitmap is fastest and can honor EXIF orientation; fall back to an
  // <img> + object URL where it's unavailable.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }
}

/**
 * @param {File} file
 * @param {{maxDim?:number, quality?:number, maxBytes?:number}} opts
 *   maxDim  , longest edge in px (image is scaled down to fit)
 *   quality , starting JPEG quality (0–1)
 *   maxBytes, if set, quality is stepped down until the result fits (best effort)
 * @returns {Promise<File>} a compressed JPEG File (or the original on failure)
 */
export async function compressImage(file, { maxDim = 1280, quality = 0.82, maxBytes = 0 } = {}) {
  if (!file || !(file.type || '').startsWith('image/')) return file;
  try {
    const bitmap = await loadBitmap(file);
    const srcW = bitmap.width, srcH = bitmap.height;
    if (!srcW || !srcH) return file;

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    const toBlob = (q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
    let q = quality;
    let blob = await toBlob(q);
    // Optionally step quality down to hit a size budget.
    while (blob && maxBytes && blob.size > maxBytes && q > 0.4) {
      q -= 0.12;
      blob = await toBlob(q);
    }
    if (!blob) return file;

    const base = (file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
