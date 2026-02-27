import React, { useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * AddInsightModal
 *
 * Props:
 *   selectedText – the highlighted text to annotate
 *   pageNumber   – page the selection is on
 *   boundingRect – { left, top, width, height } in UNSCALED PDF coordinates
 *   projectId    – for API call
 *   documentId   – for API call
 *   onSave       – (savedInsight) => void  — called after successful POST
 *   onClose      – () => void
 */
export default function AddInsightModal({
  selectedText,
  pageNumber,
  boundingRect,
  projectId,
  documentId,
  onSave,
  onClose,
}) {
  const [note,   setNote]   = useState('');
  const [tagStr, setTagStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSave = async () => {
    if (!note.trim()) { setError('Please add an annotation note.'); return; }
    setSaving(true);
    setError(null);
    try {
      const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/insights`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text:        selectedText,
            note:        note.trim(),
            tags,
            pageNumber,
            boundingRect,
            type:        'user-created',
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const saved = await res.json();
      onSave(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const overlay = {
    position:        'fixed',
    inset:           0,
    background:      'rgba(0,0,0,0.6)',
    backdropFilter:  'blur(2px)',
    zIndex:          20000,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
  };

  const card = {
    background:   'var(--surface, #1e2030)',
    border:       '1px solid var(--border, #2a2d3e)',
    borderRadius: 'var(--radius, 10px)',
    padding:      '24px',
    width:        460,
    maxWidth:     '90vw',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
    display:      'flex',
    flexDirection:'column',
    gap:           16,
  };

  return ReactDOM.createPortal(
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text, #e2e8f0)' }}>
            ✦ Add Insight
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim, #94a3b8)', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Selected text quote */}
        <div style={{
          background:   'rgba(255,215,0,0.07)',
          border:       '1px solid rgba(255,215,0,0.25)',
          borderLeft:   '3px solid rgba(255,215,0,0.6)',
          borderRadius: 6,
          padding:      '10px 14px',
          fontSize:     13,
          color:        'var(--text, #e2e8f0)',
          lineHeight:   1.6,
          maxHeight:    100,
          overflowY:    'auto',
        }}>
          <span style={{ color: 'rgba(255,215,0,0.7)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            PAGE {pageNumber} · SELECTED TEXT
          </span>
          {selectedText}
        </div>

        {/* Note textarea */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: 6 }}>
            Insight / Annotation *
          </label>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add your annotation or insight about this passage…"
            rows={4}
            style={{
              width:       '100%',
              background:  'var(--surface2, #252740)',
              border:      '1px solid var(--border, #2a2d3e)',
              borderRadius: 6,
              padding:     '10px 12px',
              fontSize:    13,
              color:       'var(--text, #e2e8f0)',
              resize:      'vertical',
              outline:     'none',
              boxSizing:   'border-box',
              lineHeight:  1.6,
            }}
          />
        </div>

        {/* Tags input */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: 6 }}>
            Tags <span style={{ fontWeight: 400 }}>(comma-separated, optional)</span>
          </label>
          <input
            value={tagStr}
            onChange={e => setTagStr(e.target.value)}
            placeholder="e.g. important, methodology, results"
            style={{
              width:       '100%',
              background:  'var(--surface2, #252740)',
              border:      '1px solid var(--border, #2a2d3e)',
              borderRadius: 6,
              padding:     '8px 12px',
              fontSize:    13,
              color:       'var(--text, #e2e8f0)',
              outline:     'none',
              boxSizing:   'border-box',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 12, color: 'var(--error, #ef4444)', margin: 0 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border:     '1px solid var(--border, #2a2d3e)',
              borderRadius: 6,
              padding:    '7px 16px',
              fontSize:   13,
              color:      'var(--text-dim, #94a3b8)',
              cursor:     'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background:   'rgba(255,215,0,0.15)',
              border:       '1px solid rgba(255,215,0,0.35)',
              borderRadius: 6,
              padding:      '7px 18px',
              fontSize:     13,
              fontWeight:   600,
              color:        'rgba(255,215,0,0.9)',
              cursor:       saving ? 'not-allowed' : 'pointer',
              opacity:      saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : '✦ Save Insight'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
