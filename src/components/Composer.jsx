import { useState } from 'react';
import Icon from './Icon.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Composer() {
  const { addPost, settings } = useApp();
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(settings.defaultPostVisibility === 'public');
  const connections = settings.connectionsEnabled;
  const empty = !text.trim();

  const send = () => {
    if (empty) return;
    addPost(text, connections ? isPublic : false);
    setText('');
  };

  return (
    <div className="composer" style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--fill)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xl)',
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

      <button className="icon-btn" onClick={send} disabled={empty} title="Post"
        style={{ color: empty ? 'var(--label-tertiary)' : 'var(--accent)', width: 40, height: 40, cursor: empty ? 'default' : 'pointer' }}>
        <Icon name="send" size={20} filled />
      </button>
    </div>
  );
}
