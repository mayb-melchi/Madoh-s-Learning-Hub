import { useState, useEffect } from 'react';
import { api, apiFileUrl, canManage } from '../api';
import { useUser } from '../components/Layout';
import { ScrollText, Download, Bookmark, Trash2, Eye, X, FileText } from 'lucide-react';
import UploadForm from '../components/UploadForm';

function PreviewModal({ material, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{material.title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p><strong>Course:</strong> {material.course_title}</p>
          <p><strong>Uploaded by:</strong> {material.uploader_name}</p>
          <p><strong>Downloads:</strong> {material.downloads || 0}</p>
          {material.description && <p style={{ marginTop: 12 }}>{material.description}</p>}
          {material.path ? (
            <iframe
              src={apiFileUrl(material.path)}
              style={{ width: '100%', height: '400px', border: 'none', marginTop: '16px', borderRadius: '8px' }}
              title="Preview"
            />
          ) : (
            <div style={{ marginTop: 24, padding: 32, background: 'var(--gray-50)', borderRadius: 12, textAlign: 'center', color: 'var(--gray-400)' }}>
              <FileText size={48} style={{ marginBottom: 12 }} />
              <p>Preview available when file is uploaded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PastQuestions() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [filter, setFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const user = useUser();

  useEffect(() => {
    api('/courses').then(data => setCourses(data || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ category: 'past_question' });
    if (filter) params.set('course_id', filter);
    api(`/materials?${params}`).then(data => setMaterials(data || []));
  }, [filter]);

  useEffect(() => {
    if (user) api('/bookmarks').then(b => setBookmarks((b || []).map(x => x.material_id)));
  }, []);

  async function handleDownload(m) {
    await api(`/materials/${m.id}/download`, { method: 'POST' });
    setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, downloads: (x.downloads || 0) + 1 } : x));
    if (m.path) window.open(apiFileUrl(m.path), '_blank');
  }

  async function toggleBookmark(id) {
    await api('/bookmarks', { method: 'POST', body: JSON.stringify({ material_id: id }) });
    setBookmarks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this past question?')) return;
    await api(`/materials/${id}`, { method: 'DELETE' });
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div>
      <div className="page-label">Exam Preparation</div>
      <h1 className="page-title">Pre-Bar Past Questions</h1>
      <p className="page-subtitle">Past Pre-Bar examination papers organised by course.</p>

      {canManage(user) && (
        <div style={{ marginBottom: '20px' }}>
          <button className="btn-primary-sm" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel' : '+ Upload Past Question'}
          </button>
        </div>
      )}

      {showUpload && (
        <UploadForm
          category="past_question"
          onUploaded={(m) => { setMaterials(prev => [m, ...prev]); setShowUpload(false); }}
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

      {materials.map(m => (
        <div key={m.id} className="material-card">
          <div className="material-header">
            <div className="material-icon"><ScrollText size={20} /></div>
            <div className="material-info">
              <h3>{m.title}</h3>
              <div className="material-meta">
                <span className="uploader">{m.uploader_name}</span> · {m.course_title || 'Unknown course'} · {m.filename}
              </div>
            </div>
            <button className={`icon-btn bookmark-btn ${bookmarks.includes(m.id) ? 'bookmarked' : ''}`} onClick={() => toggleBookmark(m.id)}>
              <Bookmark size={18} />
            </button>
          </div>
          {m.description && <p className="material-description">{m.description}</p>}
          <div className="material-footer">
            <div className="material-actions">
              <button className="btn-preview" onClick={() => setPreviewMaterial(m)}>
                <Eye size={14} /> Preview
              </button>
              <button className="btn-download" onClick={() => handleDownload(m)}>
                <Download size={14} /> Download
              </button>
              {canManage(user) && (
                <button className="btn-danger-sm" onClick={() => handleDelete(m.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
            <span className="download-count">{m.downloads || 0} downloads</span>
          </div>
        </div>
      ))}

      {materials.length === 0 && (
        <div className="empty-state">
          <ScrollText size={48} />
          <p>No past questions uploaded yet.</p>
        </div>
      )}

      {previewMaterial && <PreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />}
    </div>
  );
}
