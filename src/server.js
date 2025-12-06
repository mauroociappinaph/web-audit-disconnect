import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { WebAudit } from './audit.js';
import { AuditStorage } from './storage/audit-storage.js';
import { QueueManager } from './queue/queue-manager.js';
import { WebhookManager } from './webhooks/webhook-manager.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

export class AuditServer {
  constructor() {
    this.app = express();
    this.auditStorage = new AuditStorage();
    this.queueManager = new QueueManager();
    this.webhookManager = new WebhookManager();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupQueueProcessor();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.corsOrigins,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.version
      });
    });

    // API routes
    this.app.use('/api/v1/auth', this.authRoutes());
    this.app.use('/api/v1/audits', this.auditRoutes());
    this.app.use('/api/v1/webhooks', this.webhookRoutes());
    this.app.use('/api/v1/analytics', this.analyticsRoutes());

    // Static files (dashboard)
    this.app.use(express.static('public'));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      logger.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: config.nodeEnv === 'development' ? err.message : undefined
      });
    });
  }

  authRoutes() {
    const router = express.Router();

    // Register
    router.post('/register', async (req, res) => {
      try {
        const { email, password, company, plan } = req.body;

        // Validate input
        if (!email || !password || !company) {
          return res.status(400).json({ error: 'Email, password, and company are required' });
        }

        // Check if user exists
        const existingUser = await this.auditStorage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await this.auditStorage.createUser({
          email,
          password: hashedPassword,
          company,
          plan: plan || 'free',
          apiKey: this.generateApiKey(),
          createdAt: new Date()
        });

        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          message: 'User created successfully',
          user: {
            id: user.id,
            email: user.email,
            company: user.company,
            plan: user.plan,
            apiKey: user.apiKey
          },
          token
        });
      } catch (err) {
        logger.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    // Login
    router.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await this.auditStorage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        res.json({
          user: {
            id: user.id,
            email: user.email,
            company: user.company,
            plan: user.plan
          },
          token
        });
      } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Verify token middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
      });
    };

    // Get profile
    router.get('/profile', authenticateToken, async (req, res) => {
      try {
        const user = await this.auditStorage.getUserById(req.user.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          id: user.id,
          email: user.email,
          company: user.company,
          plan: user.plan,
          apiKey: user.apiKey,
          createdAt: user.createdAt,
          auditCount: user.auditCount || 0,
          lastAuditAt: user.lastAuditAt
        });
      } catch (err) {
        logger.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
      }
    });

    return router;
  }

  auditRoutes() {
    const router = express.Router();

    // Middleware to authenticate and check plan limits
    const authenticateAndCheckLimits = async (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;

        // Check plan limits
        const user = await this.auditStorage.getUserById(decoded.userId);
        const planLimits = config.plans[user.plan] || config.plans.free;

        if (user.auditCount >= planLimits.monthlyAudits) {
          return res.status(429).json({
            error: 'Monthly audit limit reached',
            limit: planLimits.monthlyAudits,
            used: user.auditCount
          });
        }

        next();
      } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };

    // API Key authentication (for integrations)
    const authenticateApiKey = async (req, res, next) => {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      try {
        const user = await this.auditStorage.getUserByApiKey(apiKey);
        if (!user) {
          return res.status(401).json({ error: 'Invalid API key' });
        }

        req.user = { userId: user.id, email: user.email };
        next();
      } catch (err) {
        logger.error('API key auth error:', err);
        res.status(500).json({ error: 'Authentication failed' });
      }
    };

    // Create audit (async - queue)
    router.post('/', authenticateAndCheckLimits, async (req, res) => {
      try {
        const { url, clientName, options } = req.body;

        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }

        // Create audit record
        const auditRecord = await this.auditStorage.createAudit({
          userId: req.user.userId,
          url,
          clientName: clientName || 'Default',
          status: 'queued',
          createdAt: new Date(),
          options: options || {}
        });

        // Add to queue
        await this.queueManager.addAuditJob({
          auditId: auditRecord.id,
          userId: req.user.userId,
          url,
          clientName: clientName || 'Default',
          options: options || {}
        });

        res.status(202).json({
          message: 'Audit queued successfully',
          auditId: auditRecord.id,
          status: 'queued',
          estimatedTime: '30-60 seconds'
        });
      } catch (err) {
        logger.error('Audit creation error:', err);
        res.status(500).json({ error: 'Failed to create audit' });
      }
    });

    // Get audit status/results
    router.get('/:auditId', authenticateAndCheckLimits, async (req, res) => {
      try {
        const { auditId } = req.params;

        // Verify ownership
        const audit = await this.auditStorage.getAuditById(auditId);
        if (!audit || audit.userId !== req.user.userId) {
          return res.status(404).json({ error: 'Audit not found' });
        }

        res.json({
          id: audit.id,
          url: audit.url,
          clientName: audit.clientName,
          status: audit.status,
          createdAt: audit.createdAt,
          completedAt: audit.completedAt,
          results: audit.results,
          error: audit.error
        });
      } catch (err) {
        logger.error('Audit fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch audit' });
      }
    });

    // Get user's audits
    router.get('/', authenticateAndCheckLimits, async (req, res) => {
      try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const audits = await this.auditStorage.getUserAudits(req.user.userId, limit, offset);

        res.json({
          audits: audits.map(audit => ({
            id: audit.id,
            url: audit.url,
            clientName: audit.clientName,
            status: audit.status,
            createdAt: audit.createdAt,
            completedAt: audit.completedAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: audits.length === parseInt(limit)
          }
        });
      } catch (err) {
        logger.error('Audits fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch audits' });
      }
    });

    // Delete audit
    router.delete('/:auditId', authenticateAndCheckLimits, async (req, res) => {
      try {
        const { auditId } = req.params;

        // Verify ownership
        const audit = await this.auditStorage.getAuditById(auditId);
        if (!audit || audit.userId !== req.user.userId) {
          return res.status(404).json({ error: 'Audit not found' });
        }

        await this.auditStorage.deleteAudit(auditId);
        res.json({ message: 'Audit deleted successfully' });
      } catch (err) {
        logger.error('Audit deletion error:', err);
        res.status(500).json({ error: 'Failed to delete audit' });
      }
    });

    return router;
  }

  webhookRoutes() {
    const router = express.Router();

    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
      });
    };

    // Create webhook
    router.post('/', authenticateToken, async (req, res) => {
      try {
        const { url, events, secret } = req.body;

        if (!url || !events || !Array.isArray(events)) {
          return res.status(400).json({ error: 'URL and events array are required' });
        }

        const webhook = await this.auditStorage.createWebhook({
          userId: req.user.userId,
          url,
          events,
          secret: secret || this.generateWebhookSecret(),
          createdAt: new Date(),
          active: true
        });

        res.status(201).json({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret,
          active: webhook.active,
          createdAt: webhook.createdAt
        });
      } catch (err) {
        logger.error('Webhook creation error:', err);
        res.status(500).json({ error: 'Failed to create webhook' });
      }
    });

    // Get webhooks
    router.get('/', authenticateToken, async (req, res) => {
      try {
        const webhooks = await this.auditStorage.getUserWebhooks(req.user.userId);
        res.json({
          webhooks: webhooks.map(wh => ({
            id: wh.id,
            url: wh.url,
            events: wh.events,
            active: wh.active,
            createdAt: wh.createdAt,
            lastTriggered: wh.lastTriggered,
            failureCount: wh.failureCount
          }))
        });
      } catch (err) {
        logger.error('Webhooks fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch webhooks' });
      }
    });

    // Delete webhook
    router.delete('/:webhookId', authenticateToken, async (req, res) => {
      try {
        const { webhookId } = req.params;

        // Verify ownership
        const webhook = await this.auditStorage.getWebhookById(webhookId);
        if (!webhook || webhook.userId !== req.user.userId) {
          return res.status(404).json({ error: 'Webhook not found' });
        }

        await this.auditStorage.deleteWebhook(webhookId);
        res.json({ message: 'Webhook deleted successfully' });
      } catch (err) {
        logger.error('Webhook deletion error:', err);
        res.status(500).json({ error: 'Failed to delete webhook' });
      }
    });

    return router;
  }

  analyticsRoutes() {
    const router = express.Router();

    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
      });
    };

    // Get user analytics
    router.get('/overview', authenticateToken, async (req, res) => {
      try {
        const analytics = await this.auditStorage.getUserAnalytics(req.user.userId);

        res.json({
          totalAudits: analytics.totalAudits,
          auditsThisMonth: analytics.auditsThisMonth,
          averageScore: analytics.averageScore,
          topIssues: analytics.topIssues,
          performanceTrend: analytics.performanceTrend,
          lastUpdated: new Date().toISOString()
        });
      } catch (err) {
        logger.error('Analytics fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    });

    return router;
  }

  setupQueueProcessor() {
    this.queueManager.on('auditCompleted', async (auditData) => {
      try {
        // Update audit record
        await this.auditStorage.updateAudit(auditData.auditId, {
          status: 'completed',
          results: auditData.results,
          completedAt: new Date()
        });

        // Update user audit count
        await this.auditStorage.incrementUserAuditCount(auditData.userId);

        // Trigger webhooks
        await this.webhookManager.triggerWebhooks(auditData.userId, 'audit.completed', {
          auditId: auditData.auditId,
          url: auditData.url,
          results: auditData.results,
          completedAt: new Date().toISOString()
        });

        logger.info(`Audit ${auditData.auditId} completed successfully`);
      } catch (err) {
        logger.error('Queue processor error:', err);
      }
    });

    this.queueManager.on('auditFailed', async (auditData) => {
      try {
        await this.auditStorage.updateAudit(auditData.auditId, {
          status: 'failed',
          error: auditData.error,
          completedAt: new Date()
        });

        // Trigger webhooks
        await this.webhookManager.triggerWebhooks(auditData.userId, 'audit.failed', {
          auditId: auditData.auditId,
          url: auditData.url,
          error: auditData.error,
          failedAt: new Date().toISOString()
        });

        logger.error(`Audit ${auditData.auditId} failed:`, auditData.error);
      } catch (err) {
        logger.error('Queue processor error:', err);
      }
    });
  }

  generateApiKey() {
    return 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  generateWebhookSecret() {
    return 'whs_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  start(port = config.port) {
    this.app.listen(port, () => {
      logger.info(`AuditServer running on port ${port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${port}/health`);
    });
  }

  async stop() {
    await this.auditStorage.close();
    await this.queueManager.close();
    logger.info('AuditServer stopped');
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AuditServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

export default AuditServer;
