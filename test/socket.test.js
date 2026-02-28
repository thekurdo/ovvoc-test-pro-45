const http = require('http');
const { Server } = require('socket.io');
const ClientIO = require('socket.io-client');
const createApp = require('../src/app');
const config = require('../src/config');
const { registerHandlers } = require('../src/socket/handlers');
const { authMiddleware } = require('../src/socket/middleware');

let httpServer;
let io;
let clientSocket;
let clientSocket2;

const TEST_PORT = 3458;
const VALID_AUTH = { token: 'Bearer test-token-12345678', userId: 'test-user-1' };

function connectClient(auth = VALID_AUTH) {
  return new Promise((resolve, reject) => {
    const socket = ClientIO(`http://localhost:${TEST_PORT}`, {
      auth,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

beforeAll((done) => {
  const app = createApp();
  httpServer = http.createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: config.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  io.use(authMiddleware);
  io.on('connection', (socket) => {
    registerHandlers(io, socket);
  });
  httpServer.listen(TEST_PORT, () => {
    done();
  });
});

afterEach(() => {
  if (clientSocket && clientSocket.connected) {
    clientSocket.disconnect();
    clientSocket = null;
  }
  if (clientSocket2 && clientSocket2.connected) {
    clientSocket2.disconnect();
    clientSocket2 = null;
  }
});

afterAll((done) => {
  // Socket.IO v3: io.close() closes io AND underlying http server
  io.close(() => {
    done();
  });
}, 10000);

describe('Socket.IO Authentication', () => {
  test('rejects connection without auth token', async () => {
    await expect(connectClient({})).rejects.toThrow('Authentication token required');
  });

  test('rejects connection with invalid token format', async () => {
    await expect(connectClient({ token: 'invalid' })).rejects.toThrow('Invalid token format');
  });

  test('rejects connection with short token', async () => {
    await expect(connectClient({ token: 'Bearer ab' })).rejects.toThrow('Token too short');
  });

  test('accepts connection with valid auth', async () => {
    clientSocket = await connectClient();
    expect(clientSocket.connected).toBe(true);
  });
});

describe('Socket.IO Room Events', () => {
  test('join room returns success via callback', async () => {
    clientSocket = await connectClient();
    const result = await new Promise((resolve) => {
      clientSocket.emit('room:join', { roomId: 'room-1' }, resolve);
    });
    expect(result.success).toBe(true);
    expect(result.roomId).toBe('room-1');
  });

  test('join room without roomId returns error', async () => {
    clientSocket = await connectClient();
    const result = await new Promise((resolve) => {
      clientSocket.emit('room:join', {}, resolve);
    });
    expect(result.error).toBe('roomId is required');
  });

  test('leave room returns success', async () => {
    clientSocket = await connectClient();
    await new Promise((resolve) => {
      clientSocket.emit('room:join', { roomId: 'room-1' }, resolve);
    });
    const result = await new Promise((resolve) => {
      clientSocket.emit('room:leave', { roomId: 'room-1' }, resolve);
    });
    expect(result.success).toBe(true);
  });
});

describe('Socket.IO Messaging', () => {
  test('send message returns message object', async () => {
    clientSocket = await connectClient();
    await new Promise((resolve) => {
      clientSocket.emit('room:join', { roomId: 'room-1' }, resolve);
    });
    const result = await new Promise((resolve) => {
      clientSocket.emit('message:send', {
        roomId: 'room-1',
        content: 'Hello from test!'
      }, resolve);
    });
    expect(result.success).toBe(true);
    expect(result.message.content).toBe('Hello from test!');
    expect(result.message.roomId).toBe('room-1');
    expect(result.message.userId).toBe('test-user-1');
  });

  test('send message without content returns error', async () => {
    clientSocket = await connectClient();
    const result = await new Promise((resolve) => {
      clientSocket.emit('message:send', { roomId: 'room-1' }, resolve);
    });
    expect(result.error).toBe('roomId and content are required');
  });
});

describe('Socket.IO Typing', () => {
  test('typing:start emits typing update to room', async () => {
    clientSocket = await connectClient();
    clientSocket2 = await connectClient({
      token: 'Bearer second-user-token99',
      userId: 'test-user-2'
    });

    // Both join same room
    await new Promise((resolve) => {
      clientSocket.emit('room:join', { roomId: 'typing-room' }, resolve);
    });
    await new Promise((resolve) => {
      clientSocket2.emit('room:join', { roomId: 'typing-room' }, resolve);
    });

    // Listen for typing update on client1
    const typingPromise = new Promise((resolve) => {
      clientSocket.on('typing:update', resolve);
    });

    // Client2 starts typing
    clientSocket2.emit('typing:start', { roomId: 'typing-room' });

    const update = await typingPromise;
    expect(update.userId).toBe('test-user-2');
    expect(update.isTyping).toBe(true);
  });
});
