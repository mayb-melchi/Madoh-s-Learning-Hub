import { useState, useEffect } from 'react';
import { api, canManage } from '../api';
import { useUser } from '../components/Layout';
import { Calendar, ExternalLink, Trash2, Edit3, X } from 'lucide-react';

function TutorialForm({ courses, initial, onSave, onCancel }) {
  const [courseId, setCourseId] = useState(initial?.course_id || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [date, setDate] = useState(initial?.date || '');
  const [link, setLink] = useState(initial?.link || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!courseId || !title) return;
    setSaving(true);
    const body = { course_id: courseId, title, description, date, link };
    const result = initial?.id
      ? await api(`/tutorials/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) })
      : await api('/tutorials', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (result && !result.error) onSave(result);
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        {initial?.id ? 'Edit Tutorial' : 'Create Tutorial'}
      </h3>

      <label>Course</label>
      <select value={courseId} onChange={e => setCourseId(e.target.value)}>
        <option value="">Select a course</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>

      <label>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tutorial title" />

      <label>Description (optional)</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will be covered" />

      <label>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />

      <label>Link (WhatsApp group, Google Meet, etc.)</label>
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." />

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button type="submit" className="btn-primary-sm" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving...' : initial?.id ? 'Update' : 'Create'}
        </button>
        <button type="button" className="btn-outline-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Tutorials() {
  const [tutorials, setTutorials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTutorial, setEditTutorial] = useState(null);
  const [filter, setFilter] = useState('');
  const user = useUser();

  useEffect(() => {
    const params = filter ? `?course_id=${filter}` : '';
    api(`/tutorials${params}`).then(data => setTutorials(data || []));
  }, [filter]);

  useEffect(() => {
    api('/courses').then(data => setCourses(data || []));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this tutorial?')) return;
    await api(`/tutorials/${id}`, { method: 'DELETE' });
    setTutorials(prev => prev.filter(t => t.id !== id));
  }

  function handleSave(t) {
    if (editTutorial) {
      setTutorials(prev => prev.map(x => x.id === t.id ? t : x));
      setEditTutorial(null);
    } else {
      setTutorials(prev => [t, ...prev]);
    }
    setShowForm(false);
  }

  return (
    <div>
      <div className="page-label">Sessions</div>
      <h1 className="page-title">Tutorials</h1>
      <p className="page-subtitle">Upcoming tutorial sessions — tap Join to open the group link.</p>

      {canManage(user) && (
        <div style={{ marginBottom: '20px' }}>
          <button className="btn-primary-sm" onClick={() => { setShowForm(!showForm); setEditTutorial(null); }}>
            {showForm ? 'Cancel' : '+ Create Tutorial'}
          </button>
        </div>
      )}

      {(showForm || editTutorial) && (
        <TutorialForm
          courses={courses}
          initial={editTutorial}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTutorial(null); }}
        />
      )}

      {courses.length > 1 && (
        <div className="filter-row">
          <button className={`filter-pill ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
          {courses.map(c => (
            <button key={c.id} className={`filter-pill ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      {tutorials.map(t => (
        <div key={t.id} className="tutorial-card">
          <div style={{ flex: 1 }}>
            <h3>{t.title}</h3>
            <div className="tutorial-details">
              <span>{t.course_title}</span>
              {t.date && <span> · {new Date(t.date).toLocaleDateString()}</span>}
              {t.description && <div style={{ marginTop: '4px', color: 'var(--gray-500)', fontSize: '13px' }}>{t.description}</div>}
            </div>
            {canManage(user) && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button className="btn-outline-sm" style={{ padding: '6px 12px', minHeight: '36px' }} onClick={() => { setEditTutorial(t); setShowForm(true); }}>
                  <Edit3 size={14} /> Edit
                </button>
                <button className="btn-danger-sm" style={{ padding: '6px 12px', minHeight: '36px' }} onClick={() => handleDelete(t.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
          {t.link && (
            <a href={t.link} target="_blank" rel="noopener noreferrer" className="btn-join">
              <ExternalLink size={14} /> Join
            </a>
          )}
        </div>
      ))}

      {tutorials.length === 0 && (
        <div className="empty-state">
          <Calendar size={48} />
          <p>No tutorials scheduled yet.</p>
        </div>
      )}
    </div>
  );
}
