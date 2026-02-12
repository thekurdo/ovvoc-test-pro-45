const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const router = express.Router();

// In-memory store: roomId -> messages[]
const messagesByRoom = new Map();

// Seed messages
messagesByRoom.set('room-1', [
  { id: 'msg-1', roomId: 'room-1', userId: 'user-1', content: 'Hello everyone!', type: 'text', createdAt: new Date().toISOString() },
  { id: 'msg-2', roomId: 'room-1', userId: 'user-2', content: 'Hey Alice!', type: 'text', createdAt: new Date().toISOString() }
]);
messagesByRoom.set('room-2', [
  { id: 'msg-3', roomId: 'room-2', userId: 'user-1', content: 'New deployment going out', type: 'text', createdAt: new Date().toISOString() }
]);

// GET /api/rooms/:id/messages — get messages for a room
router.get('/:id/messages', (req, res) => {
  const messages = messagesByRoom.get(req.params.id) || [];
  const { limit, offset } = req.query;
  let result = [...messages];

  // Pagination
  const start = parseInt(offset) || 0;
  const count = parseInt(limit) || 50;
  result = result.slice(start, start + count);

  res.json({ messages: result, total: messages.length, roomId: req.params.id });
});

// POST /api/rooms/:id/messages — send a message
router.post('/:id/messages', (req, res) => {
  const { userId, content, type } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content are required' });
  }

  const roomId = req.params.id;
  if (!messagesByRoom.has(roomId)) {
    messagesByRoom.set(roomId, []);
  }

  const roomMessages = messagesByRoom.get(roomId);

  // Enforce max messages per room
  if (roomMessages.length >= config.maxMessagesPerRoom) {
    roomMessages.shift(); // Remove oldest
  }

  const message = {
    id: uuidv4(),
    roomId,
    userId,
    content,
    type: type || 'text',
    createdAt: new Date().toISOString()
  };
  roomMessages.push(message);

  res.status(201).json({ message });
});

// GET /api/rooms/:id/messages/:msgId — get single message
router.get('/:id/messages/:msgId', (req, res) => {
  const messages = messagesByRoom.get(req.params.id) || [];
  const message = messages.find(m => m.id === req.params.msgId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json({ message });
});

// Export for testing
router._messagesByRoom = messagesByRoom;

module.exports = router;
