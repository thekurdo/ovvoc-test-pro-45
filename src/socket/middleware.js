/**
 * Socket.IO v3 auth middleware using use()
 * Validates connection handshake auth token
 */
function authMiddleware(socket, next) {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const userId = socket.handshake.auth && socket.handshake.auth.userId;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  // Simple token validation (in production, verify JWT)
  if (!token.startsWith('Bearer ')) {
    return next(new Error('Invalid token format'));
  }

  const tokenValue = token.slice(7);
  if (tokenValue.length < 8) {
    return next(new Error('Token too short'));
  }

  // Attach user data to socket
  socket.userId = userId || 'anonymous';
  socket.tokenValue = tokenValue;

  next();
}

/**
 * Rate limiting middleware for Socket.IO
 */
function rateLimitMiddleware(maxEventsPerMinute = 60) {
  const eventCounts = new Map();

  return function (socket, next) {
    const key = socket.handshake.address;
    const now = Date.now();
    const windowStart = now - 60000;

    if (!eventCounts.has(key)) {
      eventCounts.set(key, []);
    }

    const events = eventCounts.get(key).filter(ts => ts > windowStart);
    events.push(now);
    eventCounts.set(key, events);

    if (events.length > maxEventsPerMinute) {
      return next(new Error('Rate limit exceeded'));
    }

    next();
  };
}

module.exports = { authMiddleware, rateLimitMiddleware };
