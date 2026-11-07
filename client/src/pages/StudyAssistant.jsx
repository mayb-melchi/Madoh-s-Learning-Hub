import { Bot, Send } from 'lucide-react';
import { useState } from 'react';

export default function StudyAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your study assistant. Ask me about any topic in ADR, Company Law, Interpretation of Statutes, or Family Law.' },
  ]);
  const [input, setInput] = useState('');

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: 'This is a demo. In the full version, the study assistant would provide AI-powered answers to your law questions.' }]);
    }, 500);
    setInput('');
  }

  return (
    <div>
      <p className="page-label">AI-Powered</p>
      <h1 className="page-title">Study Assistant</h1>
      <p className="page-subtitle">Get help with your studies — ask questions about any course topic.</p>

      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 24, minHeight: 400, maxHeight: 500, overflowY: 'auto' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 32, height: 32, background: 'var(--navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="white" />
                </div>
              )}
              <div style={{ background: m.role === 'user' ? 'var(--navy)' : 'var(--gray-100)', color: m.role === 'user' ? 'white' : 'var(--gray-800)', padding: '10px 16px', borderRadius: 12, maxWidth: '70%', fontSize: 14, lineHeight: 1.6 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', borderTop: '1px solid var(--gray-200)', padding: 12, gap: 8 }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font-sans)' }} />
          <button type="submit" style={{ background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 14 }}>
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
