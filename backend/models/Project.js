const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },

  // ── Project summary fields ──────────────────────────────────────
  summary: { type: String, default: '' },
  summaryStatus: {
    type: String,
    enum: ['NONE', 'GENERATING', 'DONE', 'ERROR'],
    default: 'NONE',
  },
  summaryError: { type: String, default: '' },
  summaryGeneratedAt: { type: Date },
});

module.exports = mongoose.model('Project', ProjectSchema);
