import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export class LighthouseService {
  constructor() {
    this.chrome = null;
  }

  async runLighthouse(url, options = {}) {
    try {
      console.log('🚀 Iniciando Lighthouse analysis...');

      // Launch Chrome
      this.chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
      });

      const defaultOptions = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        port: this.chrome.port
      };

      const lighthouseOptions = { ...defaultOptions, ...options };

      console.log(`📊 Analizando: ${url}`);

      // Run Lighthouse
      const runnerResult = await lighthouse(url, lighthouseOptions);

      // Kill Chrome
      await this.chrome.kill();
      this.chrome = null;

      // Extract relevant metrics
      const result = {
        performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
        accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
        seo: Math.round(runnerResult.lhr.categories.seo.score * 100),
        coreWebVitals: {
          lcp: this.extractMetric(runnerResult.lhr.audits['largest-contentful-paint']),
          fid: this.extractMetric(runnerResult.lhr.audits['max-potential-fid']),
          cls: this.extractMetric(runnerResult.lhr.audits['cumulative-layout-shift'])
        },
        additionalMetrics: {
          fcp: this.extractMetric(runnerResult.lhr.audits['first-contentful-paint']),
          si: this.extractMetric(runnerResult.lhr.audits['speed-index']),
          tbt: this.extractMetric(runnerResult.lhr.audits['total-blocking-time']),
          tti: this.extractMetric(runnerResult.lhr.audits['interactive'])
        }
      };

      console.log(`✅ Lighthouse completado - Performance: ${result.performance}/100`);
      return result;

    } catch (error) {
      console.error('❌ Error en Lighthouse:', error.message);

      // Ensure Chrome is killed even on error
      if (this.chrome) {
        try {
          await this.chrome.kill();
        } catch (killError) {
          console.error('Error killing Chrome:', killError.message);
        }
        this.chrome = null;
      }

      // Return fallback data
      return {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        coreWebVitals: {
          lcp: { score: 0, displayValue: 'Error' },
          fid: { score: 0, displayValue: 'Error' },
          cls: { score: 0, displayValue: 'Error' }
        },
        additionalMetrics: {
          fcp: { score: 0, displayValue: 'Error' },
          si: { score: 0, displayValue: 'Error' },
          tbt: { score: 0, displayValue: 'Error' },
          tti: { score: 0, displayValue: 'Error' }
        },
        error: error.message
      };
    }
  }

  extractMetric(audit) {
    if (!audit) return { score: 0, displayValue: 'N/A' };

    return {
      score: audit.score || 0,
      displayValue: audit.displayValue || 'N/A',
      numericValue: audit.numericValue || 0,
      title: audit.title || ''
    };
  }

  async cleanup() {
    if (this.chrome) {
      try {
        await this.chrome.kill();
      } catch (error) {
        console.error('Error cleaning up Chrome:', error.message);
      }
      this.chrome = null;
    }
  }
}

export default LighthouseService;
