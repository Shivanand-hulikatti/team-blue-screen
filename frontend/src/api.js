import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Projects
export const createProject = (name) => api.post('/projects', { name, userId: 'default-user' });
export const listProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const getProjectKnowledgeGraph = (projectId, params = {}) =>
  api.get(`/projects/${projectId}/knowledge-graph`, { params });

// Documents
export const uploadDocument = (projectId, fileUrl, filename) =>
  api.post(`/projects/${projectId}/upload`, { fileUrl, filename });
export const listDocuments = (projectId) => api.get(`/projects/${projectId}/documents`);
export const getDocument = (documentId, projectId) =>
  api.get(`/documents/${documentId}`, { params: { projectId } });
export const getInsights = (projectId, documentId) =>
  api.get(`/projects/${projectId}/documents/${documentId}/insights`);

// Insights
export const createInsight = (projectId, documentId, payload) =>
  api.post(`/projects/${projectId}/documents/${documentId}/insights`, payload);

// Chat
export const sendChat = (projectId, data) =>
  api.post(`/projects/${projectId}/chat`, data);

// Project Summary
export const generateProjectSummary = (projectId) =>
  api.post(`/projects/${projectId}/summary`);
export const getProjectSummary = (projectId) =>
  api.get(`/projects/${projectId}/summary`);
