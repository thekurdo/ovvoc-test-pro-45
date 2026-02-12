const config = require('../config');

// Track online users and typing states
const onlineUsers = new Map(); // socketId -> { userId, rooms }
const typingTimers = new Map(); // `${roomId}:${userId}` -> timeout

/**
 * Register all Socket.IO event handlers for a connection.
 * Uses Socket.IO v3 APIs: to().emit(), allSockets()
 */
function registerHandlers(io, socket) {
  const userId = socket.userId;

  // Track this connection
  onlineUsers.set(socket.id, { userId, rooms: new Set() });

  // Emit user count using Socket.IO v3 allSockets()
  io.allSockets().then(sockets => {
    io.emit('users:count', { count: sockets.size });
  });

  // --- Join Room ---
  socket.on('room:join', (data, callback) => {
    const { roomId } = data || {};
    if (!roomId) {
      return callback && callback({ error: 'roomId is required' });
    }

    socket.join(roomId);

    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      userInfo.rooms.add(roomId);
    }

    // Notify room members — Socket.IO v3 to().emit()
    socket.to(roomId).emit('room:user_joined', {
      userId,
      roomId,
      timestamp: new Date().toISOString()
    });

    if (callback) {
      callback({ success: true, roomId });
    }
  });

  // --- Leave Room ---
  socket.on('room:leave', (data, callback) => {
    const { roomId } = data || {};
    if (!roomId) {
      return callback && callback({ error: 'roomId is required' });
    }

    socket.leave(roomId);

    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      userInfo.rooms.delete(roomId);
    }

    socket.to(roomId).emit('room:user_left', {
      userId,
      roomId,
      timestamp: new Date().toISOString()
    });

    if (callback) {
      callback({ success: true, roomId });
    }
  });

  // --- Send Message ---
  socket.on('message:send', (data, callback) => {
    const { roomId, content, type } = data || {};
    if (!roomId || !content) {
      return callback && callback({ error: 'roomId and content are required' });
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId,
      content,
      type: type || 'text',
      createdAt: new Date().toISOString()
    };

    // Broadcast to room — Socket.IO v3 to().emit()
    io.to(roomId).emit('message:new', message);

    // Clear typing indicator
    clearTyping(io, roomId, userId);

    if (callback) {
      callback({ success: true, message });
    }
  });

  // --- Typing Indicator ---
  socket.on('typing:start', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    const key = `${roomId}:${userId}`;

    // Clear existing timer
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
    }

    // Broadcast typing status
    socket.to(roomId).emit('typing:update', {
      userId,
      roomId,
      isTyping: true
    });

    // Auto-clear after timeout
    const timer = setTimeout(() => {
      clearTyping(io, roomId, userId);
      typingTimers.delete(key);
    }, config.typingTimeoutMs);
    typingTimers.set(key, timer);
  });

  socket.on('typing:stop', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;
    clearTyping(io, roomId, userId);
  });

  // --- Disconnect ---
  socket.on('disconnect', (reason) => {
    const userInfo = onlineUsers.get(socket.id);
    if (userInfo) {
      // Notify all rooms this user was in
      userInfo.rooms.forEach(roomId => {
        socket.to(roomId).emit('room:user_left', {
          userId,
          roomId,
          reason,
          timestamp: new Date().toISOString()
        });
        clearTyping(io, roomId, userId);
      });
    }

    onlineUsers.delete(socket.id);

    // Update user count
    io.allSockets().then(sockets => {
      io.emit('users:count', { count: sockets.size });
    });
  });
}

function clearTyping(io, roomId, userId) {
  const key = `${roomId}:${userId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
  }
  io.to(roomId).emit('typing:update', {
    userId,
    roomId,
    isTyping: false
  });
}

// Export for testing
module.exports = { registerHandlers, onlineUsers, typingTimers, clearTyping };
