import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { FileText, BookOpen, Calendar, ScrollText } from 'lucide-react';
import { useUser } from '../components/Layout';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const user = useUser();

  useEffect(() => { api('/dashboard').then(setData); }, []);

  if (!data) return <p style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</p>;

  return (
    <div>
      <div className="page-label">Welcome back</div>
      <h1 className="page-title">{user?.full_name}</h1>
      <p className="page-subtitle">Your learning hub at a glance.</p>

      <div className="dashboard-stats">
        <div className="stat-card">
          <BookOpen size={20} style={{ color: 'var(--navy)', marginBottom: 8 }} />
          <div className="stat-value">{data.courses_count}</div>
          <div className="stat-label">Courses</div>
        </div>
        <div className="stat-card">
          <FileText size={20} style={{ color: 'var(--navy)', marginBottom: 8 }} />
          <div className="stat-value">{data.materials_count}</div>
          <div className="stat-label">Materials</div>
        </div>
        <div className="stat-card">
          <ScrollText size={20} style={{ color: 'var(--navy)', marginBottom: 8 }} />
          <div className="stat-value">{data.past_questions_count}</div>
          <div className="stat-label">Past Questions</div>
        </div>
        <div className="stat-card">
          <Calendar size={20} style={{ color: 'var(--navy)', marginBottom: 8 }} />
          <div className="stat-value">{data.tutorials_count}</div>
          <div className="stat-label">Tutorials</div>
        </div>
      </div>

      {data.recent_materials?.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 24 }}>Recent Uploads</h2>
          {data.recent_materials.map(m => (
            <div key={m.id} className="material-card">
              <div className="material-header">
                <div className="material-icon">
                  {m.category === 'past_question' ? <ScrollText size={20} /> : <FileText size={20} />}
                </div>
                <div className="material-info">
                  <h3>{m.title}</h3>
                  <div className="material-meta">
                    <span className="uploader">{m.uploader_name}</span> · {m.course_title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link to="/past-questions" className="btn-primary-sm" style={{ textDecoration: 'none' }}>
          View Past Questions →
        </Link>
        <Link to="/materials" className="btn-outline-sm" style={{ textDecoration: 'none' }}>
          Browse Materials
        </Link>
      </div>
    </div>
  );
}
