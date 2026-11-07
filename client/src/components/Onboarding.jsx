import { useState, useEffect, useCallback } from 'react';

const steps = [
  {
    title: 'Welcome to Madoh's Learning Hub!',
    description: 'This is your learning hub for Pre-Bar exam preparation. Let us show you around so you can get the most out of it.',
    position: 'center',
  },
  {
    title: 'Your Dashboard',
    description: 'The dashboard gives you a quick overview — your courses, materials count, past questions, and tutorials all at a glance.',
    target: '.dashboard-stats',
    position: 'below',
  },
  {
    title: 'Sidebar Navigation',
    description: 'Use the sidebar (or the menu button on mobile) to switch between features: Courses, Materials, Past Questions, Tutorials, and your Profile.',
    target: '.sidebar-nav',
    fallbackTarget: '.menu-btn',
    position: 'right',
  },
  {
    title: 'Search Anything',
    description: 'Looking for a specific course, material, or topic? Use the search bar at the top to find it instantly.',
    target: '.search-bar',
    position: 'below',
  },
  {
    title: 'Notifications',
    description: 'The bell icon keeps you updated on new uploads, announcements, and tutorial registrations. A red dot means you have unread notifications.',
    target: '.notification-btn',
    position: 'below-left',
  },
  {
    title: 'Dark Mode',
    description: 'Prefer studying at night? Head to Profile & Settings to switch between Light, Dark, or System Default appearance.',
    position: 'center',
  },
  {
    title: 'Learning Materials',
    description: 'Find shared notes, case summaries, and study aids under Learning Materials. You can filter by course and bookmark your favourites.',
    position: 'center',
  },
  {
    title: 'Past Questions',
    description: 'Pre-Bar past questions are organised by course. Use the filter pills to narrow down to the subject you need.',
    position: 'center',
  },
  {
    title: 'You\'re all set!',
    description: 'Explore at your own pace. You can always find your profile and settings in the sidebar. Good luck with your studies!',
    position: 'center',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(-1);
  const [tooltipStyle, setTooltipStyle] = useState({});

  useEffect(() => {
    const seen = localStorage.getItem('gsl_onboarding_done');
    if (!seen) {
      const timer = setTimeout(() => setStep(0), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const positionTooltip = useCallback(() => {
    if (step < 0 || step >= steps.length) return;
    const s = steps[step];

    if (s.position === 'center' || !s.target) {
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const el = document.querySelector(s.target) || (s.fallbackTarget && document.querySelector(s.fallbackTarget));
    if (!el) {
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const rect = el.getBoundingClientRect();
    const style = {};

    switch (s.position) {
      case 'below':
        style.top = `${rect.bottom + 12}px`;
        style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - 336))}px`;
        break;
      case 'below-left':
        style.top = `${rect.bottom + 12}px`;
        style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;
        break;
      case 'right':
        style.top = `${rect.top}px`;
        style.left = `${rect.right + 12}px`;
        if (rect.right + 340 > window.innerWidth) {
          style.left = '16px';
          style.top = `${rect.bottom + 12}px`;
        }
        break;
      default:
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
    }

    setTooltipStyle(style);
  }, [step]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [positionTooltip]);

  function finish() {
    setStep(-1);
    localStorage.setItem('gsl_onboarding_done', '1');
  }

  function next() {
    if (step >= steps.length - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  }

  if (step < 0 || step >= steps.length) return null;

  const current = steps[step];

  return (
    <>
      <div className="onboarding-overlay" onClick={finish} />
      <div className="onboarding-tooltip" style={tooltipStyle}>
        <h3>{current.title}</h3>
        <p>{current.description}</p>
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="btn-onboarding-skip" onClick={finish}>Skip</button>
          <button className="btn-onboarding-next" onClick={next}>
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
