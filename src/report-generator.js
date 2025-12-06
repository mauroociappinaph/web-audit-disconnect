import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { TechnologyDetector } from './technology-detector.js';
import { ROICalculator } from './roi-calculator.js';

export class ReportGenerator {
  constructor(auditResults) {
    this.results = auditResults;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportDir = 'reports';
    mkdirSync(this.reportDir, { recursive: true });
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

  generateHTML() {
    const statusColor = (status) => {
      switch(status) {
        case 'good': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error':
        case 'bad': return '#ef4444';
        case 'up': return '#10b981';
        case 'down': return '#ef4444';
        default: return '#6b7280';
      }
    };

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audi toría Web - ${this.results.client}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      margin-bottom: 30px;
    }
    .header h1 { color: #1f2937; margin-bottom: 10px; font-size: 2em; }
    .header-info { display: flex; gap: 20px; flex-wrap: wrap; color: #6b7280; font-size: 0.95em; }
    .header-info p { display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      border-left: 5px solid #667eea;
    }
    .card h2 {
      font-size: 1.1em;
      margin-bottom: 15px;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: bold;
      color: white;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-weight: 500; }
    .metric-value { color: #1f2937; font-weight: bold; }
    .icon { font-size: 1.3em; }
    .ssl-valid { color: #10b981; }
    .ssl-error { color: #ef4444; }
    .ssl-warning { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    tr:hover { background: #f9fafb; }
    .recommendations { margin-bottom: 30px; }
    .recommendation-item {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 4px solid #6b7280;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .recommendation-critical { border-left-color: #ef4444; }
    .recommendation-high { border-left-color: #f59e0b; }
    .recommendation-medium { border-left-color: #3b82f6; }
    .recommendation-low { border-left-color: #10b981; }
    .recommendation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .recommendation-priority {
      font-size: 0.75em;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 12px;
      color: white;
    }
    .priority-critical { background-color: #ef4444; }
    .priority-high { background-color: #f59e0b; }
    .priority-medium { background-color: #3b82f6; }
    .priority-low { background-color: #10b981; }
    .recommendation-issue { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
    .recommendation-action { color: #6b7280; font-size: 0.9em; }
    .recommendation-category { font-size: 0.8em; color: #9ca3af; font-weight: 500; }
    .footer { text-align: center; color: white; margin-top: 30px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Audi toría Web Completa</h1>
      <div class="header-info">
        <p><strong>Cliente:</strong> ${this.results.client}</p>
        <p><strong>URL:</strong> ${this.results.url}</p>
        <p><strong>Fecha:</strong> ${new Date(this.results.timestamp).toLocaleDateString()}</p>
        <p><strong>Duración:</strong> ${this.results.duration || 'N/A'}</p>
      </div>
    </div>

    <div class="grid">
      <!-- SSL/HTTPS -->
      <div class="card">
        <h2>🔐 SSL/HTTPS</h2>
        <div class="metric-row">
          <span class="metric-label">Estado:</span>
          <span class="status-badge" style="background-color: ${statusColor(this.results.ssl?.status)}">
            ${this.results.ssl?.protocol || 'N/A'}
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Certificado:</span>
          <span class="metric-value">${this.results.ssl?.cert || 'N/A'}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Status Code:</span>
          <span class="metric-value">${this.results.ssl?.statusCode || 'Error'}</span>
        </div>
      </div>

      <!-- UPTIME -->
      <div class="card">
        <h2>✅ Uptime</h2>
        <div class="metric-row">
          <span class="metric-label">Estado:</span>
          <span class="status-badge" style="background-color: ${statusColor(this.results.uptime?.status)}">
            ${(this.results.uptime?.status || 'unknown').toUpperCase()}
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Response Time:</span>
          <span class="metric-value">${this.results.uptime?.responseTime || 'N/A'}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Status Code:</span>
          <span class="metric-value">${this.results.uptime?.statusCode || 'N/A'}</span>
        </div>
      </div>

      <!-- PERFORMANCE -->
      <div class="card">
        <h2>⚡ Performance</h2>
        <div class="metric-row">
          <span class="metric-label">Tiempo de carga:</span>
          <span class="metric-value">${this.results.performance?.pageLoadTime || 'N/A'}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Semáforo:</span>
          <span class="status-badge" style="background-color: ${statusColor(this.results.performance?.status)}">
            ${this.results.performance?.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Imágenes:</span>
          <span class="metric-value">${this.results.performance?.imageCount || 0}</span>
        </div>
        ${this.results.lighthouse ? `
        <div class="metric-row">
          <span class="metric-label">Lighthouse Score:</span>
          <span class="status-badge" style="background-color: ${this.results.lighthouse.performance >= 90 ? '#10b981' : this.results.lighthouse.performance >= 50 ? '#f59e0b' : '#ef4444'}">
            ${this.results.lighthouse.performance}/100
          </span>
        </div>
        ` : ''}
      </div>

      <!-- CORE WEB VITALS -->
      ${this.results.lighthouse ? `
      <div class="card">
        <h2>🎯 Core Web Vitals</h2>
        <div class="metric-row">
          <span class="metric-label">LCP (Largest Contentful Paint):</span>
          <span class="status-badge" style="background-color: ${this.results.lighthouse.coreWebVitals?.lcp?.score >= 0.75 ? '#10b981' : this.results.lighthouse.coreWebVitals?.lcp?.score >= 0.5 ? '#f59e0b' : '#ef4444'}">
            ${this.results.lighthouse.coreWebVitals?.lcp?.displayValue || 'N/A'}
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">FID (First Input Delay):</span>
          <span class="status-badge" style="background-color: ${this.results.lighthouse.coreWebVitals?.fid?.score >= 0.75 ? '#10b981' : this.results.lighthouse.coreWebVitals?.fid?.score >= 0.5 ? '#f59e0b' : '#ef4444'}">
            ${this.results.lighthouse.coreWebVitals?.fid?.displayValue || 'N/A'}
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">CLS (Cumulative Layout Shift):</span>
          <span class="status-badge" style="background-color: ${this.results.lighthouse.coreWebVitals?.cls?.score >= 0.75 ? '#10b981' : this.results.lighthouse.coreWebVitals?.cls?.score >= 0.5 ? '#f59e0b' : '#ef4444'}">
            ${this.results.lighthouse.coreWebVitals?.cls?.displayValue || 'N/A'}
          </span>
        </div>
      </div>
      ` : ''}

      <!-- LINKS ROTOS -->
      <div class="card">
        <h2>🔗 Links</h2>
        <div class="metric-row">
          <span class="metric-label">Total:</span>
          <span class="metric-value">${this.results.links?.total || 0}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Verificados:</span>
          <span class="metric-value">${this.results.links?.checked || 0}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Rotos:</span>
          <span class="status-badge" style="background-color: ${statusColor(this.results.links?.status)}">
            ${this.results.links?.broken || 0}
          </span>
        </div>
      </div>

      <!-- SEO -->
      <div class="card">
        <h2>📄 SEO</h2>
        <div class="metric-row">
          <span class="metric-label">Título:</span>
          <span class="metric-value" style="font-size: 0.9em;">${(this.results.seo?.title || 'No encontrado').substring(0, 30)}...</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">H1:</span>
          <span class="metric-value">${this.results.seo?.headings?.h1 || 0}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Meta Description:</span>
          <span class="status-badge" style="background-color: ${statusColor(this.results.seo?.status)}">
            ${this.results.seo?.metaDescription ? '✓ Presente' : '✗ Falta'}
          </span>
        </div>
      </div>
    </div>

    ${this.results.links?.brokenLinks?.length > 0 ? `
    <div class="card">
      <h2>🔗 Links Rotos Encontrados</h2>
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Estado/Error</th>
          </tr>
        </thead>
        <tbody>
          ${this.results.links.brokenLinks.slice(0, 10).map(link => `
            <tr>
              <td>${link.url}</td>
              <td>${link.status || link.error}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${this.results.technologies ? `
    <div class="card">
      <h2>🏗️ Tecnologías Detectadas</h2>
      <div class="metric-row">
        <span class="metric-label">CMS:</span>
        <span class="metric-value">${this.results.technologies.cms ? this.results.technologies.cms.charAt(0).toUpperCase() + this.results.technologies.cms.slice(1) : 'No detectado'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Framework:</span>
        <span class="metric-value">${this.results.technologies.framework ? this.results.technologies.framework.charAt(0).toUpperCase() + this.results.technologies.framework.slice(1) : 'No detectado'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Hosting:</span>
        <span class="metric-value">${this.results.technologies.hosting ? this.results.technologies.hosting.charAt(0).toUpperCase() + this.results.technologies.hosting.slice(1) : 'No detectado'}</span>
      </div>
    </div>
    ` : ''}

    ${this.results.forensics ? `
    <div class="card">
      <h2>🔍 Análisis Forense de Rendimiento</h2>
      <div class="metric-row">
        <span class="metric-label">Health Score:</span>
        <span class="status-badge" style="background-color: ${this.results.forensics.summary.healthScore >= 80 ? '#10b981' : this.results.forensics.summary.healthScore >= 60 ? '#f59e0b' : '#ef4444'}">
          ${this.results.forensics.summary.healthScore}/100
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Estado:</span>
        <span class="metric-value">${this.results.forensics.summary.status.charAt(0).toUpperCase() + this.results.forensics.summary.status.slice(1)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Problemas Críticos:</span>
        <span class="metric-value">${this.results.forensics.summary.criticalIssues}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Problemas Altos:</span>
        <span class="metric-value">${this.results.forensics.summary.highIssues}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Problemas:</span>
        <span class="metric-value">${this.results.forensics.summary.totalIssues}</span>
      </div>
    </div>
    ` : ''}

    ${this.results.roi ? `
    <div class="card">
      <h2>💰 Análisis de ROI y Business Intelligence</h2>
      <div class="metric-row">
        <span class="metric-label">Aumento Anual Estimado:</span>
        <span class="metric-value" style="color: #10b981; font-weight: bold;">$${this.results.roi.financials.annualRevenueIncrease.toLocaleString()}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Payback:</span>
        <span class="status-badge" style="background-color: ${this.results.roi.payback.recommendation.includes('EXCELENTE') ? '#10b981' : this.results.roi.payback.recommendation.includes('BUENO') ? '#f59e0b' : '#ef4444'}">
          ${this.results.roi.payback.months.low.toFixed(1)} meses
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Mejora en Conversión:</span>
        <span class="metric-value">${(this.results.roi.conversionImpact.totalImpact * 100).toFixed(1)}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Confianza del Análisis:</span>
        <span class="metric-value">${this.results.roi.confidence}%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Recomendación Payback:</span>
        <span class="metric-value" style="font-size: 0.9em;">${this.results.roi.payback.recommendation}</span>
      </div>
    </div>
    ` : ''}

    ${this.results.engineeringPlan ? `
    <div class="card">
      <h2>📋 Plan de Implementación de Ingeniería</h2>
      <div class="metric-row">
        <span class="metric-label">Prioridad General:</span>
        <span class="status-badge" style="background-color: ${this.results.engineeringPlan.summary.priority === 'CRITICAL' ? '#ef4444' : this.results.engineeringPlan.summary.priority === 'HIGH' ? '#f59e0b' : '#10b981'}">
          ${this.results.engineeringPlan.summary.priority}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Timeline Estimado:</span>
        <span class="metric-value">${this.results.engineeringPlan.timeline.totalWeeks} semanas</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Presupuesto Estimado:</span>
        <span class="metric-value">$${this.results.engineeringPlan.budget.total.toLocaleString()}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Problemas Críticos:</span>
        <span class="metric-value">${this.results.engineeringPlan.summary.criticalIssues}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Problemas Altos:</span>
        <span class="metric-value">${this.results.engineeringPlan.summary.highIssues}</span>
      </div>
    </div>

    <div class="card">
      <h2>📅 Fases de Implementación</h2>
      ${Object.entries(this.results.engineeringPlan.phases).map(([phaseKey, phase]) => `
        ${phase.issues && phase.issues.length > 0 ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-bottom: 10px;">${phase.name}</h3>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 0.9em;">
              <span><strong>Duración:</strong> ${phase.duration}</span>
              <span><strong>Issues:</strong> ${phase.issues.length}</span>
            </div>
            <div style="margin-top: 10px;">
              ${phase.issues.slice(0, 3).map(issue => `
                <div style="margin: 5px 0; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 0.85em;">
                  <strong>${issue.title}</strong> - ${issue.description}
                </div>
              `).join('')}
              ${phase.issues.length > 3 ? `<div style="font-size: 0.8em; color: #6b7280;">...y ${phase.issues.length - 3} issues más</div>` : ''}
            </div>
          </div>
        ` : ''}
      `).join('')}
    </div>
    ` : ''}

    ${(() => {
      const technologyDetector = new TechnologyDetector();
      const techRecommendations = this.results.technologies ?
        technologyDetector.getTechnologyRecommendations(this.results.technologies) : [];
      const generalRecommendations = this.generateRecommendations();
      const recommendations = [...techRecommendations, ...generalRecommendations];
      if (recommendations.length === 0) {
        return `
    <div class="card">
      <h2>✅ Recomendaciones</h2>
      <p style="color: #10b981; font-weight: bold;">¡Excelente! No se encontraron problemas críticos que requieran atención inmediata.</p>
      <p style="color: #6b7280; margin-top: 10px;">El sitio web está funcionando correctamente y cumple con los estándares básicos de calidad.</p>
    </div>
        `;
      }

      return `
    <div class="card recommendations">
      <h2>💡 Recomendaciones de Mejora</h2>
      ${recommendations.map(rec => `
        <div class="recommendation-item recommendation-${rec.priority.toLowerCase()}">
          <div class="recommendation-header">
            <span class="recommendation-category">${rec.category}</span>
            <span class="recommendation-priority priority-${rec.priority.toLowerCase()}">${rec.priority}</span>
          </div>
          <div class="recommendation-issue">${rec.issue}</div>
          <div class="recommendation-action">${rec.action}</div>
        </div>
      `).join('')}
    </div>
      `;
    })()}

    <div class="footer">
      <p>Generado por Web Audit Disconnect 🔍 | ${new Date().toLocaleString()}</p>
    </div>
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
