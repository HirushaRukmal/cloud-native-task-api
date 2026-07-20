const express = require('express');
const { randomUUID } = require('node:crypto');
const { register, metricsMiddleware } = require('./metrics');

function createApp() {
  const app = express();
  const tasks = new Map();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/', (req, res) => {
    res.json({
      service: process.env.APP_NAME || 'cloud-native-task-api',
      version: process.env.APP_VERSION || '1.0.0',
      status: 'running',
      endpoints: ['/healthz', '/readyz', '/api/tasks', '/metrics'],
    });
  });

  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.get('/readyz', (req, res) => {
    res.status(200).json({ status: 'ready' });
  });

  app.get('/api/tasks', (req, res) => {
    res.json({ items: Array.from(tasks.values()), count: tasks.size });
  });

  app.post('/api/tasks', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const task = {
      id: randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.set(task.id, task);
    return res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'task not found' });
    }

    if (req.body.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title) {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      task.title = title;
    }

    if (req.body.completed !== undefined) {
      if (typeof req.body.completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be a boolean' });
      }
      task.completed = req.body.completed;
    }

    task.updatedAt = new Date().toISOString();
    tasks.set(task.id, task);
    return res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    if (!tasks.delete(req.params.id)) {
      return res.status(404).json({ error: 'task not found' });
    }
    return res.status(204).send();
  });

  app.get('/metrics', async (req, res, next) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'route not found' });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) {
      return next(error);
    }
    return res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
