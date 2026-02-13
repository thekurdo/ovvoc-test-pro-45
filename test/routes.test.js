const request = require('supertest');
const createApp = require('../src/app');

let app;

beforeAll(() => {
  app = createApp();
});

describe('Health Check', () => {
  test('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
  });
});

describe('Users API', () => {
  test('GET /api/users returns seeded users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.users).toBeInstanceOf(Array);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.total).toBe(res.body.users.length);
  });

  test('GET /api/users?status=online filters by status', async () => {
    const res = await request(app).get('/api/users?status=online');
    expect(res.status).toBe(200);
    res.body.users.forEach(user => {
      expect(user.status).toBe('online');
    });
  });

  test('GET /api/users/:id returns specific user', async () => {
    const res = await request(app).get('/api/users/user-1');
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
  });

  test('GET /api/users/:id returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  test('POST /api/users creates a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'diana', displayName: 'Diana Prince' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('diana');
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.status).toBe('online');
  });

  test('POST /api/users returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'incomplete' });
    expect(res.status).toBe(400);
  });

  test('POST /api/users returns 409 for duplicate username', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'alice', displayName: 'Another Alice' });
    expect(res.status).toBe(409);
  });
});

describe('Rooms API', () => {
  test('GET /api/rooms returns seeded rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/rooms?isPrivate=true filters private rooms', async () => {
    const res = await request(app).get('/api/rooms?isPrivate=true');
    expect(res.status).toBe(200);
    res.body.rooms.forEach(room => {
      expect(room.isPrivate).toBe(true);
    });
  });

  test('POST /api/rooms creates a new room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({ name: 'Test Room', description: 'For testing', createdBy: 'user-1' });
    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('Test Room');
    expect(res.body.room.members).toContain('user-1');
  });

  test('POST /api/rooms/:id/join adds member', async () => {
    const res = await request(app)
      .post('/api/rooms/room-1/join')
      .send({ userId: 'user-3' });
    expect(res.status).toBe(200);
    expect(res.body.room.members).toContain('user-3');
  });
});

describe('Messages API', () => {
  test('GET /api/rooms/:id/messages returns messages', async () => {
    const res = await request(app).get('/api/rooms/room-1/messages');
    expect(res.status).toBe(200);
    expect(res.body.messages).toBeInstanceOf(Array);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/rooms/:id/messages creates a message', async () => {
    const res = await request(app)
      .post('/api/rooms/room-1/messages')
      .send({ userId: 'user-1', content: 'Test message' });
    expect(res.status).toBe(201);
    expect(res.body.message.content).toBe('Test message');
    expect(res.body.message.roomId).toBe('room-1');
  });

  test('POST /api/rooms/:id/messages returns 400 for missing content', async () => {
    const res = await request(app)
      .post('/api/rooms/room-1/messages')
      .send({ userId: 'user-1' });
    expect(res.status).toBe(400);
  });
});

describe('Express v4 Patterns', () => {
  test('wildcard * catches unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent/path');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('API endpoint not found');
  });

  test('app.delete() alias works for DELETE', async () => {
    const res = await request(app).delete('/api/cleanup');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cleanup completed');
  });

  test('optional :format? param defaults to json', async () => {
    const res = await request(app).get('/api/export');
    expect(res.status).toBe(200);
    expect(res.body.format).toBe('json');
  });

  test('optional :format? param accepts csv', async () => {
    const res = await request(app).get('/api/export/csv');
    expect(res.status).toBe(200);
    expect(res.body.format).toBe('csv');
  });
});
