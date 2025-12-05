import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ReportGenerator {
  constructor(auditResults) {
    this.results = auditResults;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportDir = 'reports';
    mkdirSync(this.reportDir, { recursive: true });
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
      </div>

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
