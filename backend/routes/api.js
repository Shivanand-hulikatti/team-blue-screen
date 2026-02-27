const express = require('express');
const router = express.Router();

const { createProject, listProjects, getProject, deleteProject } = require('../controllers/projectController');
const { uploadDocument, listDocuments, getDocument, getInsights, createInsight } = require('../controllers/documentController');
const { chatWithProject } = require('../controllers/chatController');

// Projects
router.post('/projects', createProject);
router.get('/projects', listProjects);
router.get('/projects/:id', getProject);
router.delete('/projects/:id', deleteProject);

// Documents
router.post('/projects/:projectId/upload', uploadDocument);
router.get('/projects/:projectId/documents', listDocuments);
router.get('/projects/:projectId/documents/:documentId/insights', getInsights);
router.post('/projects/:projectId/documents/:documentId/insights', createInsight);
router.get('/documents/:documentId', getDocument);

// Chat (strictly project-scoped)
router.post('/projects/:projectId/chat', chatWithProject);

module.exports = router;
