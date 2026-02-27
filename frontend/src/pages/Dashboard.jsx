import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, deleteProject } from '../api';
import { useToast } from '../hooks/useToast';

function ProjectCard({ project, onDelete, onClick }) {
  const date = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="group relative bg-white border border-[#e5e7ef] rounded-xl p-5 cursor-pointer transition-all duration-150 hover:border-[#d1d5e0] hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-[#0f1117] text-sm truncate leading-tight">{project.name}</p>
          <p className="text-[#8b90a7] text-xs mt-1">{date}</p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project._id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md flex items-center justify-center text-[#8b90a7] hover:bg-red-50 hover:text-red-500"
          title="Delete project"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
        <span className="text-[11px] text-[#8b90a7] font-medium">Active</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();

  const fetchProjects = async () => {
    try {
      const { data } = await listProjects();
      setProjects(data);
    } catch (err) {
      toast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject(newName.trim());
      setNewName('');
      toast('Project created', 'success');
      fetchProjects();
    } catch (err) {
      toast('Failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      toast('Project deleted', 'info');
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <ToastContainer />

      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">Mirage</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[#8b90a7] bg-[#f3f4f8] border border-[#e5e7ef] px-2.5 py-1 rounded-full font-medium">
            Research Intelligence
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-7 py-12">

        {/* Hero */}
        <div className="mb-12">
          <h1 className="font-display text-[2.4rem] leading-tight text-[#0f1117] tracking-tight mb-3">
            Your research,<br />
            <span className="italic text-brand-500">intelligently organized</span>
          </h1>
          <p className="text-[#4b5063] text-[15px] max-w-md">
            Upload PDFs, extract AI-powered insights, and chat with your documents.
          </p>
        </div>

        {/* Create Project */}
        <div className="bg-white border border-[#e5e7ef] rounded-xl p-6 mb-10 shadow-sm max-w-lg">
          <h2 className="text-[13px] font-semibold text-[#0f1117] mb-3 uppercase tracking-wide">
            New Project
          </h2>
          <form onSubmit={handleCreate} className="flex gap-2.5">
            <input
              className="input flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter project name…"
              disabled={creating}
            />
            <button
              type="submit"
              className="btn btn-primary shrink-0 gap-1.5"
              disabled={creating || !newName.trim()}
            >
              {creating
                ? <span className="spinner w-3.5 h-3.5 border-white border-t-transparent" />
                : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create
                  </>
                )}
            </button>
          </form>
        </div>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-semibold text-[#0f1117] uppercase tracking-wide">Projects</h2>
            {projects.length > 0 && (
              <span className="text-[12px] text-[#8b90a7]">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner w-6 h-6 border-[1.5px]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state border border-dashed border-[#e5e7ef] rounded-xl">
              <div className="w-12 h-12 bg-[#f3f4f8] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#8b90a7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <h3>No projects yet</h3>
              <p className="text-sm mt-1">Create your first project above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  onDelete={handleDelete}
                  onClick={() => navigate(`/projects/${p._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
