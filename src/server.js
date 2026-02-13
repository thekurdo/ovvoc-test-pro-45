const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const config = require('./config');
const { registerHandlers } = require('./socket/handlers');
const { authMiddleware } = require('./socket/middleware');

function createServer(options = {}) {
  const app = createApp();
  const server = http.createServer(app);

  // Socket.IO v3 — attach to HTTP server
  const io = new Server(server, {
    cors: {
      origin: config.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 10000,
    pingInterval: 5000
  });

  // Socket.IO v3 use() middleware
  io.use(authMiddleware);

  // Register socket event handlers
  io.on('connection', (socket) => {
    registerHandlers(io, socket);
  });

  // Attach io to app for route access
  app.set('io', io);

  const port = options.port || config.port;

  return { app, server, io, port };
}

function startServer() {
  const { server, port } = createServer();
  server.listen(port, () => {
    console.log(`Realtime API server running on port ${port}`);
  });
  return server;
}

// Start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { createServer, startServer };
