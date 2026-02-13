const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://app.example.com',
  'https://admin.example.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

const config = {
  port: process.env.PORT || 3456,
  corsOptions,
  allowedOrigins: ALLOWED_ORIGINS,
  maxMessagesPerRoom: 500,
  typingTimeoutMs: 3000,
  maxUsersPerRoom: 50
};

module.exports = config;
