export class MetricsHelper {
  static getMetricDefinition(metric) {
    const definitions = {
      // Core Web Vitals
      lcp: {
        name: 'Largest Contentful Paint',
        description: 'Mide cuándo se renderiza el elemento de contenido más grande visible',
        unit: 'ms',
        good: 2500,
        poor: 4000,
        category: 'core-web-vitals'
      },
      fid: {
        name: 'First Input Delay',
        description: 'Mide la capacidad de respuesta a la primera interacción del usuario',
        unit: 'ms',
        good: 100,
        poor: 300,
        category: 'core-web-vitals'
      },
      cls: {
        name: 'Cumulative Layout Shift',
        description: 'Mide la estabilidad visual del layout durante la carga',
        unit: 'score',
        good: 0.1,
        poor: 0.25,
        category: 'core-web-vitals'
      },

      // Detailed Metrics
      ttfb: {
        name: 'Time to First Byte',
        description: 'Tiempo hasta recibir el primer byte de respuesta del servidor',
        unit: 'ms',
        good: 800,
        poor: 1800,
        category: 'server'
      },
      fcp: {
        name: 'First Contentful Paint',
        description: 'Tiempo hasta renderizar el primer contenido visible',
        unit: 'ms',
        good: 1800,
        poor: 3000,
        category: 'paint'
      },
      dcl: {
        name: 'DOMContentLoaded',
        description: 'Tiempo hasta que el HTML está completamente parseado',
        unit: 'ms',
        good: 1500,
        poor: 2500,
        category: 'dom'
      },
      onload: {
        name: 'Load Event',
        description: 'Tiempo hasta que la página está completamente cargada',
        unit: 'ms',
        good: 2500,
        poor: 4000,
        category: 'load'
      },
      tbt: {
        name: 'Total Blocking Time',
        description: 'Tiempo total que la página está bloqueada para responder',
        unit: 'ms',
        good: 200,
        poor: 600,
        category: 'interactivity'
      },
      si: {
        name: 'Speed Index',
        description: 'Velocidad a la que se vuelve visible el contenido de la página',
        unit: 'ms',
        good: 3400,
        poor: 5800,
        category: 'paint'
      },
      tti: {
        name: 'Time to Interactive',
        description: 'Tiempo hasta que la página es completamente interactiva',
        unit: 'ms',
        good: 3800,
        poor: 7300,
        category: 'interactivity'
      },

      // Lighthouse Categories
      performance: {
        name: 'Performance',
        description: 'Puntuación general de rendimiento',
        unit: 'score',
        good: 90,
        poor: 50,
        category: 'overall'
      },
      accessibility: {
        name: 'Accessibility',
        description: 'Puntuación de accesibilidad',
        unit: 'score',
        good: 90,
        poor: 50,
        category: 'accessibility'
      },
      'best-practices': {
        name: 'Best Practices',
        description: 'Puntuación de mejores prácticas',
        unit: 'score',
        good: 90,
        poor: 50,
        category: 'best-practices'
      },
      seo: {
        name: 'SEO',
        description: 'Puntuación de optimización para motores de búsqueda',
        unit: 'score',
        good: 90,
        poor: 50,
        category: 'seo'
      }
    };

    return definitions[metric] || {
      name: metric.toUpperCase(),
      description: 'Métrica desconocida',
      unit: '',
      good: 0,
      poor: 0,
      category: 'unknown'
    };
  }

  static getSemaphorScore(score, metric = null) {
    // Handle different score types
    if (typeof score === 'number' && score > 1) {
      // Already a percentage (0-100)
      score = score / 100;
    }

    if (metric) {
      const definition = this.getMetricDefinition(metric);
      if (definition.unit === 'ms') {
        // For time-based metrics, lower is better
        if (score <= definition.good) return { label: 'GOOD', color: '#10b981', status: 'green', icon: '🟢' };
        if (score <= definition.poor) return { label: 'NEEDS IMPROVEMENT', color: '#f59e0b', status: 'orange', icon: '🟠' };
        return { label: 'POOR', color: '#ef4444', status: 'red', icon: '🔴' };
      }
    }

    // Default score-based logic (higher is better)
    if (score >= 0.9) return { label: 'GOOD', color: '#10b981', status: 'green', icon: '🟢' };
    if (score >= 0.5) return { label: 'NEEDS IMPROVEMENT', color: '#f59e0b', status: 'orange', icon: '🟠' };
    return { label: 'POOR', color: '#ef4444', status: 'red', icon: '🔴' };
  }

  static formatMetricValue(value, unit, metric = null) {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'N/A';
    }

    switch(unit) {
      case 'ms':
        if (value >= 1000) {
          return `${(value / 1000).toFixed(2)}s`;
        }
        return `${Math.round(value)}ms`;

      case 's':
        return `${value.toFixed(2)}s`;

      case 'score':
        // CLS and other decimal scores
        if (metric === 'cls' || value < 1) {
          return value.toFixed(3);
        }
        // Regular scores (0-100)
        return `${Math.round(value * 100)}`;

      case '':
        return value.toString();

      default:
        return `${value} ${unit}`;
    }
  }

  static getMetricImpact(metric, value) {
    const definition = this.getMetricDefinition(metric);

    let impact = { seo: 0, ux: 0, performance: 0 };

    // SEO Impact
    if (metric === 'lcp' && value > definition.poor) {
      impact.seo = 8; // Major SEO impact
    } else if (metric === 'performance' && value < 0.5) {
      impact.seo = 7; // Significant SEO impact
    } else if (['fcp', 'si', 'tti'].includes(metric) && value > definition.poor) {
      impact.seo = 4; // Moderate SEO impact
    }

    // UX Impact
    if (['lcp', 'fid', 'cls'].includes(metric) && value > definition.poor) {
      impact.ux = 9; // Critical UX impact
    } else if (['fcp', 'si', 'tti'].includes(metric) && value > definition.poor) {
      impact.ux = 6; // High UX impact
    } else if (metric === 'tbt' && value > definition.poor) {
      impact.ux = 7; // High UX impact for blocking time
    }

    // Performance Impact
    if (value > definition.poor) {
      impact.performance = 8; // High performance impact
    } else if (value > definition.good) {
      impact.performance = 4; // Moderate performance impact
    }

    return impact;
  }

  static getMetricCategoryIcon(category) {
    const icons = {
      'core-web-vitals': '🎯',
      'server': '🖥️',
      'paint': '🎨',
      'dom': '🌳',
      'load': '📦',
      'interactivity': '👆',
      'overall': '📊',
      'accessibility': '♿',
      'best-practices': '✨',
      'seo': '🔍',
      'unknown': '❓'
    };

    return icons[category] || icons.unknown;
  }

  static generateMetricSummary(results) {
    const summary = {
      overallScore: 0,
      coreWebVitalsScore: 0,
      categoriesScore: 0,
      criticalIssues: [],
      recommendations: []
    };

    // Calculate overall scores
    if (results.mobile && results.desktop) {
      summary.overallScore = results.summary?.averageScore || 0;
      summary.mobileScore = results.mobile.score;
      summary.desktopScore = results.desktop.score;
    } else {
      summary.overallScore = results.score || 0;
    }

    // Calculate Core Web Vitals score
    const cwvMetrics = ['lcp', 'fid', 'cls'];
    let cwvTotal = 0;
    cwvMetrics.forEach(metric => {
      const value = this.getMetricValue(results, metric);
      const semaphor = this.getSemaphorScore(value, metric);
      cwvTotal += (semaphor.status === 'green' ? 1 : semaphor.status === 'orange' ? 0.5 : 0);
    });
    summary.coreWebVitalsScore = Math.round((cwvTotal / cwvMetrics.length) * 100);

    // Identify critical issues
    if (results.mobile?.coreWebVitals?.lcp?.numericValue > 4000) {
      summary.criticalIssues.push('LCP móvil crítico (> 4s)');
    }
    if (results.mobile?.coreWebVitals?.cls?.numericValue > 0.25) {
      summary.criticalIssues.push('CLS móvil crítico (> 0.25)');
    }
    if (results.mobile?.score < 30) {
      summary.criticalIssues.push('Puntuación móvil crítica (< 30)');
    }

    return summary;
  }

  static getMetricValue(results, metric) {
    // Handle nested results structure
    if (results.mobile && results.desktop) {
      // Use mobile as primary for critical metrics
      const mobileValue = results.mobile.detailedMetrics?.[metric]?.numericValue ||
                         results.mobile.coreWebVitals?.[metric]?.numericValue ||
                         (metric === 'score' ? results.mobile.score : 0);
      return mobileValue;
    }

    // Single result structure
    if (metric === 'score') {
      return results.score || 0;
    }

    if (results.detailedMetrics && results.detailedMetrics[metric]) {
      return results.detailedMetrics[metric].numericValue || 0;
    }

    if (results.coreWebVitals && results.coreWebVitals[metric]) {
      return results.coreWebVitals[metric].numericValue || 0;
    }

    return 0;
  }

  static createComparisonTable(mobileResults, desktopResults) {
    const metrics = [
      { key: 'score', name: 'Performance Score', unit: 'score' },
      { key: 'lcp', name: 'Largest Contentful Paint', unit: 'ms' },
      { key: 'fid', name: 'First Input Delay', unit: 'ms' },
      { key: 'cls', name: 'Cumulative Layout Shift', unit: 'score' },
      { key: 'fcp', name: 'First Contentful Paint', unit: 'ms' },
      { key: 'ttfb', name: 'Time to First Byte', unit: 'ms' },
      { key: 'dcl', name: 'DOMContentLoaded', unit: 'ms' },
      { key: 'tbt', name: 'Total Blocking Time', unit: 'ms' },
      { key: 'si', name: 'Speed Index', unit: 'ms' },
      { key: 'tti', name: 'Time to Interactive', unit: 'ms' }
    ];

    return metrics.map(metric => {
      const mobileValue = this.getMetricValue(mobileResults, metric.key);
      const desktopValue = this.getMetricValue(desktopResults, metric.key);

      const mobileSemaphor = this.getSemaphorScore(mobileValue, metric.key);
      const desktopSemaphor = this.getSemaphorScore(desktopValue, metric.key);

      const difference = this.calculateDifference(mobileValue, desktopValue, metric.unit);

      return {
        metric: metric.name,
        mobile: {
          value: mobileValue,
          display: this.formatMetricValue(mobileValue, metric.unit, metric.key),
          semaphor: mobileSemaphor
        },
        desktop: {
          value: desktopValue,
          display: this.formatMetricValue(desktopValue, metric.unit, metric.key),
          semaphor: desktopSemaphor
        },
        difference,
        key: metric.key
      };
    });
  }

  static calculateDifference(mobileValue, desktopValue, unit) {
    if (typeof mobileValue !== 'number' || typeof desktopValue !== 'number') {
      return { value: 0, display: 'N/A', trend: 'neutral', description: 'No se puede comparar' };
    }

    const difference = mobileValue - desktopValue;

    let trend = 'neutral';
    let description = '';

    if (unit === 'score') {
      // For scores, higher is better
      trend = difference > 5 ? 'mobile-better' : difference < -5 ? 'desktop-better' : 'similar';
      description = difference > 5 ? 'Móvil mejor' : difference < -5 ? 'Desktop mejor' : 'Similar';
    } else {
      // For time-based metrics, lower is better
      trend = difference < -100 ? 'mobile-better' : difference > 100 ? 'desktop-better' : 'similar';
      description = difference < -100 ? 'Móvil más rápido' : difference > 100 ? 'Desktop más rápido' : 'Similar';
    }

    return {
      value: difference,
      display: unit === 'score' ? `${difference > 0 ? '+' : ''}${difference}` : `${difference > 0 ? '+' : ''}${difference}${unit === 'ms' ? 'ms' : ''}`,
      trend,
      description
    };
  }

  static generateActionableRecommendations(results, comparison) {
    const recommendations = [];

    // Analyze mobile performance first (most critical)
    const mobileLCP = results.mobile?.coreWebVitals?.lcp?.numericValue || 0;
    const mobileCLS = results.mobile?.coreWebVitals?.cls?.numericValue || 0;
    const mobileScore = results.mobile?.score || 0;

    // Critical LCP issues
    if (mobileLCP > 4000) {
      recommendations.push({
        priority: 'CRÍTICO',
        severity: '🔴',
        category: 'Core Web Vitals',
        issue: `LCP móvil crítico: ${this.formatMetricValue(mobileLCP, 'ms', 'lcp')} (debe ser < 2.5s)`,
        impact: 'Afecta directamente el ranking SEO y experiencia de usuario',
        specificActions: [
          'Optimizar imagen más grande por encima del fold (convertir a WebP, comprimir)',
          'Eliminar JavaScript bloqueante del <head>',
          'Implementar lazy loading agresivo',
          'Optimizar servidor response time (< 600ms)',
          'Usar CDN para assets estáticos'
        ],
        expectedImprovement: 'Reducción de 2-4 segundos en LCP',
        effort: '2-3 semanas',
        businessImpact: '$3,000-$8,000 adicionales en revenue mensual'
      });
    }

    // Critical CLS issues
    if (mobileCLS > 0.25) {
      recommendations.push({
        priority: 'CRÍTICO',
        severity: '🔴',
        category: 'Core Web Vitals',
        issue: `CLS móvil crítico: ${this.formatMetricValue(mobileCLS, 'score', 'cls')} (debe ser < 0.1)`,
        impact: 'Causa movimientos de layout que frustran a los usuarios',
        specificActions: [
          'Definir width y height en TODAS las imágenes',
          'Reservar espacio para contenido dinámico (anuncios, embeds)',
          'Evitar inserción de contenido por encima del fold',
          'Usar transform: scale() en lugar de cambiar dimensiones',
          'Optimizar fuentes con font-display: swap'
        ],
        expectedImprovement: 'Reducción de CLS a < 0.1',
        effort: '1 semana',
        businessImpact: '20-30% mejora en engagement y reducción de bounce rate'
      });
    }

    // Mobile vs Desktop performance gap
    if (comparison?.score?.difference?.value < -20) {
      recommendations.push({
        priority: 'IMPORTANTE',
        severity: '🟠',
        category: 'Mobile Optimization',
        issue: `Desktop ${comparison.score.difference.display} puntos mejor que móvil`,
        impact: 'La mayoría de usuarios móviles tienen peor experiencia',
        specificActions: [
          'Implementar mobile-first responsive design',
          'Optimizar imágenes específicamente para móviles',
          'Reducir JavaScript para conexiones lentas',
          'Implementar progressive loading',
          'Optimizar touch targets (> 44px)'
        ],
        expectedImprovement: 'Cerrar brecha de performance móvil vs desktop',
        effort: '2 semanas',
        businessImpact: '15-25% mejora en conversión móvil'
      });
    }

    // Low overall scores
    if (mobileScore < 50) {
      recommendations.push({
        priority: 'IMPORTANTE',
        severity: '🟠',
        category: 'Performance General',
        issue: `Puntuación móvil baja: ${mobileScore}/100 (debe ser > 90)`,
        impact: 'Afecta SEO, conversión y experiencia de usuario',
        specificActions: [
          'Implementar compresión gzip/brotli en servidor',
          'Optimizar y minificar CSS/JavaScript',
          'Eliminar recursos no utilizados',
          'Implementar caching agresivo',
          'Optimizar Core Web Vitals críticas'
        ],
        expectedImprovement: 'Mejora de 30-50 puntos en puntuación general',
        effort: '3-4 semanas',
        businessImpact: '$2,000-$5,000 adicionales en revenue mensual'
      });
    }

    // Server response time issues
    const ttfb = results.mobile?.detailedMetrics?.ttfb?.numericValue || 0;
    if (ttfb > 1800) {
      recommendations.push({
        priority: 'MENOR',
        severity: '🟡',
        category: 'Server Optimization',
        issue: `TTFB alto: ${this.formatMetricValue(ttfb, 'ms', 'ttfb')} (debe ser < 800ms)`,
        impact: 'Afecta la percepción de velocidad inicial',
        specificActions: [
          'Implementar Redis/memcached para caching',
          'Optimizar consultas de base de datos',
          'Usar CDN global',
          'Implementar HTTP/2 o HTTP/3',
          'Optimizar configuración del servidor web'
        ],
        expectedImprovement: 'Reducción de TTFB a < 600ms',
        effort: '1-2 semanas',
        businessImpact: '5-10% mejora en engagement inicial'
      });
    }

    return recommendations;
  }

  static calculateScopeAnalysis(results) {
    // Estimate total pages based on links found
    const linksFound = results.links?.total || 0;
    const estimatedTotalPages = Math.max(10, Math.min(linksFound * 0.1, 500)); // Conservative estimate

    const scope = {
      pagesAnalyzed: 1, // Currently only homepage
      totalEstimatedPages: estimatedTotalPages,
      linksSample: results.links?.checked || 0,
      linksTotal: linksFound,
      coveragePercentage: Math.round((1 / estimatedTotalPages) * 100),
      analysisType: 'homepage-focused',
      limitations: [
        'Solo se analizó la página principal',
        'Muestra limitada de enlaces internos',
        'No incluye páginas de producto/categoría'
      ]
    };

    return {
      description: `Análisis de homepage + muestra de ${scope.linksSample}/${scope.linksTotal} enlaces (${scope.coveragePercentage}% cobertura estimada del sitio)`,
      details: scope,
      recommendation: scope.coveragePercentage < 20 ?
        'Considerar análisis más amplio del sitio' :
        'Cobertura adecuada para evaluación inicial'
    };
  }
}

export default MetricsHelper;
