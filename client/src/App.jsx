import { Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './api';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Materials from './pages/Materials';
import PastQuestions from './pages/PastQuestions';
import Tutorials from './pages/Tutorials';
import ComingSoon from './pages/ComingSoon';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function P({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<P><Dashboard /></P>} />
      <Route path="/courses" element={<P><Courses /></P>} />
      <Route path="/courses/:id" element={<P><CourseDetail /></P>} />
      <Route path="/materials" element={<P><Materials /></P>} />
      <Route path="/past-questions" element={<P><PastQuestions /></P>} />
      <Route path="/tutorials" element={<P><Tutorials /></P>} />
      <Route path="/quizzes" element={<P><ComingSoon title="Quizzes & Practice" /></P>} />
      <Route path="/revision" element={<P><ComingSoon title="Revision Centre" /></P>} />
      <Route path="/announcements" element={<P><ComingSoon title="Announcements" /></P>} />
      <Route path="/profile" element={<P><Profile /></P>} />
      <Route path="/study-assistant" element={<P><ComingSoon title="Study Assistant" /></P>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
