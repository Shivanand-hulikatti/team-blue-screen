const Project = require('../models/Project');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { chat } = require('../services/llm');

// POST /api/projects
async function createProject(req, res) {
  try {
    const { name, userId = 'default-user' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const project = await Project.create({ name, userId });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/projects
async function listProjects(req, res) {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/projects/:id
async function getProject(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/projects/:id
async function deleteProject(req, res) {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/projects/:id/summary — generate project summary from all document chunks
async function generateSummary(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get all done documents for this project
    const documents = await Document.find({ projectId: project._id, status: 'DONE' });
    if (documents.length === 0) {
      return res.status(400).json({ error: 'No processed documents in this project yet.' });
    }

    // Mark as generating
    project.summaryStatus = 'GENERATING';
    project.summaryError = '';
    await project.save();

    // Respond immediately so UI can show loading state
    res.json({ status: 'GENERATING' });

    // ── Background generation ──────────────────────────────────────
    (async () => {
      try {
        // Gather all chunks, up to a reasonable context limit (~60k chars)
        const chunks = await Chunk.find({ projectId: project._id })
          .sort({ documentId: 1, pageNumber: 1 })
          .lean();

        // Build document-grouped content
        const docMap = {};
        for (const doc of documents) {
          docMap[doc._id.toString()] = doc.filename;
        }

        let compiledText = '';
        const MAX_CHARS = 60000;
        for (const chunk of chunks) {
          const docName = docMap[chunk.documentId?.toString()] || 'Unknown';
          const entry = `[${docName} — p.${chunk.pageNumber}]\n${chunk.text}\n\n`;
          if (compiledText.length + entry.length > MAX_CHARS) break;
          compiledText += entry;
        }

        const systemPrompt = `You are an expert research summarizer. Your task is to analyze ONLY the document content provided below and produce a comprehensive, well-structured summary strictly based on that content.

Do NOT introduce outside knowledge, opinions, or information not present in the provided text.

Your summary must include:
1. **Project Overview** — A 2-3 sentence high-level description of what this project/collection of documents is about, based solely on the provided content.
2. **Key Themes & Topics** — The main themes, subjects, and recurring topics found across the documents.
3. **Core Findings & Insights** — The most important findings, conclusions, data points, or arguments that appear in the documents.
4. **Document Breakdown** — A brief summary of what each individual document contributes, citing the document name.
5. **Connections & Patterns** — Cross-document connections, contradictions, or complementary information found within the provided content.
6. **Research Gaps** — Any apparent gaps or unanswered questions visible from within the documents themselves.

Use Markdown formatting with headers, bullet points, and bold text for readability. Be thorough but concise. Always cite specific document names when referencing findings. Do not speculate beyond what the documents state.`;

        const userMessage = `Here is the extracted content from ${documents.length} document(s) in the project "${project.name}":\n\n${compiledText}`;

        const summary = await chat(systemPrompt, userMessage);

        project.summary = summary;
        project.summaryStatus = 'DONE';
        project.summaryGeneratedAt = new Date();
        await project.save();
      } catch (err) {
        console.error('Summary generation failed:', err.message);
        project.summaryStatus = 'ERROR';
        project.summaryError = err.message;
        await project.save();
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/projects/:id/summary — get current summary state
async function getProjectSummary(req, res) {
  try {
    const project = await Project.findById(req.params.id).select('summary summaryStatus summaryError summaryGeneratedAt name');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({
      summary: project.summary,
      status: project.summaryStatus,
      error: project.summaryError,
      generatedAt: project.summaryGeneratedAt,
      projectName: project.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createProject, listProjects, getProject, deleteProject, generateSummary, getProjectSummary };
