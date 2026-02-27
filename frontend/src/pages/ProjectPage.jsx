import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, listDocuments } from '../api';
import UploadArea from '../components/UploadArea';
import ChatBox from '../components/ChatBox';
import KnowledgeGraph3D from '../components/KnowledgeGraph3D';
import { useToast } from '../hooks/useToast';

const POLL_INTERVAL = 3000;

function StatusBadge({ status }) {
  const map = { PROCESSING: 'badge-processing', DONE: 'badge-done', ERROR: 'badge-error' };
  const labels = { PROCESSING: 'Processing', DONE: 'Ready', ERROR: 'Error' };
  return (
    <span className={`badge ${map[status] || 'badge-uploaded'}`}>
      {status === 'PROCESSING' && (
        <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} />
      )}
      {labels[status] || status}
    </span>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('documents');
  const pollRef = useRef(null);
  const prevStatuses = useRef({});

  const fetchAll = async () => {
    try {
      const [projRes, docsRes] = await Promise.all([
        getProject(projectId),
        listDocuments(projectId),
      ]);
      setProject(projRes.data);
      const docs = docsRes.data;

      docs.forEach((doc) => {
        if (prevStatuses.current[doc._id] === 'PROCESSING' && doc.status === 'DONE')
          toast(`"${doc.filename}" is ready`, 'success', 5000);
        if (prevStatuses.current[doc._id] === 'PROCESSING' && doc.status === 'ERROR')
          toast(`"${doc.filename}" failed to process`, 'error', 5000);
        prevStatuses.current[doc._id] = doc.status;
      });

      setDocuments(docs);
    } catch (err) {
      if (!project) toast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="spinner w-6 h-6 border-[1.5px]" />
      </div>
    );
  }

  const processingCount = documents.filter((d) => d.status === 'PROCESSING').length;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <ToastContainer />

      <nav className="navbar">
        <span
          className="navbar-brand cursor-pointer"
          onClick={() => navigate('/')}
        >
          Mirage
        </span>
        <span className="navbar-sep">/</span>
        <span className="text-[13px] text-[#0f1117] font-medium">{project?.name}</span>

        {processingCount > 0 && (
          <div className="ml-auto flex items-center gap-2 text-[12px] text-amber-600 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderColor: '#fcd34d', borderTopColor: '#d97706' }} />
            Processing {processingCount} file{processingCount > 1 ? 's' : ''}
          </div>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-7 py-6 pb-12">
        {/* View toggle */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-[#e5e7ef] rounded-lg p-1 w-fit shadow-sm">
          {['documents', 'graph'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-1.5 rounded-md text-[12.5px] font-semibold transition-all duration-150 capitalize
                ${activeView === v
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-[#8b90a7] hover:text-[#0f1117]'}`}
            >
              {v === 'documents' ? 'Workspace' : 'Knowledge Graph'}
            </button>
          ))}
        </div>

        {activeView === 'graph' ? (
          <KnowledgeGraph3D projectId={projectId} projectName={project?.name || ''} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* Left column */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-semibold text-[#0f1117]">Documents</h2>
                <span className="text-[12px] text-[#8b90a7]">{documents.length} uploaded</span>
              </div>

              <UploadArea projectId={projectId} onUploadComplete={fetchAll} />

              <div className="mt-4">
                {documents.length === 0 ? (
                  <div className="empty-state border border-dashed border-[#e5e7ef] rounded-xl">
                    <p className="text-[13px]">No documents yet — upload your first PDF above</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {documents.map((doc) => {
                      const icons = {
                        DONE: (
                          <svg className="w-4.5 h-4.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        ),
                        ERROR: (
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        ),
                        PROCESSING: (
                          <span className="spinner" style={{ width: 16, height: 16 }} />
                        ),
                      };

                      return (
                        <div
                          key={doc._id}
                          className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#e5e7ef] bg-white transition-all duration-150
                            ${doc.status === 'DONE' ? 'cursor-pointer hover:border-brand-200 hover:shadow-sm' : 'cursor-default'}`}
                          onClick={() => doc.status === 'DONE' && navigate(`/projects/${projectId}/documents/${doc._id}`)}
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#f3f4f8] border border-[#e5e7ef] flex items-center justify-center shrink-0">
                            {icons[doc.status] || icons.PROCESSING}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-medium text-[#0f1117] truncate">{doc.filename}</p>
                            <p className="text-[11.5px] text-[#8b90a7] mt-0.5">
                              {doc.pageCount ? `${doc.pageCount} pages · ` : ''}
                              {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                            {doc.errorMessage && (
                              <p className="text-[11px] text-red-500 mt-1">{doc.errorMessage}</p>
                            )}
                          </div>
                          <StatusBadge status={doc.status} />
                          {doc.status === 'DONE' && (
                            <svg className="w-4 h-4 text-[#d1d5e0] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column — Chat */}
            <div className="sticky top-[72px] h-[calc(100vh-100px)]">
              <ChatBox projectId={projectId} projectName={project?.name || ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
