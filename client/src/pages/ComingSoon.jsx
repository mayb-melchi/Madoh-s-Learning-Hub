import { Lock } from 'lucide-react';

export default function ComingSoon({ title = 'Coming Soon' }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon"><Lock size={28} /></div>
      <h2>{title}</h2>
      <p>This feature is under development and will be available in a future update.</p>
    </div>
  );
}
