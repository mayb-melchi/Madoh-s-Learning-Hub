import { useState, useEffect } from 'react';
import { api, apiFileUrl, canManage } from '../api';
import { FileText, Download, Bookmark, Trash2, X } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import { useUser } from '../components/Layout';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [filter, setFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const user = useUser();

  useEffect(() => {
    api('/courses').then(data => setCourses(data || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ category: 'material' });
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
    if (!confirm('Delete this material?')) return;
    await api(`/materials/${id}`, { method: 'DELETE' });
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div>
      <div className="page-label">Resources</div>
      <h1 className="page-title">Learning Materials</h1>
      <p className="page-subtitle">Shared notes, case summaries, and study aids.</p>

      {canManage(user) && (
        <div style={{ marginBottom: '20px' }}>
          <button className="btn-primary-sm" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel' : '+ Upload Material'}
          </button>
        </div>
      )}

      {showUpload && (
        <UploadForm
          category="material"
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
            <div className="material-icon"><FileText size={20} /></div>
            <div className="material-info">
              <h3>{m.title}</h3>
              <div className="material-meta">
                <span className="uploader">{m.uploader_name}</span> · {m.course_title || 'Unknown course'}
              </div>
            </div>
            <button className={`icon-btn bookmark-btn ${bookmarks.includes(m.id) ? 'bookmarked' : ''}`} onClick={() => toggleBookmark(m.id)}>
              <Bookmark size={18} />
            </button>
          </div>
          {m.description && <p className="material-description">{m.description}</p>}
          <div className="material-footer">
            <div className="material-actions">
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
          <FileText size={48} />
          <p>No learning materials uploaded yet.</p>
        </div>
      )}
    </div>
  );
}
