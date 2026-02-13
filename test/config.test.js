const config = require('../src/config');

describe('Config', () => {
  test('has default port', () => {
    expect(config.port).toBe(3456);
  });

  test('has CORS options with origin function', () => {
    expect(config.corsOptions).toBeDefined();
    expect(typeof config.corsOptions.origin).toBe('function');
  });

  test('CORS allows localhost:3000', (done) => {
    config.corsOptions.origin('http://localhost:3000', (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test('CORS blocks unknown origins', (done) => {
    config.corsOptions.origin('http://evil.com', (err, allowed) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Not allowed by CORS');
      done();
    });
  });

  test('CORS allows requests with no origin', (done) => {
    config.corsOptions.origin(undefined, (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test('has allowed origins list', () => {
    expect(config.allowedOrigins).toContain('http://localhost:3000');
    expect(config.allowedOrigins).toContain('https://app.example.com');
    expect(config.allowedOrigins.length).toBe(4);
  });

  test('has max messages per room', () => {
    expect(config.maxMessagesPerRoom).toBe(500);
  });

  test('has typing timeout', () => {
    expect(config.typingTimeoutMs).toBe(3000);
  });

  test('has max users per room', () => {
    expect(config.maxUsersPerRoom).toBe(50);
  });

  test('CORS methods include GET, POST, DELETE', () => {
    expect(config.corsOptions.methods).toContain('GET');
    expect(config.corsOptions.methods).toContain('POST');
    expect(config.corsOptions.methods).toContain('DELETE');
  });
});
