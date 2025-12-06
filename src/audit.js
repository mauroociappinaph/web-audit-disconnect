import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { LighthouseService } from './lighthouse-service.js';
import { TechnologyDetector } from './technology-detector.js';
import { ForensicsEngine } from './forensics-engine.js';
import { ROICalculator } from './roi-calculator.js';
import { EngineeringPlanner } from './engineering-planner.js';
import { ReportGenerator } from './report-generator.js';

const logger = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  warn: (msg) => console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${new Date().toISOString()}: ${msg}`)
};

export class WebAudit {
  constructor(url, clientName = 'Default', options = {}) {
    this.url = this.normalizeUrl(url);
    this.clientName = clientName;
    this.options = { timeout: 10000, ...options };
    this.results = {};
    this.startTime = Date.now();
  }

  normalizeUrl(url) {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }

  async checkSSL() {
    try {
      logger.info(`Verificando SSL: ${this.url}`);
      const response = await axios.get(this.url, {
        timeout: this.options.timeout,
        validateStatus: () => true
      });

      const isHTTPS = response.config.url.startsWith('https');
      const certInfo = response.request.socket?.getPeerCertificate?.();

      return {
        status: isHTTPS ? 'valid' : 'warning',
        protocol: isHTTPS ? 'HTTPS' : 'HTTP',
        statusCode: response.status,
        cert: certInfo ? 'Present' : 'N/A',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      logger.error(`Error SSL: ${err.message}`);
      return {
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkBrokenLinks() {
    try {
      logger.info(`Buscando links rotos en: ${this.url}`);
      const response = await axios.get(this.url, { timeout: this.options.timeout });
      const $ = cheerio.load(response.data);

      // Guardar el HTML y headers para análisis posterior
      this.pageHTML = response.data;
      this.responseHeaders = response.headers;

      const links = [];
      const broken = [];
      const checked = new Set();

      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !checked.has(href)) {
          links.push(href);
          checked.add(href);
        }
      });

      const linkSample = links.slice(0, 30);

      for (const link of linkSample) {
        try {
          if (link.startsWith('http')) {
            const res = await axios.head(link, { timeout: 3000, validateStatus: () => true });
            if (res.status >= 400) {
              broken.push({ url: link, status: res.status });
            }
          }
        } catch (err) {
          broken.push({ url: link, error: err.code || 'TIMEOUT' });
        }
      }

      logger.success(`Links verificados: ${linkSample.length}, Rotos encontrados: ${broken.length}`);

      return {
        total: links.length,
        checked: linkSample.length,
        broken: broken.length,
        brokenLinks: broken,
        status: broken.length === 0 ? 'good' : broken.length < 3 ? 'warning' : 'bad'
      };
    } catch (err) {
      logger.error(`Error links: ${err.message}`);
      return { error: err.message, status: 'error' };
    }
  }

  async checkUptime() {
    try {
      logger.info(`Verificando uptime: ${this.url}`);
      const startCheck = Date.now();
      const response = await axios.get(this.url, {
        timeout: this.options.timeout,
        validateStatus: () => true
      });
      const responseTime = Date.now() - startCheck;

      return {
        status: response.status < 400 ? 'up' : 'error',
        statusCode: response.status,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      logger.error(`Error uptime: ${err.message}`);
      return {
        status: 'down',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkPerformance() {
    try {
      logger.info(`Analizando performance...`);
      const start = Date.now();
      const response = await axios.get(this.url, { timeout: this.options.timeout });
      const loadTime = Date.now() - start;
      const $ = cheerio.load(response.data);

      const metrics = {
        pageLoadTime: `${loadTime}ms`,
        imageCount: $('img').length,
        scriptCount: $('script').length,
        styleCount: $('link[rel=stylesheet]').length,
        status: loadTime < 3000 ? 'good' : loadTime < 5000 ? 'warning' : 'bad'
      };

      return metrics;
    } catch (err) {
      logger.error(`Error performance: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }

  async checkSEO() {
    try {
      logger.info(`Verificando SEO basics...`);
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);

      const seo = {
        title: $('title').text() || 'No encontrado',
        metaDescription: $('meta[name="description"]').attr('content') || 'No encontrado',
        headings: {
          h1: $('h1').length,
          h2: $('h2').length,
          h3: $('h3').length
        },
        status: $('h1').length > 0 && $('meta[name="description"]').length > 0 ? 'good' : 'warning'
      };

      return seo;
    } catch (err) {
      logger.error(`Error SEO: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }

  async runFullAudit() {
    logger.info(`========================================`);
    logger.info(`Iniciando auditoría completa`);
    logger.info(`Cliente: ${this.clientName}`);
    logger.info(`URL: ${this.url}`);
    logger.info(`========================================`);

    // Initialize services
    const lighthouseService = new LighthouseService();
    const technologyDetector = new TechnologyDetector();
    const forensicsEngine = new ForensicsEngine();
    const roiCalculator = new ROICalculator();
    const engineeringPlanner = new EngineeringPlanner();

    // Get Lighthouse results first (needed for forensics and ROI)
    const lighthouseResults = await lighthouseService.runLighthouse(this.url);

    // Prepare intermediate results for planning
    const intermediateResults = {
      lighthouse: lighthouseResults,
      technologies: technologyDetector.detect(this.pageHTML, this.responseHeaders),
      forensics: forensicsEngine.analyzeBottlenecks(this.pageHTML, [], lighthouseResults)
    };

    this.results = {
      client: this.clientName,
      url: this.url,
      timestamp: new Date().toISOString(),
      ssl: await this.checkSSL(),
      links: await this.checkBrokenLinks(),
      uptime: await this.checkUptime(),
      performance: await this.checkPerformance(),
      seo: await this.checkSEO(),
      lighthouse: lighthouseResults,
      technologies: intermediateResults.technologies,
      forensics: intermediateResults.forensics,
      roi: roiCalculator.calculateROI(intermediateResults),
      engineeringPlan: engineeringPlanner.createImplementationPlan(intermediateResults),
      pageHTML: this.pageHTML // Incluir el HTML para análisis posterior
    };

    // Cleanup
    await lighthouseService.cleanup();

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.results.duration = `${duration}s`;

    logger.success(`Auditoría completada en ${duration}s`);
    return this.results;
  }

  async generateReport(format = 'both') {
    const generator = new ReportGenerator(this.results);

    if (format === 'html' || format === 'both') {
      generator.generateHTML();
      logger.success(`Reporte HTML generado`);
    }

    if (format === 'json' || format === 'both') {
      generator.generateJSON();
      logger.success(`Reporte JSON generado`);
    }

    return generator.getReportPath();
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const client = process.argv[3] || 'Default';

  if (!url) {
    console.error('\x1b[31mError: Debes proporcionar una URL');
    console.log('\x1b[33mUso: node src/audit.js <url> [cliente]');
    process.exit(1);
  }

  const audit = new WebAudit(url, client);
  audit.runFullAudit()
    .then(() => audit.generateReport())
    .then(path => console.log(`\x1b[32m✓ Reporte disponible en: ${path}\x1b[0m`))
    .catch(err => {
      console.error('\x1b[31mError durante la auditoría:\x1b[0m', err);
      process.exit(1);
    });
}

export default WebAudit;
