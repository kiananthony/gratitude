import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { GAButton, GATextField } from '../components/ui.jsx';
import wordmark from '../assets/wordmark.png';

const validators = {
  email: (v) => ({ isValid: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), errorMessage: 'Please enter a valid email address' }),
  password: (v) => ({ isValid: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v), errorMessage: 'At least 8 characters with letters and numbers' }),
};

export default function Auth() {
  const { signIn, signUp, resetPassword } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const canSubmit = !busy && (isLogin
    ? username.trim() && password.length >= 1
    : username.trim() && validators.email(email).isValid && validators.password(password).isValid && confirm === password);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError(null); setNotice(null);
    const err = isLogin
      ? await signIn(username, password)
      : await signUp({ screenName: username, email, password });
    setBusy(false);
    if (err) setError(err);
  };

  const forgot = async () => {
    const target = email || username;
    if (!target.includes('@')) { setError('Enter your email above, then tap Forgot password.'); return; }
    setBusy(true); setError(null);
    const err = await resetPassword(target);
    setBusy(false);
    if (err) setError(err); else setNotice('Password reset email sent. Check your inbox.');
  };

  const swap = () => { setIsLogin((v) => !v); setError(null); setNotice(null); };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <img src={wordmark} alt="Gratitude" style={{ height: 44, width: 'auto' }} />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--label-secondary)', margin: 0 }}>
          {isLogin ? 'Log your gratitude today' : 'Sign up for a new account'}
        </p>

        <GATextField
          placeholder={isLogin ? 'Username or e-mail' : 'Username'}
          value={username} onChange={setUsername} autoComplete="username" onEnter={submit}
        />
        {!isLogin && (
          <GATextField placeholder="E-mail" value={email} onChange={setEmail} type="email"
            validate={validators.email} autoComplete="email" />
        )}
        <GATextField placeholder="Password" value={password} onChange={setPassword} secure
          validate={!isLogin ? validators.password : undefined} autoComplete={isLogin ? 'current-password' : 'new-password'} onEnter={submit} />
        {!isLogin && (
          <GATextField placeholder="Confirm password" value={confirm} onChange={setConfirm} secure
            validate={(v) => ({ isValid: v === password, errorMessage: 'Passwords do not match' })} />
        )}

        {error && (
          <div style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--red)', borderRadius: 12, padding: '10px 14px', fontSize: '.85rem' }}>{error}</div>
        )}
        {notice && (
          <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 12, padding: '10px 14px', fontSize: '.85rem' }}>{notice}</div>
        )}

        <div style={{ marginTop: 2 }}>
          <GAButton text={busy ? 'Please wait…' : (isLogin ? 'Sign in' : 'Sign up')} onClick={submit} disabled={!canSubmit} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <GAButton style="text" text={isLogin ? 'Create an account' : 'Have an account? Sign in'} onClick={swap} disabled={busy} />
          {isLogin && <GAButton style="text" text="Forgot password" color="var(--red)" onClick={forgot} disabled={busy} />}
        </div>

        <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--label-tertiary)', marginTop: 4 }}>
          Your account is shared with the Gratitude iOS app.
        </p>
      </div>
    </div>
  );
}
