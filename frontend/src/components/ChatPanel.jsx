import React, { useState, useRef, useEffect } from 'react';

const QUICK_ACTIONS = [
  { label: '✦ Explain this',        prompt: 'Explain the following passage in simple terms:' },
  { label: '⎘ Summarize',           prompt: 'Summarize the following passage concisely:' },
  { label: '◈ Key points',          prompt: 'List the key points from the following passage:' },
  { label: '? What does this mean', prompt: 'What does the following passage mean and why is it significant:' },
  { label: '◎ Simplify',            prompt: 'Rewrite the following passage in simpler language:' },
];
const IMAGE_QUICK_ACTIONS = [
  { label: '🔍 Explain this',      prompt: 'Explain what is shown in this image in detail:' },
  { label: '📊 Describe diagram', prompt: 'Describe this diagram and what it represents:' },
  { label: '❖ Summarize figure',  prompt: 'Summarize the key information shown in this figure:' },
  { label: '◈ Extract data',      prompt: 'Extract and list any data, values or labels visible in this image:' },
];
/**
 * ChatPanel — document-aware chat with context attachment + quick actions.
 *
 * Props:
 *   context      – string | ''  — pre-filled context from text selection
 *   setContext   – setter for context (so user can clear it)
 *   history      – [{ role: 'user'|'assistant', content: string }]
 *   setHistory   – setter for history
 *   projectId    – string
 *   documentId   – string
 */
export default function ChatPanel({
  context,
  setContext,
  imageContext,
  setImageContext,
  history,
  setHistory,
  projectId,
  documentId,
}) {
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom whenever history or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // When a new context arrives, focus the input
  useEffect(() => {
    if (context) inputRef.current?.focus();
  }, [context]);

  // When image context arrives, focus the input
  useEffect(() => {
    if (imageContext) inputRef.current?.focus();
  }, [imageContext]);

  const sendWith = async (message, ctx, imgCtx) => {
    if (!message || loading) return;
    setInput('');
    setError(null);

    const userMsg = {
      role:          'user',
      content:       message,
      contextSnippet: ctx || '',
      imageContext:  imgCtx || null,
    };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);

    // Clear image context after attaching to this message
    if (imgCtx) setImageContext && setImageContext(null);
    if (ctx)    setContext('');

    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${apiBase}/projects/${projectId}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:     message,
          context:     ctx || '',
          documentId:  documentId || '',
          imageBase64: imgCtx || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHistory(prev => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setError(err.message);
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const msg = input.trim() || (imageContext ? 'Explain what is shown in this image.' : '');
    sendWith(msg, context, imageContext);
  };

  const handleQuickAction = (action) => {
    const fullMessage = (imageContext || context)
      ? `${action.prompt}${context ? `\n\n"${context}"` : ''}`
      : action.prompt;
    sendWith(fullMessage, context, imageContext);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Pinned context block ── */}
      {context && (
        <div style={{
          background:   'rgba(255,215,0,0.07)',
          border:       '1px solid rgba(255,215,0,0.3)',
          borderRadius: 8,
          padding:      '10px 12px',
          marginBottom: 10,
          fontSize:     12,
          color:        'var(--text, #2A2520)',
          lineHeight:   1.6,
          position:     'relative',
          flexShrink:   0,
        }}>
          <span style={{
            color:         'rgba(255,215,0,0.7)',
            fontWeight:    700,
            display:       'block',
            marginBottom:  4,
            fontSize:      10,
            letterSpacing: '0.06em',
          }}>
            📎 CONTEXT FROM DOCUMENT
          </span>
          <span style={{
            display:         '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow:        'hidden',
          }}>
            {context}
          </span>
          <button
            onClick={() => setContext('')}
            title="Remove context"
            style={{
              position:   'absolute',
              top:        8,
              right:      8,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'rgba(255,215,0,0.6)',
              fontSize:   16,
              lineHeight: 1,
              padding:    0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Pinned image context block ── */}
      {imageContext && (
        <div style={{
          background:   'rgba(55,50,47,0.05)',
          border:       '1px solid var(--border)',
          borderRadius: 8,
          padding:      '10px 12px',
          marginBottom: 10,
          fontSize:     12,
          color:        'var(--text)',
          position:     'relative',
          flexShrink:   0,
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}>
          <img
            src={imageContext}
            alt="captured region"
            style={{
              width:        56,
              height:       42,
              objectFit:    'cover',
              borderRadius: 4,
              border:       '1px solid var(--border)',
              flexShrink:   0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              color:         'var(--text-dim)',
              fontWeight:    700,
              display:       'block',
              marginBottom:  2,
              fontSize:      10,
              letterSpacing: '0.06em',
            }}>
              📷 PDF REGION CAPTURED
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block' }}>
              Image attached — use a quick action or type your question
            </span>
          </div>
          <button
            onClick={() => setImageContext(null)}
            title="Remove image"
            style={{
              position:   'absolute',
              top:        8,
              right:      8,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--text-dim)',
              fontSize:   16,
              lineHeight: 1,
              padding:    0,
            }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{
        flex:          1,
        overflowY:     'auto',
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        paddingBottom: 4,
      }}>
        {history.length === 0 && !loading && (
          <div style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            color:          'var(--text-dim, #6B6460)',
            textAlign:      'center',
            padding:        20,
            gap:            8,
          }}>
            <div style={{ fontSize: 28 }}>💬</div>
            <p style={{ margin: 0, fontSize: 13 }}>Ask anything about this document</p>
            {context && (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,215,0,0.6)' }}>
                Selection attached — try a quick action below ↓
              </p>
            )}
          </div>
        )}

        {history.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            padding:    '8px 12px',
            color:      'var(--text-dim, #6B6460)',
            fontSize:   13,
          }}>
            <ThinkingDots />
            <span>Thinking…</span>
          </div>
        )}

        {error && (
          <div style={{
            background:   'rgba(239,68,68,0.1)',
            border:       '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            padding:      '8px 12px',
            fontSize:     12,
            color:        '#ef4444',
          }}>
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick action pills ── */}
      {(context || imageContext) && (
        <div style={{
          display:    'flex',
          flexWrap:   'wrap',
          gap:        5,
          padding:    '8px 0 4px',
          borderTop:  '1px solid var(--border, #E2DBD5)',
          marginTop:  4,
          flexShrink: 0,
        }}>
          {(imageContext ? IMAGE_QUICK_ACTIONS : QUICK_ACTIONS).map((a) => (
            <button
              key={a.label}
              onClick={() => handleQuickAction(a)}
              disabled={loading}
              style={{
                background:   'var(--surface2, #F9F7F5)',
                border:       '1px solid var(--border, #E2DBD5)',
                borderRadius: 999,
                padding:      '4px 10px',
                fontSize:     11,
                fontWeight:   500,
                color:        'var(--text-dim, #6B6460)',
                cursor:       loading ? 'not-allowed' : 'pointer',
                whiteSpace:   'nowrap',
                transition:   'border-color 0.12s, color 0.12s',
                opacity:      loading ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.target.style.borderColor = 'var(--border-strong)';
                  e.target.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = 'var(--border, #E2DBD5)';
                e.target.style.color = 'var(--text-dim, #6B6460)';
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{
        background:   'var(--surface2, #F9F7F5)',
        border:       '1px solid var(--border, #E2DBD5)',
        borderRadius: 10,
        overflow:     'hidden',
        marginTop:    (context || imageContext) ? 4 : 8,
        flexShrink:   0,
      }}>
        {/* Image attachment chip */}
        {imageContext && (
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            padding:      '6px 10px',
            borderBottom: '1px solid var(--border, #E2DBD5)',
            background:   'var(--surface2)',
          }}>
            <img
              src={imageContext}
              alt="captured region"
              style={{
                width:        40,
                height:       30,
                objectFit:    'cover',
                borderRadius: 4,
                border:       '1px solid var(--border, #E2DBD5)',
                flexShrink:   0,
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>
              Image · PDF region captured
            </span>
            <button
              onClick={() => setImageContext(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 15 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Text attachment chip (selected text preview) */}
        {context && !imageContext && (
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '6px 10px',
            borderBottom: '1px solid var(--border, #E2DBD5)',
            background:   'rgba(255,215,0,0.05)',
          }}>
            <div style={{
              width:        22,
              height:       22,
              borderRadius: 4,
              background:   'rgba(255,215,0,0.15)',
              border:       '1px solid rgba(255,215,0,0.3)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     11,
              flexShrink:   0,
            }}>
              ¶
            </div>
            <span style={{
              fontSize:     11,
              color:        'rgba(255,215,0,0.8)',
              flex:         1,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
              fontStyle:    'italic',
            }}>
              "{context.length > 60 ? context.slice(0, 60) + '…' : context}"
            </span>
            <button
              onClick={() => setContext('')}
              title="Remove selection"
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      'rgba(255,215,0,0.5)',
                fontSize:   15,
                lineHeight: 1,
                padding:    '0 2px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Textarea + send button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              imageContext
                ? 'Ask about this image… (Enter to send)'
                : context
                ? 'Or type your own question…'
                : 'Ask about this document… (Enter to send)'
            }
            rows={2}
            style={{
              flex:        1,
              background:  'transparent',
              border:      'none',
              padding:     '9px 12px',
              fontSize:    13,
              color:       'var(--text, #2A2520)',
              resize:      'none',
              outline:     'none',
              lineHeight:  1.5,
            }}
          />
          <button
            onClick={send}
            disabled={loading || (!input.trim() && !imageContext)}
            style={{
              background:   (loading || (!input.trim() && !imageContext)) ? 'transparent' : 'var(--accent, #37322F)',
              border:       'none',
              borderRadius: 7,
              margin:       '6px 6px 6px 0',
              padding:      '6px 12px',
              cursor:       (loading || (!input.trim() && !imageContext)) ? 'not-allowed' : 'pointer',
              color:        (loading || (!input.trim() && !imageContext)) ? 'var(--text-dim, #6B6460)' : '#fff',
              fontSize:     16,
              lineHeight:   1,
              transition:   'background 0.15s',
              flexShrink:   0,
              alignSelf:    'flex-end',
              height:       34,
            }}
            title="Send (Enter)"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display:       'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap:           8,
      alignItems:    'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width:          26,
        height:         26,
        borderRadius:   '50%',
        background:     isUser ? 'var(--accent, #37322F)' : 'var(--surface3)',        
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       12,
        flexShrink:     0,
      }}>
        {isUser ? '👤' : '✦'}
      </div>

      {/* Bubble + optional context snippet */}
      <div style={{
        maxWidth:      '85%',
        display:       'flex',
        flexDirection: 'column',
        gap:           4,
        alignItems:    isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* Context snippet shown above user bubble when present */}
        {isUser && msg.contextSnippet && (
          <div style={{
            background:   'rgba(255,215,0,0.07)',
            border:       '1px solid rgba(255,215,0,0.2)',
            borderRadius: '8px 8px 0 0',
            padding:      '5px 10px',
            fontSize:     11,
            color:        'rgba(255,215,0,0.7)',
            fontStyle:    'italic',
            maxWidth:     '100%',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            ¶ "{msg.contextSnippet.length > 55
                ? msg.contextSnippet.slice(0, 55) + '…'
                : msg.contextSnippet}"
          </div>
        )}

        {/* Image thumbnail shown above user bubble when present */}
        {isUser && msg.imageContext && (
          <img
            src={msg.imageContext}
            alt="referenced region"
            style={{
              maxWidth:     180,
              borderRadius: msg.contextSnippet ? 0 : '8px 8px 0 0',
              border:       '1px solid var(--border)',
              marginBottom: -4,
              display:      'block',
            }}
          />
        )}

        {/* Main bubble */}
        <div style={{
          background:   isUser ? 'var(--accent, #37322F)' : 'var(--surface2, #F9F7F5)',
          border:       `1px solid ${isUser ? 'transparent' : 'var(--border, #E2DBD5)'}`,
          borderRadius: isUser
            ? ((msg.contextSnippet || msg.imageContext) ? '0 4px 12px 12px' : '12px 4px 12px 12px')
            : '4px 12px 12px 12px',
          padding:      '8px 12px',
          fontSize:     13,
          color:        isUser ? '#ffffff' : 'var(--text, #2A2520)',
          lineHeight:   1.6,
          whiteSpace:   'pre-wrap',
          wordBreak:    'break-word',
        }}>
          {msg.content}

          {/* Source page chips for assistant messages */}
          {!isUser && msg.sources && msg.sources.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {msg.sources.map((s, i) => (
                <span key={i} style={{
                  background:   'var(--accent-dim)',
                  border:       '1px solid var(--border)',
                  borderRadius: 4,
                  padding:      '2px 6px',
                  fontSize:     10,
                  color:        'var(--text-dim)',
                }}>
                  p.{s.pageNumber}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ThinkingDots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   'var(--accent, #37322F)',
          animation:    `thinkDot 1.2s ${i * 0.2}s ease-in-out infinite`,
          display:      'inline-block',
        }} />
      ))}
      <style>{`
        @keyframes thinkDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </span>
  );
}