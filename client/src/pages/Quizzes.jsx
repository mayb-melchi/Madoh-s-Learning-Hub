import { useState, useEffect } from 'react';
import { api } from '../api';
import { HelpCircle, Clock, Hash, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => { api('/quizzes').then(setQuizzes); }, []);

  async function startQuiz(quiz) {
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
    const qs = await api(`/quizzes/${quiz.id}/questions`);
    setQuestions(qs);
  }

  async function submitQuiz() {
    const res = await api(`/quizzes/${activeQuiz.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    setResult(res);
  }

  function exitQuiz() {
    setActiveQuiz(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  }

  if (activeQuiz && result) {
    return (
      <div>
        <button className="btn-outline-sm" onClick={exitQuiz} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Quizzes
        </button>
        <div className="quiz-score">
          <CheckCircle size={48} style={{ color: result.score >= result.total / 2 ? '#22c55e' : '#ef4444', marginBottom: 12 }} />
          <h2>{result.score} / {result.total}</h2>
          <p>{result.score >= result.total / 2 ? 'Well done! You passed.' : 'Keep studying and try again.'}</p>
          <button className="btn-primary-sm" onClick={() => startQuiz(activeQuiz)}>Retry Quiz</button>
        </div>
        <div style={{ marginTop: 24 }}>
          {questions.map((q, qi) => {
            const r = result.results.find(x => x.question_id === q.id);
            return (
              <div key={q.id} className="quiz-question">
                <h3>{qi + 1}. {q.text}</h3>
                {q.options.map((opt, oi) => {
                  let cls = 'quiz-option';
                  if (oi === r?.correct) cls += ' correct';
                  else if (oi === r?.selected && !r?.is_correct) cls += ' incorrect';
                  return <div key={oi} className={cls}>{opt}</div>;
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
    return (
      <div>
        <button className="btn-outline-sm" onClick={exitQuiz} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Quizzes
        </button>
        <h1 className="page-title">{activeQuiz.title}</h1>
        <p className="page-subtitle">{Object.keys(answers).length} of {questions.length} answered</p>

        {questions.map((q, qi) => (
          <div key={q.id} className="quiz-question">
            <h3>{qi + 1}. {q.text}</h3>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                className={`quiz-option ${answers[q.id] === oi ? 'selected' : ''}`}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
              >
                {opt}
              </div>
            ))}
          </div>
        ))}

        <button className="btn-primary-sm" onClick={submitQuiz} disabled={!allAnswered}
          style={{ marginTop: 12, padding: '12px 32px', fontSize: 15, opacity: allAnswered ? 1 : 0.5 }}>
          Submit Quiz
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="page-label">Practice</p>
      <h1 className="page-title">Quizzes & Practice</h1>
      <p className="page-subtitle">Test your understanding with topic quizzes.</p>

      {quizzes.map(q => (
        <div key={q.id} className="quiz-card">
          <div>
            <h3>{q.title}</h3>
            <p>{q.description}</p>
            <div className="quiz-info">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={14} /> {q.questions_count} questions</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {q.duration_minutes} min</span>
              <span>{q.course_title}</span>
            </div>
          </div>
          <button className="btn-register" onClick={() => startQuiz(q)}>Start Quiz</button>
        </div>
      ))}
    </div>
  );
}
