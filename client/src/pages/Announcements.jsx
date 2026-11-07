import { useState, useEffect } from 'react';
import { api, canManage } from '../api';
import { useUser } from '../components/Layout';
import { Megaphone, Plus, Trash2, Pin, X } from 'lucide-react';

function AnnouncementForm({ courses, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !body) return;
    setSaving(true);
    const result = await api('/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, body, course_id: courseId || null, pinned }),
    });
    setSaving(false);
    if (result && !result.error) onSave(result);
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>New Announcement</h3>

      <label>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />

      <label>Message</label>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement..." rows={4} />

      <label>Course (optional — leave blank for general)</label>
      <select value={courseId} onChange={e => setCourseId(e.target.value)}>
        <option value="">General (all courses)</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
        <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
        Pin this announcement
      </label>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button type="submit" className="btn-primary-sm" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Posting...' : 'Post Announcement'}
        </button>
        <button type="button" className="btn-outline-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const user = useUser();

  useEffect(() => {
    api('/announcements').then(data => setItems(data || []));
    api('/courses').then(data => setCourses(data || []));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    await api(`/announcements/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(a => a.id !== id));
  }

  function handleSave(ann) {
    setItems(prev => [ann, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      <p className="page-label">Updates</p>
      <h1 className="page-title">Announcements</h1>
      <p className="page-subtitle">Official notices and updates for the class.</p>

      {canManage(user) && (
        <div style={{ marginBottom: '20px' }}>
          <button className="btn-primary-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : <><Plus size={14} /> New Announcement</>}
          </button>
        </div>
      )}

      {showForm && (
        <AnnouncementForm
          courses={courses}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm && (
        <div className="empty-state">
          <Megaphone size={48} />
          <p>No announcements yet.</p>
        </div>
      )}

      {items.map(a => (
        <div key={a.id} className="material-card" style={{ padding: '20px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {a.pinned ? <Pin size={14} style={{ color: 'var(--red)' }} /> : null}
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-serif)' }}>{a.title}</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {a.author_name} · {timeAgo(a.created_at)}
              </div>
            </div>
            {(a.author_id === user?.id || user?.role === 'lecturer') && (
              <button className="btn-danger-sm" style={{ padding: '6px 10px', flexShrink: 0 }} onClick={() => handleDelete(a.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
