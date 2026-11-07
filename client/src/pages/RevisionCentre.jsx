import { RotateCcw } from 'lucide-react';

export default function RevisionCentre() {
  return (
    <div>
      <p className="page-label">Exam Prep</p>
      <h1 className="page-title">Revision Centre</h1>
      <p className="page-subtitle">Structured revision guides and study plans for each course.</p>

      <div className="course-grid">
        {['Alternative Dispute Resolution', 'Company and Corporate Law', 'Interpretation of Statutes', 'Family Law'].map(course => (
          <div key={course} className="course-card">
            <RotateCcw size={20} style={{ color: 'var(--navy)', marginBottom: 12 }} />
            <h3>{course}</h3>
            <p>Key topics, case summaries, and revision checklists.</p>
            <div className="course-meta">Coming soon</div>
          </div>
        ))}
      </div>
    </div>
  );
}
