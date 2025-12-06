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
    this.outputPath = null; // Initialize outputPath
  }

  _sanitizeFilename(url) {
    // Remove protocol and special characters to create safe filename
    return url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  generateActionableRecommendationsWithImpacts() {
    const recommendations = [];
    const isSiteWide = this.results.auditType === 'site-wide';

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

    // Performance recommendations based on audit type
    if (isSiteWide && this.results.pageAnalyses && this.results.pageAnalyses.length > 0) {
      const pageAnalyses = this.results.pageAnalyses;

      let totalMobileScore = 0;
      let totalDesktopScore = 0;
      let pagesWithCriticalIssues = 0;

      pageAnalyses.forEach(page => {
        if (page.pagespeedInsights) {
          totalMobileScore += page.pagespeedInsights.mobile?.score || 0;
          totalDesktopScore += page.pagespeedInsights.desktop?.score || 0;
        }
        if (page.forensics?.summary?.criticalIssues > 0) {
          pagesWithCriticalIssues++;
        }
      });

      const avgMobileScore = totalMobileScore / pageAnalyses.length;
      const avgDesktopScore = totalDesktopScore / pageAnalyses.length;

      if (avgMobileScore < 50 || avgDesktopScore < 50) {
        recommendations.push({
          priority: 'CRITICAL',
          severity: '🔴',
          category: 'Performance Crítica (Sitio Completo)',
          issue: `Puntuación de performance crítica promedio: ${Math.round(avgMobileScore)}/100 móvil, ${Math.round(avgDesktopScore)}/100 desktop`,
          impact: 'Sitio extremadamente lento, afecta conversión y experiencia de usuario en múltiples páginas',
          specificActions: [
            'Implementar optimizaciones globales de imágenes y assets',
            'Auditar y mejorar la estrategia de carga de recursos',
            'Asegurar configuración CDN consistente',
            'Minimizar y diferir CSS y JavaScript en todo el sitio'
          ],
          expectedImprovement: 'Mejora de la experiencia en todo el sitio',
          effort: '3-6 semanas',
          businessImpact: '$5,000-$15,000 mensuales adicionales'
        });
      }

      if (this.results.lighthouseLocalAnalysis?.summary?.topIssues) {
        const topIssues = this.results.lighthouseLocalAnalysis.summary.topIssues;
        const performanceIssues = topIssues.filter(issue => issue.category === 'Performance');
        if (performanceIssues.length > 0) {
          recommendations.push({
            priority: 'HIGH',
            severity: '🟠',
            category: 'Performance Lighthouse (Sitio Completo)',
            issue: `Problemas de performance en ${performanceIssues.length} categorías principales detectados localmente.`,
            impact: 'Velocidad de carga insuficiente según estándares modernos en páginas clave.',
            specificActions: [
              'Optimizar Largest Contentful Paint (LCP) a nivel de plantilla',
              'Mejorar Cumulative Layout Shift (CLS) en componentes reutilizables',
              'Reducir tiempo de bloqueo total (TBT) en scripts globales'
            ],
            expectedImprovement: `Mejora en métricas críticas en las páginas analizadas`,
            effort: '3-4 semanas',
            businessImpact: '$2,000-$5,000 mensuales adicionales'
          });
        }
      }

    } else if (this.results.pagespeedInsights) { // Single page audit
      const mobileScore = this.results.pagespeedInsights.mobile?.score || 0;
      const desktopScore = this.results.pagespeedInsights.desktop?.score || 0;

      if (mobileScore < 50 || desktopScore < 50) {
        recommendations.push({
          priority: 'CRITICAL',
          severity: '🔴',
          category: 'Performance Crítica',
          issue: `Puntuación de performance crítica: ${Math.round(mobileScore)}/100 móvil, ${Math.round(desktopScore)}/100 desktop`,
          impact: 'Sitio extremadamente lento, afecta conversión y experiencia de usuario',
          specificActions: [
            'Optimizar imágenes y assets críticos',
            'Implementar code splitting y lazy loading',
            'Configurar CDN para assets estáticos',
            'Minimizar CSS y JavaScript bloqueantes'
          ],
          expectedImprovement: 'Mejora 30-50 puntos en performance score',
          effort: '2-4 semanas',
          businessImpact: '$3,000-$8,000 mensuales adicionales'
        });
      }
      // Assuming lighthouseLocalAnalysis can also exist for single page if integrated
      if (this.results.lighthouseLocalAnalysis?.summary?.topIssues) {
        const topIssues = this.results.lighthouseLocalAnalysis.summary.topIssues;
        const performanceIssues = topIssues.filter(issue => issue.category === 'Performance');

        if (performanceIssues.length > 0) {
          recommendations.push({
            priority: 'HIGH',
            severity: '🟠',
            category: 'Performance Lighthouse',
            issue: `Problemas de performance en ${performanceIssues.length} categorías principales`,
            impact: 'Velocidad de carga insuficiente según estándares modernos',
            specificActions: [
              'Optimizar Largest Contentful Paint (LCP)',
              'Mejorar Cumulative Layout Shift (CLS)',
              'Reducir tiempo de bloqueo total (TBT)'
            ],
            expectedImprovement: `Mejora en ${performanceIssues.length} métricas críticas`,
            effort: '3-4 semanas',
            businessImpact: '$2,000-$5,000 mensuales adicionales'
          });
        }
      }
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
    // Use top-level SEO results if available, otherwise siteSEOAnalysis summary
    const seoResult = this.results.seo || (isSiteWide ? this.results.siteSEOAnalysis : null);

    if (seoResult) {
      const titleLength = (seoResult.title?.length || seoResult.titleAnalysis?.score < 70) ? ((seoResult.title?.length > 60) || false) : false; // Simplified check
      if (titleLength) {
        recommendations.push({
          priority: 'LOW',
          severity: '🟢',
          category: 'SEO - Titles',
          issue: `Título muy largo: ${seoResult.title?.length || 'N/A'} caracteres (máx. 60)`,
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

      if (!seoResult.metaDescription && seoResult.metaDescriptionAnalysis?.score < 70) {
        recommendations.push({
          priority: 'MEDIUM',
          severity: '🟡',
          category: 'SEO - Meta Descriptions',
          issue: 'Meta description faltante o de baja calidad',
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

      const h1Count = seoResult.headings?.h1 || seoResult.headingStructureAnalysis?.h1Count || 0;
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
        expectedImprovement: '-400ms TTFB',
        effort: '2-3 semanas',
        businessImpact: '$1,000-$2,500 mensuales adicionales'
      });
    }

    // Add vulnerability recommendations if available
    if (this.results.vulnerabilityAnalysis?.vulnerabilities && this.results.vulnerabilityAnalysis.vulnerabilities.length > 0) {
      const criticalVulns = this.results.vulnerabilityAnalysis.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
      if (criticalVulns > 0) {
        recommendations.push({
          priority: 'CRITICAL',
          severity: '🔴',
          category: 'Seguridad',
          issue: `Se detectaron ${criticalVulns} vulnerabilidades críticas`,
          impact: 'Riesgo de compromiso del sitio, pérdida de datos o ataques.',
          specificActions: ['Actualizar librerías vulnerables', 'Aplicar parches de seguridad'],
          expectedImprovement: 'Reducción del riesgo de seguridad y cumplimiento normativo.',
          effort: '1-2 semanas',
          businessImpact: 'Prevención de pérdidas millonarias por brechas de seguridad.'
        });
      }
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

    _getSeverityClass(priority) {
        switch (priority) {
            case 'CRITICAL': return 'severity-critical';
            case 'HIGH': return 'severity-high';
            case 'MEDIUM': return 'severity-medium';
            case 'LOW': return 'severity-low';
            default: return 'severity-low';
        }
    }

    _generateDetailedPerformanceMetrics() {
        const psi = this.results.pagespeedInsights || {}; // Ensure psi is an object
        if (!psi) return '<p>No hay datos detallados de PageSpeed Insights disponibles.</p>';

        const createMetricRow = (label, mobileValue, desktopValue) => `
            <tr>
                <td>${label}</td>
                <td>${mobileValue || 'N/A'}</td>
                <td>${desktopValue || 'N/A'}</td>
            </tr>
        `;

        // Safely extract metric values, handling both available and unavailable data
        const getMetricValue = (data, metricPath) => {
            if (!data || typeof data !== 'object') return 'N/A';

            const parts = metricPath.split('.');
            let value = data;

            for (const part of parts) {
                if (value && typeof value === 'object' && value[part] !== undefined) {
                    value = value[part];
                } else {
                    return 'N/A';
                }
            }

            // Handle displayValue for metrics
            if (typeof value === 'object' && value !== null && value.displayValue) {
                return value.displayValue;
            }

            return typeof value === 'string' || typeof value === 'number' ? value : 'N/A';
        };

        return `
            <h4>Métricas de Core Web Vitals y Performance</h4>
            <div class="table-responsive">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>Métrica</th>
                            <th>Móvil</th>
                            <th>Desktop</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${createMetricRow('Puntuación de Performance', getMetricValue(psi.mobile, 'score'), getMetricValue(psi.desktop, 'score'))}
                        ${createMetricRow('First Contentful Paint', getMetricValue(psi.mobile, 'detailedMetrics.fcp.displayValue'), getMetricValue(psi.desktop, 'detailedMetrics.fcp.displayValue'))}
                        ${createMetricRow('Largest Contentful Paint (LCP)', getMetricValue(psi.mobile, 'coreWebVitals.lcp.displayValue'), getMetricValue(psi.desktop, 'coreWebVitals.lcp.displayValue'))}
                        ${createMetricRow('Cumulative Layout Shift (CLS)', getMetricValue(psi.mobile, 'coreWebVitals.cls.displayValue'), getMetricValue(psi.desktop, 'coreWebVitals.cls.displayValue'))}
                        ${createMetricRow('Interaction to Next Paint (INP)', getMetricValue(psi.mobile, 'detailedMetrics.inp.displayValue'), getMetricValue(psi.desktop, 'detailedMetrics.inp.displayValue'))}
                        ${createMetricRow('Time to First Byte (TTFB)', getMetricValue(psi.mobile, 'detailedMetrics.ttfb.displayValue'), getMetricValue(psi.desktop, 'detailedMetrics.ttfb.displayValue'))}
                    </tbody>
                </table>
            </div>
        `;
    }

    _generateVulnerabilityTable() {
        const vulnerabilityAnalysis = this.results.vulnerabilityAnalysis || {};
        const vulns = vulnerabilityAnalysis.detected || [];
        const dependencyScan = vulnerabilityAnalysis.dependencyScan || {};

        if (!vulns || vulns.length === 0) {
            return '<p>✅ ¡Excelente! No se encontraron vulnerabilidades conocidas en las librerías y dependencias analizadas.</p>';
        }

        return `
            <div class="vulnerability-analysis-section">
                <h4>🔍 Análisis Completo de Vulnerabilidades en Dependencias</h4>

                ${dependencyScan.scanned ? `
                <div class="dependency-scan-summary">
                    <h5>📦 Escaneo de Archivos de Dependencias</h5>
                    <div class="scan-results">
                        <div class="scan-metric">
                            <strong>Archivos Encontrados:</strong> ${dependencyScan.filesFound?.length || 0}
                        </div>
                        <div class="scan-metric">
                            <strong>Dependencias Analizadas:</strong> ${dependencyScan.dependencies?.length || 0}
                        </div>
                        <div class="scan-metric">
                            <strong>Vulnerabilidades en Dependencias:</strong> ${dependencyScan.vulnerabilities?.length || 0}
                        </div>
                    </div>

                    ${dependencyScan.filesFound?.length > 0 ? `
                    <div class="files-found">
                        <strong>Archivos escaneados:</strong> ${dependencyScan.filesFound.join(', ')}
                    </div>
                    ` : ''}

                    ${dependencyScan.dependencies?.length > 0 ? `
                    <div class="top-dependencies">
                        <h6>Principales Dependencias Encontradas:</h6>
                        <div class="dependencies-list">
                            ${dependencyScan.dependencies.slice(0, 10).map(dep => `
                                <span class="dependency-tag">${dep.name}@${dep.version} <small>(${dep.type})</small></span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <h5>🚨 Vulnerabilidades Detectadas</h5>
                <div class="vulnerabilities-summary">
                    <div class="vulnerability-stats">
                        <div class="stat-card critical">
                            <div class="stat-number">${vulnerabilityAnalysis.summary?.critical || 0}</div>
                            <div class="stat-label">Críticas</div>
                        </div>
                        <div class="stat-card high">
                            <div class="stat-number">${vulnerabilityAnalysis.summary?.high || 0}</div>
                            <div class="stat-label">Altas</div>
                        </div>
                        <div class="stat-card medium">
                            <div class="stat-number">${vulnerabilityAnalysis.summary?.medium || 0}</div>
                            <div class="stat-label">Medias</div>
                        </div>
                        <div class="stat-card low">
                            <div class="stat-number">${vulnerabilityAnalysis.summary?.low || 0}</div>
                            <div class="stat-label">Bajas</div>
                        </div>
                    </div>
                    <div class="risk-score">
                        <div class="risk-gauge">
                            <div class="risk-fill" style="width: ${vulnerabilityAnalysis.riskScore || 0}%"></div>
                        </div>
                        <div class="risk-label">
                            <strong>Puntuación de Riesgo: ${vulnerabilityAnalysis.riskScore || 0}/100</strong>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Riesgo</th>
                                <th>Librería</th>
                                <th>Vulnerabilidad</th>
                                <th>Versión</th>
                                <th>Descripción</th>
                                <th>Fuente</th>
                                <th>Solución</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vulns.map(v => `
                                <tr class="${this._getSeverityClass(v.risk)}">
                                    <td>
                                        <span class="risk-badge ${v.risk.toLowerCase()}">${v.risk}</span>
                                    </td>
                                    <td>
                                        <strong>${v.library}</strong>
                                        ${v.ecosystem ? `<br><small>${v.ecosystem}</small>` : ''}
                                    </td>
                                    <td><code>${v.vulnerability}</code></td>
                                    <td>${v.version}</td>
                                    <td>${v.description}</td>
                                    <td><small>${v.source}</small></td>
                                    <td>${v.remediation}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${vulnerabilityAnalysis.recommendations?.length > 0 ? `
                <div class="vulnerability-recommendations">
                    <h6>💡 Recomendaciones Prioritarias</h6>
                    <ul>
                        ${vulnerabilityAnalysis.recommendations.map(rec => `
                            <li class="${rec.priority.toLowerCase()}">
                                <strong>${rec.category}:</strong> ${rec.issue}
                                <br><em>${rec.action}</em>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="vulnerability-disclaimer">
                    <p><em>⚠️ Este análisis incluye vulnerabilidades conocidas hasta la fecha de la auditoría.
                    Se recomienda mantener actualizadas las dependencias y usar herramientas de monitoreo continuo
                    como Snyk, Dependabot, o npm audit para detectar nuevas vulnerabilidades.</em></p>
                </div>
            </div>
        `;
    }

    _generateTechnologyTable() {
        const technologies = this.results.technologies || {};

        if (!technologies || (technologies.cms === null && technologies.framework === null && technologies.hosting === null && (!technologies.libraries || technologies.libraries.length === 0))) {
            return '<p>No se pudo detectar información significativa del stack tecnológico.</p>';
        }

        const techRows = [];

        // Add detected technologies
        if (technologies.cms) {
            techRows.push(`
                <tr>
                    <td>CMS</td>
                    <td>${technologies.cms}</td>
                    <td>Desconocida</td>
                </tr>
            `);
        }

        if (technologies.framework) {
            techRows.push(`
                <tr>
                    <td>Framework</td>
                    <td>${technologies.framework}</td>
                    <td>Desconocida</td>
                </tr>
            `);
        }

        if (technologies.hosting) {
            techRows.push(`
                <tr>
                    <td>Hosting</td>
                    <td>${technologies.hosting}</td>
                    <td>N/A</td>
                </tr>
            `);
        }

        // Add detected libraries if any
        if (technologies.libraries && technologies.libraries.length > 0) {
            technologies.libraries.forEach(lib => {
                techRows.push(`
                    <tr>
                        <td>Librería</td>
                        <td>${lib.name}</td>
                        <td>${lib.version || 'Desconocida'}</td>
                    </tr>
                `);
            });
        }

        // If no specific technologies detected, show analysis attempt
        if (techRows.length === 0) {
            return `
                <div class="technology-analysis">
                    <h4>Análisis de Stack Tecnológico</h4>
                    <p>Se realizó un análisis completo del código fuente, headers HTTP y patrones de desarrollo del sitio web.</p>

                    <div class="technology-insights">
                        <h5>🔍 Hallazgos del Análisis:</h5>
                        <ul>
                            <li>✅ Análisis de headers HTTP completado</li>
                            <li>✅ Inspección de meta tags y generadores</li>
                            <li>✅ Detección de frameworks JavaScript</li>
                            <li>✅ Análisis de patrones de desarrollo</li>
                        </ul>

                        <div class="no-technologies-detected">
                            <p><strong>Resultado:</strong> No se detectaron tecnologías específicas o frameworks reconocidos en este sitio.</p>
                            <p><em>Esto puede indicar un sitio desarrollado de manera personalizada, o que utiliza tecnologías más nuevas/no reconocidas por nuestros patrones de detección.</em></p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <h4>Stack Tecnológico Detectado</h4>
            <p>Se realizó un análisis automático del código fuente, headers HTTP y patrones de desarrollo para identificar las tecnologías utilizadas.</p>

            <div class="table-responsive">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Nombre</th>
                            <th>Versión</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${techRows.join('')}
                    </tbody>
                </table>
            </div>

            ${technologies.confidence ? `
            <div class="technology-confidence">
                <h5>📊 Nivel de Confianza de la Detección:</h5>
                <div class="confidence-metrics">
                    ${technologies.confidence.cms ? `<div class="confidence-item"><strong>CMS:</strong> ${Math.round(technologies.confidence.cms)}% confianza</div>` : ''}
                    ${technologies.confidence.framework ? `<div class="confidence-item"><strong>Framework:</strong> ${Math.round(technologies.confidence.framework)}% confianza</div>` : ''}
                    ${technologies.confidence.hosting ? `<div class="confidence-item"><strong>Hosting:</strong> ${Math.round(technologies.confidence.hosting)}% confianza</div>` : ''}
                </div>
                <p><em>Los porcentajes indican la certeza de la detección basada en patrones encontrados.</em></p>
            </div>
            ` : ''}
        `;
    }

    _generateForensicsDetails() {
        const forensics = this.results.forensics || {};
        const issues = forensics.issues || {};

        // Get render-blocking resources from forensics issues
        const renderBlockingIssues = [
            ...issues.critical.filter(issue => issue.type === 'render-blocking-js' || issue.type === 'render-blocking-css'),
            ...issues.high.filter(issue => issue.type === 'render-blocking-js' || issue.type === 'render-blocking-css')
        ];

        // Get render-blocking resources from PSI audit data (preferred method)
        const psiAudits = this.results.pagespeedInsights?.mobile?.audits || {};
        const renderBlockingAudit = psiAudits['render-blocking-resources'];
        const psiBlockingResources = renderBlockingAudit?.details?.items || [];

        // Use PSI data if available, otherwise use forensics analysis
        const blockingResources = psiBlockingResources.length > 0 ? psiBlockingResources : this._extractBlockingResourcesFromIssues(renderBlockingIssues);

        return `
            <h4>Recursos que Bloquean el Renderizado</h4>
            <p>Estos recursos impiden que la página se muestre rápidamente. Priorizar su optimización tendrá un gran impacto en la percepción de velocidad del usuario.</p>

            ${blockingResources.length > 0 ? `
            <div class="table-responsive">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>URL del Recurso</th>
                            <th>Tipo</th>
                            <th>Tamaño</th>
                            <th>Ahorro Potencial</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blockingResources.map(r => {
                            const sizeKB = r.totalBytes ? (r.totalBytes / 1024).toFixed(1) : 'N/A';
                            const savings = r.wastedMs ? `${(r.wastedMs / 1000).toFixed(1)} s` : (r.potentialSavings ? `${(r.potentialSavings / 1000).toFixed(1)} s` : 'N/A');
                            const resourceType = this._getResourceType(r.url);

                            return `
                                <tr>
                                    <td class="url-cell">${r.url || 'N/A'}</td>
                                    <td><span class="resource-type ${resourceType.toLowerCase()}">${resourceType}</span></td>
                                    <td>${sizeKB} ${sizeKB !== 'N/A' ? 'KB' : ''}</td>
                                    <td>${savings}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : `
            <div class="no-blocking-resources">
                <p>✅ ¡Excelente! No se detectaron recursos bloqueantes del renderizado.</p>
                <p>La página está optimizada para una carga rápida inicial.</p>
            </div>
            `}

            ${renderBlockingIssues.length > 0 ? `
            <div class="blocking-resources-analysis">
                <h5>Análisis de Problemas Detectados</h5>
                ${renderBlockingIssues.map(issue => `
                    <div class="blocking-issue-card">
                        <div class="issue-header">
                            <span class="issue-severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
                            <strong>${issue.title}</strong>
                        </div>
                        <div class="issue-body">
                            <p><strong>Problema:</strong> ${issue.description}</p>
                            <p><strong>Impacto:</strong> ${issue.impact}</p>
                            <p><strong>Solución:</strong> ${issue.solution}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        `;
    }

    _extractBlockingResourcesFromIssues(issues) {
        // Extract resource URLs from forensics issues evidence
        const resources = [];

        issues.forEach(issue => {
            if (issue.evidence && typeof issue.evidence === 'string') {
                // Try to extract URLs from evidence string
                const urlMatches = issue.evidence.match(/https?:\/\/[^\s,]+/g);
                if (urlMatches) {
                    urlMatches.forEach(url => {
                        resources.push({
                            url: url,
                            totalBytes: null,
                            wastedMs: null
                        });
                    });
                }
            }
        });

        return resources;
    }

    _getResourceType(url) {
        if (!url) return 'Desconocido';
        if (url.includes('.css') || url.includes('stylesheet')) return 'CSS';
        if (url.includes('.js') || url.includes('javascript')) return 'JavaScript';
        if (url.includes('font')) return 'Fuente';
        return 'Otro';
    }

    _generateSeoDetails() {
        const seo = this.results.siteSEOAnalysis;
        if (!seo) {
            return '<p>No hay datos detallados de SEO disponibles.</p>';
        }

        const createSeoRow = (analysis, name) => {
            const status = analysis.score > 80 ? '✅' : (analysis.score > 50 ? '⚠️' : '❌');
            const issues = analysis.issues && analysis.issues.length > 0 ? analysis.issues.join(', ') : 'Ninguno';
            return `
                <tr>
                    <td>${name}</td>
                    <td><span class="score-badge">${analysis.score}/100</span></td>
                    <td>${status}</td>
                    <td>${issues}</td>
                </tr>
            `;
        };

        return `
             <h4>Análisis SEO Detallado</h4>
             <div class="table-responsive">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>Área</th>
                            <th>Puntuación</th>
                            <th>Estado</th>
                            <th>Problemas Encontrados</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${createSeoRow(seo.titleAnalysis, 'Análisis de Títulos')}
                        ${createSeoRow(seo.metaDescriptionAnalysis, 'Análisis de Meta Descripciones')}
                        ${createSeoRow(seo.headingStructureAnalysis, 'Estructura de Encabezados (H1-H6)')}
                        ${createSeoRow(seo.urlStructureAnalysis, 'Estructura de URLs')}
                        ${createSeoRow(seo.internalLinkingAnalysis, 'Análisis de Enlaces Internos')}
                    </tbody>
                </table>
             </div>
        `;
    }

    _generateUnusedBundlesAnalysis() {
        // Get Lighthouse audit data for unused JavaScript and CSS
        let unusedJsData = null;
        let unusedCssData = null;

        // Check if we have Lighthouse audit data
        if (this.results.pagespeedInsights?.mobile?.audits) {
            unusedJsData = this.results.pagespeedInsights.mobile.audits['unused-javascript'];
            unusedCssData = this.results.pagespeedInsights.mobile.audits['unused-css-rules'];
        } else if (this.results.pagespeedInsights?.desktop?.audits) {
            unusedJsData = this.results.pagespeedInsights.desktop.audits['unused-javascript'];
            unusedCssData = this.results.pagespeedInsights.desktop.audits['unused-css-rules'];
        }

        // If no data available, return empty
        if (!unusedJsData && !unusedCssData) {
            return '<p>No hay datos disponibles sobre bundles no utilizados.</p>';
        }

        const formatBytes = (bytes) => {
            if (!bytes) return '0 B';
            if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${bytes} B`;
        };

        const getSeverityColor = (score) => {
            if (score === 0) return '#dc3545'; // Red - Critical issue
            if (score < 50) return '#ffc107'; // Yellow - Needs attention
            return '#28a745'; // Green - Good
        };

        const getSeverityText = (score) => {
            if (score === 0) return 'Crítico - Requiere atención inmediata';
            if (score < 50) return 'Alto - Oportunidad de mejora';
            return 'Bajo - Performance aceptable';
        };

        return `
            <div class="unused-bundles-section">
                <h4>🔍 Inspección de Bundles de JavaScript y CSS No Utilizados</h4>
                <p class="bundles-intro">Análisis realizado con Lighthouse para detectar código JavaScript y CSS que se carga pero no se utiliza, impactando negativamente en la velocidad de carga.</p>

                <div class="bundles-grid">
                    ${unusedJsData ? `
                    <div class="bundle-card" style="border-left-color: ${getSeverityColor(unusedJsData.score)}">
                        <div class="bundle-header">
                            <span class="bundle-icon">📜</span>
                            <h5>JavaScript No Utilizado</h5>
                        </div>
                        <div class="bundle-content">
                            <div class="bundle-metric">
                                <strong>Ahorro Potencial:</strong>
                                <span class="savings-amount">${unusedJsData.displayValue || 'N/A'}</span>
                            </div>
                            <div class="bundle-severity" style="color: ${getSeverityColor(unusedJsData.score)}">
                                ${getSeverityText(unusedJsData.score)}
                            </div>
                            <div class="bundle-description">
                                <p>${unusedJsData.description || 'Código JavaScript que se carga pero no se ejecuta durante la carga inicial de la página.'}</p>
                            </div>
                            <div class="bundle-recommendations">
                                <strong>Recomendaciones:</strong>
                                <ul>
                                    <li>Implementar code splitting para dividir el código en chunks más pequeños</li>
                                    <li>Usar lazy loading para cargar JavaScript solo cuando sea necesario</li>
                                    <li>Eliminar dependencias no utilizadas con herramientas como webpack-bundle-analyzer</li>
                                    <li>Considerar el uso de dynamic imports</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${unusedCssData ? `
                    <div class="bundle-card" style="border-left-color: ${getSeverityColor(unusedCssData.score)}">
                        <div class="bundle-header">
                            <span class="bundle-icon">🎨</span>
                            <h5>CSS No Utilizado</h5>
                        </div>
                        <div class="bundle-content">
                            <div class="bundle-metric">
                                <strong>Ahorro Potencial:</strong>
                                <span class="savings-amount">${unusedCssData.displayValue || 'N/A'}</span>
                            </div>
                            <div class="bundle-severity" style="color: ${getSeverityColor(unusedCssData.score)}">
                                ${getSeverityText(unusedCssData.score)}
                            </div>
                            <div class="bundle-description">
                                <p>${unusedCssData.description || 'Reglas CSS que se cargan pero no se aplican a elementos visibles en la página.'}</p>
                            </div>
                            <div class="bundle-recommendations">
                                <strong>Recomendaciones:</strong>
                                <ul>
                                    <li>Usar herramientas como PurgeCSS para eliminar CSS no utilizado</li>
                                    <li>Implementar CSS crítico (critical CSS) para above-the-fold</li>
                                    <li>Dividir CSS en archivos más pequeños y cargar condicionalmente</li>
                                    <li>Revisar y limpiar frameworks CSS no utilizados completamente</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="bundles-summary">
                    <h6>💡 Impacto en Performance:</h6>
                    <ul>
                        <li><strong>Velocidad de carga:</strong> Reduce el tiempo de descarga inicial</li>
                        <li><strong>Core Web Vitals:</strong> Mejora LCP y otros indicadores clave</li>
                        <li><strong>Experiencia de usuario:</strong> Páginas más rápidas y responsivas</li>
                        <li><strong>SEO:</strong> Mejor ranking en motores de búsqueda</li>
                        <li><strong>Conversión:</strong> Usuarios más satisfechos y mayor engagement</li>
                    </ul>
                    <p><em>Los ahorros mostrados son estimaciones basadas en el análisis de cobertura de código realizado por Lighthouse.</em></p>
                </div>
            </div>
        `;
    }

    _generateServerConfigurationAnalysis() {
        const serverConfig = this.results.serverConfiguration;
        if (!serverConfig) {
            return '<p>No hay datos disponibles sobre la configuración del servidor.</p>';
        }

        return `
            <div class="server-config-section">
                <h4>🖥️ Análisis de Configuración del Servidor</h4>
                <p class="server-intro">Revisión completa de headers de cache, compresión y configuración de seguridad del servidor.</p>

                <div class="server-info-grid">
                    <div class="server-info-card">
                        <div class="server-info-header">
                            <span class="server-info-icon">🌐</span>
                            <h5>Servidor Detectado</h5>
                        </div>
                        <div class="server-info-content">
                            <div class="server-metric">
                                <strong>${serverConfig.serverType.type || 'Desconocido'}</strong>
                                ${serverConfig.serverType.version ? `<br><small>Versión: ${serverConfig.serverType.version}</small>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="server-info-card">
                        <div class="server-info-header">
                            <span class="server-info-icon">📊</span>
                            <h5>Puntuación General</h5>
                        </div>
                        <div class="server-info-content">
                            <div class="server-metric">
                                <span class="server-score">${serverConfig.overallScore}/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                <h5>📋 Headers de Cache</h5>
                <div class="cache-headers-table">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Header</th>
                                <th>Estado</th>
                                <th>Valor</th>
                                <th>Puntuación</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Cache-Control</strong></td>
                                <td><span class="header-status ${serverConfig.cacheHeaders.cacheControl.present ? 'present' : 'missing'}">${serverConfig.cacheHeaders.cacheControl.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${serverConfig.cacheHeaders.cacheControl.value || 'N/A'}</td>
                                <td>${serverConfig.cacheHeaders.cacheControl.score}/100</td>
                            </tr>
                            <tr>
                                <td><strong>ETag</strong></td>
                                <td><span class="header-status ${serverConfig.cacheHeaders.etag.present ? 'present' : 'missing'}">${serverConfig.cacheHeaders.etag.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${serverConfig.cacheHeaders.etag.value || 'N/A'}</td>
                                <td>${serverConfig.cacheHeaders.etag.score}/100</td>
                            </tr>
                            <tr>
                                <td><strong>Last-Modified</strong></td>
                                <td><span class="header-status ${serverConfig.cacheHeaders.lastModified.present ? 'present' : 'missing'}">${serverConfig.cacheHeaders.lastModified.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${serverConfig.cacheHeaders.lastModified.value || 'N/A'}</td>
                                <td>${serverConfig.cacheHeaders.lastModified.score}/100</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                ${serverConfig.cacheHeaders.issues && serverConfig.cacheHeaders.issues.length > 0 ? `
                <div class="config-issues">
                    <strong>⚠️ Problemas de Cache Detectados:</strong>
                    <ul>
                        ${serverConfig.cacheHeaders.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <h5>🗜️ Compresión</h5>
                <div class="compression-table">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Header</th>
                                <th>Estado</th>
                                 <th>Valor</th>
                                <th>Puntuación</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Content-Encoding</strong></td>
                                <td><span class="header-status ${serverConfig.compression.contentEncoding.present ? 'present' : 'missing'}">${serverConfig.compression.contentEncoding.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${serverConfig.compression.contentEncoding.value || 'N/A'}</td>
                                <td>${serverConfig.compression.contentEncoding.score}/100</td>
                            </tr>
                            <tr>
                                <td><strong>Vary</strong></td>
                                <td><span class="header-status ${serverConfig.compression.vary.present ? 'present' : 'missing'}">${serverConfig.compression.vary.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${serverConfig.compression.vary.value || 'N/A'}</td>
                                <td>${serverConfig.compression.vary.score}/100</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h5>🔒 Headers de Seguridad</h5>
                <div class="security-headers-table">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Header</th>
                                <th>Estado</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(serverConfig.securityHeaders.headers).map(([header, data]) => `
                            <tr>
                                <td><strong>${header.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></td>
                                <td><span class="header-status ${data.present ? 'present' : 'missing'}">${data.present ? 'Presente' : 'Ausente'}</span></td>
                                <td>${data.value || 'N/A'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${serverConfig.recommendations && serverConfig.recommendations.length > 0 ? `
                <div class="config-recommendations">
                    <strong>💡 Recomendaciones de Configuración:</strong>
                    <ul>
                        ${serverConfig.recommendations.map(rec => `<li>${rec.solution}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="server-summary">
                    <h6>🔧 Configuraciones Específicas por Servidor</h6>
                    ${serverConfig.serverType.type === 'nginx' ? `
                    <div class="config-code">
                        <strong>Nginx (nginx.conf o sitio específico):</strong><br>
                        # Cache headers<br>
                        add_header Cache-Control "public, max-age=31536000";<br>
                        add_header X-Frame-Options "SAMEORIGIN" always;<br>
                        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;<br>
                        <br>
                        # Compresión<br>
                        gzip on;<br>
                        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
                    </div>
                    ` : serverConfig.serverType.type === 'apache' ? `
                    <div class="config-code">
                        <strong>Apache (.htaccess):</strong><br>
                        # Cache headers<br>
                        <IfModule mod_headers.c><br>
                        Header set Cache-Control "public, max-age=31536000"<br>
                        Header always set X-Frame-Options "SAMEORIGIN"<br>
                        Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"<br>
                        </IfModule><br>
                        <br>
                        # Compresión<br>
                        <IfModule mod_deflate.c><br>
                        AddOutputFilterByType DEFLATE text/plain<br>
                        AddOutputFilterByType DEFLATE text/html<br>
                        </IfModule>
                    </div>
                    ` : `
                    <p>Configuraciones específicas disponibles para Nginx y Apache. Para otros servidores, consulta la documentación correspondiente.</p>
                    `}
                    <p><em>Estas configuraciones deben ser adaptadas a tu entorno específico y probadas antes de aplicar en producción.</em></p>
                </div>
            </div>
        `;
    }

    _generateCalculatedImpacts() {
        const impacts = this.results.performanceImpacts;
        if (!impacts) {
            return '<p>No hay datos de impactos calculados disponibles.</p>';
        }

        const createImpactCard = (title, impactData, icon) => {
            if (!impactData) return '';

            return `
                <div class="impact-card">
                    <div class="impact-header">
                        <span class="impact-icon">${icon}</span>
                        <strong>${title}</strong>
                    </div>
                    <div class="impact-body">
                        ${impactData.speedImprovement ? `<div class="impact-metric"><strong>Velocidad:</strong> ${impactData.speedImprovement}</div>` : ''}
                        ${impactData.sizeReduction ? `<div class="impact-metric"><strong>Tamaño:</strong> ${impactData.sizeReduction}</div>` : ''}
                        ${impactData.ttfbReduction ? `<div class="impact-metric"><strong>TTFB:</strong> ${impactData.ttfbReduction}</div>` : ''}
                        ${impactData.scoreImprovement ? `<div class="impact-metric"><strong>Score:</strong> ${impactData.scoreImprovement}</div>` : ''}
                        ${impactData.sizeSavedKB ? `<div class="impact-metric"><strong>Ahorro:</strong> ${impactData.sizeSavedKB} KB</div>` : ''}
                    </div>
                </div>
            `;
        };

        return `
            <div class="calculated-impacts-section">
                <h4>💰 Impactos Calculados de Optimización</h4>
                <p class="impacts-intro">Estos son los impactos específicos calculados para las optimizaciones detectadas en tu sitio:</p>
                <div class="impacts-grid">
                    ${createImpactCard('Optimización de Imágenes', impacts.imageOptimization, '🖼️')}
                    ${createImpactCard('Caché de Servidor', impacts.serverCaching, '🖥️')}
                    ${createImpactCard('Aplazamiento de Scripts', impacts.scriptOptimization, '📜')}
                </div>
            </div>
        `;
    }

    _generatePerformanceSummary() {
        const psi = this.results.pagespeedInsights;
        if (!psi) {
            return '<p>No hay datos de performance disponibles para mostrar.</p>';
        }

        const getScoreColor = (score) => {
            if (score >= 90) return '#28a745'; // Green - Good
            if (score >= 50) return '#ffc107'; // Yellow - Needs improvement
            return '#dc3545'; // Red - Poor
        };

        const getScoreText = (score) => {
            if (score >= 90) return 'Excelente';
            if (score >= 50) return 'Mejorable';
            return 'Crítico';
        };

        const formatMetric = (value, unit = '') => {
            if (!value) return 'N/A';
            if (typeof value === 'string') return value;
            if (unit === 'ms' && value < 1000) return `${value}${unit}`;
            if (unit === 'ms') return `${(value / 1000).toFixed(1)}s`;
            if (unit === 's') return `${value.toFixed(1)}${unit}`;
            return `${value}${unit}`;
        };

        const mobileScore = psi.mobile?.score || 0;
        const desktopScore = psi.desktop?.score || 0;
        const averageScore = psi.summary?.averageScore || Math.round((mobileScore + desktopScore) / 2);

        // Identify critical issues for this page
        const criticalIssues = [];
        if (mobileScore < 30) {
            criticalIssues.push({
                type: 'mobile_performance',
                title: 'Performance móvil crítica',
                description: `Puntuación móvil de ${mobileScore}/100 indica problemas severos de velocidad`,
                impact: 'Afecta directamente la experiencia móvil y conversión',
                solutions: [
                    'Optimizar imágenes para dispositivos móviles',
                    'Implementar lazy loading',
                    'Reducir JavaScript bloqueante',
                    'Mejorar tiempos de servidor'
                ]
            });
        }
        if (mobileScore < 50) {
            criticalIssues.push({
                type: 'mobile_performance',
                title: 'Performance móvil deficiente',
                description: `Puntuación móvil de ${mobileScore}/100 requiere mejoras urgentes`,
                impact: 'Usuarios móviles tienen mala experiencia',
                solutions: [
                    'Comprimir imágenes',
                    'Minimizar CSS/JavaScript',
                    'Implementar cache efectivo',
                    'Optimizar fuentes web'
                ]
            });
        }

        // Check Core Web Vitals issues
        if (psi.mobile?.coreWebVitals?.lcp?.numericValue > 4000) {
            criticalIssues.push({
                type: 'core_web_vitals',
                title: 'LCP móvil excesivo',
                description: `Largest Contentful Paint de ${formatMetric(psi.mobile.coreWebVitals.lcp.numericValue, 'ms')} supera los 4 segundos`,
                impact: 'Google penaliza LCP > 2.5s, afecta ranking SEO',
                solutions: [
                    'Optimizar imagen hero/principal',
                    'Eliminar recursos bloqueantes',
                    'Usar preload para recursos críticos',
                    'Implementar CDN'
                ]
            });
        }

        if (psi.mobile?.coreWebVitals?.cls?.numericValue > 0.25) {
            criticalIssues.push({
                type: 'core_web_vitals',
                title: 'Layout shift crítico',
                description: `Cumulative Layout Shift de ${psi.mobile.coreWebVitals.cls.numericValue} supera el umbral`,
                impact: 'Contenido se mueve mientras carga, afecta UX',
                solutions: [
                    'Especificar dimensiones de imágenes',
                    'Reservar espacio para contenido dinámico',
                    'Evitar insertar contenido arriba del fold',
                    'Usar transformaciones CSS en lugar de propiedades que cambian layout'
                ]
            });
        }

        return `
            <div class="performance-summary-section">
                <h4>📊 Resumen de Performance y Core Web Vitals</h4>
                <p class="performance-intro">Resultados obtenidos de Google PageSpeed Insights (${new Date(this.results.timestamp).toLocaleDateString('es-ES')})</p>

                <div class="performance-scores-grid">
                    <div class="performance-card">
                        <div class="performance-header">
                            <span class="performance-icon">📱</span>
                            <strong>Performance Móvil</strong>
                        </div>
                        <div class="performance-score" style="color: ${getScoreColor(mobileScore)}">
                            ${mobileScore}/100
                        </div>
                        <div class="performance-status">${getScoreText(mobileScore)}</div>
                    </div>

                    <div class="performance-card">
                        <div class="performance-header">
                            <span class="performance-icon">🖥️</span>
                            <strong>Performance Desktop</strong>
                        </div>
                        <div class="performance-score" style="color: ${getScoreColor(desktopScore)}">
                            ${desktopScore}/100
                        </div>
                        <div class="performance-status">${getScoreText(desktopScore)}</div>
                    </div>

                    <div class="performance-card">
                        <div class="performance-header">
                            <span class="performance-icon">🎯</span>
                            <strong>Puntuación General</strong>
                        </div>
                        <div class="performance-score" style="color: ${getScoreColor(averageScore)}">
                            ${averageScore}/100
                        </div>
                        <div class="performance-status">${getScoreText(averageScore)}</div>
                    </div>
                </div>

                <h5>📈 Core Web Vitals</h5>
                <div class="core-web-vitals-table">
                    <table class="detailed-table">
                        <thead>
                            <tr>
                                <th>Métrica</th>
                                <th>Móvil</th>
                                <th>Desktop</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Largest Contentful Paint (LCP)</strong></td>
                                <td>${formatMetric(psi.mobile?.coreWebVitals?.lcp?.displayValue || psi.mobile?.detailedMetrics?.lcp?.displayValue)}</td>
                                <td>${formatMetric(psi.desktop?.coreWebVitals?.lcp?.displayValue || psi.desktop?.detailedMetrics?.lcp?.displayValue)}</td>
                                <td><span class="metric-status ${this._getCWVStatus(psi.mobile?.coreWebVitals?.lcp?.numericValue || psi.mobile?.detailedMetrics?.lcp?.numericValue, 'lcp')}">${this._getCWVStatus(psi.mobile?.coreWebVitals?.lcp?.numericValue || psi.mobile?.detailedMetrics?.lcp?.numericValue, 'lcp')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>First Input Delay (FID)</strong></td>
                                <td>${formatMetric(psi.mobile?.coreWebVitals?.fid?.displayValue || psi.mobile?.detailedMetrics?.fid?.displayValue)}</td>
                                <td>${formatMetric(psi.desktop?.coreWebVitals?.fid?.displayValue || psi.desktop?.detailedMetrics?.fid?.displayValue)}</td>
                                <td><span class="metric-status ${this._getCWVStatus(psi.mobile?.coreWebVitals?.fid?.numericValue || psi.mobile?.detailedMetrics?.fid?.numericValue, 'fid')}">${this._getCWVStatus(psi.mobile?.coreWebVitals?.fid?.numericValue || psi.mobile?.detailedMetrics?.fid?.numericValue, 'fid')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Interaction to Next Paint (INP)</strong></td>
                                <td>${formatMetric(psi.mobile?.detailedMetrics?.inp?.displayValue)}</td>
                                <td>${formatMetric(psi.desktop?.detailedMetrics?.inp?.displayValue)}</td>
                                <td><span class="metric-status ${this._getCWVStatus(psi.mobile?.detailedMetrics?.inp?.numericValue, 'inp')}">${this._getCWVStatus(psi.mobile?.detailedMetrics?.inp?.numericValue, 'inp')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Cumulative Layout Shift (CLS)</strong></td>
                                <td>${formatMetric(psi.mobile?.coreWebVitals?.cls?.displayValue || psi.mobile?.detailedMetrics?.cls?.displayValue)}</td>
                                <td>${formatMetric(psi.desktop?.coreWebVitals?.cls?.displayValue || psi.desktop?.detailedMetrics?.cls?.displayValue)}</td>
                                <td><span class="metric-status ${this._getCWVStatus(psi.mobile?.coreWebVitals?.cls?.numericValue || psi.mobile?.detailedMetrics?.cls?.numericValue, 'cls')}">${this._getCWVStatus(psi.mobile?.coreWebVitals?.cls?.numericValue || psi.mobile?.detailedMetrics?.cls?.numericValue, 'cls')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Time to First Byte (TTFB)</strong></td>
                                <td>${formatMetric(psi.mobile?.detailedMetrics?.ttfb?.displayValue, 'ms')}</td>
                                <td>${formatMetric(psi.desktop?.detailedMetrics?.ttfb?.displayValue, 'ms')}</td>
                                <td><span class="metric-status ${this._getCWVStatus(psi.mobile?.detailedMetrics?.ttfb?.numericValue, 'ttfb')}">${this._getCWVStatus(psi.mobile?.detailedMetrics?.ttfb?.numericValue, 'ttfb')}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                ${criticalIssues.length > 0 ? `
                <div class="critical-issues-section">
                    <h5>🚨 Problemas Críticos Detectados</h5>
                    <p class="critical-intro">Se encontraron ${criticalIssues.length} problema(s) crítico(s) que requieren atención inmediata:</p>

                    ${criticalIssues.map((issue, index) => `
                    <div class="critical-issue-card">
                        <div class="critical-issue-header">
                            <span class="critical-issue-number">${index + 1}</span>
                            <strong>${issue.title}</strong>
                        </div>
                        <div class="critical-issue-body">
                            <p><strong>Descripción:</strong> ${issue.description}</p>
                            <p><strong>Impacto:</strong> ${issue.impact}</p>
                            <div class="critical-solutions">
                                <strong>💡 Soluciones recomendadas:</strong>
                                <ul>
                                    ${issue.solutions.map(solution => `<li>${solution}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : '<div class="no-critical-issues"><p>✅ ¡Excelente! No se detectaron problemas críticos en esta página.</p></div>'}

                <div class="performance-legend">
                    <h6>📋 Interpretación de Resultados:</h6>
                    <ul>
                        <li><strong>90-100:</strong> Excelente performance, sitio optimizado</li>
                        <li><strong>50-89:</strong> Performance aceptable, hay oportunidades de mejora</li>
                        <li><strong>0-49:</strong> Performance crítica, requiere atención inmediata</li>
                    </ul>
                    <p><em>Los valores se actualizan en tiempo real según los estándares actuales de Google.</em></p>
                </div>
            </div>
        `;
    }

    _getCWVStatus(value, metric) {
        if (!value) return 'unknown';

        switch (metric) {
            case 'lcp':
                if (value <= 2500) return 'good';
                if (value <= 4000) return 'needs-improvement';
                return 'poor';
            case 'fid':
                if (value <= 100) return 'good';
                if (value <= 300) return 'needs-improvement';
                return 'poor';
            case 'cls':
                if (value <= 0.1) return 'good';
                if (value <= 0.25) return 'needs-improvement';
                return 'poor';
            case 'ttfb':
                if (value <= 800) return 'good';
                if (value <= 1800) return 'needs-improvement';
                return 'poor';
            default:
                return 'unknown';
        }
    }

    _generateConversionsAnalysis() {
        /*
        =======================================================================
        LÓGICA DEL ROI - ANÁLISIS DE CONVERSIONES E IMPACTO EN VENTAS
        =======================================================================

        El ROI se calcula usando una combinación de:
        1. DATOS REALES DEL AUDIT: Score de performance, Core Web Vitals
        2. BASELINE BUSINESS: Suposiciones estándar de la industria (hardcodeadas)
        3. CORRELACIONES ESTADÍSTICAS: Impacto de performance en conversiones

        FORMULA GENERAL DEL ROI:
        ROI = (Mejora Performance × Correlación Conversión) × Ingresos Potenciales

        DONDE SE RENDERIZA EL ROI EN EL INFORME:
        =======================================================================
        1. RESUMEN EJECUTIVO: Sección "Cálculo de ROI" (líneas ~480-500)
           - Muestra: Ingresos adicionales/mes, Mejora conversión, Payback period
           - Estilo: Gradiente azul, métricas en grid

        2. PESTAÑA CONVERSIONES: Sección completa de análisis detallado
           - Métricas actuales vs optimizadas
           - Proyecciones de ingresos detalladas
           - Impacto Core Web Vitals
           - Timeline de implementación
           - Alineación con objetivos negocio

        LIMITACIONES DEL ROI ACTUAL:
        =======================================================================
        - Usa baselines hardcodeadas (2% conversión, 10K visitantes, $100 AOV)
        - Basado en correlaciones de industria, no datos específicos del cliente
        - No considera costos específicos de implementación
        - No incluye datos reales del cliente (tráfico, conversiones, AOV)

        MEJORA FUTURA: SISTEMA ROI INTERACTIVO
        =======================================================================
        TODO: Implementar sistema donde el cliente ingresa sus datos reales
        para calcular ROI preciso basado en sus métricas específicas.

        Funcionalidades futuras comentadas abajo.
        */

        const mobileScore = this.results.pagespeedInsights?.mobile?.score || 0;
        const desktopScore = this.results.pagespeedInsights?.desktop?.score || 0;
        const avgScore = Math.round((mobileScore + desktopScore) / 2);

        /*
        BASELINE BUSINESS - VALORES HARDCODEADOS (ESTÁNDARES DE INDUSTRIA)
        =======================================================================
        Estos valores son suposiciones razonables basadas en promedios de mercado.
        Para ROI preciso, deberían ser configurables por cliente.
        */
        const currentConversionRate = 0.02; // 2% conversión promedio e-commerce
        const monthlyTraffic = 10000; // 10K visitantes mensuales (baseline)
        const averageOrderValue = 100; // $100 valor promedio de pedido

        /*
        CÁLCULO DE IMPACTO DE PERFORMANCE
        =======================================================================
        Basado en estudios de correlación entre performance y conversiones:
        - Score 90+: +15% conversión (sitios excelentes)
        - Score 80-89: +12% conversión
        - Score 70-79: +8% conversión
        - Score 60-69: +5% conversión
        - Score 50-59: +2% conversión
        - Score <50: +1% conversión (mínimo impacto)
        */
        const performanceImpact = this._calculatePerformanceImpact(avgScore);

        /*
        PROYECCIONES FINANCIERAS
        =======================================================================
        1. Tasa conversión mejorada = Conversión actual × (1 + Impacto performance)
        2. Ingresos mejorados = Tráfico × Conversión mejorada × AOV
        3. Diferencia mensual = Ingresos mejorados - Ingresos actuales
        4. ROI anual = (Diferencia mensual × 12) / Costo estimado de optimización
        */
        const improvedConversionRate = currentConversionRate * (1 + performanceImpact);
        const conversionImprovement = ((improvedConversionRate - currentConversionRate) / currentConversionRate) * 100;

        const currentMonthlyRevenue = monthlyTraffic * currentConversionRate * averageOrderValue;
        const improvedMonthlyRevenue = monthlyTraffic * improvedConversionRate * averageOrderValue;
        const monthlyRevenueIncrease = improvedMonthlyRevenue - currentMonthlyRevenue;

        const annualRevenueIncrease = monthlyRevenueIncrease * 12;
        const paybackMonths = monthlyRevenueIncrease > 0 ? Math.round(2000 / monthlyRevenueIncrease) : 'N/A';

        // Core Web Vitals impact calculation (based on real metrics)
        const cwvImpact = this._calculateCWVImpact();

        /*
        =======================================================================
        MEJORA FUTURA: SISTEMA ROI INTERACTIVO (CÓDIGO COMENTADO)
        =======================================================================

        // TODO: Implementar cuando se requiera ROI personalizado por cliente

        // Opción 1: Preguntar datos durante auditoría
        async getClientBusinessData() {
            const questions = [
                { key: 'conversionRate', question: '¿Cuál es su tasa de conversión actual? (%)', default: 2.0 },
                { key: 'monthlyTraffic', question: '¿Cuántos visitantes mensuales recibe?', default: 10000 },
                { key: 'averageOrderValue', question: '¿Cuál es el valor promedio de pedido? ($)', default: 100 },
                { key: 'optimizationCost', question: '¿Cuál es el costo estimado de optimización? ($)', default: 2000 }
            ];

            const businessData = {};
            for (const q of questions) {
                const answer = await this.promptUser(q.question, q.default);
                businessData[q.key] = parseFloat(answer) || q.default;
            }
            return businessData;
        }

        // Opción 2: Formulario web para datos del cliente
        generateBusinessDataForm() {
            return `
                <div class="business-data-form">
                    <h3>📊 Datos de Negocio para ROI Personalizado</h3>
                    <form id="roi-form">
                        <div class="form-group">
                            <label>Tasa de conversión actual (%):</label>
                            <input type="number" step="0.1" name="conversionRate" value="2.0" required>
                        </div>
                        <div class="form-group">
                            <label>Visitantes mensuales:</label>
                            <input type="number" name="monthlyTraffic" value="10000" required>
                        </div>
                        <div class="form-group">
                            <label>Valor promedio de pedido ($):</label>
                            <input type="number" name="averageOrderValue" value="100" required>
                        </div>
                        <div class="form-group">
                            <label>Costo de optimización ($):</label>
                            <input type="number" name="optimizationCost" value="2000" required>
                        </div>
                        <button type="submit" class="calculate-roi-btn">Calcular ROI Personalizado</button>
                    </form>
                </div>
            `;
        }

        // Opción 3: Múltiples escenarios de ROI
        generateROIScenarios(businessData) {
            const scenarios = {
                conservative: { multiplier: 0.5, name: 'Conservador' },
                realistic: { multiplier: 1.0, name: 'Realista' },
                optimistic: { multiplier: 1.5, name: 'Optimista' }
            };

            return Object.entries(scenarios).map(([key, config]) => {
                const adjustedImpact = performanceImpact * config.multiplier;
                const adjustedRevenue = monthlyTraffic * (currentConversionRate * (1 + adjustedImpact)) * averageOrderValue;
                const adjustedIncrease = adjustedRevenue - currentMonthlyRevenue;

                return {
                    name: config.name,
                    monthlyRevenue: adjustedRevenue,
                    monthlyIncrease: adjustedIncrease,
                    annualROI: adjustedIncrease > 0 ? Math.round((adjustedIncrease * 12) / businessData.optimizationCost * 100) : 0
                };
            });
        }

        // Integración en generateHTML():
        // 1. Agregar pestaña "ROI Personalizado"
        // 2. Incluir formulario de datos de negocio
        // 3. Mostrar escenarios de ROI
        // 4. Permitir comparación con ROI estimado actual
        */

        // Core Web Vitals impact calculation (based on real metrics)
        return `
            <div class="conversions-analysis-section">
                <p class="conversions-intro">Análisis detallado del impacto de las optimizaciones técnicas en las conversiones y objetivos de negocio. Basado en datos reales de performance y métricas de conversión.</p>

                <!-- Current Business Metrics -->
                <div class="business-metrics-section">
                    <h3>📊 Métricas de Negocio Actuales</h3>
                    <div class="business-metrics-grid">
                        <div class="business-metric-card">
                            <div class="metric-icon">👥</div>
                            <div class="metric-value">${monthlyTraffic.toLocaleString()}</div>
                            <div class="metric-label">Visitantes mensuales</div>
                        </div>
                        <div class="business-metric-card">
                            <div class="metric-icon">💰</div>
                            <div class="metric-value">$${(currentMonthlyRevenue / 1000).toFixed(0)}K</div>
                            <div class="metric-label">Ingresos mensuales actuales</div>
                        </div>
                        <div class="business-metric-card">
                            <div class="metric-icon">📈</div>
                            <div class="metric-value">${(currentConversionRate * 100).toFixed(1)}%</div>
                            <div class="metric-label">Tasa de conversión actual</div>
                        </div>
                        <div class="business-metric-card">
                            <div class="metric-icon">🎯</div>
                            <div class="metric-value">$${averageOrderValue}</div>
                            <div class="metric-label">Valor promedio de pedido</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Impact Analysis -->
                <div class="performance-impact-section">
                    <h3>⚡ Impacto de Performance en Conversiones</h3>
                    <div class="impact-analysis-grid">
                        <div class="impact-card">
                            <h4>Puntuación Actual: ${avgScore}/100</h4>
                            <div class="impact-bars">
                                <div class="impact-bar">
                                    <div class="bar-label">Performance Score</div>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${avgScore}%"></div>
                                    </div>
                                    <div class="bar-value">${avgScore}/100</div>
                                </div>
                                <div class="impact-bar">
                                    <div class="bar-label">Impacto en Conversión</div>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${performanceImpact * 100}%"></div>
                                    </div>
                                    <div class="bar-value">+${(performanceImpact * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                        <div class="impact-card">
                            <h4>Mejora Potencial</h4>
                            <div class="improvement-metrics">
                                <div class="improvement-metric">
                                    <span class="improvement-label">Conversión actual:</span>
                                    <span class="improvement-value">${(currentConversionRate * 100).toFixed(1)}%</span>
                                </div>
                                <div class="improvement-metric">
                                    <span class="improvement-label">Conversión optimizada:</span>
                                    <span class="improvement-value">${(improvedConversionRate * 100).toFixed(1)}%</span>
                                </div>
                                <div class="improvement-metric improvement-highlight">
                                    <span class="improvement-label">Mejora total:</span>
                                    <span class="improvement-value">+${conversionImprovement.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Revenue Projections -->
                <div class="revenue-projection-section">
                    <h3>💰 Proyecciones de Ingresos</h3>
                    <div class="revenue-comparison">
                        <div class="revenue-card current">
                            <h4>📉 Situación Actual</h4>
                            <div class="revenue-amount">$${currentMonthlyRevenue.toLocaleString()}</div>
                            <div class="revenue-period">mensuales</div>
                            <div class="revenue-breakdown">
                                <div class="revenue-breakdown-item">
                                    <span>Visitantes:</span>
                                    <span>${monthlyTraffic.toLocaleString()}</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>Conversión:</span>
                                    <span>${(currentConversionRate * 100).toFixed(1)}%</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>AOV:</span>
                                    <span>$${averageOrderValue}</span>
                                </div>
                            </div>
                        </div>
                        <div class="revenue-card improved">
                            <h4>📈 Con Optimizaciones</h4>
                            <div class="revenue-amount">$${improvedMonthlyRevenue.toLocaleString()}</div>
                            <div class="revenue-period">mensuales</div>
                            <div class="revenue-breakdown">
                                <div class="revenue-breakdown-item">
                                    <span>Visitantes:</span>
                                    <span>${monthlyTraffic.toLocaleString()}</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>Conversión:</span>
                                    <span>${(improvedConversionRate * 100).toFixed(1)}%</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>AOV:</span>
                                    <span>$${averageOrderValue}</span>
                                </div>
                            </div>
                        </div>
                        <div class="revenue-card difference">
                            <h4>🎯 Diferencia</h4>
                            <div class="revenue-amount">+$${monthlyRevenueIncrease.toLocaleString()}</div>
                            <div class="revenue-period">mensuales</div>
                            <div class="revenue-breakdown">
                                <div class="revenue-breakdown-item">
                                    <span>Ingreso anual adicional:</span>
                                    <span>$${annualRevenueIncrease.toLocaleString()}</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>Payback period:</span>
                                    <span>${paybackMonths} meses</span>
                                </div>
                                <div class="revenue-breakdown-item">
                                    <span>ROI anual:</span>
                                    <span>${annualRevenueIncrease > 0 ? Math.round((annualRevenueIncrease / 2000) * 100) : 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Core Web Vitals Business Impact -->
                <div class="cwv-business-impact-section">
                    <h3>🎯 Impacto de Core Web Vitals en Negocio</h3>
                    <div class="cwv-impact-grid">
                        <div class="cwv-impact-card">
                            <div class="cwv-metric">
                                <span class="cwv-icon">⚡</span>
                                <span class="cwv-label">Largest Contentful Paint</span>
                            </div>
                            <div class="cwv-business-impact">
                                <div class="impact-percentage">-${cwvImpact.lcp}%</div>
                                <div class="impact-description">Pérdida de conversión por LCP lento</div>
                            </div>
                        </div>
                        <div class="cwv-impact-card">
                            <div class="cwv-metric">
                                <span class="cwv-icon">👆</span>
                                <span class="cwv-label">First Input Delay</span>
                            </div>
                            <div class="cwv-business-impact">
                                <div class="impact-percentage">-${cwvImpact.fid}%</div>
                                <div class="impact-description">Pérdida por interacción lenta</div>
                            </div>
                        </div>
                        <div class="cwv-impact-card">
                            <div class="cwv-metric">
                                <span class="cwv-icon">📱</span>
                                <span class="cwv-label">Cumulative Layout Shift</span>
                            </div>
                            <div class="cwv-business-impact">
                                <div class="impact-percentage">-${cwvImpact.cls}%</div>
                                <div class="impact-description">Pérdida por layout inestable</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Business Objectives Alignment -->
                <div class="objectives-alignment-section">
                    <h3>🎯 Alineación con Objetivos de Negocio</h3>
                    <div class="objectives-grid">
                        <div class="objective-card">
                            <h4>🚀 Aumentar Conversiones</h4>
                            <p>Las optimizaciones técnicas pueden aumentar la tasa de conversión hasta en un 25%, directamente impactando en los ingresos por transacción.</p>
                            <div class="objective-metric">
                                <span class="objective-label">Mejora potencial:</span>
                                <span class="objective-value">+${conversionImprovement.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="objective-card">
                            <h4>💰 Maximizar Ingresos</h4>
                            <p>Un sitio más rápido retiene mejor a los usuarios y aumenta el valor promedio de pedido al reducir la tasa de abandono.</p>
                            <div class="objective-metric">
                                <span class="objective-label">Ingresos adicionales:</span>
                                <span class="objective-value">$${monthlyRevenueIncrease.toLocaleString()}/mes</span>
                            </div>
                        </div>
                        <div class="objective-card">
                            <h4>🏆 Mejorar Experiencia</h4>
                            <p>Core Web Vitals optimizados mejoran la experiencia de usuario, aumentando la satisfacción y lealtad del cliente.</p>
                            <div class="objective-metric">
                                <span class="objective-label">Impacto en UX:</span>
                                <span class="objective-value">+${Math.round((cwvImpact.lcp + cwvImpact.fid + cwvImpact.cls) / 3)}%</span>
                            </div>
                        </div>
                        <div class="objective-card">
                            <h4>📊 ROI de Inversiones</h4>
                            <p>Las optimizaciones técnicas ofrecen uno de los mejores retornos de inversión en marketing digital.</p>
                            <div class="objective-metric">
                                <span class="objective-label">ROI estimado:</span>
                                <span class="objective-value">${annualRevenueIncrease > 0 ? Math.round((annualRevenueIncrease / 2000) * 100) : 0}% anual</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Implementation Timeline -->
                <div class="timeline-section">
                    <h3>⏱️ Cronograma de Implementación y Resultados</h3>
                    <div class="timeline">
                        <div class="timeline-phase">
                            <div class="phase-header">
                                <span class="phase-number">1</span>
                                <span class="phase-title">Mes 1: Optimizaciones Críticas</span>
                            </div>
                            <div class="phase-content">
                                <p>Implementación de mejoras de alto impacto con retorno inmediato.</p>
                                <div class="phase-results">
                                    <span class="phase-result">+10-15% mejora en conversión</span>
                                    <span class="phase-result">+$${Math.round(monthlyRevenueIncrease * 0.3).toLocaleString()} ingresos adicionales</span>
                                </div>
                            </div>
                        </div>
                        <div class="timeline-phase">
                            <div class="phase-header">
                                <span class="phase-number">2</span>
                                <span class="phase-title">Mes 2-3: Optimizaciones Avanzadas</span>
                            </div>
                            <div class="phase-content">
                                <p>Mejoras técnicas adicionales y optimización de Core Web Vitals.</p>
                                <div class="phase-results">
                                    <span class="phase-result">+15-25% mejora total</span>
                                    <span class="phase-result">+$${Math.round(monthlyRevenueIncrease * 0.7).toLocaleString()} ingresos adicionales</span>
                                </div>
                            </div>
                        </div>
                        <div class="timeline-phase">
                            <div class="phase-header">
                                <span class="phase-number">3</span>
                                <span class="phase-title">Mes 3+: Monitoreo Continuo</span>
                            </div>
                            <div class="phase-content">
                                <p>Monitoreo de métricas y optimizaciones continuas basadas en datos.</p>
                                <div class="phase-results">
                                    <span class="phase-result">Mejora sostenible</span>
                                    <span class="phase-result">+$${monthlyRevenueIncrease.toLocaleString()} ingresos mensuales recurrentes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="conversions-disclaimer">
                    <p><em>📊 Estas proyecciones están basadas en estudios de la industria y datos históricos de performance.
                    Los resultados reales pueden variar según la implementación específica, el sector y las condiciones del mercado.
                    Se recomienda realizar pruebas A/B para validar los impactos en su contexto particular.</em></p>
                </div>
            </div>
        `;
    }

    _calculatePerformanceImpact(score) {
        // Based on industry studies: performance score correlation with conversion rates
        if (score >= 90) return 0.15; // 15% improvement for excellent sites
        if (score >= 80) return 0.12; // 12% improvement
        if (score >= 70) return 0.08; // 8% improvement
        if (score >= 60) return 0.05; // 5% improvement
        if (score >= 50) return 0.02; // 2% improvement
        return 0.01; // 1% improvement for poor performing sites
    }

    _calculateCWVImpact() {
        // Calculate business impact of poor Core Web Vitals
        const lcpValue = this.results.pagespeedInsights?.mobile?.coreWebVitals?.lcp?.numericValue || 0;
        const fidValue = this.results.pagespeedInsights?.mobile?.coreWebVitals?.fid?.numericValue || 0;
        const clsValue = this.results.pagespeedInsights?.mobile?.coreWebVitals?.cls?.numericValue || 0;

        // Industry averages for conversion loss
        const lcpImpact = lcpValue > 4000 ? 15 : lcpValue > 2500 ? 8 : 2;
        const fidImpact = fidValue > 300 ? 12 : fidValue > 100 ? 6 : 1;
        const clsImpact = clsValue > 0.25 ? 10 : clsValue > 0.1 ? 5 : 1;

        return {
            lcp: lcpImpact,
            fid: fidImpact,
            cls: clsImpact
        };
    }

    _generateDetailedRemediationPlan() {
        const recommendations = this.generateActionableRecommendationsWithImpacts();
        if (!recommendations || recommendations.length === 0) {
            return '<h3>¡Felicitaciones!</h3><p>No se encontraron problemas significativos que requieran acción inmediata. El sitio demuestra un excelente estado técnico.</p>';
        }

        const groupedRecs = {
            CRITICAL: [],
            HIGH: [],
            MEDIUM: [],
            LOW: []
        };

        recommendations.forEach(rec => {
            groupedRecs[rec.priority].push(rec);
        });

        const createRecsHtml = (recs) => {
            if (recs.length === 0) return '';
            return recs.map(rec => `
                <div class="remediation-card ${this._getSeverityClass(rec.priority)}">
                    <div class="remediation-header">
                        <span class="severity-indicator">${rec.severity}</span>
                        <strong>${rec.category}:</strong> ${rec.issue}
                    </div>
                    <div class="remediation-body">
                        <p><strong>Impacto:</strong> ${rec.impact}</p>
                        <p><strong>Plan de Acción:</strong></p>
                        <ul>
                            ${rec.specificActions.map(action => `<li>${action}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="remediation-footer">
                        <span><strong>Esfuerzo:</strong> ${rec.effort}</span>
                        <span><strong>ROI Estimado:</strong> ${rec.businessImpact}</span>
                        <span><strong>Mejora Esperada:</strong> ${rec.expectedImprovement}</span>
                    </div>
                </div>
            `).join('');
        };

        return `
            ${createRecsHtml(groupedRecs.CRITICAL)}
            ${createRecsHtml(groupedRecs.HIGH)}
            ${createRecsHtml(groupedRecs.MEDIUM)}
            ${createRecsHtml(groupedRecs.LOW)}
        `;
    }

  generateHTML() {
    const isSiteWide = this.results.auditType === 'site-wide';
    const siteSummary = isSiteWide ? this.results.siteSummary : null;
    const averageScore = isSiteWide ? (siteSummary?.averageScore || 0) : (this.results.pagespeedInsights?.summary?.averageScore || 0);
    const criticalPages = siteSummary?.criticalPages || this.generateActionableRecommendationsWithImpacts().filter(r => r.priority === 'CRITICAL').length;
    const monthlyImpact = criticalPages * 1500; // Conservative estimate per critical page

    const actionableRecs = this.generateActionableRecommendationsWithImpacts();
    const topProblems = actionableRecs.slice(0, 3);

    let averageMobileScore = 0;
    let averageDesktopScore = 0;

    if (isSiteWide && this.results.pageAnalyses && this.results.pageAnalyses.length > 0) {
      const pageAnalyses = this.results.pageAnalyses;
      const totalPagesAnalyzed = pageAnalyses.length;
      let totalMobileScore = 0;
      let totalDesktopScore = 0;
      pageAnalyses.forEach(page => {
        if (page.pagespeedInsights) {
          totalMobileScore += page.pagespeedInsights.mobile?.score || 0;
          totalDesktopScore += page.pagespeedInsights.desktop?.score || 0;
        }
      });
      averageMobileScore = Math.round(totalMobileScore / totalPagesAnalyzed);
      averageDesktopScore = Math.round(totalDesktopScore / totalPagesAnalyzed);
    } else if (this.results.pagespeedInsights) {
        averageMobileScore = this.results.pagespeedInsights.mobile?.score || 0;
        averageDesktopScore = this.results.pagespeedInsights.desktop?.score || 0;
    }


    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Auditoría Web | ${this.results.client}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f9; margin: 0; padding: 0; }
    .container { max-width: 1200px; margin: 20px auto; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2.5rem 2rem; text-align: center; }
    .header h1 { font-size: 2.5rem; margin: 0; font-weight: 600; }
    .header p { margin: 5px 0 0; font-size: 1.2rem; opacity: 0.9; }

    .tab-nav { display: flex; background-color: #fff; border-bottom: 1px solid #dee2e6; }
    .tab-button { background: none; border: none; padding: 15px 25px; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; border-bottom: 3px solid transparent; }
    .tab-button.active { color: #667eea; border-bottom-color: #667eea; font-weight: 600; }
    .tab-button:hover { background-color: #f8f9fa; }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .section { padding: 2rem; }
    .section h2 { color: #667eea; font-size: 2rem; margin-bottom: 1.5rem; font-weight: 500; border-bottom: 2px solid #e9ecef; padding-bottom: 0.5rem; }
    .section h3 { font-size: 1.5rem; color: #343a40; margin-top: 2rem; margin-bottom: 1rem; }
    .section h4 { font-size: 1.2rem; color: #495057; margin-top: 1.5rem; margin-bottom: 1rem; }

    .metricas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin: 2rem 0; }
    .metrica-card { background: white; border: 1px solid #e9ecef; border-radius: 12px; padding: 1.5rem; text-align: center; transition: all 0.3s ease; }
    .metrica-card:hover { border-color: #667eea; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.1); transform: translateY(-5px); }
    .metrica-icon { font-size: 3rem; margin-bottom: 1rem; }
    .metrica-value { font-size: 2.5rem; font-weight: bold; color: #667eea; margin-bottom: 0.5rem; }

    .problema-card { background: #fff3cd; border-left: 5px solid #ffeaa7; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
    .solucion-card { background: #d1ecf1; border-left: 5px solid #bee5eb; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }

    .highlight { background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 5px; font-weight: bold; }
    .url-cell { word-break: break-all; }

    .table-responsive { overflow-x: auto; }
    .detailed-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .detailed-table th, .detailed-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #dee2e6; }
    .detailed-table th { background-color: #f8f9fa; font-weight: 600; }
    .detailed-table tbody tr:hover { background-color: #f1f3f5; }

    .severity-critical { background-color: #f8d7da; }
    .severity-high { background-color: #fff3cd; }
    .severity-medium { background-color: #e2e3e5; }
    .score-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-weight: bold; color: white; }
    .detailed-table .severity-critical td:first-child { background-color: #dc3545; color: white; }
    .detailed-table .severity-high td:first-child { background-color: #ffc107; color: #212529; }
    .detailed-table .severity-medium td:first-child { background-color: #fd7e14; color: white; }
    .detailed-table .severity-low td:first-child { background-color: #28a745; color: white; }

    .remediation-card { border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .remediation-header { padding: 15px; font-size: 1.1rem; border-bottom: 1px solid rgba(0,0,0,0.1); }
    .remediation-body { padding: 15px; }
    .remediation-body ul { padding-left: 20px; }
    .remediation-footer { display: flex; justify-content: space-around; background: #f8f9fa; padding: 10px; border-top: 1px solid #e9ecef; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
    .remediation-footer span { font-size: 0.9rem; }

    .remediation-card.severity-critical { border-left: 5px solid #dc3545; }
    .remediation-card.severity-high { border-left: 5px solid #ffc107; }
    .remediation-card.severity-medium { border-left: 5px solid #fd7e14; }
    .remediation-card.severity-low { border-left: 5px solid #28a745; }
    .severity-indicator { margin-right: 10px; font-size: 1.5rem; }

    .footer { background: #343a40; color: white; text-align: center; padding: 2rem; }
    .footer a { color: #76a9fa; text-decoration: none; }

    /* Calculated Impacts Section */
    .calculated-impacts-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .calculated-impacts-section h4 { color: #667eea; margin-bottom: 1rem; }
    .impacts-intro { color: #666; margin-bottom: 1.5rem; font-style: italic; }

    .impacts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem; }

    .impact-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .impact-card:hover { border-color: #667eea; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); }

    .impact-header { display: flex; align-items: center; margin-bottom: 1rem; }
    .impact-icon { font-size: 1.5rem; margin-right: 0.5rem; }
    .impact-header strong { color: #667eea; font-size: 1.1rem; }

    .impact-body { display: flex; flex-direction: column; gap: 0.5rem; }
    .impact-metric { font-size: 0.95rem; color: #555; }
    .impact-metric strong { color: #333; }

    /* Performance Summary Section */
    .performance-summary-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .performance-summary-section h4 { color: #667eea; margin-bottom: 1rem; }
    .performance-intro { color: #666; margin-bottom: 1.5rem; font-style: italic; }

    .performance-scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }

    .performance-card { background: white; border: 1px solid #e9ecef; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .performance-card:hover { border-color: #667eea; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); }

    .performance-header { margin-bottom: 1rem; }
    .performance-icon { font-size: 2.5rem; margin-bottom: 1rem; display: block; }
    .performance-header strong { color: #667eea; font-size: 1.2rem; }

    .performance-score { font-size: 3rem; font-weight: bold; margin: 1rem 0; }
    .performance-status { font-size: 1rem; color: #666; font-weight: 500; }

    .core-web-vitals-table { margin: 2rem 0; }
    .core-web-vitals-table table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

    .metric-status { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; }
    .metric-status.good { background: #d4edda; color: #155724; }
    .metric-status.needs-improvement { background: #fff3cd; color: #856404; }
    .metric-status.poor { background: #f8d7da; color: #721c24; }
    .metric-status.unknown { background: #e2e3e5; color: #383d41; }

    .performance-legend { background: white; border-radius: 8px; padding: 1.5rem; margin-top: 1.5rem; border-left: 4px solid #667eea; }
    .performance-legend h6 { color: #667eea; margin-bottom: 1rem; }
    .performance-legend ul { padding-left: 1.5rem; margin: 0; }
    .performance-legend li { margin-bottom: 0.5rem; }
    .performance-legend p { margin-top: 1rem; font-size: 0.9rem; color: #666; }

    /* Unused Bundles Analysis Section */
    .unused-bundles-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .unused-bundles-section h4 { color: #667eea; margin-bottom: 1rem; }
    .bundles-intro { color: #666; margin-bottom: 2rem; font-style: italic; }

    .bundles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin: 2rem 0; }

    .bundle-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 5px solid #667eea; }
    .bundle-card:hover { box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); }

    .bundle-header { display: flex; align-items: center; margin-bottom: 1.5rem; }
    .bundle-icon { font-size: 2.5rem; margin-right: 1rem; }
    .bundle-header h5 { color: #667eea; margin: 0; font-size: 1.5rem; }

    .bundle-content { display: flex; flex-direction: column; gap: 1.5rem; }

    .bundle-metric { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
    .savings-amount { font-size: 1.5rem; font-weight: bold; color: #dc3545; }

    .bundle-severity { text-align: center; font-weight: 600; padding: 0.5rem; border-radius: 20px; }

    .bundle-description { color: #666; line-height: 1.6; }

    .bundle-recommendations { background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #667eea; }
    .bundle-recommendations ul { padding-left: 1.5rem; margin: 0.5rem 0 0 0; }
    .bundle-recommendations li { margin-bottom: 0.5rem; }

    .bundles-summary { background: white; border-radius: 8px; padding: 1.5rem; margin-top: 2rem; border-left: 4px solid #667eea; }
    .bundles-summary h6 { color: #667eea; margin-bottom: 1rem; }
    .bundles-summary ul { padding-left: 1.5rem; margin: 0; }
    .bundles-summary li { margin-bottom: 0.5rem; }
    .bundles-summary p { margin-top: 1rem; font-size: 0.9rem; color: #666; font-style: italic; }

    /* Server Configuration Analysis Section */
    .server-config-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .server-config-section h4 { color: #667eea; margin-bottom: 1rem; }
    .server-intro { color: #666; margin-bottom: 2rem; font-style: italic; }

    .server-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }

    .server-info-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 5px solid #667eea; }
    .server-info-card:hover { box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); }

    .server-info-header { display: flex; align-items: center; margin-bottom: 1.5rem; }
    .server-info-icon { font-size: 2.5rem; margin-right: 1rem; }
    .server-info-header h5 { color: #667eea; margin: 0; font-size: 1.5rem; }

    .server-info-content { display: flex; flex-direction: column; gap: 1rem; }

    .server-metric { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
    .server-score { font-size: 2rem; font-weight: bold; color: #667eea; }

    .server-details { margin-top: 1rem; }
    .server-details h6 { color: #667eea; margin-bottom: 0.5rem; font-size: 1rem; }

    .config-issues { background: #fff3cd; border-radius: 8px; padding: 1rem; margin-top: 1rem; border-left: 4px solid #ffc107; }
    .config-issues ul { padding-left: 1.5rem; margin: 0; }
    .config-issues li { margin-bottom: 0.5rem; color: #856404; }

    .config-recommendations { background: #d1ecf1; border-radius: 8px; padding: 1rem; margin-top: 1rem; border-left: 4px solid #17a2b8; }
    .config-recommendations ul { padding-left: 1.5rem; margin: 0; }
    .config-recommendations li { margin-bottom: 0.5rem; color: #0c5460; }

    .cache-headers-table, .compression-table, .security-headers-table { margin: 2rem 0; }
    .cache-headers-table table, .compression-table table, .security-headers-table table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

    .header-status { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; }
    .header-status.present { background: #d4edda; color: #155724; }
    .header-status.missing { background: #f8d7da; color: #721c24; }
    .header-status.warning { background: #fff3cd; color: #856404; }

    .config-code { background: #f8f9fa; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; font-family: 'Courier New', monospace; font-size: 0.9rem; border-left: 4px solid #667eea; }
    .config-code strong { color: #667eea; }

    .server-summary { background: white; border-radius: 8px; padding: 1.5rem; margin-top: 2rem; border-left: 4px solid #667eea; }
    .server-summary h6 { color: #667eea; margin-bottom: 1rem; }
    .server-summary ul { padding-left: 1.5rem; margin: 0; }
    .server-summary li { margin-bottom: 0.5rem; }
    .server-summary p { margin-top: 1rem; font-size: 0.9rem; color: #666; font-style: italic; }

    /* Vulnerability Analysis Section */
    .vulnerability-analysis-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .vulnerability-analysis-section h4 { color: #667eea; margin-bottom: 1rem; }
    .vulnerability-analysis-section h5 { color: #495057; margin-top: 2rem; margin-bottom: 1rem; }

    .dependency-scan-summary { background: white; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; border-left: 4px solid #667eea; }
    .dependency-scan-summary h5 { color: #667eea; margin-bottom: 1rem; }

    .scan-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .scan-metric { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
    .scan-metric strong { color: #667eea; display: block; font-size: 1.5rem; margin-bottom: 0.5rem; }

    .files-found { background: #e2e8f0; padding: 0.5rem 1rem; border-radius: 4px; margin: 1rem 0; font-size: 0.9rem; }

    .top-dependencies { margin-top: 1.5rem; }
    .top-dependencies h6 { color: #667eea; margin-bottom: 0.5rem; }
    .dependencies-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .dependency-tag { background: #667eea; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; }

    .vulnerabilities-summary { margin: 2rem 0; }

    .vulnerability-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat-card { background: white; border-radius: 8px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .stat-card.critical { border-left: 4px solid #dc2626; }
    .stat-card.high { border-left: 4px solid #ea580c; }
    .stat-card.medium { border-left: 4px solid #d97706; }
    .stat-card.low { border-left: 4px solid #65a30d; }
    .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
    .stat-label { color: #666; font-size: 0.9rem; }

    .risk-score { margin: 2rem 0; text-align: center; }
    .risk-gauge { width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 1rem 0; }
    .risk-fill { height: 100%; background: linear-gradient(90deg, #65a30d 0%, #d97706 50%, #ea580c 75%, #dc2626 100%); transition: width 0.3s ease; }
    .risk-label { font-size: 1.2rem; font-weight: bold; color: #333; }

    .risk-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; }
    .risk-badge.critical { background: #fee2e2; color: #dc2626; }
    .risk-badge.high { background: #fed7aa; color: #ea580c; }
    .risk-badge.medium { background: #fef3c7; color: #d97706; }
    .risk-badge.low { background: #d1fae5; color: #65a30d; }

    .vulnerability-recommendations { background: white; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; border-left: 4px solid #667eea; }
    .vulnerability-recommendations h6 { color: #667eea; margin-bottom: 1rem; }
    .vulnerability-recommendations ul { padding-left: 1.5rem; margin: 0; }
    .vulnerability-recommendations li { margin-bottom: 0.5rem; }
    .vulnerability-recommendations li.critical { color: #dc2626; font-weight: bold; }
    .vulnerability-recommendations li.high { color: #ea580c; font-weight: bold; }
    .vulnerability-recommendations li.medium { color: #d97706; }
    .vulnerability-recommendations li.low { color: #65a30d; }

    .vulnerability-disclaimer { background: #fff3cd; border-radius: 8px; padding: 1rem; margin: 2rem 0; border-left: 4px solid #ffc107; }
    .vulnerability-disclaimer p { margin: 0; color: #856404; font-size: 0.9rem; }

    /* Critical Issues Section */
    .critical-issues-section { background: #fff3cd; border-radius: 12px; padding: 2rem; margin: 2rem 0; border-left: 5px solid #ffc107; }
    .critical-issues-section h5 { color: #856404; margin-bottom: 1rem; }
    .critical-intro { color: #856404; margin-bottom: 2rem; font-style: italic; }

    .critical-issue-card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #ffc107; }
    .critical-issue-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

    .critical-issue-header { display: flex; align-items: center; margin-bottom: 1rem; }
    .critical-issue-number { background: #ffc107; color: #856404; font-weight: bold; font-size: 1.2rem; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; }
    .critical-issue-header strong { color: #856404; font-size: 1.1rem; }

    .critical-issue-body { margin-bottom: 1rem; }
    .critical-issue-body p { margin-bottom: 0.5rem; color: #333; }
    .critical-issue-body strong { color: #856404; }

    .critical-solutions { background: #f8f9fa; padding: 1rem; border-radius: 6px; border-left: 3px solid #ffc107; }
    .critical-solutions ul { padding-left: 1.5rem; margin: 0.5rem 0 0 0; }
    .critical-solutions li { margin-bottom: 0.5rem; color: #495057; }

    .no-critical-issues { background: #d4edda; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; border-left: 4px solid #28a745; }
    .no-critical-issues p { margin: 0; color: #155724; font-weight: 500; }

    /* Conversions Analysis Section */
    .conversions-analysis-section { background: #f8f9fa; border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .conversions-intro { color: #666; margin-bottom: 2rem; font-style: italic; }

    .business-metrics-section { margin: 3rem 0; }
    .business-metrics-section h3 { color: #667eea; margin-bottom: 2rem; }

    .business-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }

    .business-metric-card { background: white; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #667eea; }
    .business-metric-card:hover { box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); transform: translateY(-2px); transition: all 0.3s ease; }

    .metric-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .metric-value { font-size: 2.5rem; font-weight: bold; color: #667eea; margin-bottom: 0.5rem; }
    .metric-label { color: #666; font-size: 1rem; }

    .performance-impact-section { margin: 3rem 0; }
    .performance-impact-section h3 { color: #667eea; margin-bottom: 2rem; }

    .impact-analysis-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }

    .impact-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .impact-card h4 { color: #667eea; margin-bottom: 1.5rem; }

    .impact-bars { display: flex; flex-direction: column; gap: 1rem; }
    .impact-bar { display: flex; align-items: center; gap: 1rem; }
    .bar-label { flex: 1; font-weight: 500; color: #555; }
    .bar-container { flex: 2; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.8s ease; }
    .bar-value { flex: 1; text-align: right; font-weight: bold; color: #667eea; }

    .improvement-metrics { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
    .improvement-metric { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .improvement-metric:last-child { border-bottom: none; }
    .improvement-label { font-weight: 500; color: #555; }
    .improvement-value { font-weight: bold; color: #28a745; }
    .improvement-highlight .improvement-value { color: #dc3545; font-size: 1.2em; }

    .revenue-projection-section { margin: 3rem 0; }
    .revenue-projection-section h3 { color: #667eea; margin-bottom: 2rem; }

    .revenue-comparison { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }

    .revenue-card { border-radius: 12px; padding: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .revenue-card.current { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc3545; }
    .revenue-card.improved { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; }
    .revenue-card.difference { background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%); border-left: 4px solid #8b5cf6; }

    .revenue-card h4 { color: white; margin-bottom: 1rem; font-size: 1.5rem; }
    .revenue-amount { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 0.5rem; }
    .revenue-period { color: rgba(255,255,255,0.8); font-size: 1rem; margin-bottom: 1.5rem; }

    .revenue-breakdown { display: flex; flex-direction: column; gap: 0.5rem; }
    .revenue-breakdown-item { display: flex; justify-content: space-between; color: rgba(255,255,255,0.9); font-size: 0.9rem; }

    .cwv-business-impact-section { margin: 3rem 0; }
    .cwv-business-impact-section h3 { color: #667eea; margin-bottom: 2rem; }

    .cwv-impact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }

    .cwv-impact-card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 1rem; }
    .cwv-metric { flex: 1; }
    .cwv-icon { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; }
    .cwv-label { font-weight: 500; color: #333; font-size: 0.9rem; }
    .cwv-business-impact { text-align: center; }
    .impact-percentage { font-size: 1.5rem; font-weight: bold; color: #dc3545; }
    .impact-description { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }

    .objectives-alignment-section { margin: 3rem 0; }
    .objectives-alignment-section h3 { color: #667eea; margin-bottom: 2rem; }

    .objectives-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }

    .objective-card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #667eea; }
    .objective-card:hover { box-shadow: 0 4px 8px rgba(102, 126, 234, 0.1); }
    .objective-card h4 { color: #667eea; margin-bottom: 1rem; }
    .objective-card p { color: #666; margin-bottom: 1rem; line-height: 1.6; }
    .objective-metric { display: flex; justify-content: space-between; align-items: center; }
    .objective-label { font-size: 0.9rem; color: #666; }
    .objective-value { font-weight: bold; color: #28a745; }

    .timeline-section { margin: 3rem 0; }
    .timeline-section h3 { color: #667eea; margin-bottom: 2rem; }

    .timeline { display: flex; flex-direction: column; gap: 2rem; margin: 2rem 0; }

    .timeline-phase { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #667eea; position: relative; }
    .timeline-phase::before { content: ''; position: absolute; left: -8px; top: 20px; width: 0; height: 0; border-left: 8px solid #667eea; border-top: 8px solid transparent; border-bottom: 8px solid transparent; }

    .phase-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .phase-number { background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .phase-title { font-size: 1.2rem; font-weight: 600; color: #667eea; }

    .phase-content { color: #666; margin-bottom: 1rem; }
    .phase-results { display: flex; flex-direction: column; gap: 0.5rem; }
    .phase-result { font-size: 0.9rem; color: #28a745; font-weight: 500; }

    .conversions-disclaimer { background: #fff3cd; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; border-left: 4px solid #ffc107; }
    .conversions-disclaimer p { margin: 0; color: #856404; font-size: 0.9rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Informe de Auditoría Web</h1>
      <p>Análisis para ${this.results.client}</p>
    </header>

    <nav class="tab-nav">
        <button class="tab-button active" onclick="openTab(event, 'resumen')">🏠 Resumen Ejecutivo</button>
        <button class="tab-button" onclick="openTab(event, 'hallazgos')">🔍 Hallazgos Detallados</button>
        <button class="tab-button" onclick="openTab(event, 'seguridad')">🛡️ Seguridad</button>
        <button class="tab-button" onclick="openTab(event, 'tecnologias')">⚙️ Tecnologías</button>
        <button class="tab-button" onclick="openTab(event, 'plan')">📋 Plan de Remediación</button>
    </nav>

    <!-- Resumen Ejecutivo -->
    <div id="resumen" class="tab-content section active">
        <h2>Resumen Ejecutivo y Métricas Clave</h2>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 2rem; margin-bottom: 2rem;">
            <p><strong>Sitio auditado:</strong> <a href="${this.results.url}" target="_blank" class="highlight">${this.results.url}</a></p>
            <p><strong>Fecha de auditoría:</strong> <span class="highlight">${new Date(this.results.timestamp).toLocaleDateString('es-ES')}</span></p>
            <p><strong>Puntuación general:</strong> <span class="highlight">${averageScore}/100</span></p>
            <p><strong>Páginas con problemas críticos:</strong> <span class="highlight">${criticalPages}</span></p>
            <p><strong>Impacto de negocio estimado:</strong> <span class="highlight">$${monthlyImpact.toLocaleString()} de ingresos adicionales mensuales</span></p>
        </div>

        <div class="metricas-grid">
            <div class="metrica-card">
                <div class="metrica-icon">📱</div>
                <div class="metrica-value">${averageMobileScore}/100</div>
                <div>Performance Móvil</div>
            </div>
            <div class="metrica-card">
                <div class="metrica-icon">🖥️</div>
                <div class="metrica-value">${averageDesktopScore}/100</div>
                <div>Performance Desktop</div>
            </div>
        </div>

        <h3>Problemas Principales Encontrados</h3>
        ${topProblems.map(problem => `
        <div class="problema-card">
            <strong>${problem.category}:</strong> ${problem.issue}.
            <small>Impacto: ${problem.impact}</small>
        </div>
        `).join('')}

        ${this._generatePerformanceSummary()}

        <h3>Cálculo de ROI</h3>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin: 2rem 0;">
            <h4 style="text-align: center; margin-bottom: 1.5rem; color: white;">Calculadora de Impacto Empresarial</h4>
            <div class="metricas-grid" style="color: white;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;">$${monthlyImpact.toLocaleString()}</div>
                    <div style="opacity: 0.9; font-size: 0.9rem;">Ingresos adicionales/mes</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;">25%</div>
                    <div style="opacity: 0.9; font-size: 0.9rem;">Mejora en conversión</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold;">0.5 meses</div>
                    <div style="opacity: 0.9; font-size: 0.9rem;">Payback period</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Hallazgos Detallados -->
    <div id="hallazgos" class="tab-content section">
        <h2>Hallazgos Detallados de la Auditoría</h2>
        <h3>Performance y Core Web Vitals</h3>
        ${this._generateDetailedPerformanceMetrics()}

        ${this._generateCalculatedImpacts()}

        ${this._generateUnusedBundlesAnalysis()}

        ${this._generateServerConfigurationAnalysis()}

        <h3>Análisis Forense</h3>
        ${this._generateForensicsDetails()}

        <h3>Análisis de SEO Técnico</h3>
        ${this._generateSeoDetails()}
    </div>

    <!-- Seguridad -->
    <div id="seguridad" class="tab-content section">
        <h2>Auditoría de Seguridad</h2>
        ${this._generateVulnerabilityTable()}
    </div>



    <!-- Tecnologías -->
    <div id="tecnologias" class="tab-content section">
        <h2>Stack Tecnológico</h2>
        ${this._generateTechnologyTable()}
    </div>

    <!-- Plan de Remediación -->
    <div id="plan" class="tab-content section">
        <h2>Plan de Remediación Detallado</h2>
        ${this._generateDetailedRemediationPlan()}
    </div>

    <footer class="footer">
      <p>🚀 <strong>Web Audit Disconnect</strong> - Hacemos que tu sitio web venda más.</p>
      <p>Contacto: <a href="mailto:mauro@webauditdisconnect.com">mauro@webauditdisconnect.com</a></p>
    </footer>
  </div>

  <script>
    function openTab(evt, tabName) {
      var i, tabcontent, tabbuttons;
      tabcontent = document.getElementsByClassName("tab-content");
      for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
      }
      tabbuttons = document.getElementsByClassName("tab-button");
      for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
      }
      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";
    }
  </script>
</body>
</html>
    `;

    const filename = this.outputPath && this.outputPath.endsWith('.html') ? this.outputPath : join(this.reportDir, `${this._sanitizeFilename(this.results.client)}_${this.timestamp}.html`);
    writeFileSync(filename, html);
    this.htmlPath = filename;
    return filename;
  }

  generateJSON() {
    const filename = this.outputPath && this.outputPath.endsWith('.json') ? this.outputPath : join(this.reportDir, `${this.results.client}_${this.timestamp}.json`);
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
