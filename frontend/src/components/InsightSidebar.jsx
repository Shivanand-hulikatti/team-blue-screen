import React, { useState } from 'react';

export default function InsightSidebar({ insights }) {
  const [expanded, setExpanded] = useState(null);

  if (!insights || insights.length === 0) {
    return (
      <div style={{
        padding: 20,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-dim)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💡</div>
        <p>No insights yet</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600,
        fontSize: 14,
      }}>
        💡 Insights ({insights.length})
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {insights.map((insight, i) => (
          <div
            key={i}
            style={{
              borderBottom: i < insights.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Page {insight.pageNumber}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>
                {expanded === i ? '▲' : '▼'}
              </span>
            </div>
            {expanded === i && (
              <div style={{ padding: '0 16px 14px' }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginBottom: 12 }}>
                  {insight.insightText}
                </p>
                {insight.highlights && insight.highlights.length > 0 && (
                  <div>
                    <p style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-dim)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                    }}>
                      Key Phrases
                    </p>
                    {insight.highlights.map((hl, j) => (
                      <div key={j} style={{
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        marginBottom: 6,
                        fontSize: 12,
                        color: 'var(--warning)',
                        fontStyle: 'italic',
                      }}>
                        "{hl.text}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
