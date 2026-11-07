import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, setAuth } from '../api';
import { ArrowLeft } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isJoin = params.get('join') === 'true';

  const [step, setStep] = useState(isJoin ? 'join' : 'name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinCampus, setJoinCampus] = useState('');
  const [repCode, setRepCode] = useState('');
  const [repCodeStatus, setRepCodeStatus] = useState(null);

  async function handleNameSubmit(e) {
    e.preventDefault();
    setError('');
    const data = await api('/auth/lookup', { method: 'POST', body: JSON.stringify({ full_name: name }) });
    if (!data.found) { setError('Name not found on the class list.'); return; }
    if (!data.approved) { setError('Your account is pending approval.'); return; }
    setUserId(data.user_id);
    setStep(data.has_pin ? 'pin' : 'set-pin');
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    setError('');
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ full_name: name, pin }) });
    if (data.error) { setError(data.error); return; }
    setAuth(data.token, data.user);
    navigate('/dashboard');
  }

  async function handleSetPin(e) {
    e.preventDefault();
    setError('');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return; }
    const data = await api('/auth/set-pin', { method: 'POST', body: JSON.stringify({ full_name: name, pin }) });
    if (data.error) { setError(data.error); return; }
    setAuth(data.token, data.user);
    navigate('/dashboard');
  }

  async function validateRepCode(code) {
    if (!code || code.length < 4) { setRepCodeStatus(null); return; }
    const data = await api(`/rep-codes/validate/${encodeURIComponent(code.trim())}`);
    setRepCodeStatus(data);
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    const body = { full_name: joinName, email: joinEmail, campus: joinCampus };
    if (repCode.trim()) body.rep_code = repCode.trim();
    const data = await api('/auth/waitlist', { method: 'POST', body: JSON.stringify(body) });
    if (data?.error) { setError(data.error); return; }
    if (data?.auto_approved) {
      setStep('join-approved');
    } else {
      setStep('join-done');
    }
  }

  return (
    <div className="auth-page" style={{ position: 'relative' }}>
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>
      <div className="auth-logo">
        <div className="crest">ML</div>
        <h2>Madoh's Learning Hub</h2>
      </div>

      {step === 'name' && (
        <>
          <form className="auth-card" onSubmit={handleNameSubmit}>
            <h1>Welcome</h1>
            <p className="subtitle">Type your full name as it is on the class list. Any order works.</p>
            {error && <div className="error-msg">{error}</div>}
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" placeholder="e.g. Nana Akua Owusu" value={name} onChange={e => setName(e.target.value)} />
            <button type="submit" className="btn-primary">Continue</button>
          </form>
          <div className="auth-actions">
            <div className="auth-action-card">
              <h3>New here?</h3>
              <p>Joining us from another campus or session?</p>
              <button className="btn-outline" onClick={() => setStep('join')}>Join the waitlist</button>
            </div>
            <div className="auth-action-card">
              <h3>Already approved?</h3>
              <p>Type your full name above and press Continue. You will choose your own 4-digit PIN the first time.</p>
            </div>
          </div>
        </>
      )}

      {step === 'pin' && (
        <form className="auth-card" onSubmit={handlePinSubmit}>
          <h1>Enter your PIN</h1>
          <p className="subtitle">Welcome back. Enter your 4-digit PIN.</p>
          {error && <div className="error-msg">{error}</div>}
          <label htmlFor="pin">4-digit PIN</label>
          <input id="pin" type="password" maxLength={4} placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="btn-primary">Sign in</button>
          <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => { setStep('name'); setPin(''); }}>Back</button>
        </form>
      )}

      {step === 'set-pin' && (
        <form className="auth-card" onSubmit={handleSetPin}>
          <h1>Choose a PIN</h1>
          <p className="subtitle">First time signing in. Choose a 4-digit PIN you'll remember.</p>
          {error && <div className="error-msg">{error}</div>}
          <label htmlFor="new-pin">New 4-digit PIN</label>
          <input id="new-pin" type="password" maxLength={4} placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="btn-primary">Set PIN & sign in</button>
        </form>
      )}

      {step === 'join' && (
        <form className="auth-card" onSubmit={handleJoin}>
          <h1>Join the waitlist</h1>
          <p className="subtitle">Request access to the class learning hub.</p>
          {error && <div className="error-msg">{error}</div>}
          <label htmlFor="wl-name">Full name</label>
          <input id="wl-name" type="text" placeholder="Your full name" value={joinName} onChange={e => setJoinName(e.target.value)} style={{ marginBottom: 16 }} />
          <label htmlFor="wl-email">Email (optional)</label>
          <input id="wl-email" type="email" placeholder="you@example.com" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} style={{ marginBottom: 16 }} />
          <label htmlFor="wl-campus">Campus / Session</label>
          <select id="wl-campus" value={joinCampus} onChange={e => setJoinCampus(e.target.value)} style={{ marginBottom: 16 }}>
            <option value="">Select...</option>
            <option value="Accra">Accra</option>
            <option value="Kumasi">Kumasi</option>
            <option value="Tamale">Tamale</option>
          </select>
          <label htmlFor="wl-repcode">Rep code (optional)</label>
          <input id="wl-repcode" type="text" placeholder="e.g. REP-ADR-A1B2C3" value={repCode} onChange={e => { setRepCode(e.target.value); validateRepCode(e.target.value); }} style={{ marginBottom: 4 }} />
          {repCodeStatus && (
            <div style={{ fontSize: '13px', marginBottom: 12, color: repCodeStatus.valid ? 'var(--green-600)' : 'var(--red)' }}>
              {repCodeStatus.valid ? `Valid — course rep for ${repCodeStatus.course_title}` : 'Invalid or already used code'}
            </div>
          )}
          {!repCodeStatus && repCode && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>Validating...</div>}
          {!repCode && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>Got a rep code from your lecturer? Enter it to get instant access as a course rep.</div>}
          <button type="submit" className="btn-primary">{repCode.trim() ? 'Join as Course Rep' : 'Submit request'}</button>
          <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => setStep('name')}>Back to sign in</button>
        </form>
      )}

      {step === 'join-done' && (
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Request submitted</h1>
          <p className="subtitle">You'll be notified when your access is approved.</p>
          <button className="btn-primary" onClick={() => setStep('name')}>Back to sign in</button>
        </div>
      )}

      {step === 'join-approved' && (
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>You're in!</h1>
          <p className="subtitle">Your account has been created as a course rep. Sign in with your name to set your PIN.</p>
          <button className="btn-primary" onClick={() => setStep('name')}>Sign in now</button>
        </div>
      )}
    </div>
  );
}
