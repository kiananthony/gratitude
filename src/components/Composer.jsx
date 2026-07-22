import { useState, useRef } from 'react';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Composer() {
  const { addPost, settings, user, features, t } = useApp();
  const canAddPhoto = features.postImages;
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(settings.defaultPostVisibility === 'public');
  const [image, setImage] = useState(null);       // File
  const [preview, setPreview] = useState(null);    // object URL
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fileRef = useRef(null);
  const connections = settings.connectionsEnabled;
  const empty = !text.trim();

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null); setPreview(null);
  };

  const send = async () => {
    if (empty || busy) return;
    setBusy(true); setError(false);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
    try {
      await Promise.race([addPost(text, connections ? isPublic : false, image), timeout]);
      setText(''); clearImage();
    } catch {
      setError(true);
    } finally { setBusy(false); }
  };

  return (
    <div data-tour="composer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {preview && (
        <div style={{ position: 'relative', width: 92, height: 92, borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={clearImage} aria-label="Remove photo" style={{
            position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="xmark" size={12} />
          </button>
        </div>
      )}

      <div className={`composer-wrap${busy ? ' loading' : ''}`} style={{ position: 'relative', borderRadius: 'var(--r-xl)' }}>
      <div className="composer" style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xl)',
        padding: '4px 8px', minHeight: 52, position: 'relative', zIndex: 1,
        pointerEvents: busy ? 'none' : 'auto', opacity: busy ? 0.7 : 1,
      }}>
        {connections ? (
          <button className="icon-btn" onClick={() => setIsPublic((v) => !v)} title={isPublic ? 'Public' : 'Private'} disabled={busy}
            style={{ color: isPublic ? 'var(--accent)' : 'var(--label-secondary)', width: 36, height: 40 }}>
            <Icon name={isPublic ? 'eye' : 'eyeSlash'} size={20} />
          </button>
        ) : <div style={{ width: 6 }} />}

        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            disabled={busy}
            aria-label={t('composer.placeholder')}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--label)', fontSize: '1rem', padding: '10px 2px' }}
          />
          {empty && !busy && (
            <div aria-hidden style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              overflow: 'hidden', pointerEvents: 'none', color: 'var(--label-tertiary)', maskImage: 'linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent)',
            }}>
              <span className="composer-marquee" style={{ whiteSpace: 'nowrap', paddingLeft: 2 }}>
                {t('composer.placeholder')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          )}
          {busy && (
            <span className="muted" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', fontSize: '.95rem' }}>
              {t('composer.posting')}
            </span>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
        {canAddPhoto && (
          <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Add photo" disabled={busy}
            style={{ color: image ? 'var(--accent)' : 'var(--label-secondary)', width: 30, height: 40 }}>
            <Icon name="photo" size={19} />
          </button>
        )}

        <button className="icon-btn" onClick={send} disabled={empty || busy} title="Post"
          style={{ width: 42, height: 34, borderRadius: 999, marginLeft: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (empty || busy) ? 'transparent' : 'var(--accent)',
            color: (empty || busy) ? 'var(--label-tertiary)' : '#fff',
            cursor: (empty || busy) ? 'default' : 'pointer', transition: 'background .15s ease, color .15s ease' }}>
          <Icon name="send" size={19} filled />
        </button>
      </div>
      </div>
      {error && (
        <div className="muted" style={{ fontSize: '.8rem', color: 'var(--red)', margin: '6px 4px 0' }}>
          {t('composer.error')}
        </div>
      )}
    </div>
  );
}
