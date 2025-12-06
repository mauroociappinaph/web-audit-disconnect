export class SiteSEOAnalyzer {
  constructor() {
    this.minTitleLength = 30;
    this.maxTitleLength = 60;
    this.minMetaLength = 120;
    this.maxMetaLength = 160;
  }

  async analyzeSiteSEO(siteData) {
    const pageAnalyses = siteData.pageAnalyses || [];
    const siteDiscovery = siteData.siteDiscovery || {};

    const seoAnalysis = {
      titleAnalysis: this.analyzeTitles(pageAnalyses),
      metaDescriptionAnalysis: this.analyzeMetaDescriptions(pageAnalyses),
      headingStructureAnalysis: this.analyzeHeadingStructure(pageAnalyses),
      urlStructureAnalysis: this.analyzeUrlStructure(pageAnalyses),
      internalLinkingAnalysis: this.analyzeInternalLinking(pageAnalyses),
      overallScore: 0,
      recommendations: []
    };

    // Calcular puntuación general
    seoAnalysis.overallScore = this.calculateOverallSEO(seoAnalysis);

    // Generar recomendaciones
    seoAnalysis.recommendations = this.generateSEORecommendations(seoAnalysis);

    return seoAnalysis;
  }

  analyzeTitles(pageAnalyses) {
    const titles = pageAnalyses
      .filter(p => p.seo?.title && p.seo.title !== 'No encontrado')
      .map(p => p.seo.title);

    if (titles.length === 0) {
      return {
        count: 0,
        uniqueCount: 0,
        averageLength: 0,
        optimalLength: 0,
        duplicates: 0,
        score: 0,
        issues: ['No se encontraron títulos en ninguna página']
      };
    }

    const uniqueTitles = [...new Set(titles)];
    const lengths = titles.map(t => t.length);
    const averageLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const optimalLength = lengths.filter(l => l >= this.minTitleLength && l <= this.maxTitleLength).length;
    const duplicates = titles.length - uniqueTitles.length;

    let score = 100;
    if (duplicates > 0) score -= duplicates * 10;
    if (averageLength < this.minTitleLength) score -= 20;
    if (averageLength > this.maxTitleLength) score -= 15;
    if (optimalLength / titles.length < 0.7) score -= 10;

    const issues = [];
    if (duplicates > 0) issues.push(`${duplicates} títulos duplicados`);
    if (averageLength < this.minTitleLength) issues.push(`Títulos muy cortos (promedio ${averageLength.toFixed(0)} caracteres)`);
    if (averageLength > this.maxTitleLength) issues.push(`Títulos muy largos (promedio ${averageLength.toFixed(0)} caracteres)`);

    return {
      count: titles.length,
      uniqueCount: uniqueTitles.length,
      averageLength: Math.round(averageLength),
      optimalLength: optimalLength,
      duplicates: duplicates,
      score: Math.max(0, score),
      issues: issues
    };
  }

  analyzeMetaDescriptions(pageAnalyses) {
    const metaDescs = pageAnalyses
      .filter(p => p.seo?.metaDescription && p.seo.metaDescription !== 'No encontrado')
      .map(p => p.seo.metaDescription);

    if (metaDescs.length === 0) {
      return {
        count: 0,
        uniqueCount: 0,
        averageLength: 0,
        optimalLength: 0,
        duplicates: 0,
        score: 0,
        issues: ['No se encontraron meta descriptions en ninguna página']
      };
    }

    const uniqueMetaDescs = [...new Set(metaDescs)];
    const lengths = metaDescs.map(m => m.length);
    const averageLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const optimalLength = lengths.filter(l => l >= this.minMetaLength && l <= this.maxMetaLength).length;
    const duplicates = metaDescs.length - uniqueMetaDescs.length;

    let score = 100;
    if (duplicates > 0) score -= duplicates * 15;
    if (averageLength < this.minMetaLength) score -= 25;
    if (averageLength > this.maxMetaLength) score -= 20;
    if (optimalLength / metaDescs.length < 0.6) score -= 15;

    const issues = [];
    if (duplicates > 0) issues.push(`${duplicates} meta descriptions duplicadas`);
    if (averageLength < this.minMetaLength) issues.push(`Meta descriptions muy cortas (promedio ${averageLength.toFixed(0)} caracteres)`);
    if (averageLength > this.maxMetaLength) issues.push(`Meta descriptions muy largas (promedio ${averageLength.toFixed(0)} caracteres)`);
    if (metaDescs.length < pageAnalyses.length * 0.8) issues.push('Muchas páginas sin meta description');

    return {
      count: metaDescs.length,
      uniqueCount: uniqueMetaDescs.length,
      averageLength: Math.round(averageLength),
      optimalLength: optimalLength,
      duplicates: duplicates,
      score: Math.max(0, score),
      issues: issues
    };
  }

  analyzeHeadingStructure(pageAnalyses) {
    const pagesWithHeadings = pageAnalyses.filter(p => p.seo?.headings);

    if (pagesWithHeadings.length === 0) {
      return {
        totalPages: pageAnalyses.length,
        pagesWithH1: 0,
        pagesWithMultipleH1: 0,
        averageH1Count: 0,
        score: 0,
        issues: ['No se pudo analizar la estructura de headings']
      };
    }

    const pagesWithH1 = pagesWithHeadings.filter(p => p.seo.headings.h1 > 0).length;
    const pagesWithMultipleH1 = pagesWithHeadings.filter(p => p.seo.headings.h1 > 1).length;
    const averageH1Count = pagesWithHeadings.reduce((sum, p) => sum + p.seo.headings.h1, 0) / pagesWithHeadings.length;

    let score = 100;
    if (pagesWithH1 / pagesWithHeadings.length < 0.9) score -= 30; // Menos del 90% tienen H1
    if (pagesWithMultipleH1 > 0) score -= pagesWithMultipleH1 * 10; // Penalización por múltiples H1
    if (averageH1Count > 1.5) score -= 15; // Demasiados H1 promedio

    const issues = [];
    if (pagesWithH1 / pagesWithHeadings.length < 0.9) {
      issues.push(`Solo ${Math.round(pagesWithH1 / pagesWithHeadings.length * 100)}% de páginas tienen H1`);
    }
    if (pagesWithMultipleH1 > 0) {
      issues.push(`${pagesWithMultipleH1} páginas tienen múltiples H1`);
    }

    return {
      totalPages: pagesWithHeadings.length,
      pagesWithH1: pagesWithH1,
      pagesWithMultipleH1: pagesWithMultipleH1,
      averageH1Count: averageH1Count.toFixed(1),
      score: Math.max(0, score),
      issues: issues
    };
  }

  analyzeUrlStructure(pageAnalyses) {
    const urls = pageAnalyses.map(p => p.url);

    if (urls.length === 0) {
      return {
        totalUrls: 0,
        seoFriendly: 0,
        withKeywords: 0,
        tooLong: 0,
        withUnderscores: 0,
        score: 0,
        issues: ['No se pudieron analizar URLs']
      };
    }

    const seoFriendly = urls.filter(url => this.isSEOUrl(url)).length;
    const withKeywords = urls.filter(url => this.hasKeywords(url)).length;
    const tooLong = urls.filter(url => this.isTooLong(url)).length;
    const withUnderscores = urls.filter(url => url.includes('_')).length;

    let score = 100;
    if (seoFriendly / urls.length < 0.8) score -= 20;
    if (tooLong > 0) score -= tooLong * 5;
    if (withUnderscores > 0) score -= withUnderscores * 3;

    const issues = [];
    if (seoFriendly / urls.length < 0.8) {
      issues.push(`Solo ${Math.round(seoFriendly / urls.length * 100)}% de URLs son SEO-friendly`);
    }
    if (tooLong > 0) {
      issues.push(`${tooLong} URLs demasiado largas`);
    }
    if (withUnderscores > 0) {
      issues.push(`${withUnderscores} URLs usan underscores en lugar de guiones`);
    }

    return {
      totalUrls: urls.length,
      seoFriendly: seoFriendly,
      withKeywords: withKeywords,
      tooLong: tooLong,
      withUnderscores: withUnderscores,
      score: Math.max(0, score),
      issues: issues
    };
  }

  analyzeInternalLinking(pageAnalyses) {
    const totalLinks = pageAnalyses.reduce((sum, p) => sum + (p.links?.total || 0), 0);
    const brokenLinks = pageAnalyses.reduce((sum, p) => sum + (p.links?.broken || 0), 0);

    let score = 100;
    if (brokenLinks > 0) score -= brokenLinks * 5;
    if (totalLinks === 0) score = 0;

    const issues = [];
    if (brokenLinks > 0) {
      issues.push(`${brokenLinks} enlaces internos rotos encontrados`);
    }
    if (totalLinks === 0) {
      issues.push('No se encontraron enlaces internos para analizar');
    }

    return {
      totalLinks: totalLinks,
      brokenLinks: brokenLinks,
      healthyLinks: totalLinks - brokenLinks,
      score: Math.max(0, score),
      issues: issues
    };
  }

  calculateOverallSEO(seoAnalysis) {
    const weights = {
      titleAnalysis: 0.25,
      metaDescriptionAnalysis: 0.25,
      headingStructureAnalysis: 0.20,
      urlStructureAnalysis: 0.15,
      internalLinkingAnalysis: 0.15
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      if (seoAnalysis[key] && typeof seoAnalysis[key].score === 'number') {
        totalScore += seoAnalysis[key].score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  generateSEORecommendations(seoAnalysis) {
    const recommendations = [];

    // Title recommendations
    if (seoAnalysis.titleAnalysis?.score < 80) {
      if (seoAnalysis.titleAnalysis.duplicates > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'SEO - Titles',
          issue: `${seoAnalysis.titleAnalysis.duplicates} títulos duplicados encontrados`,
          action: 'Crear títulos únicos y descriptivos para cada página (30-60 caracteres)',
          impact: 'Mejora ranking SEO y CTR en resultados de búsqueda'
        });
      }
      if (seoAnalysis.titleAnalysis.averageLength < this.minTitleLength) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'SEO - Titles',
          issue: `Títulos muy cortos (promedio ${seoAnalysis.titleAnalysis.averageLength} caracteres)`,
          action: 'Expandir títulos para incluir más palabras clave relevantes',
          impact: 'Mejor comprensión del contenido por parte de motores de búsqueda'
        });
      }
    }

    // Meta description recommendations
    if (seoAnalysis.metaDescriptionAnalysis?.score < 70) {
      if (seoAnalysis.metaDescriptionAnalysis.duplicates > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'SEO - Meta Descriptions',
          issue: `${seoAnalysis.metaDescriptionAnalysis.duplicates} meta descriptions duplicadas`,
          action: 'Crear meta descriptions únicas y atractivas para cada página (120-160 caracteres)',
          impact: 'Mejor CTR en resultados de búsqueda y experiencia de usuario'
        });
      }
      if (seoAnalysis.metaDescriptionAnalysis.averageLength < this.minMetaLength) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'SEO - Meta Descriptions',
          issue: `Meta descriptions muy cortas (promedio ${seoAnalysis.metaDescriptionAnalysis.averageLength} caracteres)`,
          action: 'Expandir meta descriptions para incluir llamadas a acción y beneficios',
          impact: 'Mayor engagement en resultados de búsqueda'
        });
      }
    }

    // Heading structure recommendations
    if (seoAnalysis.headingStructureAnalysis?.score < 80) {
      if (seoAnalysis.headingStructureAnalysis.pagesWithH1 / seoAnalysis.headingStructureAnalysis.totalPages < 0.9) {
        recommendations.push({
          priority: 'CRITICAL',
          category: 'SEO - Headings',
          issue: 'Páginas sin H1 o con múltiples H1',
          action: 'Asegurar que cada página tenga exactamente un H1 descriptivo',
          impact: 'Estructura semántica correcta y mejor indexación SEO'
        });
      }
    }

    // URL structure recommendations
    if (seoAnalysis.urlStructureAnalysis?.score < 80) {
      if (seoAnalysis.urlStructureAnalysis.withUnderscores > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'SEO - URLs',
          issue: `${seoAnalysis.urlStructureAnalysis.withUnderscores} URLs usan underscores`,
          action: 'Reemplazar underscores con guiones en URLs para mejor SEO',
          impact: 'Mejor legibilidad de URLs para motores de búsqueda'
        });
      }
      if (seoAnalysis.urlStructureAnalysis.tooLong > 0) {
        recommendations.push({
          priority: 'LOW',
          category: 'SEO - URLs',
          issue: `${seoAnalysis.urlStructureAnalysis.tooLong} URLs demasiado largas`,
          action: 'Acortar URLs manteniendo palabras clave importantes',
          impact: 'Mejor usabilidad y compartibilidad'
        });
      }
    }

    // Internal linking recommendations
    if (seoAnalysis.internalLinkingAnalysis?.score < 80) {
      if (seoAnalysis.internalLinkingAnalysis.brokenLinks > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'SEO - Internal Linking',
          issue: `${seoAnalysis.internalLinkingAnalysis.brokenLinks} enlaces internos rotos`,
          action: 'Reparar o redirigir enlaces internos rotos',
          impact: 'Mejor distribución de PageRank y navegación del sitio'
        });
      }
    }

    return recommendations;
  }

  isSEOUrl(url) {
    // URLs SEO-friendly: usan guiones, no underscores, no demasiado largas
    const path = url.split('?')[0].split('#')[0];
    return path.length < 100 && !path.includes('_') && path.includes('-');
  }

  hasKeywords(url) {
    // URLs con palabras clave relevantes
    const path = url.toLowerCase();
    const keywords = ['product', 'service', 'about', 'contact', 'blog', 'news'];
    return keywords.some(keyword => path.includes(keyword));
  }

  isTooLong(url) {
    // URLs demasiado largas (> 100 caracteres)
    return url.length > 100;
  }
}

export default SiteSEOAnalyzer;
