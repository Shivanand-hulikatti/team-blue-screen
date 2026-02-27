const Project = require('../models/Project');

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

module.exports = { createProject, listProjects, getProject, deleteProject };
