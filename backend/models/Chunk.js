const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  pageNumber: { type: Number, required: true },
});

module.exports = mongoose.model('Chunk', ChunkSchema);
