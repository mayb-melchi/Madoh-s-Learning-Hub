import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Announcements() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/announcements').then(setItems); }, []);

  return (
    <div>
      <p className="page-label">Updates</p>
      <h1 className="page-title">Announcements</h1>
      <p className="page-subtitle">Official notices and updates for the class.</p>

      {items.map(a => (
        <div key={a.id} className={`announcement-card ${a.pinned ? 'pinned' : ''}`}>
          <h3>{a.title} {a.pinned ? <span className="pin-badge">Pinned</span> : null}</h3>
          <p>{a.body}</p>
          <div className="meta">By {a.author_name} · {a.created_at}</div>
        </div>
      ))}
    </div>
  );
}
