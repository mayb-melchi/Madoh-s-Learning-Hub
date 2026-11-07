import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BookOpen, FileText, ScrollText, Calendar } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/courses').then(data => { setCourses(data || []); setLoading(false); });
  }, []);

  if (loading) return <div className="empty-state"><p>Loading courses...</p></div>;

  return (
    <div>
      <div className="page-label">Courses</div>
      <h1 className="page-title">My Courses</h1>
      <p className="page-subtitle">Browse your enrolled courses and access resources.</p>

      <div className="course-grid">
        {courses.map(c => (
          <Link to={`/courses/${c.id}`} className="course-card" key={c.id}>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <div className="course-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={12} /> {c.material_count} materials
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ScrollText size={12} /> {c.past_question_count} past questions
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> {c.tutorial_count} tutorials
              </span>
            </div>
          </Link>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>No courses available yet.</p>
        </div>
      )}
    </div>
  );
}
