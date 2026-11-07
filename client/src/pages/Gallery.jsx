import { Image } from 'lucide-react';

export default function Gallery() {
  const placeholders = [
    'Class group photo — October 2026',
    'ADR Moot Court session',
    'Weekend tutorial — Company Law',
    'Guest lecture — Family Law',
    'Study group at the library',
    'End of term gathering',
  ];

  return (
    <div>
      <p className="page-label">Memories</p>
      <h1 className="page-title">Gallery</h1>
      <p className="page-subtitle">Photos and moments from class activities.</p>

      <div className="gallery-grid">
        {placeholders.map((caption, i) => (
          <div key={i} className="gallery-item">
            <div className="gallery-placeholder"><Image size={32} /></div>
            <p>{caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
