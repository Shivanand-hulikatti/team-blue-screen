const Chunk = require('../models/Chunk');
const Project = require('../models/Project');
const { embedText } = require('../services/embedding');
const { chat, chatWithImage } = require('../services/llm');
const { topKChunks } = require('../utils/similarity');

// POST /api/projects/:projectId/chat
async function chatWithProject(req, res) {
  try {
    const { projectId } = req.params;
    // Accept both legacy 'question' and new 'message' field
    const { question, message, context, documentId, imageBase64 } = req.body;
    const userQuestion = message || question;

    if (!userQuestion && !imageBase64) return res.status(400).json({ error: 'message is required' });

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // ── Vision path: image attached ──────────────────────────────────────────
    if (imageBase64) {
      const answer = await chatWithImage(
        userQuestion || 'Explain what is shown in this image.',
        imageBase64,
        context || '',
      );
      return res.json({ answer, sources: [] });
    }

    // ── Standard RAG path ────────────────────────────────────────────────────

    // Generate embedding for question — include selected context so RAG
    // retrieval works even when the user types a short command like "summarize"
    const embeddingInput = context
      ? `${userQuestion} ${context}`
      : userQuestion;
    const queryEmbedding = await embedText(embeddingInput);

    // Fetch chunks — optionally scoped to a specific document
    const chunkQuery = { projectId };
    if (documentId) chunkQuery.documentId = documentId;
    const chunks = await Chunk.find(chunkQuery).lean();

    if (chunks.length === 0) {
      return res.json({
        answer: "No documents have been processed for this project yet. Please upload and wait for processing to complete.",
        sources: [],
      });
    }

    // Rank by cosine similarity
    const topChunks = topKChunks(queryEmbedding, chunks, 5);

    // Build context — prepend user-supplied selection context if present
    const ragContext = topChunks
      .map((c, i) => `[Source ${i + 1} - Page ${c.pageNumber}]\n${c.text}`)
      .join('\n\n---\n\n');

    const selectionContext = context
      ? `\n\nUser is asking about this specific passage from the document:\n"${context}"\n`
      : '';

    const systemPrompt = `You are a research assistant for the project "${project.name}". 
Answer ONLY based on the provided context below. 
If the answer is not in the context, say "I could not find information about this in the project documents."
Do NOT use any external knowledge. Be concise and cite source numbers when referencing content.`;

    const userMessage = `Context:\n${ragContext}${selectionContext}\n\nQuestion: ${userQuestion}`;

    const answer = await chat(systemPrompt, userMessage);

    res.json({
      answer,
      sources: topChunks.map((c) => ({
        pageNumber: c.pageNumber,
        documentId: c.documentId,
        score:      c.score,
        preview:    c.text.slice(0, 120) + '...',
      })),
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chatWithProject };
