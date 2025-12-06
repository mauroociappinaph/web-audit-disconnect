import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { PageSpeedInsightsService } from './pagespeed-insights-service.js';
import { TechnologyDetector } from './technology-detector.js';
import { ForensicsEngine } from './forensics-engine.js';
import { ROICalculator } from './roi-calculator.js';
import { EngineeringPlanner } from './engineering-planner.js';
import { ReportGenerator } from './report-generator.js';
import { MetricsHelper } from './utils/metrics-helper.js';
import { PageDiscoveryEngine } from './discovery/page-discovery-engine.js';
import { SiteSEOAnalyzer } from './analyzers/site-seo-analyzer.js';
import { LighthouseLocalAnalyzer } from './analyzers/lighthouse-local-analyzer.js';
import { ImpactCalculator } from './analyzers/impact-calculator.js';
import { VulnerabilityScanner } from './analyzers/vulnerability-scanner.js';

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
    logger.info(`Iniciando auditoría completa con PageSpeed Insights`);
    logger.info(`Cliente: ${this.clientName}`);
    logger.info(`URL: ${this.url}`);
    logger.info(`========================================`);

    // Initialize services
    const psiService = new PageSpeedInsightsService();
    const technologyDetector = new TechnologyDetector();
    const forensicsEngine = new ForensicsEngine();
    const roiCalculator = new ROICalculator();
    const engineeringPlanner = new EngineeringPlanner();

    // Get SSL and basic info first
    const ssl = await this.checkSSL();
    const links = await this.checkBrokenLinks();

    // Get PageSpeed Insights results (mobile + desktop)
    const psiResults = await psiService.runComprehensiveAudit(this.url);

    // Prepare intermediate results for analysis
    const intermediateResults = {
      lighthouse: psiResults.mobile, // Use mobile as primary for analysis
      technologies: technologyDetector.detect(this.pageHTML, this.responseHeaders),
      forensics: forensicsEngine.analyzeBottlenecks(this.pageHTML, [], psiResults.mobile)
    };

    // Get additional metrics
    const uptime = await this.checkUptime();
    const performance = await this.checkPerformance();
    const seo = await this.checkSEO();

    // Calculate additional analysis
    const scopeAnalysis = MetricsHelper.calculateScopeAnalysis({
      links,
      performance,
      seo
    });

    const actionableRecommendations = MetricsHelper.generateActionableRecommendations(
      psiResults,
      psiResults.comparison
    );

    this.results = {
      client: this.clientName,
      url: this.url,
      timestamp: new Date().toISOString(),
      ssl,
      links,
      uptime,
      performance,
      seo,
      pagespeedInsights: psiResults, // New PSI results
      technologies: intermediateResults.technologies,
      forensics: intermediateResults.forensics,
      roi: roiCalculator.calculateROI(intermediateResults),
      engineeringPlan: engineeringPlanner.createImplementationPlan(intermediateResults),
      scopeAnalysis, // New scope analysis
      actionableRecommendations, // New actionable recommendations
      pageHTML: this.pageHTML // Incluir el HTML para análisis posterior
    };

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.results.duration = `${duration}s`;

    logger.success(`Auditoría completada en ${duration}s`);
    return this.results;
  }

  async runSiteWideAudit(options = {}) {
    logger.info(`========================================`);
    logger.info(`🚀 Iniciando auditoría SITE-WIDE completa`);
    logger.info(`Cliente: ${this.clientName}`);
    logger.info(`URL: ${this.url}`);
    logger.info(`========================================`);

    const maxPages = options.maxPages || 15; // Análisis de top 15 páginas por defecto
    const analysisMode = options.mode || 'gradual'; // 'full', 'standard', 'light', 'gradual'

    // Initialize services
    const pageDiscovery = new PageDiscoveryEngine();
    const psiService = new PageSpeedInsightsService();
    const technologyDetector = new TechnologyDetector();
    const forensicsEngine = new ForensicsEngine();
    const roiCalculator = new ROICalculator();
    const engineeringPlanner = new EngineeringPlanner();

    logger.info(`🔍 Descubriendo páginas del sitio...`);

    // 1. Descubrir páginas automáticamente
    const discoveryResult = await pageDiscovery.discoverPages(this.url);
    const pagesToAnalyze = discoveryResult.prioritizedPages.slice(0, maxPages);

    logger.success(`📊 Encontradas ${pagesToAnalyze.length} páginas para analizar`);
    logger.success(`🎯 Cobertura estimada: ${discoveryResult.metadata.coverage}% del sitio`);

    // 2. Información básica del sitio
    const ssl = await this.checkSSL();
    const links = await this.checkBrokenLinks();
    const uptime = await this.checkUptime();

    // 3. Análisis por niveles (gradual)
    const pageAnalyses = [];
    let totalAnalysisTime = 0;

    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const page = pagesToAnalyze[i];
      const pageStartTime = Date.now();

      logger.info(`📄 Analizando página ${i + 1}/${pagesToAnalyze.length}: ${page.url}`);

      try {
        // Determinar nivel de análisis basado en importancia y posición
        const analysisLevel = this.determineAnalysisLevel(i, page.priority, analysisMode);

        let pageResults;

        switch (analysisLevel) {
          case 'full':
            // Análisis completo: PSI + forensics + technologies + básicos
            const psiResults = await psiService.runComprehensiveAudit(page.url);
            const pageHtml = await this.getPageHtml(page.url);
            const pageHeaders = await this.getPageHeaders(page.url);
            const tech = technologyDetector.detect(pageHtml, pageHeaders);
            const forensics = forensicsEngine.analyzeBottlenecks(pageHtml, [], psiResults.mobile);
            const sslCheck = await this.checkSSLForPage(page.url);
            const linksCheck = await this.checkLinksForPage(page.url, pageHtml);
            const seoCheck = await this.checkSEOForPage(page.url, pageHtml);

            pageResults = {
              url: page.url,
              analysisLevel: 'full',
              pagespeedInsights: psiResults,
              technologies: tech,
              forensics: forensics,
              ssl: sslCheck,
              links: linksCheck,
              seo: seoCheck,
              priority: page.priority,
              type: page.type,
              success: true
            };
            break;

          case 'standard':
            // Análisis estándar: PSI + básicos
            const psiStandard = await psiService.runComprehensiveAudit(page.url);
            const pageHtmlStandard = await this.getPageHtml(page.url);
            const pageHeadersStandard = await this.getPageHeaders(page.url);
            const sslStandard = await this.checkSSLForPage(page.url);
            const linksStandard = await this.checkLinksForPage(page.url, pageHtmlStandard);
            const seoStandard = await this.checkSEOForPage(page.url, pageHtmlStandard);
            const techStandard = technologyDetector.detect(pageHtmlStandard, pageHeadersStandard);

            pageResults = {
              url: page.url,
              analysisLevel: 'standard',
              pagespeedInsights: psiStandard,
              ssl: sslStandard,
              links: linksStandard,
              seo: seoStandard,
              technologies: techStandard,
              priority: page.priority,
              type: page.type,
              success: true
            };
            break;

          case 'light':
          default:
            // Análisis light: Básicos + uptime
            const uptimeCheck = await this.checkUptimeForPage(page.url);
            const pageHtmlLight = await this.getPageHtml(page.url);
            const pageHeadersLight = await this.getPageHeaders(page.url);
            const sslLight = await this.checkSSLForPage(page.url);
            const linksLight = await this.checkLinksForPage(page.url, pageHtmlLight);
            const seoLight = await this.checkSEOForPage(page.url, pageHtmlLight);
            const techLight = technologyDetector.detect(pageHtmlLight, pageHeadersLight);

            pageResults = {
              url: page.url,
              analysisLevel: 'light',
              uptime: uptimeCheck,
              ssl: sslLight,
              links: linksLight,
              seo: seoLight,
              technologies: techLight,
              priority: page.priority,
              type: page.type,
              success: true
            };
            break;
        }

        const pageAnalysisTime = Date.now() - pageStartTime;
        totalAnalysisTime += pageAnalysisTime;

        pageResults.analysisTime = pageAnalysisTime;
        pageAnalyses.push(pageResults);

        logger.success(`✅ ${page.url} - ${analysisLevel.toUpperCase()} (${(pageAnalysisTime/1000).toFixed(1)}s)`);

        // Pequeña pausa para no sobrecargar APIs
        if (i < pagesToAnalyze.length - 1) {
          await this.sleep(1000);
        }

      } catch (error) {
        logger.error(`❌ Error analizando ${page.url}:`, error.message);

        pageAnalyses.push({
          url: page.url,
          analysisLevel: 'failed',
          error: error.message,
          priority: page.priority,
          type: page.type,
          success: false,
          analysisTime: Date.now() - pageStartTime
        });
      }
    }

    // 4. Análisis avanzado del sitio
    logger.info(`📊 Generando análisis consolidado del sitio...`);

    // Análisis SEO general del sitio
    const siteSEOAnalyzer = new SiteSEOAnalyzer();
    const siteSEOAnalysis = await siteSEOAnalyzer.analyzeSiteSEO({
      pageAnalyses: pageAnalyses,
      siteDiscovery: discoveryResult
    });

    // Análisis Lighthouse local (si hay páginas exitosas)
    let lighthouseLocalAnalysis = null;
    const successfulPages = pageAnalyses.filter(p => p.success);
    if (successfulPages.length > 0) {
      logger.info(`🏮 Ejecutando análisis Lighthouse local...`);
      const lighthouseAnalyzer = new LighthouseLocalAnalyzer();
      const pageUrls = successfulPages.slice(0, 3).map(p => p.url); // Analizar top 3 páginas
      lighthouseLocalAnalysis = await lighthouseAnalyzer.runMultiplePagesAnalysis(pageUrls);
    }

    const siteSummary = this.generateSiteSummary(pageAnalyses, discoveryResult);

    // Escanear vulnerabilidades de seguridad
    logger.info(`🔒 Escaneando vulnerabilidades de seguridad...`);
    const vulnerabilityScanner = new VulnerabilityScanner();
    const vulnerabilityAnalysis = await vulnerabilityScanner.scanForVulnerabilities({
      technologies: pageAnalyses[0]?.technologies || {},
      pageHTML: pageAnalyses[0]?.pageHTML || '',
      responseHeaders: pageAnalyses[0]?.responseHeaders || {}
    });

    // Calcular impactos específicos de optimización
    const impactCalculator = new ImpactCalculator();
    const homepageAnalysis = pageAnalyses.find(p => p.url === this.url || p.url === this.url + '/');
    const performanceImpacts = homepageAnalysis ?
      impactCalculator.calculateAllImpacts(homepageAnalysis) : null;

    const siteRecommendations = this.generateSiteRecommendations(pageAnalyses, siteSummary, performanceImpacts);
    const siteROI = this.calculateSiteROI(pageAnalyses, siteSummary);

    // 5. Preparar resultados finales
    this.results = {
      client: this.clientName,
      url: this.url,
      timestamp: new Date().toISOString(),
      auditType: 'site-wide',
      ssl,
      links,
      uptime,

      // Resultados del sitio completo
      siteDiscovery: discoveryResult,
      pageAnalyses: pageAnalyses,
      siteSummary: siteSummary,
      siteRecommendations: siteRecommendations,
      siteROI: siteROI,

      // Análisis avanzados
      siteSEOAnalysis: siteSEOAnalysis,
      lighthouseLocalAnalysis: lighthouseLocalAnalysis,
      performanceImpacts: performanceImpacts,
      vulnerabilityAnalysis: vulnerabilityAnalysis,

      // Estadísticas
      totalPagesAnalyzed: pageAnalyses.length,
      successfulAnalyses: pageAnalyses.filter(p => p.success).length,
      failedAnalyses: pageAnalyses.filter(p => !p.success).length,
      totalAnalysisTime: totalAnalysisTime,
      averageAnalysisTime: pageAnalyses.length > 0 ? totalAnalysisTime / pageAnalyses.length : 0,

      // Metadata
      analysisMode,
      maxPages,
      coverage: discoveryResult.metadata.coverage
    };

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.results.duration = `${duration}s`;

    logger.success(`🎉 Auditoría site-wide completada en ${duration}s`);
    logger.success(`📊 Analizadas ${pageAnalyses.length} páginas con ${siteSummary.coverage}% cobertura`);

    return this.results;
  }

  determineAnalysisLevel(index, priority, mode) {
    if (mode === 'full') return 'full';
    if (mode === 'standard') return 'standard';
    if (mode === 'light') return 'light';

    // Modo gradual: análisis basado en importancia
    if (index < 3 || priority >= 10) return 'full';        // Top 3 páginas + muy importantes
    if (index < 8 || priority >= 6) return 'standard';     // Siguientes 5 + importantes
    return 'light';                                        // Resto: análisis light
  }

  async getPageHtml(url) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      logger.warn(`No se pudo obtener HTML de ${url}`);
      return '';
    }
  }

  async getPageHeaders(url) {
    try {
      const response = await axios.head(url, { timeout: 8000 });
      return response.headers;
    } catch (error) {
      logger.warn(`No se pudieron obtener headers de ${url}`);
      return {};
    }
  }

  async checkSSLForPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
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
      return {
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkLinksForPage(url, pageHtml) {
    try {
      const $ = cheerio.load(pageHtml);
      const links = [];
      const checked = new Set();

      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !checked.has(href)) {
          links.push(href);
          checked.add(href);
        }
      });

      // Verificar primeros 10 links por página
      const linksToCheck = links.slice(0, 10);
      const broken = [];

      for (const link of linksToCheck) {
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

      return {
        total: links.length,
        checked: linksToCheck.length,
        broken: broken.length,
        brokenLinks: broken,
        status: broken.length === 0 ? 'good' : broken.length < 2 ? 'warning' : 'bad'
      };
    } catch (err) {
      return { error: err.message, status: 'error' };
    }
  }

  async checkSEOForPage(url, pageHtml) {
    try {
      const $ = cheerio.load(pageHtml);

      const seo = {
        title: $('title').text().trim() || 'No encontrado',
        metaDescription: $('meta[name="description"]').attr('content')?.trim() || 'No encontrado',
        headings: {
          h1: $('h1').length,
          h2: $('h2').length,
          h3: $('h3').length
        },
        status: $('h1').length > 0 && $('meta[name="description"]').length > 0 ? 'good' : 'warning'
      };

      return seo;
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  async checkUptimeForPage(url) {
    try {
      const startCheck = Date.now();
      const response = await axios.get(url, {
        timeout: 8000,
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
      return {
        status: 'down',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkBrokenLinksForPage(url) {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      const $ = cheerio.load(response.data);

      const links = [];
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) links.push(href);
      });

      // Solo verificar primeros 10 links por página (para no ser muy lento)
      const linksToCheck = links.slice(0, 10);
      const broken = [];

      for (const link of linksToCheck) {
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

      return {
        total: links.length,
        checked: linksToCheck.length,
        broken: broken.length,
        brokenLinks: broken,
        status: broken.length === 0 ? 'good' : broken.length < 2 ? 'warning' : 'bad'
      };
    } catch (err) {
      return { error: err.message, status: 'error' };
    }
  }

  generateSiteSummary(pageAnalyses, discoveryResult) {
    const successfulAnalyses = pageAnalyses.filter(p => p.success);
    const fullAnalyses = successfulAnalyses.filter(p => p.analysisLevel === 'full');
    const standardAnalyses = successfulAnalyses.filter(p => p.analysisLevel === 'standard');
    const lightAnalyses = successfulAnalyses.filter(p => p.analysisLevel === 'light');

    // Calcular promedios de performance
    let totalScore = 0;
    let mobileScore = 0;
    let desktopScore = 0;
    let analysisCount = 0;

    successfulAnalyses.forEach(page => {
      if (page.pagespeedInsights) {
        totalScore += page.pagespeedInsights.summary?.averageScore || 0;
        mobileScore += page.pagespeedInsights.mobile?.score || 0;
        desktopScore += page.pagespeedInsights.desktop?.score || 0;
        analysisCount++;
      }
    });

    const avgScore = analysisCount > 0 ? totalScore / analysisCount : 0;
    const avgMobileScore = analysisCount > 0 ? mobileScore / analysisCount : 0;
    const avgDesktopScore = analysisCount > 0 ? desktopScore / analysisCount : 0;

    // Identificar páginas problemáticas
    const criticalPages = successfulAnalyses.filter(page =>
      page.pagespeedInsights?.mobile?.score < 30 ||
      page.pagespeedInsights?.summary?.criticalIssuesCount > 0
    );

    return {
      totalPages: pageAnalyses.length,
      successfulPages: successfulAnalyses.length,
      failedPages: pageAnalyses.length - successfulAnalyses.length,
      fullAnalyses: fullAnalyses.length,
      standardAnalyses: standardAnalyses.length,
      lightAnalyses: lightAnalyses.length,
      averageScore: Math.round(avgScore),
      averageMobileScore: Math.round(avgMobileScore),
      averageDesktopScore: Math.round(avgDesktopScore),
      coverage: discoveryResult.metadata.coverage,
      criticalPages: criticalPages.length,
      criticalPagesList: criticalPages.map(p => ({
        url: p.url,
        score: p.pagespeedInsights?.mobile?.score || 0,
        issues: p.pagespeedInsights?.summary?.criticalIssuesCount || 0
      })),
      pageTypes: this.summarizePageTypes(successfulAnalyses)
    };
  }

  summarizePageTypes(analyses) {
    const types = {};
    analyses.forEach(analysis => {
      const type = analysis.type || 'general';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  generateSiteRecommendations(pageAnalyses, siteSummary, performanceImpacts = null) {
    const recommendations = [];

    // Recomendaciones basadas en el análisis del sitio
    if (siteSummary.averageScore < 50) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Site Performance',
        issue: `Puntuación media del sitio crítica: ${siteSummary.averageScore}/100`,
        impact: 'Afecta toda la experiencia de usuario y SEO',
        scope: 'Todo el sitio',
        effort: '4-6 semanas',
        businessImpact: '$5,000-$15,000 mensuales adicionales'
      });
    }

    if (siteSummary.averageMobileScore < siteSummary.averageDesktopScore - 20) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Mobile Optimization',
        issue: `Mobile ${siteSummary.averageMobileScore}pts vs Desktop ${siteSummary.averageDesktopScore}pts`,
        impact: 'La mayoría de usuarios tienen mala experiencia móvil',
        scope: 'Páginas principales',
        effort: '3-4 semanas',
        businessImpact: '20-35% mejora en conversión móvil'
      });
    }

    if (siteSummary.criticalPages > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Critical Pages',
        issue: `${siteSummary.criticalPages} páginas con problemas críticos`,
        impact: 'Páginas importantes del sitio no funcionan correctamente',
        scope: siteSummary.criticalPagesList.slice(0, 3).map(p => p.url),
        effort: '2-3 semanas',
        businessImpact: 'ROI inmediato en páginas de alto tráfico'
      });
    }

    return recommendations;
  }

  calculateSiteROI(pageAnalyses, siteSummary) {
    // Estimación basada en las páginas analizadas
    const avgScore = siteSummary.averageScore;
    const pagesAnalyzed = siteSummary.successfulPages;

    // Estimar impacto basado en score promedio
    let conversionImprovement = 0;
    if (avgScore < 30) conversionImprovement = 0.25; // 25% mejora posible
    else if (avgScore < 50) conversionImprovement = 0.15; // 15% mejora posible
    else if (avgScore < 70) conversionImprovement = 0.08; // 8% mejora posible
    else if (avgScore < 90) conversionImprovement = 0.03; // 3% mejora posible

    // Asumir métricas de negocio conservadoras
    const monthlyTraffic = 10000; // 10K visitantes/mes
    const conversionRate = 0.02; // 2% tasa de conversión
    const averageOrderValue = 100; // $100 valor promedio

    const monthlyConversions = monthlyTraffic * conversionRate;
    const additionalConversions = monthlyConversions * conversionImprovement;
    const monthlyRevenueIncrease = additionalConversions * averageOrderValue;
    const annualRevenueIncrease = monthlyRevenueIncrease * 12;

    // Calcular payback (estimado en 4 meses promedio para optimizaciones)
    const estimatedCost = pagesAnalyzed * 500; // $500 por página promedio
    const monthlyPayback = estimatedCost / monthlyRevenueIncrease;

    return {
      monthlyRevenueIncrease: Math.round(monthlyRevenueIncrease),
      annualRevenueIncrease: Math.round(annualRevenueIncrease),
      conversionImprovement: Math.round(conversionImprovement * 100),
      estimatedCost: estimatedCost,
      paybackMonths: Math.round(monthlyPayback * 10) / 10,
      confidence: pagesAnalyzed > 5 ? 85 : 70 // Más confianza con más páginas analizadas
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
