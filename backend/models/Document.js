const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  filename: { type: String, required: true },
  fileUrl: { type: String, required: true },
  annotatedFileUrl: { type: String },
  status: {
    type: String,
    enum: ['UPLOADED', 'PROCESSING', 'DONE', 'ERROR'],
    default: 'UPLOADED',
  },
  pageCount: { type: Number },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', DocumentSchema);
