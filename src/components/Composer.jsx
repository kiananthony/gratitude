import { useState, useRef } from 'react';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Composer() {
  const { addPost, settings } = useApp();
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(settings.defaultPostVisibility === 'public');
  const [image, setImage] = useState(null);       // File
  const [preview, setPreview] = useState(null);    // object URL
  const [busy, setBusy] = useState(false);
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
    setBusy(true);
    try {
      await addPost(text, connections ? isPublic : false, image);
      setText(''); clearImage();
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

      <div className="composer" style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xl)',
        padding: '4px 6px 4px 6px', minHeight: 52,
      }}>
        {connections ? (
          <button className="icon-btn" onClick={() => setIsPublic((v) => !v)} title={isPublic ? 'Public' : 'Private'}
            style={{ color: isPublic ? 'var(--accent)' : 'var(--label-secondary)', width: 40, height: 40 }}>
            <Icon name={isPublic ? 'eye' : 'eyeSlash'} size={20} />
          </button>
        ) : <div style={{ width: 8 }} />}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Describe your moment of gratitude here…"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--label)', fontSize: '1rem', padding: '10px 4px' }}
        />

        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
        <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Add photo"
          style={{ color: image ? 'var(--accent)' : 'var(--label-secondary)', width: 40, height: 40 }}>
          <Icon name="photo" size={19} />
        </button>

        <button className="icon-btn" onClick={send} disabled={empty || busy} title="Post"
          style={{ color: (empty || busy) ? 'var(--label-tertiary)' : 'var(--accent)', width: 40, height: 40, cursor: (empty || busy) ? 'default' : 'pointer' }}>
          <Icon name="send" size={20} filled />
        </button>
      </div>
    </div>
  );
}
