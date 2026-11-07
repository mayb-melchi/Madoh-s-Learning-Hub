import { useState, useEffect } from 'react';
import { api } from '../api';
import { MessageSquare, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function Discussions() {
  const [discussions, setDiscussions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    api('/discussions').then(setDiscussions);
    api('/courses').then(setCourses);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const d = await api('/discussions', { method: 'POST', body: JSON.stringify({ title, body, course_id: courseId }) });
    setDiscussions(prev => [d, ...prev]);
    setTitle(''); setBody(''); setCourseId(''); setShowForm(false);
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!replies[id]) {
      const r = await api(`/discussions/${id}/replies`);
      setReplies(prev => ({ ...prev, [id]: r }));
    }
  }

  async function handleReply(discussionId) {
    if (!replyText.trim()) return;
    const r = await api(`/discussions/${discussionId}/replies`, { method: 'POST', body: JSON.stringify({ body: replyText }) });
    setReplies(prev => ({ ...prev, [discussionId]: [...(prev[discussionId] || []), r] }));
    setDiscussions(prev => prev.map(d => d.id === discussionId ? { ...d, replies_count: (d.replies_count || 0) + 1 } : d));
    setReplyText('');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p className="page-label">Community</p>
          <h1 className="page-title">Discussions</h1>
          <p className="page-subtitle">Ask questions, share insights, and learn together.</p>
        </div>
        <button className="btn-primary-sm" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Discussion
        </button>
      </div>

      {showForm && (
        <form className="discussion-form" onSubmit={handleCreate}>
          <input placeholder="Discussion title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="What's on your mind?" value={body} onChange={e => setBody(e.target.value)} />
          <select value={courseId} onChange={e => setCourseId(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
            <option value="">Select a course (optional)</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn-primary-sm">Post Discussion</button>
            <button type="button" className="btn-outline-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {discussions.map(d => (
        <div key={d.id} className="discussion-card" onClick={() => toggleExpand(d.id)}>
          <h3>{d.title}</h3>
          <p>{d.body}</p>
          <div className="discussion-meta">
            <span>By {d.author_name} · {d.course_title}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={14} /> {d.replies_count} replies
              {expanded === d.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>

          {expanded === d.id && (
            <div className="discussion-replies" onClick={e => e.stopPropagation()}>
              {(replies[d.id] || []).length === 0 && <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No replies yet. Be the first!</p>}
              {(replies[d.id] || []).map(r => (
                <div key={r.id} className="reply-item">
                  <div className="reply-author">{r.author_name}</div>
                  <div className="reply-text">{r.body}</div>
                  <div className="reply-time">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReply(d.id)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
                />
                <button className="btn-primary-sm" onClick={() => handleReply(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
