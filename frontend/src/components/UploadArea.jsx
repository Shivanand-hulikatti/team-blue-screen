import React, { useState } from 'react';
import { uploadDocument } from '../api';

export default function UploadArea({ projectId, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = async (files) => {
    const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf');
    if (!pdfs.length) return alert('Please select PDF files only.');

    setUploading(true);
    for (const file of pdfs) {
      try {
        setProgress(10);

        // Upload directly to backend, which will upload to UploadThing
        const formData = new FormData();
        formData.append('file', file);

        setProgress(30);

        const uploadResp = await fetch('/api/uploadthing-upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResp.ok) {
          throw new Error('Upload failed');
        }

        const { fileUrl } = await uploadResp.json();
        setProgress(70);

        // Notify backend to process the document
        await uploadDocument(projectId, fileUrl, file.name);
        setProgress(100);
        onUploadComplete && onUploadComplete();
      } catch (err) {
        console.error('Upload failed:', err);
        alert(`Upload failed: ${err.message}`);
      }
    }
    setUploading(false);
    setProgress(0);
  };

  return (
    <div
      className={`upload-area ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '40px',
        textAlign: 'center',
        background: dragging ? 'var(--accent-dim)' : 'var(--surface2)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
    >
      {uploading ? (
        <div>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-dim)' }}>Uploading... {progress}%</p>
          <div style={{
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            marginTop: 12,
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>
            Drop PDF files here
          </p>
          <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>
            or click to browse
          </p>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            Browse Files
            <input
              type="file"
              multiple
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </>
      )}
    </div>
  );
}
