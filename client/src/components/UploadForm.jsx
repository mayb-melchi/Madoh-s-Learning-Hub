import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Upload, X } from 'lucide-react';

export default function UploadForm({ category, onUploaded, defaultCourseId }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(defaultCourseId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api('/courses').then(data => setCourses(data || []));
  }, []);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !courseId) { setError('Please select a file and course.'); return; }
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('course_id', courseId);
    fd.append('category', category);
    fd.append('title', title);
    fd.append('description', description);
    const result = await api('/materials/upload', { method: 'POST', body: fd });
    setUploading(false);
    if (result?.error) { setError(result.error); return; }
    setFile(null);
    setTitle('');
    setDescription('');
    setCourseId('');
    if (fileRef.current) fileRef.current.value = '';
    onUploaded?.(result);
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        Upload {category === 'past_question' ? 'Past Question' : 'Material'}
      </h3>

      {error && <div className="error-msg">{error}</div>}

      <div className="upload-area" onClick={() => fileRef.current?.click()}>
        <Upload size={28} />
        <p>{file ? file.name : 'Tap to choose a file'}</p>
        <p className="upload-hint">PDF, DOC, DOCX, PPT, PPTX, images (max 50MB)</p>
      </div>
      <input type="file" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp" />

      <label>Course</label>
      <select value={courseId} onChange={e => setCourseId(e.target.value)}>
        <option value="">Select a course</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>

      <label>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />

      <label>Description (optional)</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />

      <button type="submit" className="btn-primary-sm" disabled={uploading} style={{ marginTop: '16px', width: '100%' }}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
