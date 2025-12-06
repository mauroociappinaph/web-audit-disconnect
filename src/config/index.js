import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration (for future use)
  database: {
    url: process.env.DATABASE_URL,
    type: process.env.DATABASE_TYPE || 'sqlite'
  },

  // PageSpeed Insights API
  psiApiKey: process.env.PSI_API_KEY,

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100 // requests per windowMs
  },

  // CORS Configuration
  corsOrigins: process.env.CORS_ORIGINS ?
    process.env.CORS_ORIGINS.split(',') :
    ['http://localhost:3000', 'http://localhost:3001'],

  // Plan Limits
  plans: {
    free: {
      monthlyAudits: 10,
      maxUrls: 1,
      features: ['basic-audit', 'html-report']
    },
    pro: {
      monthlyAudits: 100,
      maxUrls: 5,
      features: ['basic-audit', 'html-report', 'json-report', 'api-access']
    },
    enterprise: {
      monthlyAudits: 1000,
      maxUrls: 50,
      features: ['basic-audit', 'html-report', 'json-report', 'api-access', 'webhooks', 'analytics']
    }
  },

  // Version
  version: process.env.npm_package_version || '1.0.0',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Queue Configuration (for future Redis implementation)
  queue: {
    redisUrl: process.env.REDIS_URL,
    concurrency: process.env.QUEUE_CONCURRENCY || 2,
    timeout: process.env.QUEUE_TIMEOUT || 300000 // 5 minutes
  },

  // Webhook Configuration
  webhooks: {
    maxRetries: 3,
    timeout: 10000,
    secretLength: 32
  }
};

export default config;
