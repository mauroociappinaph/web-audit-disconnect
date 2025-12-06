import { LighthouseService } from '../lighthouse-service.js';

export class LighthouseLocalAnalyzer {
  constructor() {
    this.lighthouseService = new LighthouseService();
  }

  async runLocalLighthouse(url, options = {}) {
    try {
      console.log(`🏮 Ejecutando Lighthouse local para: ${url}`);

      // Usar opciones básicas para análisis rápido
      const lighthouseOptions = {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        ...options
      };

      const results = await this.lighthouseService.runLighthouse(url, lighthouseOptions);

      // Estructurar los resultados para el reporte
      const localAnalysis = {
        performance: {
          score: results.performance,
          status: this.getScoreStatus(results.performance),
          displayValue: `${results.performance}/100`
        },
        accessibility: {
          score: results.accessibility,
          status: this.getScoreStatus(results.accessibility),
          displayValue: `${results.accessibility}/100`
        },
        bestPractices: {
          score: results['best-practices'],
          status: this.getScoreStatus(results['best-practices']),
          displayValue: `${results['best-practices']}/100`
        },
        seo: {
          score: results.seo,
          status: this.getScoreStatus(results.seo),
          displayValue: `${results.seo}/100`
        },
        coreWebVitals: {
          lcp: results.coreWebVitals?.lcp || { displayValue: 'N/A', score: 0 },
          fid: results.coreWebVitals?.fid || { displayValue: 'N/A', score: 0 },
          cls: results.coreWebVitals?.cls || { displayValue: 'N/A', score: 0 }
        },
        detailedMetrics: results.additionalMetrics || {},
        diagnostics: this.extractTopIssues(results),
        summary: {
          overallScore: Math.round((results.performance + results.accessibility + results['best-practices'] + results.seo) / 4),
          coreWebVitalsScore: this.calculateCoreWebVitalsScore(results.coreWebVitals),
          generatedAt: new Date().toISOString(),
          source: 'Lighthouse Local'
        }
      };

      console.log(`✅ Lighthouse local completado - Performance: ${results.performance}/100`);
      return localAnalysis;

    } catch (error) {
      console.error('❌ Error en Lighthouse local:', error.message);

      // Retornar estructura vacía en caso de error
      return {
        performance: { score: 0, status: 'error', displayValue: 'Error' },
        accessibility: { score: 0, status: 'error', displayValue: 'Error' },
        bestPractices: { score: 0, status: 'error', displayValue: 'Error' },
        seo: { score: 0, status: 'error', displayValue: 'Error' },
        coreWebVitals: {
          lcp: { displayValue: 'Error', score: 0 },
          fid: { displayValue: 'Error', score: 0 },
          cls: { displayValue: 'Error', score: 0 }
        },
        detailedMetrics: {},
        diagnostics: [],
        summary: {
          overallScore: 0,
          coreWebVitalsScore: 0,
          generatedAt: new Date().toISOString(),
          source: 'Lighthouse Local - Error',
          error: error.message
        }
      };
    }
  }

  getScoreStatus(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  calculateCoreWebVitalsScore(cwv) {
    if (!cwv) return 0;

    let score = 0;
    if (cwv.lcp?.score !== undefined) score += cwv.lcp.score;
    if (cwv.fid?.score !== undefined) score += cwv.fid.score;
    if (cwv.cls?.score !== undefined) score += cwv.cls.score;

    return Math.round((score / 3) * 100);
  }

  extractTopIssues(results) {
    // Extraer los problemas más importantes encontrados por Lighthouse
    const issues = [];

    // Performance issues
    if (results.performance < 50) {
      issues.push({
        category: 'Performance',
        severity: 'high',
        title: 'Performance score muy bajo',
        description: `Puntuación de ${results.performance}/100 indica problemas críticos de rendimiento`
      });
    }

    // Accessibility issues
    if (results.accessibility < 70) {
      issues.push({
        category: 'Accessibility',
        severity: 'medium',
        title: 'Problemas de accesibilidad',
        description: `Puntuación de accesibilidad: ${results.accessibility}/100`
      });
    }

    // Best Practices issues
    if (results['best-practices'] < 70) {
      issues.push({
        category: 'Best Practices',
        severity: 'medium',
        title: 'Mejores prácticas no optimizadas',
        description: `Puntuación de mejores prácticas: ${results['best-practices']}/100`
      });
    }

    // SEO issues
    if (results.seo < 70) {
      issues.push({
        category: 'SEO',
        severity: 'medium',
        title: 'Problemas de optimización SEO',
        description: `Puntuación SEO: ${results.seo}/100`
      });
    }

    // Core Web Vitals issues
    if (results.coreWebVitals?.lcp?.score < 0.5) {
      issues.push({
        category: 'Core Web Vitals',
        severity: 'high',
        title: 'LCP problemático',
        description: `Largest Contentful Paint: ${results.coreWebVitals.lcp.displayValue}`
      });
    }

    if (results.coreWebVitals?.cls?.score < 0.5) {
      issues.push({
        category: 'Core Web Vitals',
        severity: 'high',
        title: 'CLS problemático',
        description: `Cumulative Layout Shift: ${results.coreWebVitals.cls.displayValue}`
      });
    }

    return issues.slice(0, 5); // Top 5 issues
  }

  async runMultiplePagesAnalysis(urls, options = {}) {
    console.log(`🏮 Ejecutando Lighthouse local para ${urls.length} páginas...`);

    const results = [];
    let totalTime = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`📄 Analizando ${i + 1}/${urls.length}: ${url}`);

      const startTime = Date.now();
      const result = await this.runLocalLighthouse(url, options);
      const analysisTime = Date.now() - startTime;
      totalTime += analysisTime;

      result.url = url;
      result.analysisTime = analysisTime;
      results.push(result);

      // Pequeña pausa entre análisis para no sobrecargar
      if (i < urls.length - 1) {
        await this.sleep(2000);
      }
    }

    // Generar resumen consolidado
    const summary = this.generateMultiPageSummary(results);

    console.log(`✅ Análisis múltiple completado - ${results.length} páginas en ${(totalTime/1000).toFixed(1)}s`);

    return {
      results: results,
      summary: summary,
      metadata: {
        totalPages: urls.length,
        totalTime: totalTime,
        averageTime: totalTime / urls.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  generateMultiPageSummary(results) {
    if (results.length === 0) {
      return {
        averageScores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
        coreWebVitalsAverage: { lcp: 0, fid: 0, cls: 0 },
        topIssues: [],
        recommendations: []
      };
    }

    // Calcular promedios
    const averages = {
      performance: Math.round(results.reduce((sum, r) => sum + r.performance.score, 0) / results.length),
      accessibility: Math.round(results.reduce((sum, r) => sum + r.accessibility.score, 0) / results.length),
      bestPractices: Math.round(results.reduce((sum, r) => sum + r.bestPractices.score, 0) / results.length),
      seo: Math.round(results.reduce((sum, r) => sum + r.seo.score, 0) / results.length)
    };

    // Core Web Vitals averages
    const cwvAverages = {
      lcp: results.filter(r => r.coreWebVitals.lcp.numericValue).reduce((sum, r) => sum + r.coreWebVitals.lcp.numericValue, 0) / results.filter(r => r.coreWebVitals.lcp.numericValue).length || 0,
      fid: results.filter(r => r.coreWebVitals.fid.numericValue).reduce((sum, r) => sum + r.coreWebVitals.fid.numericValue, 0) / results.filter(r => r.coreWebVitals.fid.numericValue).length || 0,
      cls: results.filter(r => r.coreWebVitals.cls.numericValue).reduce((sum, r) => sum + r.coreWebVitals.cls.numericValue, 0) / results.filter(r => r.coreWebVitals.cls.numericValue).length || 0
    };

    // Recopilar todos los issues
    const allIssues = results.flatMap(r => r.diagnostics || []);
    const topIssues = this.getMostCommonIssues(allIssues);

    return {
      averageScores: averages,
      coreWebVitalsAverage: cwvAverages,
      topIssues: topIssues,
      recommendations: this.generateMultiPageRecommendations(averages, cwvAverages, topIssues)
    };
  }

  getMostCommonIssues(issues) {
    const issueCount = {};

    issues.forEach(issue => {
      const key = `${issue.category}:${issue.title}`;
      issueCount[key] = (issueCount[key] || 0) + 1;
    });

    return Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => {
        const [category, title] = key.split(':');
        return { category, title, count, percentage: Math.round((count / issues.length) * 100) };
      });
  }

  generateMultiPageRecommendations(averages, cwvAverages, topIssues) {
    const recommendations = [];

    // Performance recommendations
    if (averages.performance < 50) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Performance',
        issue: `Puntuación de performance promedio crítica: ${averages.performance}/100`,
        action: 'Implementar optimizaciones críticas de performance en todo el sitio',
        impact: 'Mejora significativa en velocidad de carga y experiencia de usuario'
      });
    }

    // Core Web Vitals recommendations
    if (cwvAverages.lcp > 2500) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Core Web Vitals',
        issue: `LCP promedio alto: ${(cwvAverages.lcp/1000).toFixed(1)}s`,
        action: 'Optimizar Largest Contentful Paint en páginas principales',
        impact: 'Mejora ranking SEO y experiencia de carga'
      });
    }

    if (cwvAverages.cls > 0.1) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Core Web Vitals',
        issue: `CLS promedio alto: ${cwvAverages.cls}`,
        action: 'Estabilizar layout y definir dimensiones de elementos',
        impact: 'Reduce movimientos de layout que molestan a usuarios'
      });
    }

    // Add recommendations based on top issues
    topIssues.forEach(issue => {
      if (issue.percentage > 30) { // Si más del 30% de páginas tienen este issue
        recommendations.push({
          priority: issue.category === 'Performance' ? 'HIGH' : 'MEDIUM',
          category: issue.category,
          issue: `${issue.title} (${issue.percentage}% de páginas)`,
          action: `Resolver problema común en ${issue.percentage}% del sitio`,
          impact: 'Mejora consistente en toda la experiencia del sitio'
        });
      }
    });

    return recommendations;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.lighthouseService) {
      await this.lighthouseService.cleanup();
    }
  }
}

export default LighthouseLocalAnalyzer;
