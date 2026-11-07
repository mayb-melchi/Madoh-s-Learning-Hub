import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiFileUrl, canManage } from '../api';
import { useUser } from '../components/Layout';
import { ArrowLeft, FileText, ScrollText, Calendar, Download, ExternalLink, Users, Shield, ShieldOff, Copy, Plus, Trash2, Upload } from 'lucide-react';
import UploadForm from '../components/UploadForm';

function ManageReps({ courseId }) {
  const [members, setMembers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    Promise.all([
      api(`/courses/${courseId}/members`),
      api(`/rep-codes?course_id=${courseId}`),
    ]).then(([m, c]) => {
      setMembers(m || []);
      setCodes(c || []);
      setLoading(false);
    });
  }, [courseId]);

  async function generateCode() {
    const data = await api('/rep-codes', { method: 'POST', body: JSON.stringify({ course_id: courseId }) });
    if (data?.code) setCodes(prev => [...prev, data]);
  }

  async function promote(userId) {
    await api(`/courses/${courseId}/promote`, { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, courseRole: 'course_rep' } : m));
  }

  async function revoke(userId) {
    await api(`/courses/${courseId}/revoke`, { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, courseRole: null } : m));
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  const reps = members.filter(m => m.courseRole === 'course_rep');
  const students = members.filter(m => m.role === 'student' && m.courseRole !== 'course_rep');
  const unusedCodes = codes.filter(c => !c.used);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: 0 }}>Course Reps</h3>
        <button className="btn-primary-sm" onClick={generateCode} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={14} /> Generate Rep Code
        </button>
      </div>

      {unusedCodes.length > 0 && (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Unused Rep Codes</div>
          {unusedCodes.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', gap: '8px' }}>
              <code style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{c.code}</code>
              <button className="btn-outline-sm" onClick={() => copyCode(c.code)} style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Copy size={12} /> {copiedCode === c.code ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      {reps.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Current Reps</div>
          {reps.map(m => (
            <div key={m.id} className="material-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{m.avatar_initials}</div>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.full_name}</span>
              </div>
              <button className="btn-outline-sm" onClick={() => revoke(m.id)} style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldOff size={12} /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Students</div>
          {students.map(m => (
            <div key={m.id} className="material-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{m.avatar_initials}</div>
                <span style={{ color: 'var(--text-primary)' }}>{m.full_name}</span>
              </div>
              <button className="btn-outline-sm" onClick={() => promote(m.id)} style={{ color: 'var(--green-600)', borderColor: 'var(--green-600)', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} /> Make Rep
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser();
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState('materials');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('material');

  useEffect(() => {
    api(`/courses/${id}`).then(data => {
      if (data?.error) navigate('/courses');
      else setCourse(data);
    });
  }, [id]);

  if (!course) return <div className="empty-state"><p>Loading...</p></div>;

  const materials = (course.materials || []).filter(m => m.category === 'material');
  const pastQuestions = (course.materials || []).filter(m => m.category === 'past_question');
  const tutorials = course.tutorials || [];

  function handleDownload(m) {
    api(`/materials/${m.id}/download`, { method: 'POST' });
    if (m.file_url) window.open(m.file_url, '_blank');
  }

  async function handleDelete(materialId) {
    if (!confirm('Delete this item?')) return;
    await api(`/materials/${materialId}`, { method: 'DELETE' });
    setCourse(prev => ({ ...prev, materials: (prev.materials || []).filter(m => m.id !== materialId) }));
  }

  function handleUploaded(m) {
    setCourse(prev => ({ ...prev, materials: [m, ...(prev.materials || [])] }));
    setShowUpload(false);
  }

  return (
    <div>
      <button className="btn-outline-sm" onClick={() => navigate('/courses')} style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <ArrowLeft size={14} /> Back to Courses
      </button>

      <div className="page-label">{course.code}</div>
      <h1 className="page-title">{course.title}</h1>
      <p className="page-subtitle">{course.description}</p>

      <div className="tabs">
        <button className={`tab ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>
          Materials ({materials.length})
        </button>
        <button className={`tab ${tab === 'past_questions' ? 'active' : ''}`} onClick={() => setTab('past_questions')}>
          Past Questions ({pastQuestions.length})
        </button>
        <button className={`tab ${tab === 'tutorials' ? 'active' : ''}`} onClick={() => setTab('tutorials')}>
          Tutorials ({tutorials.length})
        </button>
        {user?.role === 'lecturer' && (
          <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>
            <Users size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Manage
          </button>
        )}
      </div>

      {tab === 'materials' && (
        <div>
          {canManage(user, id) && (
            <div style={{ marginBottom: '16px' }}>
              <button className="btn-primary-sm" onClick={() => { setUploadCategory('material'); setShowUpload(!showUpload); }}>
                {showUpload && uploadCategory === 'material' ? 'Cancel' : '+ Upload Material'}
              </button>
            </div>
          )}
          {showUpload && uploadCategory === 'material' && <UploadForm category="material" defaultCourseId={id} onUploaded={handleUploaded} />}
          {materials.length === 0 && <div className="empty-state"><FileText size={32} /><p>No materials uploaded yet.</p></div>}
          {materials.map(m => (
            <div key={m.id} className="material-card">
              <div className="material-header">
                <div className="material-icon"><FileText size={20} /></div>
                <div className="material-info">
                  <h3>{m.title}</h3>
                  <div className="material-meta">
                    <span className="uploader">{m.uploader_name}</span> · {m.filename}
                  </div>
                </div>
              </div>
              {m.description && <div className="material-description">{m.description}</div>}
              <div className="material-footer">
                <div className="material-actions">
                  <button className="btn-download" onClick={() => handleDownload(m)}>
                    <Download size={14} /> Download
                  </button>
                  {canManage(user, id) && (
                    <button className="btn-danger-sm" onClick={() => handleDelete(m.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
                <span className="download-count">{m.downloads || 0} downloads</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'past_questions' && (
        <div>
          {canManage(user, id) && (
            <div style={{ marginBottom: '16px' }}>
              <button className="btn-primary-sm" onClick={() => { setUploadCategory('past_question'); setShowUpload(!showUpload); }}>
                {showUpload && uploadCategory === 'past_question' ? 'Cancel' : '+ Upload Past Question'}
              </button>
            </div>
          )}
          {showUpload && uploadCategory === 'past_question' && <UploadForm category="past_question" defaultCourseId={id} onUploaded={handleUploaded} />}
          {pastQuestions.length === 0 && <div className="empty-state"><ScrollText size={32} /><p>No past questions uploaded yet.</p></div>}
          {pastQuestions.map(m => (
            <div key={m.id} className="material-card">
              <div className="material-header">
                <div className="material-icon"><ScrollText size={20} /></div>
                <div className="material-info">
                  <h3>{m.title}</h3>
                  <div className="material-meta">
                    <span className="uploader">{m.uploader_name}</span> · {m.filename}
                  </div>
                </div>
              </div>
              {m.description && <div className="material-description">{m.description}</div>}
              <div className="material-footer">
                <div className="material-actions">
                  <button className="btn-download" onClick={() => handleDownload(m)}>
                    <Download size={14} /> Download
                  </button>
                  {canManage(user, id) && (
                    <button className="btn-danger-sm" onClick={() => handleDelete(m.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
                <span className="download-count">{m.downloads || 0} downloads</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tutorials' && (
        <div>
          {tutorials.length === 0 && <div className="empty-state"><Calendar size={32} /><p>No tutorials scheduled yet.</p></div>}
          {tutorials.map(t => (
            <div key={t.id} className="tutorial-card">
              <div>
                <h3>{t.title}</h3>
                <div className="tutorial-details">
                  {t.description && <span>{t.description} · </span>}
                  {t.date && <span>{new Date(t.date).toLocaleDateString()}</span>}
                </div>
              </div>
              {t.link && (
                <a href={t.link} target="_blank" rel="noopener noreferrer" className="btn-join">
                  <ExternalLink size={14} /> Join
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'manage' && user?.role === 'lecturer' && (
        <ManageReps courseId={id} />
      )}
    </div>
  );
}
