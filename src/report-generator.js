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
    const comparisonTable = this.results.pagespeedInsights ?
      MetricsHelper.createComparisonTable(
        this.results.pagespeedInsights.mobile,
        this.results.pagespeedInsights.desktop
      ) : [];

    // Información de alcance
    const scopeInfo = this.results.scopeAnalysis ?
      this.results.scopeAnalysis :
      MetricsHelper.calculateScopeAnalysis(this.results);

    // Recomendaciones accionables
    const actionableRecs = this.results.actionableRecommendations || [];

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auditoría Web Completa - ${this.results.client} - PageSpeed Insights</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
      color: #1f2937;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 { color: #1f2937; margin-bottom: 10px; font-size: 2.5em; }
    .header .subtitle { color: #6b7280; font-size: 1.2em; margin-bottom: 20px; }
    .header-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      color: #6b7280;
      font-size: 0.95em;
    }
    .header-info p { display: flex; align-items: center; justify-content: center; gap: 8px; }

    .overview-section {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .overview-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    .overview-card h3 { color: #1f2937; margin-bottom: 10px; font-size: 1.1em; }
    .overview-metric { font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .overview-label { color: #6b7280; font-size: 0.9em; }

    .section { margin-bottom: 40px; }
    .section h2 {
      color: white;
      font-size: 1.8em;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .card h3 {
      color: #1f2937;
      margin-bottom: 20px;
      font-size: 1.3em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 25px;
      font-size: 0.9em;
      font-weight: bold;
      color: white;
      text-transform: uppercase;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .comparison-table th {
      background: #667eea;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    .comparison-table td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .comparison-table tr:nth-child(even) { background: #f8fafc; }
    .comparison-table tr:hover { background: #f0f4ff; }

    .mobile-col { background: #e3f2fd; }
    .desktop-col { background: #f3e5f5; }
    .diff-col {
      font-weight: bold;
    }
    .diff-mobile-better { color: #10b981; }
    .diff-desktop-better { color: #f59e0b; }
    .diff-similar { color: #6b7280; }

    .screenshots-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot-card {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .screenshot-card h4 {
      padding: 15px;
      background: #667eea;
      color: white;
      margin: 0;
      font-size: 1.1em;
    }
    .screenshot-card img {
      width: 100%;
      height: auto;
      display: block;
    }

    .recommendations-grid {
      display: grid;
      gap: 20px;
    }
    .recommendation-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-left: 5px solid #6b7280;
    }
    .recommendation-critical { border-left-color: #ef4444; }
    .recommendation-high { border-left-color: #f59e0b; }
    .recommendation-medium { border-left-color: #3b82f6; }
    .recommendation-low { border-left-color: #10b981; }

    .recommendation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .recommendation-severity {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      font-weight: bold;
    }
    .severity-critical { color: #ef4444; }
    .severity-high { color: #f59e0b; }
    .severity-medium { color: #3b82f6; }
    .severity-low { color: #10b981; }

    .recommendation-issue {
      font-size: 1.1em;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .recommendation-impact {
      color: #6b7280;
      font-size: 0.95em;
      margin-bottom: 15px;
      font-style: italic;
    }
    .recommendation-actions {
      margin-bottom: 15px;
    }
    .recommendation-action {
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 5px 0;
      font-size: 0.9em;
      border-left: 3px solid #667eea;
    }
    .recommendation-outcomes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }
    .outcome-item {
      background: #f0f4ff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85em;
      text-align: center;
    }
    .outcome-label { font-weight: bold; color: #667eea; }
    .outcome-value { color: #1f2937; }

    .footer {
      text-align: center;
      color: white;
      margin-top: 40px;
      font-size: 0.9em;
      padding: 20px;
    }

    @media (max-width: 768px) {
      .container { padding: 10px; }
      .header { padding: 20px; }
      .header h1 { font-size: 2em; }
      .overview-grid { grid-template-columns: 1fr; }
      .screenshots-section { grid-template-columns: 1fr; }
      .comparison-table { font-size: 0.8em; }
      .comparison-table th,
      .comparison-table td { padding: 8px; }
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
        <p><strong>Fuente:</strong> PageSpeed Insights API</p>
        <p><strong>Alcance:</strong> ${scopeInfo.description}</p>
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
            ${rec.specificActions.map(action => `
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
        <strong>Web Audit Disconnect</strong> | Generado con PageSpeed Insights API Oficial<br>
        ${new Date().toLocaleString('es-ES')} | Reporte basado en datos reales de Google
      </p>
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
