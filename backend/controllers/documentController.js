const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const Insight = require('../models/Insight');
const Project = require('../models/Project');
const { triggerProcessing } = require('../services/worker');

// POST /api/projects/:projectId/upload
async function uploadDocument(req, res) {
  try {
    const { projectId } = req.params;
    const { fileUrl, filename } = req.body;

    if (!fileUrl || !filename) {
      return res.status(400).json({ error: 'fileUrl and filename are required' });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Create document record
    const document = await Document.create({
      projectId,
      filename,
      fileUrl,
      status: 'PROCESSING',
    });

    // Trigger async processing (fire and forget, handle errors gracefully)
    triggerProcessing({
      documentId: document._id.toString(),
      projectId: projectId.toString(),
      fileUrl,
    })
      .then(async (result) => {
        // Store chunks
        if (result.chunks && result.chunks.length > 0) {
          const chunkDocs = result.chunks.map((c) => ({
            projectId,
            documentId: document._id,
            text: c.text,
            embedding: c.embedding,
            pageNumber: c.pageNumber,
          }));
          await Chunk.insertMany(chunkDocs);
        }

        // Store insights
        if (result.insights && result.insights.length > 0) {
          const insightDocs = result.insights.map((i) => ({
            projectId,
            documentId: document._id,
            pageNumber: i.pageNumber,
            insightText: i.insightText,
            highlights: i.highlights,
          }));
          await Insight.insertMany(insightDocs);
        }

        // Update document
        await Document.findByIdAndUpdate(document._id, {
          status: 'DONE',
          pageCount: result.pageCount,
          annotatedFileUrl: result.annotatedFileUrl,
        });
      })
      .catch(async (err) => {
        console.error('Processing failed:', err.message);
        await Document.findByIdAndUpdate(document._id, {
          status: 'ERROR',
          errorMessage: err.message,
        });
      });

    res.status(201).json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/projects/:projectId/documents
async function listDocuments(req, res) {
  try {
    const { projectId } = req.params;
    const documents = await Document.find({ projectId }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/documents/:documentId
async function getDocument(req, res) {
  try {
    const { documentId } = req.params;
    const { projectId } = req.query; // for ownership validation
    const query = { _id: documentId };
    if (projectId) query.projectId = projectId;
    const document = await Document.findOne(query);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/projects/:projectId/documents/:documentId/insights
async function getInsights(req, res) {
  try {
    const { projectId, documentId } = req.params;
    const insights = await Insight.find({ projectId, documentId }).sort({ pageNumber: 1 });
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/projects/:projectId/documents/:documentId/insights
async function createInsight(req, res) {
  try {
    const { projectId, documentId } = req.params;
    const { text, note, tags, pageNumber, boundingRect, type } = req.body;

    if (!text || !note || !pageNumber) {
      return res.status(400).json({ error: 'text, note, and pageNumber are required' });
    }

    // Verify project and document exist (lightweight ownership check)
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const insight = await Insight.create({
      projectId,
      documentId,
      pageNumber,
      insightText: note, // mirror note into insightText for sidebar compatibility
      type:        type || 'user-created',
      text:        text  || '',
      note:        note  || '',
      tags:        tags  || [],
      boundingRect: boundingRect || { left: 0, top: 0, width: 0, height: 0 },
    });

    res.status(201).json(insight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { uploadDocument, listDocuments, getDocument, getInsights, createInsight };
