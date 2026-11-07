import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-left">
          <div className="sidebar-crest" style={{ width: 36, height: 36, fontSize: 14 }}>ML</div>
          <h1>Madoh's Learning Hub</h1>
        </div>
        <Link to="/auth">Sign in</Link>
      </header>
      <section className="landing-hero">
        <div>
          <p className="page-label" style={{ marginBottom: 12 }}>For the class only</p>
          <h2>One place for every <em>course, case</em> and <em>tutorial.</em></h2>
          <p className="hero-desc">
            Shared notes, past questions, quizzes and tutorial sign-ups
            for ADR, Company and Corporate Law, Interpretation and Family Law.
          </p>
          <Link to="/auth" className="btn-hero">Sign in with your name</Link>
          <div className="landing-bottom" style={{ padding: '32px 0 0', maxWidth: 'none', margin: 0 }}>
            <div className="auth-action-card">
              <h3>New here?</h3>
              <p>Joining us from another campus or session? Request access.</p>
              <Link to="/auth?join=true" className="btn-outline">Join the waitlist</Link>
            </div>
            <div className="auth-action-card">
              <h3>Already approved?</h3>
              <p>Type your full name and choose your own 4-digit PIN the first time.</p>
            </div>
          </div>
        </div>
        <div className="feature-cards">
          <div className="feature-card">
            <h4>Four course spaces</h4>
            <p>Overview, topics and materials for each subject.</p>
          </div>
          <div className="feature-card">
            <h4>Shared PDF library</h4>
            <p>Reviewed uploads, credited to the classmate who shared them.</p>
          </div>
          <div className="feature-card">
            <h4>Tutorials</h4>
            <p>See sessions and register in a couple of taps.</p>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        Copyright &copy; All Rights Reserved — 2026
      </footer>
    </div>
  );
}
