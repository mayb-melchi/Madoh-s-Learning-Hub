import { useState } from 'react';
import { api, logout } from '../api';
import { useUser } from '../components/Layout';
import { User, Shield, LogOut, Key, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../components/Layout';

export default function Profile() {
  const user = useUser();
  const [showPinForm, setShowPinForm] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

  async function handleChangePin(e) {
    e.preventDefault();
    setPinMsg('');
    setPinError('');
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    const verifyRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ full_name: user?.full_name, pin: currentPin }),
    });
    if (verifyRes?.error) {
      setPinError('Current PIN is incorrect.');
      return;
    }
    const res = await api('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ full_name: user?.full_name, pin: newPin }),
    });
    if (res?.error) {
      setPinError(res.error);
      return;
    }
    setPinMsg('PIN updated successfully.');
    setCurrentPin('');
    setNewPin('');
    setShowPinForm(false);
  }

  const { themePreference, setThemePreference } = useTheme();
  const isRepAnywhere = user?.courseRoles && Object.values(user.courseRoles).includes('course_rep');
  const roleBadgeColor = user?.role === 'lecturer' ? 'var(--red)' : isRepAnywhere ? 'var(--green-600)' : 'var(--gray-500)';
  const roleLabel = user?.role === 'lecturer' ? 'Lecturer' : isRepAnywhere ? 'Course Rep' : 'Student';

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System Default', icon: Monitor },
  ];

  return (
    <div>
      <div className="page-label">Account</div>
      <h1 className="page-title">Profile & Settings</h1>
      <p className="page-subtitle">View your account details and manage your PIN.</p>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{user?.avatar_initials}</div>
          <div className="profile-details">
            <h2>{user?.full_name}</h2>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user?.id}
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: roleBadgeColor,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                {roleLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="profile-field">
          <span className="label">Full name</span>
          <span className="value">{user?.full_name}</span>
        </div>
        <div className="profile-field">
          <span className="label">Student ID</span>
          <span className="value">{user?.id}</span>
        </div>
        <div className="profile-field">
          <span className="label">Role</span>
          <span className="value">{roleLabel}</span>
        </div>
        <div className="profile-field">
          <span className="label">Campus</span>
          <span className="value">Accra</span>
        </div>
        <div className="profile-field" style={{ borderBottom: 'none' }}>
          <span className="label">PIN</span>
          <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            ••••
            <button className="btn-outline-sm" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }} onClick={() => { setShowPinForm(!showPinForm); setPinMsg(''); setPinError(''); }}>
              <Key size={14} style={{ marginRight: '4px' }} /> Change
            </button>
          </span>
        </div>

        {pinMsg && <div style={{ background: 'var(--green-100)', color: 'var(--green-600)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginTop: '16px' }}>{pinMsg}</div>}

        {showPinForm && (
          <form onSubmit={handleChangePin} style={{ marginTop: '16px', padding: '16px', background: 'var(--gray-50)', borderRadius: '12px' }}>
            {pinError && <div className="error-msg">{pinError}</div>}
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '6px' }}>Current PIN</label>
            <input
              type="password"
              maxLength={4}
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '16px', fontFamily: 'var(--font-sans)', marginBottom: '12px', outline: 'none' }}
            />
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '6px' }}>New PIN</label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '16px', fontFamily: 'var(--font-sans)', marginBottom: '12px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn-primary-sm" style={{ flex: 1 }}>Update PIN</button>
              <button type="button" className="btn-outline-sm" onClick={() => setShowPinForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>Appearance</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setThemePreference(value)}
              style={{
                flex: '1 1 0',
                minWidth: '90px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 12px',
                borderRadius: '12px',
                border: themePreference === value ? '2px solid var(--red)' : '1px solid var(--border-color)',
                background: themePreference === value ? 'var(--blue-50)' : 'var(--bg-input)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: themePreference === value ? 600 : 400,
                color: themePreference === value ? 'var(--red)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button className="btn-outline-sm" onClick={logout} style={{ color: 'var(--red)', borderColor: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
