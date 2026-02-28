const Chunk = require('../models/Chunk');
const Document = require('../models/Document');
const Project = require('../models/Project');
const { embedText } = require('../services/embedding');
const { chat, chatWithImage } = require('../services/llm');
const { topKChunks } = require('../utils/similarity');

// Heuristic: does the question look like a "suggest papers / further reading" request?
function isPaperSuggestionQuery(text) {
  const t = text.toLowerCase();
  return (
    /suggest|recommend|related paper|further read|more paper|should i read|what else|similar paper|reference|citation/.test(t)
  );
}

// POST /api/projects/:projectId/chat
async function chatWithProject(req, res) {
  try {
    const { projectId } = req.params;

    // log incoming body for debugging content-type / JSON parse issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('chat endpoint received body:', req.body);
    }

    // Accept both legacy 'question' and new 'message' field
    // Support two payload formats:
    // 1. { message: '...' } or { question: '...' } (current API)
    // 2. raw string body (legacy clients occasionally send just a string)
    let question, message, context, documentId, imageBase64;
    if (typeof req.body === 'string') {
      message = req.body;
    } else {
      ({ question, message, context, documentId, imageBase64 } = req.body);
    }
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

    // ── Fetch all documents in this project for paper-suggestion context ──────
    const allDocuments = await Document.find({ projectId, status: 'DONE' }).lean();
    const paperTitles = allDocuments.map((d) => d.filename.replace(/\.[^/.]+$/, '')); // strip extension

    // Which document is the user currently viewing (if any)?
    let currentPaperTitle = '';
    if (documentId) {
      const currentDoc = allDocuments.find((d) => String(d._id) === String(documentId));
      if (currentDoc) currentPaperTitle = currentDoc.filename.replace(/\.[^/.]+$/, '');
    }

    // ── RAG retrieval ─────────────────────────────────────────────────────────

    // Generate embedding for question — include selected context so RAG
    // retrieval works even when the user types a short command like "summarize"
    const embeddingInput = context
      ? `${userQuestion} ${context}`
      : userQuestion;

    let topChunks = [];
    let ragContext = '';

    // Only attempt embedding + similarity search when there are processed chunks
    const chunkQuery = { projectId };
    if (documentId) chunkQuery.documentId = documentId;
    const chunks = await Chunk.find(chunkQuery).lean();

    if (chunks.length > 0) {
      const queryEmbedding = await embedText(embeddingInput);
      topChunks = topKChunks(queryEmbedding, chunks, 5);
      ragContext = topChunks
        .map((c, i) => `[Source ${i + 1} - Page ${c.pageNumber}]\n${c.text}`)
        .join('\n\n---\n\n');
    }

    // ── Build system prompt ───────────────────────────────────────────────────

    const paperListNote = paperTitles.length > 0
      ? `\n\nPapers currently in this project:\n${paperTitles.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
      : '';

    const currentPaperNote = currentPaperTitle
      ? `\nThe user is currently reading: "${currentPaperTitle}"`
      : '';

    const systemPrompt = `You are an expert research assistant for the project "${project.name}".
You help researchers understand papers, explore research topics, and discover relevant literature.${paperListNote}${currentPaperNote}

How to respond:

1. **Research & academic questions (ALWAYS answer these):**
   - Questions about concepts, methods, models, datasets, metrics, findings, authors, or fields related to the papers — answer fully using the provided document context AND your broad academic knowledge.
   - If document context is available, cite sources (e.g. [Source 1]) when referencing specific content from it.
   - If no document context is available or it is insufficient, draw on your academic knowledge to give a thorough, accurate answer and note that the answer comes from general knowledge rather than the uploaded documents.

2. **Paper / further reading suggestions:**
   - When the user asks for paper recommendations, related work, or further reading, use the current paper title${currentPaperTitle ? ` ("${currentPaperTitle}")` : ''} and the overall topic of the project as the basis.
   - Suggest 3-5 real, well-known papers that are closely related to the topic — include the paper title, authors (if known), and a one-line reason why it is relevant.
   - You may also mention any other papers already in the project that are relevant.

3. **Conversational openers** (e.g. "hi", "thanks"):
   - Respond naturally in one short sentence, then offer to help with the research.

4. **Off-topic questions** (completely unrelated to research, e.g. cooking, personal advice, entertainment):
   - Politely decline and redirect: "I'm a research assistant — feel free to ask me anything about the papers or research topics in this project."

5. Never fabricate paper titles, authors, or findings. If you are unsure of a specific citation, say so.`;

    // ── Build user message ────────────────────────────────────────────────────

    const selectionContext = context
      ? `\n\nThe user is asking about this specific passage from the document:\n"${context}"\n`
      : '';

    const noDocsNote = chunks.length === 0
      ? '\n\n[Note: No document chunks are indexed yet for this project. Answer using your general academic knowledge.]\n'
      : '';

    const userMessage = ragContext
      ? `Document context:\n${ragContext}${selectionContext}${noDocsNote}\n\nQuestion: ${userQuestion}`
      : `${noDocsNote}${selectionContext}Question: ${userQuestion}`;

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