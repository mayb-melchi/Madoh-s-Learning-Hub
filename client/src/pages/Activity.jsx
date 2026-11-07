import { Activity as ActivityIcon } from 'lucide-react';

export default function Activity() {
  const activities = [
    { action: 'Viewed', item: 'Pre-Bar Past Questions — ADR (2015–2025)', time: 'Today' },
    { action: 'Downloaded', item: 'Company Law — Case Summaries', time: 'Yesterday' },
    { action: 'Registered for', item: 'ADR Tutorial — Arbitration Procedures', time: '2 days ago' },
    { action: 'Bookmarked', item: 'ADR Lecture Notes — Week 1–6', time: '3 days ago' },
  ];

  return (
    <div>
      <p className="page-label">History</p>
      <h1 className="page-title">My Activity</h1>
      <p className="page-subtitle">Your recent actions and engagement.</p>

      {activities.map((a, i) => (
        <div key={i} className="material-card">
          <div className="material-header">
            <div className="material-icon"><ActivityIcon size={18} /></div>
            <div className="material-info">
              <h3 style={{ fontSize: 14 }}>{a.action} — {a.item}</h3>
              <div className="material-meta">{a.time}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
