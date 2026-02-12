const express = require('express');
const cors = require('cors');
const config = require('./config');
const usersRouter = require('./routes/users');
const roomsRouter = require('./routes/rooms');
const messagesRouter = require('./routes/messages');

function createApp() {
  const app = express();

  // CORS middleware with v2 API — cors({origin, methods})
  app.use(cors(config.corsOptions));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // API routes
  app.use('/api/users', usersRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/rooms', messagesRouter);

  // Express v4 app.del() alias for app.delete()
  app.del('/api/cleanup', (req, res) => {
    res.json({ message: 'Cleanup completed' });
  });

  // Express v4 optional param pattern :format?
  app.get('/api/export/:format?', (req, res) => {
    const format = req.params.format || 'json';
    res.json({ format, message: `Exporting as ${format}` });
  });

  // Express v4 wildcard pattern: catch-all with * (must be LAST)
  app.get('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'CORS not allowed' });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
