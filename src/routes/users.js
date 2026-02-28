const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory store
const users = new Map();

// Seed some users
const seedUsers = [
  { id: 'user-1', username: 'alice', displayName: 'Alice Chen', status: 'online', createdAt: new Date().toISOString() },
  { id: 'user-2', username: 'bob', displayName: 'Bob Smith', status: 'offline', createdAt: new Date().toISOString() },
  { id: 'user-3', username: 'charlie', displayName: 'Charlie Davis', status: 'away', createdAt: new Date().toISOString() }
];
seedUsers.forEach(u => users.set(u.id, u));

// GET /api/users — list all users
router.get('/', (req, res) => {
  const { status } = req.query;
  let result = Array.from(users.values());
  if (status) {
    result = result.filter(u => u.status === status);
  }
  res.json({ users: result, total: result.length });
});

// GET /api/users/:id — get user by ID
router.get('/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// POST /api/users — create user
router.post('/', (req, res) => {
  const { username, displayName } = req.body;
  if (!username || !displayName) {
    return res.status(400).json({ error: 'username and displayName are required' });
  }

  // Check duplicate username
  const existing = Array.from(users.values()).find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const user = {
    id: uuidv4(),
    username,
    displayName,
    status: 'online',
    createdAt: new Date().toISOString()
  };
  users.set(user.id, user);
  res.status(201).json({ user });
});

// PUT /api/users/:id/status — update user status
router.put('/:id/status', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { status } = req.body;
  const validStatuses = ['online', 'offline', 'away', 'busy'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  user.status = status;
  res.json({ user });
});

// Export users map for testing
router._users = users;

module.exports = router;
