import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Calendar, ScrollText, Shield, ArrowRight, Users } from 'lucide-react';
import ParticleVoid from '../components/ParticleVoid';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      setScrolled(window.scrollY > heroRef.current.offsetHeight - 64);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className={`landing-nav${scrolled ? ' landing-nav-scrolled' : ''}`}>
        <div className="landing-nav-left">
          <div className="sidebar-crest" style={{ width: 36, height: 36, fontSize: 14 }}>EG</div>
          <span className="landing-nav-title">Erma Global Academic Hub</span>
        </div>
        <div className="landing-nav-right">
          <Link to="/auth?join=true" className="landing-nav-link">Join waitlist</Link>
          <Link to="/auth" className="landing-nav-signin">Sign in</Link>
        </div>
      </nav>

      {/* ── Hero with Particle Tunnel ── */}
      <section className="landing-hero-section" ref={heroRef}>
        <div className="landing-hero-particles">
          <ParticleVoid
            x={50}
            y={50}
            radius={8}
            density={22}
            gap={52}
            particleSize={2.5}
            colors={['#ffffff', 'rgba(255,255,255,0.5)', 'rgba(197,0,34,0.4)']}
            direction="inside"
            speed={1.2}
          />
        </div>
        <div className="landing-hero-content">
          <div className="landing-hero-backdrop" />
          <p className="landing-hero-label">Empowering Minds, Creating Opportunities</p>
          <h1 className="landing-hero-heading">
            One Place For Every<br />
            <em>Course, Case</em> &amp; <em>Tutorial.</em>
          </h1>
          <p className="landing-hero-desc">
            Shared notes, past questions, quizzes and tutorial sign-ups — organised by course.
          </p>
          <div className="landing-hero-actions">
            <Link to="/auth" className="landing-btn-primary">
              Sign in <ArrowRight size={18} />
            </Link>
            <Link to="/auth?join=true" className="landing-btn-ghost">
              Join the waitlist
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <p className="landing-section-label">What's inside</p>
          <h2 className="landing-section-heading">Everything your class needs, nothing it doesn't.</h2>
          <div className="landing-features-grid">
            <div className="landing-feature-card landing-feature-card--hero">
              <div className="landing-feature-icon"><BookOpen size={22} strokeWidth={2} /></div>
              <h3>Course Spaces</h3>
              <p>Dedicated pages for ADR, Company Law, Interpretation of Statutes and Family Law — each with its own materials, past questions and tutorials.</p>
            </div>
            <div className="landing-feature-card landing-feature-card--hero">
              <div className="landing-feature-icon"><ScrollText size={22} strokeWidth={2} /></div>
              <h3>Past Questions</h3>
              <p>Pre-Bar examination papers going back a decade, organised by course with in-browser preview.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon"><FileText size={22} strokeWidth={1.75} /></div>
              <h3>Shared Library</h3>
              <p>Upload and download lecture notes, case summaries and study aids. Every file credited to the classmate who shared it.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon"><Calendar size={22} strokeWidth={1.75} /></div>
              <h3>Tutorials</h3>
              <p>See upcoming sessions, register in a tap, and get the join link when it's time.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon"><Shield size={22} strokeWidth={1.75} /></div>
              <h3>Course Reps</h3>
              <p>Reps manage uploads and announcements for their course. Lecturers generate rep codes to onboard them instantly.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon"><Users size={22} strokeWidth={1.75} /></div>
              <h3>Class Only</h3>
              <p>Waitlist approval keeps access limited to your class. No public sign-ups, no strangers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <div className="landing-cta-card">
            <p className="landing-cta-eyebrow">New student</p>
            <h3>Join the waitlist</h3>
            <p>Joining from another campus or session? Request access and you'll be notified when approved.</p>
            <Link to="/auth?join=true" className="landing-cta-btn">
              Request access <ArrowRight size={14} />
            </Link>
          </div>
          <div className="landing-cta-card landing-cta-card--rep">
            <p className="landing-cta-eyebrow">For course reps</p>
            <h3>Got a rep code?</h3>
            <p>Your lecturer gave you a code? Use it during sign-up for instant course rep access.</p>
            <Link to="/auth?join=true" className="landing-cta-btn landing-cta-btn--rep">
              Enter rep code <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="sidebar-crest" style={{ width: 32, height: 32, fontSize: 12 }}>EG</div>
            <span>Erma Global Academic Hub</span>
          </div>
          <p className="landing-footer-slogan">Empowering Minds, Creating Opportunities</p>
          <p>Copyright &copy; All Rights Reserved — 2026</p>
        </div>
      </footer>
    </div>
  );
}
