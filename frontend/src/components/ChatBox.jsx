import React, { useState, useRef, useEffect } from 'react';
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
      const { data } = await sendChat(projectId, q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err) {
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
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
        fontWeight: 600,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🤖</span> Research Assistant
      </div>

      {/* Messages */}
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
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6,
              background: msg.role === 'user'
                ? 'var(--accent)'
                : msg.isError
                ? 'rgba(239,68,68,0.1)'
                : 'var(--surface2)',
              color: msg.isError ? 'var(--error)' : 'var(--text)',
              border: msg.role === 'assistant' && !msg.isError
                ? '1px solid var(--border)'
                : 'none',
            }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>
                    SOURCES
                  </p>
                  {msg.sources.map((s, si) => (
                    <div key={si} style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginBottom: 4,
                      padding: '4px 8px',
                      background: 'var(--surface)',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                    }}>
                      📄 Page {s.pageNumber} · Score: {(s.score * 100).toFixed(0)}%
                      <br />
                      <span style={{ fontStyle: 'italic' }}>{s.preview}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-dim)' }}>
            <div className="spinner" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
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
