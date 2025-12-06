export class ROICalculator {
  constructor() {
    this.baselineMetrics = {
      // Métricas estándar de la industria
      conversionRate: 0.02, // 2% tasa de conversión promedio
      averageOrderValue: 100, // $100 valor promedio de pedido
      monthlyTraffic: 10000, // 10K visitantes mensuales

      // Impacto de performance en conversión
      performanceImpact: {
        // Cada 100ms de mejora en LCP aumenta conversión ~2%
        lcpImprovement: 0.02,
        // Cada punto de mejora en Core Web Vitals aumenta conversión ~1%
        cwvImprovement: 0.01
      }
    };
  }

  calculateROI(auditResults, businessMetrics = {}) {
    // Usar métricas proporcionadas o valores por defecto
    const metrics = { ...this.baselineMetrics, ...businessMetrics };

    // Obtener scores actuales
    const lighthouseScore = auditResults.lighthouse?.performance || 0;
    const lcpValue = this.parseLCP(auditResults.lighthouse?.coreWebVitals?.lcp?.displayValue);

    // Calcular mejoras potenciales
    const improvements = this.calculatePotentialImprovements(auditResults, lighthouseScore, lcpValue);

    // Calcular impacto en conversión
    const conversionImpact = this.calculateConversionImpact(improvements, metrics);

    // Calcular métricas financieras
    const financials = this.calculateFinancialImpact(conversionImpact, metrics);

    // Calcular periodo de payback
    const payback = this.calculatePaybackPeriod(financials);

    return {
      currentPerformance: {
        lighthouseScore,
        lcpValue,
        estimatedConversionRate: metrics.conversionRate
      },
      potentialImprovements: improvements,
      conversionImpact,
      financials,
      payback,
      recommendations: this.generateROIRecommendations(improvements, financials),
      confidence: this.calculateConfidenceLevel(auditResults)
    };
  }

  parseLCP(lcpDisplayValue) {
    if (!lcpDisplayValue) return 0;
    // Convertir "2.5 s" a 2500ms
    const match = lcpDisplayValue.match(/([\d.]+)\s*s/);
    return match ? parseFloat(match[1]) * 1000 : 0;
  }

  calculatePotentialImprovements(auditResults, currentScore, currentLcp) {
    const improvements = {
      lighthouseScore: 0,
      lcpImprovement: 0,
      cwvScore: 0
    };

    // Estimar mejora potencial en Lighthouse score
    // Sitios con score < 50 pueden mejorar hasta 90 con optimizaciones
    if (currentScore < 50) {
      improvements.lighthouseScore = 40; // Mejora de 40 puntos
    } else if (currentScore < 80) {
      improvements.lighthouseScore = 20; // Mejora de 20 puntos
    } else {
      improvements.lighthouseScore = 10; // Mejora menor
    }

    // Estimar mejora en LCP
    // LCP > 4s puede mejorar significativamente
    if (currentLcp > 4000) {
      improvements.lcpImprovement = 2000; // 2 segundos de mejora
    } else if (currentLcp > 2500) {
      improvements.lcpImprovement = 1000; // 1 segundo de mejora
    } else {
      improvements.lcpImprovement = 500; // 0.5 segundos de mejora
    }

    // Calcular mejora en Core Web Vitals score
    improvements.cwvScore = Math.min(40, improvements.lighthouseScore * 0.8);

    return improvements;
  }

  calculateConversionImpact(improvements, metrics) {
    const impact = {
      lcpImpact: 0,
      cwvImpact: 0,
      totalImpact: 0,
      newConversionRate: 0,
      additionalConversions: 0
    };

    // Impacto de mejora en LCP
    // Cada segundo de mejora en LCP aumenta conversión ~2%
    const lcpSecondsImprovement = improvements.lcpImprovement / 1000;
    impact.lcpImpact = lcpSecondsImprovement * metrics.performanceImpact.lcpImprovement;

    // Impacto de mejora en Core Web Vitals
    impact.cwvImpact = (improvements.cwvScore / 100) * metrics.performanceImpact.cwvImprovement;

    // Impacto total
    impact.totalImpact = impact.lcpImpact + impact.cwvImpact;
    impact.newConversionRate = metrics.conversionRate * (1 + impact.totalImpact);
    impact.additionalConversions = metrics.monthlyTraffic * (impact.newConversionRate - metrics.conversionRate);

    return impact;
  }

  calculateFinancialImpact(conversionImpact, metrics) {
    const financials = {
      monthlyRevenueIncrease: 0,
      annualRevenueIncrease: 0,
      monthlyProfitIncrease: 0,
      annualProfitIncrease: 0,
      roi: 0
    };

    // Calcular aumento de revenue
    financials.monthlyRevenueIncrease = conversionImpact.additionalConversions * metrics.averageOrderValue;
    financials.annualRevenueIncrease = financials.monthlyRevenueIncrease * 12;

    // Asumir margen de profit del 30%
    const profitMargin = 0.3;
    financials.monthlyProfitIncrease = financials.monthlyRevenueIncrease * profitMargin;
    financials.annualProfitIncrease = financials.annualRevenueIncrease * profitMargin;

    return financials;
  }

  calculatePaybackPeriod(financials) {
    // Costos estimados de implementación
    const implementationCosts = {
      low: 2000,    // Optimizaciones básicas
      medium: 5000, // Optimizaciones avanzadas
      high: 10000   // Rediseño completo
    };

    // Calcular payback para diferentes niveles de inversión
    const payback = {
      low: implementationCosts.low / financials.monthlyProfitIncrease,
      medium: implementationCosts.medium / financials.monthlyProfitIncrease,
      high: implementationCosts.high / financials.monthlyProfitIncrease
    };

    return {
      costs: implementationCosts,
      months: payback,
      recommendation: this.getPaybackRecommendation(payback)
    };
  }

  getPaybackRecommendation(payback) {
    if (payback.low < 6) {
      return 'EXCELENTE - Payback en menos de 6 meses';
    } else if (payback.medium < 12) {
      return 'BUENO - Payback razonable';
    } else if (payback.high < 24) {
      return 'ACEPTABLE - Payback a largo plazo';
    } else {
      return 'REVISAR - Payback muy largo, considerar otras prioridades';
    }
  }

  generateROIRecommendations(improvements, financials) {
    const recommendations = [];

    if (financials.annualRevenueIncrease > 50000) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'ROI',
        issue: `Potencial aumento de revenue: $${financials.annualRevenueIncrease.toLocaleString()}/año`,
        action: 'Implementar optimizaciones de performance inmediatamente - ROI excelente'
      });
    }

    if (improvements.lighthouseScore > 30) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ROI',
        issue: `${improvements.lighthouseScore} puntos de mejora en Lighthouse score`,
        action: 'Optimizaciones técnicas pueden aumentar conversión significativamente'
      });
    }

    if (improvements.lcpImprovement > 1500) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ROI',
        issue: `${(improvements.lcpImprovement / 1000).toFixed(1)}s mejora en LCP`,
        action: 'Mejorar Largest Contentful Paint - impacto directo en UX y conversión'
      });
    }

    return recommendations;
  }

  calculateConfidenceLevel(auditResults) {
    let confidence = 100;

    // Reducir confianza si faltan datos
    if (!auditResults.lighthouse?.coreWebVitals) {
      confidence -= 20;
    }

    if (!auditResults.technologies) {
      confidence -= 15;
    }

    if (!auditResults.forensics) {
      confidence -= 10;
    }

    // Reducir confianza para sitios con performance muy baja
    if (auditResults.lighthouse?.performance < 30) {
      confidence -= 15;
    }

    return Math.max(60, confidence); // Mínimo 60% de confianza
  }

  // Método para calcular benchmarking competitivo
  calculateCompetitiveBenchmark(auditResults, industry = 'ecommerce') {
    const benchmarks = {
      ecommerce: {
        lighthouseScore: 75,
        lcp: 2500,
        fid: 100,
        cls: 0.1
      },
      saas: {
        lighthouseScore: 85,
        lcp: 2000,
        fid: 80,
        cls: 0.08
      },
      media: {
        lighthouseScore: 70,
        lcp: 3000,
        fid: 120,
        cls: 0.15
      }
    };

    const benchmark = benchmarks[industry] || benchmarks.ecommerce;
    const current = {
      lighthouseScore: auditResults.lighthouse?.performance || 0,
      lcp: this.parseLCP(auditResults.lighthouse?.coreWebVitals?.lcp?.displayValue),
      fid: auditResults.lighthouse?.coreWebVitals?.fid?.numericValue || 0,
      cls: auditResults.lighthouse?.coreWebVitals?.cls?.numericValue || 0
    };

    return {
      industry,
      benchmark,
      current,
      gaps: {
        lighthouseScore: benchmark.lighthouseScore - current.lighthouseScore,
        lcp: current.lcp - benchmark.lcp,
        fid: current.fid - benchmark.fid,
        cls: current.cls - benchmark.cls
      },
      percentile: this.calculatePercentile(current, benchmark)
    };
  }

  calculatePercentile(current, benchmark) {
    // Cálculo simplificado de percentil basado en benchmarks
    const scores = [
      current.lighthouseScore / benchmark.lighthouseScore,
      (benchmark.lcp - current.lcp) / benchmark.lcp,
      (benchmark.fid - current.fid) / benchmark.fid,
      (benchmark.cls - current.cls) / benchmark.cls
    ].map(score => Math.max(0, Math.min(1, score)));

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(averageScore * 100);
  }
}

export default ROICalculator;
