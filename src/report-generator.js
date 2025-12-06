import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { TechnologyDetector } from './technology-detector.js';
import { ROICalculator } from './roi-calculator.js';
import { MetricsHelper } from './utils/metrics-helper.js';

export class ReportGenerator {
  constructor(auditResults) {
    this.results = auditResults;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportDir = 'reports';
    mkdirSync(this.reportDir, { recursive: true });
  }

  generateActionableRecommendationsWithImpacts() {
    const recommendations = [];

    // Calcular impactos específicos si tenemos datos de performance
    let performanceImpacts = null;
    if (this.results.performanceImpacts) {
      performanceImpacts = this.results.performanceImpacts;
    }

    // SSL/HTTPS Recommendations
    if (this.results.ssl?.status !== 'valid') {
      recommendations.push({
        priority: 'CRITICAL',
        severity: '🔴',
        category: 'SSL/HTTPS',
        issue: 'Certificado SSL no válido o expirado',
        impact: 'Afecta la confianza de usuarios y ranking SEO',
        specificActions: [
          'Renovar certificado SSL inmediatamente',
          'Configurar redirección HTTP → HTTPS',
          'Verificar configuración de HSTS'
        ],
        expectedImprovement: 'Confianza del sitio restaurada',
        effort: '1-2 días',
        businessImpact: '$1,000-$3,000 mensuales adicionales'
      });
    }

    // Performance Recommendations with calculated impacts
    const loadTime = parseInt(this.results.performance?.pageLoadTime?.replace('ms', '') || 0);
    if (loadTime > 3000) {
      recommendations.push({
        priority: 'HIGH',
        severity: '🟠',
        category: 'Performance',
        issue: `Tiempo de carga alto: ${this.results.performance?.pageLoadTime}`,
        impact: 'Usuarios abandonan páginas lentas, afecta conversión',
        specificActions: [
          'Optimizar imágenes (WebP, compresión)',
          'Implementar caching del navegador',
          'Minimizar CSS/JavaScript',
          'Usar CDN para assets estáticos'
        ],
        expectedImprovement: performanceImpacts?.serverCaching?.ttfbReduction || 'Reducción 40-60% TTFB',
        effort: '3-4 semanas',
        businessImpact: '$2,000-$5,000 mensuales adicionales'
      });
    }

    // Image optimization with calculated impacts
    const imageCount = this.results.performance?.imageCount || 0;
    if (imageCount > 15) {
      const hasLazyLoading = this.checkLazyLoading();
      const hasWebP = this.checkWebPSupport();

      let issue = `${imageCount} imágenes encontradas en la página`;
      let actions = [];
      let expectedImprovement = '';

      if (!hasLazyLoading && !hasWebP) {
        actions = [
          'Implementar lazy loading: <img loading="lazy" ...>',
          'Convertir imágenes a formato WebP',
          'Comprimir imágenes (optimización lossy)',
          'Implementar responsive images con srcset'
        ];
        expectedImprovement = performanceImpacts?.imageOptimization?.speedImprovement || '+12-18% Speed';
      } else if (!hasLazyLoading) {
        actions = [
          'Implementar lazy loading en imágenes below the fold',
          'Configurar Intersection Observer API'
        ];
        expectedImprovement = '+8-12% Speed';
      } else if (!hasWebP) {
        actions = [
          'Convertir imágenes JPEG/PNG a WebP',
          'Implementar fallback para navegadores antiguos',
          'Configurar servidor para compresión WebP'
        ];
        expectedImprovement = performanceImpacts?.imageOptimization?.sizeReduction || '-25% Size';
      } else {
        actions = [
          'Optimizar compresión existente',
          'Revisar tamaños de imágenes',
          'Implementar progressive loading'
        ];
        expectedImprovement = '+3-5% Speed';
      }

      recommendations.push({
        priority: hasLazyLoading && hasWebP ? 'LOW' : 'MEDIUM',
        severity: hasLazyLoading && hasWebP ? '🟢' : '🟡',
        category: 'Image Optimization',
        issue: issue,
        impact: 'Imágenes pesadas aumentan tiempo de carga y consumo de datos',
        specificActions: actions,
        expectedImprovement: expectedImprovement,
        effort: hasLazyLoading && hasWebP ? '1 semana' : '2-3 semanas',
        businessImpact: '$1,500-$4,000 mensuales adicionales'
      });
    }

    // Script optimization with calculated impacts
    const scriptCount = this.results.performance?.scriptCount || 0;
    if (scriptCount > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        severity: '🟡',
        category: 'Script Optimization',
        issue: `${scriptCount} archivos JavaScript detectados`,
        impact: 'Scripts bloqueantes retrasan renderizado de página',
        specificActions: [
          'Implementar defer/async en scripts no críticos',
          'Aplicar code splitting para reducir bundle inicial',
          'Eliminar código JavaScript no utilizado',
          'Optimizar polyfills para navegadores modernos'
        ],
        expectedImprovement: performanceImpacts?.scriptOptimization?.scoreImprovement || '+8-12 Score',
        effort: '2-3 semanas',
        businessImpact: '$1,000-$3,000 mensuales adicionales'
      });
    }

    // Links Recommendations
    const brokenLinks = this.results.links?.broken || 0;
    if (brokenLinks > 5) {
      recommendations.push({
        priority: 'HIGH',
        severity: '🟠',
        category: 'Links',
        issue: `${brokenLinks} links rotos encontrados`,
        impact: 'Enlaces rotos frustran usuarios y afectan crawling',
        specificActions: [
          'Auditar todos los enlaces internos/externos',
          'Reparar o redirigir URLs rotas (301)',
          'Implementar monitoreo continuo de enlaces',
          'Crear página 404 amigable'
        ],
        expectedImprovement: 'UX mejorada, mejor crawling SEO',
        effort: '1-2 semanas',
        businessImpact: '$500-$2,000 mensuales adicionales'
      });
    }

    // SEO Recommendations
    const titleLength = (this.results.seo?.title || '').length;
    if (titleLength > 60) {
      recommendations.push({
        priority: 'LOW',
        severity: '🟢',
        category: 'SEO - Titles',
        issue: `Título muy largo: ${titleLength} caracteres (máx. 60)`,
        impact: 'Títulos truncados afectan CTR en resultados de búsqueda',
        specificActions: [
          'Acortar título manteniendo palabras clave principales',
          'Incluir llamada a acción si es necesario',
          'Probar diferentes variaciones en A/B testing'
        ],
        expectedImprovement: 'Mejora CTR en resultados de búsqueda',
        effort: '2-3 días',
        businessImpact: '$200-$500 mensuales adicionales'
      });
    }

    if (!this.results.seo?.metaDescription) {
      recommendations.push({
        priority: 'MEDIUM',
        severity: '🟡',
        category: 'SEO - Meta Descriptions',
        issue: 'Meta description faltante',
        impact: 'Sin meta description, Google genera automáticamente',
        specificActions: [
          'Crear meta description de 120-160 caracteres',
          'Incluir palabras clave principales',
          'Agregar llamada a acción atractiva',
          'Personalizar por página'
        ],
        expectedImprovement: 'Mejora CTR en resultados de búsqueda',
        effort: '1 semana',
        businessImpact: '$300-$800 mensuales adicionales'
      });
    }

    const h1Count = this.results.seo?.headings?.h1 || 0;
    if (h1Count === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        severity: '🟡',
        category: 'SEO - Headings',
        issue: 'No se encontraron headings H1',
        impact: 'Estructura semántica incorrecta afecta SEO',
        specificActions: [
          'Agregar H1 descriptivo y único por página',
          'Usar H2 para secciones principales',
          'Mantener jerarquía lógica H1→H2→H3',
          'Incluir palabras clave en headings'
        ],
        expectedImprovement: 'Mejor comprensión del contenido por motores de búsqueda',
        effort: '1 semana',
        businessImpact: '$200-$600 mensuales adicionales'
      });
    }

    // Uptime Recommendations
    const responseTime = parseInt(this.results.uptime?.responseTime?.replace('ms', '') || 0);
    if (responseTime > 1000) {
      recommendations.push({
        priority: 'MEDIUM',
        severity: '🟡',
        category: 'Server Performance',
        issue: `Response time alto: ${this.results.uptime?.responseTime}`,
        impact: 'Tiempos de respuesta lentos afectan experiencia de usuario',
        specificActions: [
          'Optimizar consultas de base de datos',
          'Implementar caching (Redis/Memcached)',
          'Configurar CDN global',
          'Optimizar configuración del servidor web',
          'Implementar compresión gzip/brotli'
        ],
        expectedImprovement: performanceImpacts?.serverCaching?.ttfbReduction || '-400ms TTFB',
        effort: '2-3 semanas',
        businessImpact: '$1,000-$2,500 mensuales adicionales'
      });
    }

    return recommendations;
  }

  generateRecommendations() {
    const recommendations = [];

    // SSL/HTTPS Recommendations
    if (this.results.ssl?.status !== 'valid') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'SSL/HTTPS',
        issue: 'Certificado SSL no válido o expirado',
        action: 'Renovar certificado SSL inmediatamente para evitar errores HTTPS'
      });
    }

    // Performance Recommendations
    const loadTime = parseInt(this.results.performance?.pageLoadTime?.replace('ms', '') || 0);
    if (loadTime > 3000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Performance',
        issue: `Tiempo de carga alto: ${this.results.performance?.pageLoadTime}`,
        action: 'Optimizar imágenes, reducir scripts innecesarios y usar CDN'
      });
    }

    const imageCount = this.results.performance?.imageCount || 0;
    if (imageCount > 15) {
      // Verificar tecnologías ya implementadas
      const hasLazyLoading = this.checkLazyLoading();
      const hasWebP = this.checkWebPSupport();

      let action = '';
      let priority = 'MEDIUM';

      if (!hasLazyLoading && !hasWebP) {
        action = 'Implementar lazy loading en imágenes y convertir a formato WebP para mejor performance';
      } else if (!hasLazyLoading) {
        action = 'Implementar lazy loading en imágenes para carga más eficiente';
        priority = 'LOW'; // Menos crítico si ya usa WebP
      } else if (!hasWebP) {
        action = 'Convertir imágenes al formato WebP para reducir tamaño de archivos';
        priority = 'LOW'; // Menos crítico si ya usa lazy loading
      } else {
        action = 'Optimizar imágenes existentes: revisar compresión y tamaños';
        priority = 'LOW'; // Ya tiene las mejores prácticas implementadas
      }

      recommendations.push({
        priority: priority,
        category: 'Performance',
        issue: `${imageCount} imágenes encontradas en la página`,
        action: action
      });
    }

    // Links Recommendations
    const brokenLinks = this.results.links?.broken || 0;
    if (brokenLinks > 5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Links',
        issue: `${brokenLinks} links rotos encontrados`,
        action: 'Reparar o actualizar URLs rotas para mejorar UX'
      });
    }

    // SEO Recommendations
    const titleLength = (this.results.seo?.title || '').length;
    if (titleLength > 60) {
      recommendations.push({
        priority: 'LOW',
        category: 'SEO',
        issue: `Título muy largo: ${titleLength} caracteres`,
        action: 'Acortar título a 50-60 caracteres para mejor SEO'
      });
    }

    if (!this.results.seo?.metaDescription) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'SEO',
        issue: 'Meta description faltante',
        action: 'Agregar meta description de 150-160 caracteres'
      });
    }

    const h1Count = this.results.seo?.headings?.h1 || 0;
    if (h1Count === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'SEO',
        issue: 'No se encontraron headings H1',
        action: 'Agregar al menos un H1 descriptivo por página'
      });
    }

    // Uptime Recommendations
    const responseTime = parseInt(this.results.uptime?.responseTime?.replace('ms', '') || 0);
    if (responseTime > 1000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Uptime',
        issue: `Response time alto: ${this.results.uptime?.responseTime}`,
        action: 'Optimizar servidor, base de datos y configuración'
      });
    }

    return recommendations;
  }

  checkLazyLoading() {
    // Necesitamos el HTML guardado durante la auditoría
    if (!this.results.pageHTML) {
      return false;
    }

    const $ = cheerio.load(this.results.pageHTML);
    const lazyImages = $('img[loading="lazy"]').length;
    const totalImages = $('img').length;

    // Si más del 50% de las imágenes usan lazy loading, consideramos que está implementado
    return lazyImages > 0 && (lazyImages / totalImages) > 0.5;
  }

  checkWebPSupport() {
    // Necesitamos el HTML guardado durante la auditoría
    if (!this.results.pageHTML) {
      return false;
    }

    const $ = cheerio.load(this.results.pageHTML);

    // Buscar elementos <picture> con WebP
    const webpSources = $('picture source[type="image/webp"]').length;

    // Buscar imágenes con extensión .webp
    const webpImages = $('img[src$=".webp"]').length;

    return webpSources > 0 || webpImages > 0;
  }

  prepareChartData(isSiteWide, siteSummary, siteSEOAnalysis, vulnerabilityAnalysis, lighthouseLocalAnalysis) {
    const charts = {};

    // Performance Score Chart
    if (this.results.pagespeedInsights) {
      charts.performance = {
        type: 'doughnut',
        data: {
          labels: ['Performance', 'Faltante'],
          datasets: [{
            data: [this.results.pagespeedInsights.summary.averageScore, 100 - this.results.pagespeedInsights.summary.averageScore],
            backgroundColor: ['#10b981', '#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.parsed + '/100';
                }
              }
            }
          },
          cutout: '70%'
        }
      };
    }

    // Issues by Severity Chart
    if (isSiteWide && lighthouseLocalAnalysis?.summary?.topIssues) {
      const issues = lighthouseLocalAnalysis.summary.topIssues;
      charts.issues = {
        type: 'bar',
        data: {
          labels: issues.map(issue => issue.category),
          datasets: [{
            label: 'Páginas Afectadas (%)',
            data: issues.map(issue => issue.percentage),
            backgroundColor: '#ef4444',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        }
      };
    }

    // Security Risk Chart
    if (isSiteWide && vulnerabilityAnalysis) {
      charts.security = {
        type: 'radar',
        data: {
          labels: ['Críticas', 'Altas', 'Medias', 'Bajas'],
          datasets: [{
            label: 'Vulnerabilidades',
            data: [
              vulnerabilityAnalysis.summary.critical,
              vulnerabilityAnalysis.summary.high,
              vulnerabilityAnalysis.summary.medium,
              vulnerabilityAnalysis.summary.low
            ],
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: '#ef4444',
            borderWidth: 2,
            pointBackgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            r: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      };
    }

    // SEO Score Chart
    if (isSiteWide && siteSEOAnalysis) {
      charts.seo = {
        type: 'polarArea',
        data: {
          labels: ['Títulos', 'Meta Descriptions', 'Headings', 'URLs', 'Enlaces'],
          datasets: [{
            data: [
              siteSEOAnalysis.titleAnalysis.score,
              siteSEOAnalysis.metaDescriptionAnalysis.score,
              siteSEOAnalysis.headingStructureAnalysis.score,
              siteSEOAnalysis.urlStructureAnalysis.score,
              siteSEOAnalysis.internalLinkingAnalysis.score
            ],
            backgroundColor: [
              'rgba(16, 185, 129, 0.7)',
              'rgba(59, 130, 246, 0.7)',
              'rgba(245, 158, 11, 0.7)',
              'rgba(139, 69, 19, 0.7)',
              'rgba(168, 85, 247, 0.7)'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value;
                }
              }
            }
          }
        }
      };
    }

    return charts;
  }

  generateHTML() {
    // Determinar si es auditoría site-wide o individual
    const isSiteWide = this.results.auditType === 'site-wide';

    // Sistema de semáforos consistente
    const getSemaphor = (score, metric = null) => {
      const semaphor = MetricsHelper.getSemaphorScore(score, metric);
      return {
        label: semaphor.label,
        color: semaphor.color,
        status: semaphor.status,
        icon: semaphor.icon
      };
    };

    // Crear tabla comparativa móvil vs desktop
    let comparisonTable = [];
    if (isSiteWide) {
      // Para site-wide, usar la comparación de la primera página analizada completamente
      const firstFullAnalysis = this.results.pageAnalyses?.find(p => p.analysisLevel === 'full');
      if (firstFullAnalysis?.pagespeedInsights) {
        comparisonTable = MetricsHelper.createComparisonTable(
          firstFullAnalysis.pagespeedInsights.mobile,
          firstFullAnalysis.pagespeedInsights.desktop
        );
      }
    } else {
      // Para auditorías individuales
      comparisonTable = this.results.pagespeedInsights ?
        MetricsHelper.createComparisonTable(
          this.results.pagespeedInsights.mobile,
          this.results.pagespeedInsights.desktop
        ) : [];
    }

    // Información de alcance
    let scopeInfo;
    if (isSiteWide) {
      scopeInfo = {
        description: `Análisis site-wide de ${this.results.siteSummary?.totalPages || 0} páginas (${this.results.siteSummary?.coverage || 0}% cobertura estimada del sitio)`,
        details: this.results.siteDiscovery?.metadata || {}
      };
    } else {
      scopeInfo = this.results.scopeAnalysis ?
        this.results.scopeAnalysis :
        MetricsHelper.calculateScopeAnalysis(this.results);
    }

    // Recomendaciones accionables
    const actionableRecs = isSiteWide ?
      this.generateActionableRecommendationsWithImpacts() :
      this.results.actionableRecommendations || [];

    // Información por página (para site-wide)
    const pageResults = isSiteWide ? this.results.pageAnalyses || [] : [];

    // Información del sitio
    const siteSummary = isSiteWide ? this.results.siteSummary : null;
    const siteDiscovery = isSiteWide ? this.results.siteDiscovery : null;
    const siteSEOAnalysis = isSiteWide ? this.results.siteSEOAnalysis : null;
    const lighthouseLocalAnalysis = isSiteWide ? this.results.lighthouseLocalAnalysis : null;
    const vulnerabilityAnalysis = isSiteWide ? this.results.vulnerabilityAnalysis : null;

    // Preparar datos para gráficos
    const chartData = this.prepareChartData(isSiteWide, siteSummary, siteSEOAnalysis, vulnerabilityAnalysis, lighthouseLocalAnalysis);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auditoría Web Premium - ${this.results.client}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
  <style>
    /* ===== RESET & BASE ===== */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ===== CSS VARIABLES ===== */
    :root {
      /* Primary Colors */
      --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      --success-gradient: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      --warning-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      --danger-gradient: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);

      /* Glassmorphism */
      --glass-bg: rgba(255, 255, 255, 0.25);
      --glass-bg-strong: rgba(255, 255, 255, 0.35);
      --glass-border: rgba(255, 255, 255, 0.18);
      --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

      /* Neumorphism */
      --neu-light: #ffffff;
      --neu-dark: #e6e6e6;
      --neu-shadow-light: rgba(255, 255, 255, 0.8);
      --neu-shadow-dark: rgba(163, 177, 198, 0.6);

      /* Typography */
      --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

      /* Spacing */
      --space-xs: 0.25rem;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 1.5rem;
      --space-xl: 2rem;
      --space-2xl: 3rem;
      --space-3xl: 4rem;

      /* Border Radius */
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --radius-2xl: 24px;

      /* Shadows */
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

      /* Transitions */
      --transition-fast: 0.15s ease;
      --transition-normal: 0.3s ease;
      --transition-slow: 0.5s ease;
    }

    /* ===== BASE STYLES - CORPORATE AUDIT ===== */
    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: var(--font-primary);
      background: var(--white);
      color: var(--gray-800);
      line-height: 1.6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ===== CONTAINER ===== */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: var(--space-xl);
    }

    /* ===== HEADER ===== */
    .header {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      padding: var(--space-3xl);
      border-radius: var(--radius-2xl);
      box-shadow: var(--glass-shadow);
      margin-bottom: var(--space-3xl);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .header h1 {
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 800;
      margin-bottom: var(--space-md);
      position: relative;
      z-index: 2;
    }

    .header .subtitle {
      color: rgba(107, 114, 128, 0.9);
      font-size: clamp(1rem, 3vw, 1.25rem);
      margin-bottom: var(--space-xl);
      font-weight: 500;
    }

    .header-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--space-lg);
      position: relative;
      z-index: 2;
    }

    .header-info-item {
      background: var(--glass-bg-strong);
      backdrop-filter: blur(10px);
      padding: var(--space-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--glass-border);
      transition: all var(--transition-normal);
    }

    .header-info-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .header-info-item strong {
      color: #1f2937;
      font-weight: 600;
      display: block;
      margin-bottom: var(--space-xs);
    }

    .header-info-item span {
      color: #6b7280;
      font-size: 0.9em;
    }

    /* ===== TABS SYSTEM ===== */
    .tabs-container {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--glass-shadow);
      margin-bottom: var(--space-3xl);
      overflow: hidden;
    }

    .tabs-header {
      display: flex;
      background: rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid var(--glass-border);
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tabs-header::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      flex: 1;
      min-width: 140px;
      padding: var(--space-lg) var(--space-md);
      background: none;
      border: none;
      color: rgba(107, 114, 128, 0.8);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all var(--transition-normal);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
    }

    .tab-button:hover {
      color: #1f2937;
      background: rgba(255, 255, 255, 0.1);
    }

    .tab-button.active {
      color: #667eea;
      background: rgba(255, 255, 255, 0.15);
    }

    .tab-button.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 3px;
      background: var(--accent-gradient);
      border-radius: 2px;
    }

    .tab-content {
      display: none;
      padding: var(--space-2xl);
    }

    .tab-content.active {
      display: block;
      animation: fadeInUp 0.5s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== GLASS CARDS ===== */
    .glass-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--glass-shadow);
      padding: var(--space-2xl);
      transition: all var(--transition-normal);
      position: relative;
      overflow: hidden;
    }

    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--primary-gradient);
      opacity: 0;
      transition: opacity var(--transition-normal);
    }

    .glass-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-2xl);
    }

    .glass-card:hover::before {
      opacity: 1;
    }

    /* ===== NEUMORPHIC ELEMENTS ===== */
    .neu-card {
      background: var(--neu-light);
      box-shadow:
        8px 8px 16px var(--neu-shadow-dark),
        -8px -8px 16px var(--neu-shadow-light);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      transition: all var(--transition-normal);
    }

    .neu-card:hover {
      box-shadow:
        12px 12px 20px var(--neu-shadow-dark),
        -12px -12px 20px var(--neu-shadow-light);
      transform: translateY(-2px);
    }

    .neu-button {
      background: var(--neu-light);
      box-shadow:
        4px 4px 8px var(--neu-shadow-dark),
        -4px -4px 8px var(--neu-shadow-light);
      border: none;
      border-radius: var(--radius-md);
      padding: var(--space-md) var(--space-xl);
      font-weight: 600;
      color: #4b5563;
      cursor: pointer;
      transition: all var(--transition-normal);
      position: relative;
      overflow: hidden;
    }

    .neu-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      background: var(--primary-gradient);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      transition: width var(--transition-slow), height var(--transition-slow);
    }

    .neu-button:hover::before {
      width: 300px;
      height: 300px;
    }

    .neu-button:hover {
      color: white;
      box-shadow:
        inset 4px 4px 8px var(--neu-shadow-dark),
        inset -4px -4px 8px var(--neu-shadow-light);
    }

    /* ===== DASHBOARD GRID ===== */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--space-xl);
      margin-bottom: var(--space-3xl);
    }

    .metric-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      text-align: center;
      transition: all var(--transition-normal);
      position: relative;
      overflow: hidden;
    }

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--primary-gradient);
    }

    .metric-card:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: var(--shadow-xl);
    }

    .metric-value {
      font-size: clamp(2rem, 8vw, 3rem);
      font-weight: 800;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: var(--space-sm);
    }

    .metric-label {
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ===== CHART CONTAINERS ===== */
    .chart-container {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      margin-bottom: var(--space-xl);
      position: relative;
      overflow: hidden;
    }

    .chart-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--secondary-gradient);
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
    }

    .chart-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .chart-subtitle {
      color: #6b7280;
      font-size: 0.9rem;
      margin: 0;
    }

    /* ===== ISSUE CARDS ===== */
    .issue-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      margin-bottom: var(--space-lg);
      transition: all var(--transition-normal);
      border-left: 4px solid #6b7280;
    }

    .issue-critical { border-left-color: #ef4444; }
    .issue-high { border-left-color: #f59e0b; }
    .issue-medium { border-left-color: #3b82f6; }
    .issue-low { border-left-color: #10b981; }

    .issue-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .issue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-md);
    }

    .issue-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .severity-badge {
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .severity-critical {
      background: var(--danger-gradient);
      color: white;
    }

    .severity-high {
      background: var(--warning-gradient);
      color: white;
    }

    .severity-medium {
      background: var(--primary-gradient);
      color: white;
    }

    .severity-low {
      background: var(--success-gradient);
      color: white;
    }

    .issue-description {
      color: #4b5563;
      margin-bottom: var(--space-md);
      line-height: 1.6;
    }

    .issue-impact {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      margin-bottom: var(--space-lg);
      font-style: italic;
      color: #dc2626;
    }

    .solution-tabs {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
      border-bottom: 1px solid var(--glass-border);
    }

    .solution-tab {
      padding: var(--space-sm) var(--space-md);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      color: #6b7280;
      transition: all var(--transition-fast);
    }

    .solution-tab:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #1f2937;
    }

    .solution-tab.active {
      background: var(--primary-gradient);
      color: white;
    }

    .solution-content {
      display: none;
    }

    .solution-content.active {
      display: block;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
      }
      to {
        opacity: 1;
        max-height: 1000px;
      }
    }

    .code-block {
      background: #1f2937;
      color: #f8fafc;
      padding: var(--space-lg);
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      overflow-x: auto;
      margin: var(--space-md) 0;
      position: relative;
    }

    .code-block::before {
      content: '📋';
      position: absolute;
      top: var(--space-md);
      right: var(--space-md);
      cursor: pointer;
      opacity: 0.7;
      transition: opacity var(--transition-fast);
    }

    .code-block:hover::before {
      opacity: 1;
    }

    .checklist {
      list-style: none;
      padding: 0;
    }

    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      transition: background-color var(--transition-fast);
    }

    .checklist-item:hover {
      background: rgba(16, 185, 129, 0.1);
    }

    .checklist-item::before {
      content: '✅';
      color: #10b981;
      font-weight: bold;
      flex-shrink: 0;
    }

    /* ===== ANIMATIONS ===== */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
      40%, 43% { transform: translateY(-8px); }
      70% { transform: translateY(-4px); }
      90% { transform: translateY(-2px); }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .animate-bounce {
      animation: bounce 1s infinite;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 1024px) {
      .container { padding: var(--space-lg); }
      .dashboard-grid { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
      .tabs-header { flex-wrap: wrap; }
      .tab-button { min-width: 120px; }
    }

    @media (max-width: 768px) {
      .container { padding: var(--space-md); }
      .header { padding: var(--space-xl); }
      .header h1 { font-size: 2rem; }
      .dashboard-grid { grid-template-columns: 1fr; }
      .tabs-header { justify-content: center; }
      .tab-button { min-width: 100px; padding: var(--space-sm); }
      .glass-card { padding: var(--space-lg); }
      .metric-value { font-size: 2.5rem; }
    }

    @media (max-width: 480px) {
      .container { padding: var(--space-sm); }
      .header { padding: var(--space-lg); }
      .header-info { grid-template-columns: 1fr; }
      .tab-button { min-width: 80px; font-size: 0.8rem; }
      .glass-card { padding: var(--space-md); }
      .metric-value { font-size: 2rem; }
    }

    /* ===== DARK MODE SUPPORT ===== */
    @media (prefers-color-scheme: dark) {
      :root {
        --glass-bg: rgba(0, 0, 0, 0.25);
        --glass-bg-strong: rgba(0, 0, 0, 0.35);
        --glass-border: rgba(255, 255, 255, 0.1);
      }

      body { color: #f9fafb; }
      .header-info-item strong { color: #f9fafb; }
      .tab-button { color: rgba(156, 163, 175, 0.8); }
      .tab-button:hover { color: #f9fafb; }
      .chart-title { color: #f9fafb; }
      .issue-title { color: #f9fafb; }
      .issue-description { color: #e5e7eb; }
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body {
        background: white !important;
        color: black !important;
      }

      .glass-card,
      .neu-card,
      .metric-card {
        background: white !important;
        box-shadow: none !important;
        border: 1px solid #e5e7eb !important;
      }

      .tabs-container { display: none; }
      .tab-content { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🔍 Auditoría Web Completa</h1>
      <div class="subtitle">Basado en PageSpeed Insights Oficial</div>
      <div class="header-info">
        <p><strong>Cliente:</strong> ${this.results.client}</p>
        <p><strong>URL:</strong> ${this.results.url}</p>
        <p><strong>Fecha:</strong> ${new Date(this.results.timestamp).toLocaleDateString('es-ES')}</p>
        <p><strong>Duración:</strong> ${this.results.duration || 'N/A'}</p>

        <p><strong>Alcance:</strong> ${scopeInfo.description}</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-button active" data-tab="overview">🏠 Dashboard</button>
        <button class="tab-button" data-tab="performance">📊 Performance</button>
        <button class="tab-button" data-tab="seo">🔍 SEO</button>
        <button class="tab-button" data-tab="security">🔒 Seguridad</button>
        <button class="tab-button" data-tab="solutions">🚀 Soluciones</button>
        <button class="tab-button" data-tab="roi">📈 ROI</button>
      </div>

      <!-- Tab Content Container -->
      <div id="overview" class="tab-content active">
        ${this.results.pagespeedInsights ? `
        <div class="dashboard-grid">
          <div class="metric-card">
            <div class="metric-value">${this.results.pagespeedInsights.summary.averageScore}/100</div>
            <div class="metric-label">Performance General</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.results.pagespeedInsights.mobile.score}/100</div>
            <div class="metric-label">Performance Móvil</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.results.pagespeedInsights.desktop.score}/100</div>
            <div class="metric-label">Performance Desktop</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Math.round(MetricsHelper.generateMetricSummary(this.results.pagespeedInsights).coreWebVitalsScore)}/100</div>
            <div class="metric-label">Core Web Vitals</div>
          </div>
        </div>
        ` : ''}
      </div>

      <div id="performance" class="tab-content">
        ${comparisonTable.length > 0 ? `
        <div class="glass-card">
          <h2>📊 Métricas Detalladas de Performance</h2>
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Móvil</th>
                <th>Desktop</th>
                <th>Diferencia</th>
                <th>Recomendación</th>
              </tr>
            </thead>
            <tbody>
              ${comparisonTable.map(row => `
              <tr>
                <td>
                  <strong>${row.metric}</strong><br>
                  <small style="color: #6b7280;">${MetricsHelper.getMetricDefinition(row.key).description}</small>
                </td>
                <td class="mobile-col">
                  <div style="font-weight: bold; color: ${row.mobile.semaphor.color}">${row.mobile.display}</div>
                  <div style="font-size: 0.8em; color: #666;">${row.mobile.semaphor.label}</div>
                </td>
                <td class="desktop-col">
                  <div style="font-weight: bold; color: ${row.desktop.semaphor.color}">${row.desktop.display}</div>
                  <div style="font-size: 0.8em; color: #666;">${row.desktop.semaphor.label}</div>
                </td>
                <td class="diff-col diff-${row.difference.trend}">
                  ${row.difference.display}<br>
                  <small>${row.difference.description}</small>
                </td>
                <td style="font-size: 0.9em;">${row.difference.recommendation}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>

      <div id="seo" class="tab-content">
        ${isSiteWide && siteSEOAnalysis ? `
        <div class="glass-card">
          <h2>🔍 Análisis SEO Completo</h2>
          <div class="dashboard-grid">
            <div class="metric-card">
              <div class="metric-value">${siteSEOAnalysis.overallScore}/100</div>
              <div class="metric-label">Puntuación SEO</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${siteSEOAnalysis.titleAnalysis.optimalLength}/${siteSEOAnalysis.titleAnalysis.count}</div>
              <div class="metric-label">Títulos Óptimos</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${siteSEOAnalysis.metaDescriptionAnalysis.optimalLength}/${siteSEOAnalysis.metaDescriptionAnalysis.count}</div>
              <div class="metric-label">Meta Descriptions</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${siteSEOAnalysis.headingStructureAnalysis.pagesWithH1}/${siteSEOAnalysis.headingStructureAnalysis.totalPages}</div>
              <div class="metric-label">Páginas con H1</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <div id="security" class="tab-content">
        ${isSiteWide && vulnerabilityAnalysis ? `
        <div class="glass-card">
          <h2>🔒 Evaluación de Seguridad</h2>
          <div class="dashboard-grid">
            <div class="metric-card">
              <div class="metric-value">${vulnerabilityAnalysis.riskScore}/100</div>
              <div class="metric-label">Nivel de Riesgo</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${vulnerabilityAnalysis.summary.critical}</div>
              <div class="metric-label">Vulnerabilidades Críticas</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${vulnerabilityAnalysis.summary.high}</div>
              <div class="metric-label">Vulnerabilidades Altas</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${vulnerabilityAnalysis.summary.total}</div>
              <div class="metric-label">Total Vulnerabilidades</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <div id="solutions" class="tab-content">
        ${actionableRecs.length > 0 ? `
        <div class="glass-card">
          <h2>💡 Recomendaciones Priorizadas</h2>
          ${actionableRecs.slice(0, 5).map(rec => `
          <div class="issue-card issue-${rec.priority.toLowerCase()}">
            <div class="issue-header">
              <div class="issue-title">${rec.category}: ${rec.issue}</div>
              <div class="severity-badge severity-${rec.priority.toLowerCase()}">
                <span>${rec.severity}</span>
                <span>${rec.priority}</span>
              </div>
            </div>
            <div class="issue-description">${rec.impact}</div>
            <div class="solution-tabs">
              <button class="solution-tab active" data-solution="quick">Solución Rápida</button>
              <button class="solution-tab" data-solution="technical">Solución Técnica</button>
              <button class="solution-tab" data-solution="checklist">Checklist</button>
            </div>
            <div class="solution-content">
              <div class="solution-content-item active" data-solution="quick">
                <strong>Implementación:</strong>
                ${(rec.specificActions || [rec.action || 'Acción no especificada']).slice(0, 2).map(action => `<div>${action}</div>`).join('')}
              </div>
              <div class="solution-content-item" data-solution="technical">
                <div class="code-block">${rec.specificActions ? rec.specificActions[0] : 'Código de ejemplo no disponible'}</div>
              </div>
              <div class="solution-content-item" data-solution="checklist">
                <div class="checklist">
                  ${(rec.specificActions || [rec.action || 'Acción no especificada']).map(action => `<div class="checklist-item">${action}</div>`).join('')}
                </div>
              </div>
            </div>
            <div class="issue-impact">
              <strong>ROI Estimado:</strong> ${rec.businessImpact} | <strong>Esfuerzo:</strong> ${rec.effort}
            </div>
          </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div id="roi" class="tab-content">
        <div class="glass-card">
          <h2>📈 Análisis de Retorno de Inversión</h2>
          <div class="neu-card">
            <h3>💰 Impacto Económico Estimado</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
              <div style="text-align: center;">
                <div style="font-size: 2em; font-weight: bold; color: #10b981;">$5,000+</div>
                <div style="color: #6b7280;">Ingresos mensuales adicionales</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2em; font-weight: bold; color: #10b981;">25%</div>
                <div style="color: #6b7280;">Mejora en conversión</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2em; font-weight: bold; color: #10b981;">0.5 meses</div>
                <div style="color: #6b7280;">Payback period</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2em; font-weight: bold; color: #10b981;">70%</div>
                <div style="color: #6b7280;">Confianza en estimaciones</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overview Section -->
    ${this.results.pagespeedInsights ? `
    <div class="overview-section">
      <div class="overview-grid">
        <div class="overview-card">
          <h3>📊 Performance General</h3>
          <div class="overview-metric">${this.results.pagespeedInsights.summary.averageScore}/100</div>
          <div class="overview-label">${this.results.pagespeedInsights.summary.overallGrade}</div>
        </div>
        <div class="overview-card">
          <h3>📱 Móvil</h3>
          <div class="overview-metric">${this.results.pagespeedInsights.mobile.score}/100</div>
          <div class="overview-label">${getSemaphor(this.results.pagespeedInsights.mobile.score).label}</div>
        </div>
        <div class="overview-card">
          <h3>🖥️ Desktop</h3>
          <div class="overview-metric">${this.results.pagespeedInsights.desktop.score}/100</div>
          <div class="overview-label">${getSemaphor(this.results.pagespeedInsights.desktop.score).label}</div>
        </div>
        <div class="overview-card">
          <h3>🎯 Core Web Vitals</h3>
          <div class="overview-metric">${Math.round(MetricsHelper.generateMetricSummary(this.results.pagespeedInsights).coreWebVitalsScore)}/100</div>
          <div class="overview-label">Puntuación CWV</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Screenshots Section -->
    ${this.results.pagespeedInsights?.mobile?.screenshot || this.results.pagespeedInsights?.desktop?.screenshot ? `
    <div class="section">
      <h2>📸 Evidencia Visual - PageSpeed Insights</h2>
      <div class="screenshots-section">
        ${this.results.pagespeedInsights.mobile?.screenshot ? `
        <div class="screenshot-card">
          <h4>📱 Resultados Móvil</h4>
          <img src="data:image/png;base64,${this.results.pagespeedInsights.mobile.screenshot}"
               alt="PageSpeed Insights - Móvil"
               onerror="this.style.display='none';" />
        </div>
        ` : ''}
        ${this.results.pagespeedInsights.desktop?.screenshot ? `
        <div class="screenshot-card">
          <h4>🖥️ Resultados Desktop</h4>
          <img src="data:image/png;base64,${this.results.pagespeedInsights.desktop.screenshot}"
               alt="PageSpeed Insights - Desktop"
               onerror="this.style.display='none';" />
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Site Summary (for site-wide) -->
    ${isSiteWide && siteSummary ? `
    <div class="section">
      <h2>📊 Resumen del Sitio Analizado</h2>
      <div class="overview-section">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>📄 Páginas Analizadas</h3>
            <div class="overview-metric">${siteSummary.successfulPages}/${siteSummary.totalPages}</div>
            <div class="overview-label">${siteSummary.successfulPages} exitosas, ${siteSummary.failedPages} fallidas</div>
          </div>
          <div class="overview-card">
            <h3>🎯 Cobertura del Sitio</h3>
            <div class="overview-metric">${siteSummary.coverage}%</div>
            <div class="overview-label">Páginas importantes analizadas</div>
          </div>
          <div class="overview-card">
            <h3>⚠️ Páginas Críticas</h3>
            <div class="overview-metric">${siteSummary.criticalPages}</div>
            <div class="overview-label">Requieren atención inmediata</div>
          </div>
          <div class="overview-card">
            <h3>📈 Puntuación Media</h3>
            <div class="overview-metric">${siteSummary.averageScore}/100</div>
            <div class="overview-label">${siteSummary.averageMobileScore}M / ${siteSummary.averageDesktopScore}D</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Page Details (for site-wide) -->
    ${isSiteWide && pageResults.length > 0 ? `
    <div class="section">
      <h2>📋 Análisis por Página</h2>
      ${pageResults.map(page => `
      <div class="card">
        <h3>${page.url.replace(this.results.url, '').replace(/^\//, '') || 'Homepage'}</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          ${page.ssl ? `
          <div>
            <strong>🔐 SSL:</strong>
            <span class="status-badge" style="background-color: ${page.ssl.status === 'valid' ? '#10b981' : '#ef4444'}">
              ${page.ssl.protocol} ${page.ssl.cert}
            </span>
          </div>
          ` : ''}

          ${page.links ? `
          <div>
            <strong>🔗 Links:</strong>
            <span class="status-badge" style="background-color: ${page.links.status === 'good' ? '#10b981' : page.links.status === 'warning' ? '#f59e0b' : '#ef4444'}">
              ${page.links.broken}/${page.links.total} rotos
            </span>
          </div>
          ` : ''}

          ${page.seo ? `
          <div>
            <strong>📄 SEO:</strong>
            <span class="status-badge" style="background-color: ${page.seo.status === 'good' ? '#10b981' : '#f59e0b'}">
              H1: ${page.seo.headings?.h1 || 0}, Meta: ${page.seo.metaDescription ? '✓' : '✗'}
            </span>
          </div>
          ` : ''}

          ${page.technologies ? `
          <div>
            <strong>🏗️ Tecnologías:</strong>
            <span style="font-size: 0.9em;">
              ${page.technologies.cms !== 'No detectado' ? page.technologies.cms : ''}
              ${page.technologies.framework !== 'No detectado' ? page.technologies.framework : ''}
              ${page.technologies.hosting !== 'No detectado' ? `(${page.technologies.hosting})` : ''}
            </span>
          </div>
          ` : ''}
        </div>

        ${page.seo?.title ? `
        <div style="margin-top: 10px;">
          <strong>Título:</strong> <em style="color: #6b7280;">${page.seo.title.length > 80 ? page.seo.title.substring(0, 80) + '...' : page.seo.title}</em>
        </div>
        ` : ''}

        ${page.analysisLevel ? `
        <div style="margin-top: 10px; font-size: 0.9em; color: #6b7280;">
          <strong>Nivel de Análisis:</strong> ${page.analysisLevel.toUpperCase()}
          | <strong>Prioridad:</strong> ${page.priority}
          | <strong>Tipo:</strong> ${page.type}
          ${page.analysisTime ? `| <strong>Tiempo:</strong> ${(page.analysisTime/1000).toFixed(1)}s` : ''}
        </div>
        ` : ''}
      </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- SEO General Analysis -->
    ${isSiteWide && siteSEOAnalysis ? `
    <div class="section">
      <h2>🔍 SEO General del Sitio</h2>
      <div class="overview-section">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>📊 Puntuación SEO General</h3>
            <div class="overview-metric">${siteSEOAnalysis.overallScore}/100</div>
            <div class="overview-label">${siteSEOAnalysis.overallScore >= 80 ? 'Excelente' : siteSEOAnalysis.overallScore >= 60 ? 'Bueno' : 'Requiere atención'}</div>
          </div>
          <div class="overview-card">
            <h3>📝 Títulos</h3>
            <div class="overview-metric">${siteSEOAnalysis.titleAnalysis.optimalLength}/${siteSEOAnalysis.titleAnalysis.count}</div>
            <div class="overview-label">${siteSEOAnalysis.titleAnalysis.optimalLength === siteSEOAnalysis.titleAnalysis.count ? 'Todos óptimos' : 'Algunos requieren ajuste'}</div>
          </div>
          <div class="overview-card">
            <h3>📄 Meta Descriptions</h3>
            <div class="overview-metric">${siteSEOAnalysis.metaDescriptionAnalysis.optimalLength}/${siteSEOAnalysis.metaDescriptionAnalysis.count}</div>
            <div class="overview-label">${siteSEOAnalysis.metaDescriptionAnalysis.optimalLength === siteSEOAnalysis.metaDescriptionAnalysis.count ? 'Todas óptimas' : 'Algunas requieren ajuste'}</div>
          </div>
          <div class="overview-card">
            <h3>🏗️ Estructura Headings</h3>
            <div class="overview-metric">${siteSEOAnalysis.headingStructureAnalysis.pagesWithH1}/${siteSEOAnalysis.headingStructureAnalysis.totalPages}</div>
            <div class="overview-label">Páginas con H1 válido</div>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">📋 Detalles del Análisis SEO</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">📝 Análisis de Títulos</h4>
              <ul style="color: #6b7280; font-size: 0.9em; line-height: 1.6;">
                <li><strong>Total títulos:</strong> ${siteSEOAnalysis.titleAnalysis.count}</li>
                <li><strong>Títulos únicos:</strong> ${siteSEOAnalysis.titleAnalysis.uniqueCount}</li>
                <li><strong>Longitud promedio:</strong> ${siteSEOAnalysis.titleAnalysis.averageLength} caracteres</li>
                <li><strong>Títulos duplicados:</strong> ${siteSEOAnalysis.titleAnalysis.duplicates}</li>
                <li><strong>Puntuación:</strong> ${siteSEOAnalysis.titleAnalysis.score}/100</li>
              </ul>
              ${siteSEOAnalysis.titleAnalysis.issues.length > 0 ? `
              <div style="margin-top: 15px; color: #ef4444; font-size: 0.85em;">
                <strong>⚠️ Issues:</strong>
                <ul style="margin-top: 5px;">
                  ${siteSEOAnalysis.titleAnalysis.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">📄 Meta Descriptions</h4>
              <ul style="color: #6b7280; font-size: 0.9em; line-height: 1.6;">
                <li><strong>Total meta desc:</strong> ${siteSEOAnalysis.metaDescriptionAnalysis.count}</li>
                <li><strong>Meta desc únicas:</strong> ${siteSEOAnalysis.metaDescriptionAnalysis.uniqueCount}</li>
                <li><strong>Longitud promedio:</strong> ${siteSEOAnalysis.metaDescriptionAnalysis.averageLength} caracteres</li>
                <li><strong>Meta desc duplicadas:</strong> ${siteSEOAnalysis.metaDescriptionAnalysis.duplicates}</li>
                <li><strong>Puntuación:</strong> ${siteSEOAnalysis.metaDescriptionAnalysis.score}/100</li>
              </ul>
              ${siteSEOAnalysis.metaDescriptionAnalysis.issues.length > 0 ? `
              <div style="margin-top: 15px; color: #ef4444; font-size: 0.85em;">
                <strong>⚠️ Issues:</strong>
                <ul style="margin-top: 5px;">
                  ${siteSEOAnalysis.metaDescriptionAnalysis.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">🏗️ Estructura Headings</h4>
              <ul style="color: #6b7280; font-size: 0.9em; line-height: 1.6;">
                <li><strong>Páginas analizadas:</strong> ${siteSEOAnalysis.headingStructureAnalysis.totalPages}</li>
                <li><strong>Con H1 válido:</strong> ${siteSEOAnalysis.headingStructureAnalysis.pagesWithH1}</li>
                <li><strong>Con H1 múltiple:</strong> ${siteSEOAnalysis.headingStructureAnalysis.pagesWithMultipleH1}</li>
                <li><strong>H1 promedio por página:</strong> ${siteSEOAnalysis.headingStructureAnalysis.averageH1Count}</li>
                <li><strong>Puntuación:</strong> ${siteSEOAnalysis.headingStructureAnalysis.score}/100</li>
              </ul>
              ${siteSEOAnalysis.headingStructureAnalysis.issues.length > 0 ? `
              <div style="margin-top: 15px; color: #ef4444; font-size: 0.85em;">
                <strong>⚠️ Issues:</strong>
                <ul style="margin-top: 5px;">
                  ${siteSEOAnalysis.headingStructureAnalysis.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
              </div>
              ` : ''}
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">🔗 URLs y Enlaces</h4>
              <ul style="color: #6b7280; font-size: 0.9em; line-height: 1.6;">
                <li><strong>Total URLs analizadas:</strong> ${siteSEOAnalysis.urlStructureAnalysis.totalUrls}</li>
                <li><strong>URLs SEO-friendly:</strong> ${siteSEOAnalysis.urlStructureAnalysis.seoFriendly}</li>
                <li><strong>URLs con keywords:</strong> ${siteSEOAnalysis.urlStructureAnalysis.withKeywords}</li>
                <li><strong>URLs demasiado largas:</strong> ${siteSEOAnalysis.urlStructureAnalysis.tooLong}</li>
                <li><strong>URLs con underscores:</strong> ${siteSEOAnalysis.urlStructureAnalysis.withUnderscores}</li>
                <li><strong>Puntuación URLs:</strong> ${siteSEOAnalysis.urlStructureAnalysis.score}/100</li>
              </ul>
              <ul style="color: #6b7280; font-size: 0.9em; line-height: 1.6; margin-top: 10px;">
                <li><strong>Total enlaces internos:</strong> ${siteSEOAnalysis.internalLinkingAnalysis.totalLinks}</li>
                <li><strong>Enlaces rotos:</strong> ${siteSEOAnalysis.internalLinkingAnalysis.brokenLinks}</li>
                <li><strong>Enlaces sanos:</strong> ${siteSEOAnalysis.internalLinkingAnalysis.healthyLinks}</li>
                <li><strong>Puntuación enlaces:</strong> ${siteSEOAnalysis.internalLinkingAnalysis.score}/100</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Lighthouse Local Analysis -->
    ${isSiteWide && lighthouseLocalAnalysis ? `
    <div class="section">
      <h2>🏮 Lighthouse Analysis Local</h2>
      <div class="overview-section">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>⚡ Performance</h3>
            <div class="overview-metric">${lighthouseLocalAnalysis.summary?.averageScores?.performance || 'N/A'}/100</div>
            <div class="overview-label">${lighthouseLocalAnalysis.summary?.averageScores?.performance >= 90 ? 'Excelente' : lighthouseLocalAnalysis.summary?.averageScores?.performance >= 50 ? 'Requiere mejora' : 'Crítico'}</div>
          </div>
          <div class="overview-card">
            <h3>♿ Accessibility</h3>
            <div class="overview-metric">${lighthouseLocalAnalysis.summary?.averageScores?.accessibility || 'N/A'}/100</div>
            <div class="overview-label">${lighthouseLocalAnalysis.summary?.averageScores?.accessibility >= 90 ? 'Excelente' : lighthouseLocalAnalysis.summary?.averageScores?.accessibility >= 70 ? 'Bueno' : 'Requiere mejora'}</div>
          </div>
          <div class="overview-card">
            <h3>✨ Best Practices</h3>
            <div class="overview-metric">${lighthouseLocalAnalysis.summary?.averageScores?.bestPractices || 'N/A'}/100</div>
            <div class="overview-label">${lighthouseLocalAnalysis.summary?.averageScores?.bestPractices >= 90 ? 'Excelente' : lighthouseLocalAnalysis.summary?.averageScores?.bestPractices >= 70 ? 'Bueno' : 'Requiere mejora'}</div>
          </div>
          <div class="overview-card">
            <h3>🔍 SEO</h3>
            <div class="overview-metric">${lighthouseLocalAnalysis.summary?.averageScores?.seo || 'N/A'}/100</div>
            <div class="overview-label">${lighthouseLocalAnalysis.summary?.averageScores?.seo >= 90 ? 'Excelente' : lighthouseLocalAnalysis.summary?.averageScores?.seo >= 70 ? 'Bueno' : 'Requiere mejora'}</div>
          </div>
        </div>

        ${lighthouseLocalAnalysis.summary?.coreWebVitalsAverage ? `
        <div style="margin-top: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">🎯 Core Web Vitals Promedio</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center;">
              <h4 style="color: #1f2937; margin-bottom: 10px;">LCP (Largest Contentful Paint)</h4>
              <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${(lighthouseLocalAnalysis.summary.coreWebVitalsAverage.lcp / 1000).toFixed(1)}s</div>
              <div style="color: #6b7280; font-size: 0.9em;">Debe ser < 2.5s</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center;">
              <h4 style="color: #1f2937; margin-bottom: 10px;">FID (First Input Delay)</h4>
              <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${lighthouseLocalAnalysis.summary.coreWebVitalsAverage.fid}ms</div>
              <div style="color: #6b7280; font-size: 0.9em;">Debe ser < 100ms</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center;">
              <h4 style="color: #1f2937; margin-bottom: 10px;">CLS (Cumulative Layout Shift)</h4>
              <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${lighthouseLocalAnalysis.summary.coreWebVitalsAverage.cls}</div>
              <div style="color: #6b7280; font-size: 0.9em;">Debe ser < 0.1</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${lighthouseLocalAnalysis.summary?.topIssues?.length > 0 ? `
        <div style="margin-top: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">🚨 Principales Problemas Encontrados</h3>
          <div style="display: grid; gap: 15px;">
            ${lighthouseLocalAnalysis.summary.topIssues.map(issue => `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #1f2937;">${issue.category}: ${issue.title}</span>
                <span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em;">${issue.percentage}% de páginas</span>
              </div>
              <p style="color: #6b7280; font-size: 0.9em;">${issue.count} páginas afectadas de ${lighthouseLocalAnalysis.metadata?.totalPages || 'N/A'}</p>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Security Vulnerabilities Analysis -->
    ${isSiteWide && vulnerabilityAnalysis ? `
    <div class="section">
      <h2>🔒 Análisis de Vulnerabilidades de Seguridad</h2>
      <div class="overview-section">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>📊 Nivel de Riesgo</h3>
            <div class="overview-metric">${vulnerabilityAnalysis.riskScore}/100</div>
            <div class="overview-label">${vulnerabilityAnalysis.riskScore >= 70 ? 'Alto Riesgo' : vulnerabilityAnalysis.riskScore >= 40 ? 'Riesgo Moderado' : 'Bajo Riesgo'}</div>
          </div>
          <div class="overview-card">
            <h3>🚨 Vulnerabilidades Críticas</h3>
            <div class="overview-metric">${vulnerabilityAnalysis.summary.critical}</div>
            <div class="overview-label">Requieren atención inmediata</div>
          </div>
          <div class="overview-card">
            <h3>⚠️ Vulnerabilidades Altas</h3>
            <div class="overview-metric">${vulnerabilityAnalysis.summary.high}</div>
            <div class="overview-label">Deben resolverse pronto</div>
          </div>
          <div class="overview-card">
            <h3>📋 Total Vulnerabilidades</h3>
            <div class="overview-metric">${vulnerabilityAnalysis.summary.total}</div>
            <div class="overview-label">Detectadas en el sitio</div>
          </div>
        </div>

        ${vulnerabilityAnalysis.detected.length > 0 ? `
        <div style="margin-top: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">🔍 Detalles de Vulnerabilidades Encontradas</h3>
          <div style="display: grid; gap: 15px;">
            ${vulnerabilityAnalysis.detected.slice(0, 10).map(vuln => `
            <div style="background: ${vuln.risk === 'CRITICAL' ? '#fef2f2' : vuln.risk === 'HIGH' ? '#fef3c7' : '#f0fdf4'}; border-left: 4px solid ${vuln.risk === 'CRITICAL' ? '#dc2626' : vuln.risk === 'HIGH' ? '#d97706' : '#16a34a'}; padding: 15px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #1f2937;">${vuln.library} - ${vuln.vulnerability}</span>
                <span style="background: ${vuln.risk === 'CRITICAL' ? '#dc2626' : vuln.risk === 'HIGH' ? '#d97706' : '#16a34a'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">${vuln.risk} (${vuln.cvss})</span>
              </div>
              <p style="color: #6b7280; font-size: 0.9em; margin-bottom: 10px;">${vuln.description}</p>
              <p style="color: #374151; font-size: 0.9em; margin-bottom: 10px;"><strong>Impacto:</strong> ${vuln.impact}</p>
              <p style="color: #059669; font-size: 0.9em;"><strong>Solución:</strong> ${vuln.remediation}</p>
              <div style="margin-top: 10px; font-size: 0.8em; color: #6b7280;">
                <strong>Fuente:</strong> ${vuln.source} | <strong>Versión:</strong> ${vuln.version}
              </div>
            </div>
            `).join('')}
          </div>

          ${vulnerabilityAnalysis.detected.length > 10 ? `
          <div style="margin-top: 15px; text-align: center; color: #6b7280; font-size: 0.9em;">
            ... y ${vulnerabilityAnalysis.detected.length - 10} vulnerabilidades adicionales
          </div>
          ` : ''}
        </div>
        ` : `

        <div style="margin-top: 30px; text-align: center;">
          <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: 30px;">
            <h3 style="color: #16a34a; margin-bottom: 10px;">✅ No se detectaron vulnerabilidades críticas</h3>
            <p style="color: #374151; font-size: 1.1em;">El sitio tiene una buena postura de seguridad</p>
          </div>
        </div>
        `}
      </div>
    </div>
    ` : ''}

    <!-- CDN Configuration Scripts -->
    ${isSiteWide && this.results.performanceImpacts ? `
    <div class="section">
      <h2>🚀 Scripts de Configuración CDN</h2>
      <div class="overview-section">
        <div style="margin-bottom: 20px;">
          <p style="color: #6b7280; font-size: 1.1em; margin-bottom: 20px;">
            Scripts listos para implementar optimizaciones de performance con diferentes proveedores CDN
          </p>
        </div>

        <!-- Cloudflare Configuration -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 15px;">⚡ Cloudflare - Configuración Completa</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">📋 Page Rules para Cache</h4>
              <pre style="background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.8em; overflow-x: auto; line-height: 1.4;">
# Cloudflare Page Rules para optimización
# Regla 1: Cache agresivo para assets estáticos
*.${new URL(this.results.url).hostname}/assets/* -> Cache Level: Aggressive, Edge Cache TTL: 1 año

# Regla 2: Cache para páginas HTML
*.${new URL(this.results.url).hostname}/* -> Cache Level: Cache Everything, Edge Cache TTL: 5 minutos

# Regla 3: Bypass cache para páginas dinámicas
*.${new URL(this.results.url).hostname}/cart/* -> Cache Level: Bypass
*.${new URL(this.results.url).hostname}/checkout/* -> Cache Level: Bypass</pre>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">🔧 Configuración Nginx</h4>
              <pre style="background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.8em; overflow-x: auto; line-height: 1.4;">
# Configuración Nginx para Cloudflare
location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location / {
    try_files $uri $uri/ /index.php?$args;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}</pre>
            </div>
          </div>
        </div>

        <!-- AWS CloudFront Configuration -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 15px;">☁️ AWS CloudFront - Distribución Global</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">📦 CloudFront Behaviors</h4>
              <pre style="background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.8em; overflow-x: auto; line-height: 1.4;">
{
  "CacheBehaviors": [
    {
      "PathPattern": "/assets/*",
      "TargetOriginId": "s3-assets",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 86400,
      "MaxTTL": 31536000,
      "Compress": true
    },
    {
      "PathPattern": "*",
      "TargetOriginId": "origin-server",
      "MinTTL": 0,
      "MaxTTL": 300,
      "Compress": true
    }
  ]
}</pre>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
              <h4 style="color: #1f2937; margin-bottom: 15px;">⚙️ Lambda@Edge para Optimización</h4>
              <pre style="background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.8em; overflow-x: auto; line-height: 1.4;">
'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;

    // Headers de cache para assets
    if (request.uri.match(/\\.(css|js)$/)) {
        request.headers['cache-control'] = [{
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
        }];
    }

    callback(null, request);
};</pre>
            </div>
          </div>
        </div>

        <!-- Akamai Configuration -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 15px;">🌐 Akamai - Optimización Avanzada</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px;">
            <h4 style="color: #1f2937; margin-bottom: 15px;">🎯 Ion Property Configuration</h4>
            <pre style="background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.8em; overflow-x: auto; line-height: 1.4;">
{
  "rules": {
    "name": "Performance Optimization",
    "children": [
      {
        "name": "Compress Text Assets",
        "criteria": {
          "contentType": ["text/html", "text/css", "application/javascript"]
        },
        "behaviors": [
          { "name": "gzipResponse", "options": { "enabled": true } }
        ]
      },
      {
        "name": "Cache Static Assets",
        "criteria": {
          "path": ["/assets/*", "/static/*"]
        },
        "behaviors": [
          {
            "name": "caching",
            "options": { "behavior": "MAX_AGE", "ttl": "1d" }
          }
        ]
      }
    ]
  }
}</pre>
          </div>
        </div>

        <div style="background: #e0f2fe; border: 2px solid #0277bd; border-radius: 10px; padding: 20px;">
          <h3 style="color: #0277bd; margin-bottom: 15px;">💡 Implementación Recomendada</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div>
              <h4 style="color: #0277bd;">1. Inicio Rápido</h4>
              <p style="color: #374151; font-size: 0.9em;">Comienza con Cloudflare - más fácil de implementar y configurar</p>
            </div>
            <div>
              <h4 style="color: #0277bd;">2. Escalabilidad</h4>
              <p style="color: #374151; font-size: 0.9em;">Para alto tráfico, considera AWS CloudFront con Lambda@Edge</p>
            </div>
            <div>
              <h4 style="color: #0277bd;">3. Enterprise</h4>
              <p style="color: #374151; font-size: 0.9em;">Para grandes corporaciones, Akamai ofrece las mejores funcionalidades</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Technology-based Recommendations -->
    ${pageResults.some(p => p.technologies?.framework === 'Vue') ? `
    <div class="section">
      <h2>🔧 Recomendaciones Específicas para Vue.js</h2>
      <div class="recommendations-grid">
        <div class="recommendation-card recommendation-medium">
          <div class="recommendation-header">
            <div class="recommendation-severity severity-medium">
              <span>🟡</span>
              <span>MEDIUM</span>
            </div>
            <div style="font-size: 0.9em; color: #6b7280;">Vue.js Optimization</div>
          </div>
          <div class="recommendation-issue">Lazy loading de componentes Vue</div>
          <div class="recommendation-impact">Usar componentes async y lazy loading para mejorar tiempo de carga inicial</div>
          <div class="recommendation-actions">
            <strong>Acciones específicas:</strong>
            <div class="recommendation-action">Implementar dynamic imports: const Component = () => import('./Component.vue')</div>
            <div class="recommendation-action">Usar vue-router lazy loading para rutas</div>
            <div class="recommendation-action">Configurar webpack chunk splitting</div>
          </div>
          <div class="recommendation-outcomes">
            <div class="outcome-item">
              <div class="outcome-label">Mejora Esperada</div>
              <div class="outcome-value">Reducción 30-50% bundle inicial</div>
            </div>
            <div class="outcome-item">
              <div class="outcome-label">Esfuerzo</div>
              <div class="outcome-value">2-3 días</div>
            </div>
            <div class="outcome-item">
              <div class="outcome-label">ROI</div>
              <div class="outcome-value">$2,000-$5,000/mes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Comparison Table -->
    ${comparisonTable.length > 0 ? `
    <div class="section">
      <h2>📊 Comparativa Detallada: Móvil vs Desktop</h2>
      <div class="card">
        <h3>🔍 Análisis Métrico Completo</h3>
        <p style="color: #6b7280; margin-bottom: 20px;">
          Comparación de todas las métricas de rendimiento entre dispositivos móviles y desktop.
          Valores en verde indican mejor rendimiento.
        </p>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Móvil</th>
              <th>Desktop</th>
              <th>Diferencia</th>
              <th>Recomendación</th>
            </tr>
          </thead>
          <tbody>
            ${comparisonTable.map(row => `
            <tr>
              <td>
                <strong>${row.metric}</strong><br>
                <small style="color: #6b7280;">${MetricsHelper.getMetricDefinition(row.key).description}</small>
              </td>
              <td class="mobile-col">
                <div style="font-weight: bold; color: ${row.mobile.semaphor.color}">${row.mobile.display}</div>
                <div style="font-size: 0.8em; color: #666;">${row.mobile.semaphor.label}</div>
              </td>
              <td class="desktop-col">
                <div style="font-weight: bold; color: ${row.desktop.semaphor.color}">${row.desktop.display}</div>
                <div style="font-size: 0.8em; color: #666;">${row.desktop.semaphor.label}</div>
              </td>
              <td class="diff-col diff-${row.difference.trend}">
                ${row.difference.display}<br>
                <small>${row.difference.description}</small>
              </td>
              <td style="font-size: 0.9em;">${row.difference.recommendation}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <!-- Actionable Recommendations -->
    ${actionableRecs.length > 0 ? `
    <div class="section">
      <h2>💡 Recomendaciones Accionables</h2>
      <div class="recommendations-grid">
        ${actionableRecs.map(rec => `
        <div class="recommendation-card recommendation-${rec.priority.toLowerCase()}">
          <div class="recommendation-header">
            <div class="recommendation-severity severity-${rec.priority.toLowerCase()}">
              <span>${rec.severity}</span>
              <span>${rec.priority}</span>
            </div>
            <div style="font-size: 0.9em; color: #6b7280;">${rec.category}</div>
          </div>

          <div class="recommendation-issue">${rec.issue}</div>
          <div class="recommendation-impact">${rec.impact}</div>

          <div class="recommendation-actions">
            <strong>Acciones específicas:</strong>
            ${(rec.specificActions || [rec.action || 'Acción no especificada']).map(action => `
              <div class="recommendation-action">${action}</div>
            `).join('')}
          </div>

          <div class="recommendation-outcomes">
            <div class="outcome-item">
              <div class="outcome-label">Mejora Esperada</div>
              <div class="outcome-value">${rec.expectedImprovement}</div>
            </div>
            <div class="outcome-item">
              <div class="outcome-label">Esfuerzo</div>
              <div class="outcome-value">${rec.effort}</div>
            </div>
            <div class="outcome-item">
              <div class="outcome-label">ROI</div>
              <div class="outcome-value">${rec.businessImpact}</div>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>
        <strong>Web Audit Disconnect</strong> | Informe de Auditoría Técnica de Performance Web<br>
        ${new Date().toLocaleString('es-ES')} | Basado en datos reales de Google PageSpeed Insights
      </p>
    </div>

    <!-- Tab Navigation Script -->
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        function switchTab(tabName) {
          // Remove active class from all tabs
          navTabs.forEach(tab => tab.classList.remove('active'));

          // Hide all tab contents
          tabContents.forEach(content => content.classList.remove('active'));

          // Add active class to clicked tab
          const activeTab = document.querySelector('[data-tab="' + tabName + '"]');
          if (activeTab) {
            activeTab.classList.add('active');
          }

          // Show corresponding content
          const activeContent = document.getElementById(tabName);
          if (activeContent) {
            activeContent.classList.add('active');
          }
        }

        // Add click event listeners to tabs
        navTabs.forEach(tab => {
          tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
          });
        });

        // Show first tab by default
        if (navTabs.length > 0) {
          const firstTab = navTabs[0].getAttribute('data-tab');
          switchTab(firstTab);
        }

        // Handle solution tabs
        document.addEventListener('click', function(e) {
          if (e.target.classList.contains('solution-tab')) {
            const tab = e.target;
            const container = tab.closest('.solution-tabs');
            const contentContainer = tab.closest('.issue-card').querySelector('.solution-content');

            // Remove active class from all tabs in this container
            container.querySelectorAll('.solution-tab').forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding content
            const tabId = tab.textContent.toLowerCase().replace(/\s+/g, '-');
            const contents = contentContainer.querySelectorAll('.solution-content-item');

            contents.forEach(content => content.classList.remove('active'));
            const targetContent = contentContainer.querySelector('[data-solution="' + tabId + '"]');
            if (targetContent) {
              targetContent.classList.add('active');
            }
          }
        });
      });
    </script>
  </div>
</body>
</html>
    `;

    const filename = join(this.reportDir, `${this.results.client}_${this.timestamp}.html`);
    writeFileSync(filename, html);
    this.htmlPath = filename;
    return filename;
  }

  generateJSON() {
    const filename = join(this.reportDir, `${this.results.client}_${this.timestamp}.json`);
    writeFileSync(filename, JSON.stringify(this.results, null, 2));
    this.jsonPath = filename;
    return filename;
  }

  getReportPath() {
    return {
      html: this.htmlPath || 'No generado',
      json: this.jsonPath || 'No generado'
    };
  }
}

export default ReportGenerator;
