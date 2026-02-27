import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Projects
export const createProject = (name) => api.post('/projects', { name, userId: 'default-user' });
export const listProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const getProjectKnowledgeGraph = (projectId) =>
  api.get(`/projects/${projectId}/knowledge-graph`);

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
