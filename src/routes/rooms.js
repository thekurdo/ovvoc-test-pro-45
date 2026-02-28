const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const router = express.Router();

// In-memory store
const rooms = new Map();

// Seed rooms
const seedRooms = [
  { id: 'room-1', name: 'General', description: 'General discussion', members: ['user-1', 'user-2'], createdBy: 'user-1', createdAt: new Date().toISOString(), isPrivate: false },
  { id: 'room-2', name: 'Engineering', description: 'Tech talk', members: ['user-1', 'user-3'], createdBy: 'user-1', createdAt: new Date().toISOString(), isPrivate: false },
  { id: 'room-3', name: 'Private DM', description: 'Direct message', members: ['user-1', 'user-2'], createdBy: 'user-2', createdAt: new Date().toISOString(), isPrivate: true }
];
seedRooms.forEach(r => rooms.set(r.id, r));

// GET /api/rooms — list rooms
router.get('/', (req, res) => {
  const { isPrivate } = req.query;
  let result = Array.from(rooms.values());
  if (isPrivate !== undefined) {
    result = result.filter(r => r.isPrivate === (isPrivate === 'true'));
  }
  res.json({ rooms: result, total: result.length });
});

// GET /api/rooms/:id — get room by ID
router.get('/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room });
});

// POST /api/rooms — create room
router.post('/', (req, res) => {
  const { name, description, isPrivate, createdBy } = req.body;
  if (!name || !createdBy) {
    return res.status(400).json({ error: 'name and createdBy are required' });
  }

  const room = {
    id: uuidv4(),
    name,
    description: description || '',
    members: [createdBy],
    createdBy,
    createdAt: new Date().toISOString(),
    isPrivate: isPrivate || false
  };
  rooms.set(room.id, room);
  res.status(201).json({ room });
});

// POST /api/rooms/:id/join — join a room
router.post('/:id/join', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (room.members.length >= config.maxUsersPerRoom) {
    return res.status(403).json({ error: 'Room is full' });
  }
  if (!room.members.includes(userId)) {
    room.members.push(userId);
  }
  res.json({ room });
});

// Export rooms map for testing
router._rooms = rooms;

module.exports = router;
