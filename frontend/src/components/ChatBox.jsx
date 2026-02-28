import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendChat } from '../api';

export default function ChatBox({ projectId, projectName }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your research assistant for **${projectName}**. Ask me anything about the documents in this project.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      // send object with `message` field to ensure valid JSON request body
      const { data } = await sendChat(projectId, { message: q });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      console.error('chat send error', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(55,50,47,0.06)',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        fontWeight: 700,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', opacity: 0.7 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Research Assistant
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '84%',
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 14,
              lineHeight: 1.65,
              background: msg.role === 'user'
                ? 'var(--accent)'
                : msg.isError
                  ? 'rgba(192,57,43,0.07)'
                  : 'var(--surface2)',
              color: msg.role === 'user' ? '#ffffff' : (msg.isError ? 'var(--error)' : 'var(--text)'),
              border: msg.role === 'assistant' && !msg.isError ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 5, fontWeight: 700 }}>
                    SOURCES
                  </p>
                  {msg.sources.map((s, si) => (
                    <div key={si} style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginBottom: 4,
                      padding: '5px 8px',
                      background: 'var(--surface)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}>
                      📄 Page {s.pageNumber} · Score: {(s.score * 100).toFixed(0)}%
                      <br />
                      <div style={{ fontStyle: 'italic' }}>
                        <ReactMarkdown>{s.preview}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
            <div className="spinner" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '13px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
        background: 'var(--surface)',
      }}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about your documents..."
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ flexShrink: 0 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}