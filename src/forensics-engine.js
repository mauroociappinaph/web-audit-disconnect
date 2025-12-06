export class ForensicsEngine {
  constructor() {
    this.bottlenecks = {
      rendering: [],
      network: [],
      javascript: [],
      resources: []
    };
  }

  analyzeBottlenecks(html, networkRequests = [], lighthouseResults = {}) {
    const issues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Analyze rendering bottlenecks
    const renderingIssues = this.analyzeRenderingBottlenecks(html, lighthouseResults);
    issues.critical.push(...renderingIssues.critical);
    issues.high.push(...renderingIssues.high);
    issues.medium.push(...renderingIssues.medium);

    // Analyze network bottlenecks
    const networkIssues = this.analyzeNetworkBottlenecks(networkRequests, lighthouseResults);
    issues.high.push(...networkIssues.high);
    issues.medium.push(...networkIssues.medium);

    // Analyze JavaScript bottlenecks
    const jsIssues = this.analyzeJavaScriptBottlenecks(html, lighthouseResults);
    issues.high.push(...jsIssues.high);
    issues.medium.push(...jsIssues.medium);

    // Analyze resource bottlenecks
    const resourceIssues = this.analyzeResourceBottlenecks(html, networkRequests);
    issues.medium.push(...resourceIssues.medium);
    issues.low.push(...resourceIssues.low);

    return {
      issues,
      summary: this.generateSummary(issues),
      recommendations: this.generateForensicsRecommendations(issues)
    };
  }

  analyzeRenderingBottlenecks(html, lighthouseResults) {
    const issues = { critical: [], high: [], medium: [] };

    // Check for valid HTML input
    if (!html || typeof html !== 'string') {
      return issues;
    }

    // Check for render-blocking resources
    const renderBlockingCSS = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g) || [];
    const renderBlockingJS = html.match(/<script[^>]*src=[^>]*><\/script>/g) || [];

    if (renderBlockingCSS.length > 3) {
      issues.high.push({
        type: 'render-blocking-css',
        severity: 'high',
        title: 'Múltiples CSS bloqueantes de renderizado',
        description: `${renderBlockingCSS.length} archivos CSS bloquean el renderizado inicial`,
        impact: 'Aumenta significativamente el tiempo de renderizado inicial',
        evidence: `${renderBlockingCSS.length} CSS files in <head>`,
        solution: 'Usar media queries, preload, o inline critical CSS'
      });
    }

    if (renderBlockingJS.length > 2) {
      issues.critical.push({
        type: 'render-blocking-js',
        severity: 'critical',
        title: 'JavaScript bloqueante crítico',
        description: `${renderBlockingJS.length} archivos JS bloquean el parsing del HTML`,
        impact: 'Bloquea completamente el renderizado hasta que se ejecute el JS',
        evidence: `${renderBlockingJS.length} blocking script tags`,
        solution: 'Usar async/defer, code splitting, o mover scripts al final'
      });
    }

    // Check for excessive DOM size
    const domElements = (html.match(/<[^>]+>/g) || []).length;
    if (domElements > 1500) {
      issues.medium.push({
        type: 'dom-size',
        severity: 'medium',
        title: 'DOM excesivamente grande',
        description: `${domElements} elementos en el DOM`,
        impact: 'Ralentiza renderizado y aumenta uso de memoria',
        evidence: `${domElements} DOM elements`,
        solution: 'Optimizar estructura HTML, usar pagination, lazy loading'
      });
    }

    // Check for layout shifts
    if (lighthouseResults.coreWebVitals?.cls?.numericValue > 0.25) {
      issues.high.push({
        type: 'layout-shift',
        severity: 'high',
        title: 'Layout shifts críticos detectados',
        description: `CLS score: ${lighthouseResults.coreWebVitals.cls.displayValue}`,
        impact: 'Experiencia de usuario degradada, posible penalización SEO',
        evidence: `CLS: ${lighthouseResults.coreWebVitals.cls.displayValue}`,
        solution: 'Definir dimensiones en imágenes, evitar inserción dinámica de contenido'
      });
    }

    return issues;
  }

  analyzeNetworkBottlenecks(networkRequests = [], lighthouseResults = {}) {
    const issues = { high: [], medium: [] };

    // Check for slow network requests
    const slowRequests = networkRequests.filter(req => req.duration > 2000);
    if (slowRequests.length > 0) {
      issues.medium.push({
        type: 'slow-network',
        severity: 'medium',
        title: 'Requests de red lentos',
        description: `${slowRequests.length} requests toman más de 2 segundos`,
        impact: 'Aumenta tiempo total de carga de la página',
        evidence: `${slowRequests.length} slow requests`,
        solution: 'Optimizar imágenes, usar CDN, implementar caching agresivo'
      });
    }

    // Check for uncompressed resources
    const uncompressedResources = networkRequests.filter(req =>
      req.size > 100000 && !req.encodedSize
    );
    if (uncompressedResources.length > 0) {
      issues.medium.push({
        type: 'uncompressed-resources',
        severity: 'medium',
        title: 'Recursos sin comprimir',
        description: `${uncompressedResources.length} recursos grandes sin compresión`,
        impact: 'Aumenta tamaño de transferencia de datos',
        evidence: `${uncompressedResources.length} uncompressed resources`,
        solution: 'Habilitar gzip/brotli compression en el servidor'
      });
    }

    return issues;
  }

  analyzeJavaScriptBottlenecks(html, lighthouseResults = {}) {
    const issues = { high: [], medium: [] };

    // Check for valid HTML input
    if (!html || typeof html !== 'string') {
      return issues;
    }

    // Check for large JavaScript bundles
    const jsFiles = html.match(/<script[^>]*src=["'][^"']*\.js["'][^>]*>/g) || [];
    if (jsFiles.length > 10) {
      issues.medium.push({
        type: 'excessive-js',
        severity: 'medium',
        title: 'Excesivos archivos JavaScript',
        description: `${jsFiles.length} archivos JS cargados`,
        impact: 'Aumenta tiempo de parsing y ejecución de JavaScript',
        evidence: `${jsFiles.length} JavaScript files`,
        solution: 'Implementar code splitting, tree shaking, lazy loading'
      });
    }

    // Check for long tasks
    if (lighthouseResults.additionalMetrics?.tbt?.numericValue > 300) {
      issues.high.push({
        type: 'long-tasks',
        severity: 'high',
        title: 'Tareas largas de JavaScript',
        description: `Total Blocking Time: ${lighthouseResults.additionalMetrics.tbt.displayValue}`,
        impact: 'Página no responde durante tareas largas',
        evidence: `TBT: ${lighthouseResults.additionalMetrics.tbt.displayValue}`,
        solution: 'Optimizar bucles, reducir manipulación del DOM, usar Web Workers'
      });
    }

    return issues;
  }

  analyzeResourceBottlenecks(html, networkRequests = []) {
    const issues = { medium: [], low: [] };

    // Check for valid HTML input
    if (!html || typeof html !== 'string') {
      return issues;
    }

    // Check for unused CSS
    const cssFiles = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*\.css["'][^>]*>/g) || [];
    if (cssFiles.length > 5) {
      issues.low.push({
        type: 'unused-css',
        severity: 'low',
        title: 'Posible CSS sin usar',
        description: `${cssFiles.length} archivos CSS cargados`,
        impact: 'Recursos innecesarios consumen ancho de banda',
        evidence: `${cssFiles.length} CSS files`,
        solution: 'Auditar y remover CSS no utilizado, usar PurgeCSS'
      });
    }

    // Check for large images without optimization
    const images = html.match(/<img[^>]*src=[^>]*>/g) || [];
    const largeImages = images.filter(img => {
      // Check for images without width/height attributes
      return !img.includes('width=') || !img.includes('height=');
    });

    if (largeImages.length > images.length * 0.3) {
      issues.medium.push({
        type: 'unoptimized-images',
        severity: 'medium',
        title: 'Imágenes sin dimensiones definidas',
        description: `${largeImages.length} de ${images.length} imágenes sin width/height`,
        impact: 'Causa layout shifts y afecta CLS score',
        evidence: `${largeImages.length}/${images.length} images without dimensions`,
        solution: 'Definir width y height en todas las etiquetas img'
      });
    }

    return issues;
  }

  generateSummary(issues) {
    const totalIssues = Object.values(issues).flat().length;
    const criticalCount = issues.critical.length;
    const highCount = issues.high.length;

    let healthScore = 100;

    // Penalize based on issue severity
    healthScore -= criticalCount * 25; // -25 points per critical
    healthScore -= highCount * 15;     // -15 points per high
    healthScore -= issues.medium.length * 5; // -5 points per medium

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalIssues,
      criticalIssues: criticalCount,
      highIssues: highCount,
      mediumIssues: issues.medium.length,
      lowIssues: issues.low.length,
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical'
    };
  }

  generateForensicsRecommendations(issues) {
    const recommendations = [];

    // Prioritize critical issues first
    if (issues.critical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Forensics',
        issue: `${issues.critical.length} problemas críticos de rendimiento`,
        action: 'Resolver inmediatamente: render-blocking JS, layout shifts críticos'
      });
    }

    if (issues.high.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Forensics',
        issue: `${issues.high.length} cuellos de botella de alto impacto`,
        action: 'Optimizar: CSS bloqueante, tareas JS largas, requests lentos'
      });
    }

    if (issues.medium.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Forensics',
        issue: `${issues.medium.length} optimizaciones pendientes`,
        action: 'Mejorar: compresión, imágenes, DOM size'
      });
    }

    return recommendations;
  }
}

export default ForensicsEngine;
