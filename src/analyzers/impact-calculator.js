export class ImpactCalculator {
  constructor() {
    // Factores de mejora basados en estudios reales de Google y otras fuentes
    this.factors = {
      imageOptimization: {
        lazyLoadingPerImage: 0.08, // 8% mejora por imagen con lazy loading
        webpConversion: 0.25, // 25% reducción de tamaño con WebP
        responsiveImages: 0.15, // 15% mejora con imágenes responsive
        compression: 0.20 // 20% mejora con compresión óptima
      },
      serverCaching: {
        staticAssets: 0.60, // 60% reducción TTFB para assets estáticos
        htmlCaching: 0.80, // 80% reducción para HTML con cache agresivo
        apiResponses: 0.40, // 40% reducción para respuestas de API
        databaseQueries: 0.30 // 30% reducción con cache de DB
      },
      scriptOptimization: {
        deferPerScript: 2.5, // 2.5 puntos de score por script defer
        asyncPerScript: 1.8, // 1.8 puntos por script async
        codeSplitting: 8, // 8 puntos por implementar code splitting
        minification: 3, // 3 puntos por minificación
        unusedCodeRemoval: 5 // 5 puntos por eliminar código no usado
      },
      cssOptimization: {
        unusedCss: 4, // 4 puntos por eliminar CSS no usado
        criticalCss: 6, // 6 puntos por CSS crítico
        fontLoading: 3, // 3 puntos por optimizar carga de fuentes
        renderBlocking: 5 // 5 puntos por eliminar CSS bloqueante
      }
    };
  }

  calculateImageOptimizationImpact(pageData, psiData = null) {
    const impact = {
      lazyLoading: this.calculateLazyLoadingImpact(pageData),
      webpConversion: this.calculateWebPImpact(pageData),
      responsiveImages: this.calculateResponsiveImageImpact(pageData),
      compression: this.calculateCompressionImpact(pageData),
      total: {
        speedImprovement: 0,
        sizeReduction: 0,
        scoreImprovement: 0
      }
    };

    // Calcular totales
    impact.total.speedImprovement = impact.lazyLoading.speedImprovement +
                                   impact.webpConversion.speedImprovement +
                                   impact.responsiveImages.speedImprovement +
                                   impact.compression.speedImprovement;

    impact.total.sizeReduction = impact.webpConversion.sizeReduction +
                                impact.compression.sizeReduction;

    impact.total.scoreImprovement = Math.round(impact.total.speedImprovement * 25); // ~25 puntos por cada 1% de mejora

    return {
      speedImprovement: `+${impact.total.speedImprovement.toFixed(1)}% Speed`,
      sizeReduction: `-${impact.total.sizeReduction.toFixed(0)}% Size`,
      scoreImprovement: `+${impact.total.scoreImprovement} Score`,
      breakdown: impact
    };
  }

  calculateLazyLoadingImpact(pageData) {
    const imageCount = pageData.performance?.imageCount || 0;
    const hasLazyLoading = this.checkLazyLoadingImplemented(pageData);

    if (hasLazyLoading || imageCount < 5) {
      return { speedImprovement: 0, implemented: true };
    }

    // Estimar imágenes que se benefician del lazy loading (imágenes below the fold)
    const lazyBeneficialImages = Math.max(1, Math.floor(imageCount * 0.7)); // 70% below the fold
    const speedImprovement = lazyBeneficialImages * this.factors.imageOptimization.lazyLoadingPerImage;

    return {
      speedImprovement: Math.min(speedImprovement, 0.25), // Máximo 25% mejora
      implemented: false,
      potentialImages: lazyBeneficialImages
    };
  }

  calculateWebPImpact(pageData) {
    const imageCount = pageData.performance?.imageCount || 0;
    const hasWebP = this.checkWebPSupport(pageData);

    if (hasWebP || imageCount === 0) {
      return { speedImprovement: 0, sizeReduction: 0, implemented: true };
    }

    const sizeReduction = this.factors.imageOptimization.webpConversion;
    const avgImageSizeKB = 150; // Estimación conservadora
    const totalImageSizeKB = imageCount * avgImageSizeKB;
    const sizeSavedKB = totalImageSizeKB * sizeReduction;

    // La mejora de velocidad depende del tamaño total de imágenes
    const speedImprovement = Math.min(sizeReduction * 0.8, 0.20); // Máximo 20% mejora

    return {
      speedImprovement,
      sizeReduction: sizeReduction * 100,
      sizeSavedKB: Math.round(sizeSavedKB),
      implemented: false
    };
  }

  calculateResponsiveImageImpact(pageData) {
    const imageCount = pageData.performance?.imageCount || 0;
    const hasResponsiveImages = this.checkResponsiveImages(pageData);

    if (hasResponsiveImages || imageCount === 0) {
      return { speedImprovement: 0, implemented: true };
    }

    // Estimar mejora para dispositivos móviles
    const speedImprovement = this.factors.imageOptimization.responsiveImages;

    return {
      speedImprovement,
      implemented: false
    };
  }

  calculateCompressionImpact(pageData) {
    const imageCount = pageData.performance?.imageCount || 0;
    const hasGoodCompression = this.checkImageCompression(pageData);

    if (hasGoodCompression || imageCount === 0) {
      return { speedImprovement: 0, sizeReduction: 0, implemented: true };
    }

    const sizeReduction = this.factors.imageOptimization.compression;
    const speedImprovement = sizeReduction * 0.6; // 60% de la reducción de tamaño = mejora de velocidad

    return {
      speedImprovement,
      sizeReduction: sizeReduction * 100,
      implemented: false
    };
  }

  calculateServerCachingImpact(pageData, psiData = null) {
    const impact = {
      staticAssets: this.calculateStaticAssetCaching(pageData),
      htmlCaching: this.calculateHTMLCaching(pageData),
      apiCaching: this.calculateAPICaching(pageData),
      total: {
        ttfbReduction: 0,
        scoreImprovement: 0
      }
    };

    // Calcular totales
    impact.total.ttfbReduction = impact.staticAssets.ttfbReduction +
                                impact.htmlCaching.ttfbReduction +
                                impact.apiCaching.ttfbReduction;

    impact.total.scoreImprovement = Math.round(impact.total.ttfbReduction / 100); // ~1 punto por cada 100ms

    return {
      ttfbReduction: `-${Math.round(impact.total.ttfbReduction)}ms TTFB`,
      scoreImprovement: `+${impact.total.scoreImprovement} Score`,
      breakdown: impact
    };
  }

  calculateStaticAssetCaching(pageData) {
    const hasStaticCaching = this.checkStaticAssetCaching(pageData);
    const currentTTFB = this.getCurrentTTFB(pageData);

    if (hasStaticCaching || currentTTFB === 0) {
      return { ttfbReduction: 0, implemented: true };
    }

    // Estimar reducción para assets estáticos (CSS, JS, imágenes)
    const ttfbReduction = currentTTFB * this.factors.serverCaching.staticAssets;

    return {
      ttfbReduction: Math.min(ttfbReduction, 600), // Máximo 600ms reducción
      implemented: false
    };
  }

  calculateHTMLCaching(pageData) {
    const hasHTMLCaching = this.checkHTMLCaching(pageData);
    const currentTTFB = this.getCurrentTTFB(pageData);

    if (hasHTMLCaching || currentTTFB === 0) {
      return { ttfbReduction: 0, implemented: true };
    }

    // Estimar reducción para HTML (más agresivo)
    const ttfbReduction = currentTTFB * this.factors.serverCaching.htmlCaching;

    return {
      ttfbReduction: Math.min(ttfbReduction, 800), // Máximo 800ms reducción
      implemented: false
    };
  }

  calculateAPICaching(pageData) {
    const hasAPICaching = this.checkAPICaching(pageData);
    const currentTTFB = this.getCurrentTTFB(pageData);

    if (hasAPICaching || currentTTFB === 0) {
      return { ttfbReduction: 0, implemented: true };
    }

    // Estimar reducción para respuestas de API
    const ttfbReduction = currentTTFB * this.factors.serverCaching.apiCaching;

    return {
      ttfbReduction: Math.min(ttfbReduction, 300), // Máximo 300ms reducción
      implemented: false
    };
  }

  calculateScriptOptimizationImpact(pageData, psiData = null) {
    const impact = {
      deferScripts: this.calculateDeferScriptsImpact(pageData),
      asyncScripts: this.calculateAsyncScriptsImpact(pageData),
      codeSplitting: this.calculateCodeSplittingImpact(pageData),
      minification: this.calculateMinificationImpact(pageData),
      unusedCode: this.calculateUnusedCodeImpact(pageData),
      total: {
        scoreImprovement: 0,
        speedImprovement: 0
      }
    };

    // Calcular totales
    impact.total.scoreImprovement = impact.deferScripts.scoreImprovement +
                                   impact.asyncScripts.scoreImprovement +
                                   impact.codeSplitting.scoreImprovement +
                                   impact.minification.scoreImprovement +
                                   impact.unusedCode.scoreImprovement;

    impact.total.speedImprovement = impact.total.scoreImprovement * 0.04; // ~4% velocidad por punto de score

    return {
      scoreImprovement: `+${impact.total.scoreImprovement} Score`,
      speedImprovement: `+${impact.total.speedImprovement.toFixed(1)}% Speed`,
      breakdown: impact
    };
  }

  calculateDeferScriptsImpact(pageData) {
    const blockingScripts = this.countBlockingScripts(pageData);
    const hasDeferImplementation = this.checkDeferImplementation(pageData);

    if (hasDeferImplementation || blockingScripts === 0) {
      return { scoreImprovement: 0, implemented: true };
    }

    const scoreImprovement = Math.min(blockingScripts * this.factors.scriptOptimization.deferPerScript, 15);

    return {
      scoreImprovement: Math.round(scoreImprovement),
      blockingScripts,
      implemented: false
    };
  }

  calculateAsyncScriptsImpact(pageData) {
    const renderBlockingScripts = this.countRenderBlockingScripts(pageData);
    const hasAsyncImplementation = this.checkAsyncImplementation(pageData);

    if (hasAsyncImplementation || renderBlockingScripts === 0) {
      return { scoreImprovement: 0, implemented: true };
    }

    const scoreImprovement = Math.min(renderBlockingScripts * this.factors.scriptOptimization.asyncPerScript, 12);

    return {
      scoreImprovement: Math.round(scoreImprovement),
      renderBlockingScripts,
      implemented: false
    };
  }

  calculateCodeSplittingImpact(pageData) {
    const hasCodeSplitting = this.checkCodeSplitting(pageData);
    const scriptCount = this.countScripts(pageData);

    if (hasCodeSplitting || scriptCount < 3) {
      return { scoreImprovement: 0, implemented: true };
    }

    // Beneficio si hay muchos scripts
    const scoreImprovement = scriptCount > 5 ? this.factors.scriptOptimization.codeSplitting : 0;

    return {
      scoreImprovement,
      scriptCount,
      implemented: false
    };
  }

  calculateMinificationImpact(pageData) {
    const hasMinification = this.checkMinification(pageData);

    if (hasMinification) {
      return { scoreImprovement: 0, implemented: true };
    }

    return {
      scoreImprovement: this.factors.scriptOptimization.minification,
      implemented: false
    };
  }

  calculateUnusedCodeImpact(pageData) {
    const hasUnusedCodeRemoval = this.checkUnusedCodeRemoval(pageData);
    const scriptSize = this.estimateScriptSize(pageData);

    if (hasUnusedCodeRemoval || scriptSize < 500) { // Menos de 500KB
      return { scoreImprovement: 0, implemented: true };
    }

    // Beneficio si hay mucho código
    const scoreImprovement = scriptSize > 1000 ? this.factors.scriptOptimization.unusedCodeRemoval : 3;

    return {
      scoreImprovement,
      scriptSizeKB: scriptSize,
      implemented: false
    };
  }

  // Helper methods para verificar implementaciones
  checkLazyLoadingImplemented(pageData) {
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const lazyImages = $('img[loading="lazy"]').length;
    const totalImages = $('img').length;
    return lazyImages > 0 && (lazyImages / totalImages) > 0.5;
  }

  checkWebPSupport(pageData) {
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const webpSources = $('picture source[type="image/webp"]').length;
    const webpImages = $('img[src$=".webp"]').length;
    return webpSources > 0 || webpImages > 0;
  }

  checkResponsiveImages(pageData) {
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const responsiveImages = $('img[srcset], img[sizes]').length;
    const totalImages = $('img').length;
    return responsiveImages > 0 && (responsiveImages / totalImages) > 0.5;
  }

  checkImageCompression(pageData) {
    // Estimación basada en tamaño promedio de imágenes
    const avgImageSize = this.estimateAvgImageSize(pageData);
    return avgImageSize < 100; // Menos de 100KB promedio = bien comprimido
  }

  checkStaticAssetCaching(pageData) {
    const headers = pageData.responseHeaders || {};
    const cacheControl = headers['cache-control'] || '';
    return cacheControl.includes('max-age') && !cacheControl.includes('no-cache');
  }

  checkHTMLCaching(pageData) {
    const headers = pageData.responseHeaders || {};
    const cacheControl = headers['cache-control'] || '';
    return cacheControl.includes('max-age=') || cacheControl.includes('public');
  }

  checkAPICaching(pageData) {
    // Esto sería más complejo - por ahora asumimos básico
    return false; // Requiere análisis más detallado
  }

  checkDeferImplementation(pageData) {
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const deferredScripts = $('script[defer]').length;
    const totalScripts = $('script').length;
    return deferredScripts > 0 && (deferredScripts / totalScripts) > 0.5;
  }

  checkAsyncImplementation(pageData) {
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const asyncScripts = $('script[async]').length;
    const renderBlockingScripts = $('script:not([defer]):not([async])').length;
    return asyncScripts > 0 && renderBlockingScripts < 2;
  }

  checkCodeSplitting(pageData) {
    // Difícil de detectar sin análisis detallado - estimación
    const scriptCount = this.countScripts(pageData);
    return scriptCount > 8; // Si hay muchos scripts, probablemente hay code splitting
  }

  checkMinification(pageData) {
    // Estimación basada en nombres de archivos
    if (!pageData.pageHTML) return false;
    const $ = require('cheerio').load(pageData.pageHTML);
    const minifiedScripts = $('script[src*="min"], script[src*=".min"]').length;
    const totalScripts = $('script[src]').length;
    return totalScripts > 0 && (minifiedScripts / totalScripts) > 0.5;
  }

  checkUnusedCodeRemoval(pageData) {
    // Difícil de detectar - estimación conservadora
    const scriptSize = this.estimateScriptSize(pageData);
    return scriptSize < 800; // Si no es muy grande, probablemente está optimizado
  }

  // Helper methods para obtener datos
  getCurrentTTFB(pageData) {
    return pageData.pagespeedInsights?.mobile?.detailedMetrics?.ttfb?.numericValue ||
           pageData.pagespeedInsights?.desktop?.detailedMetrics?.ttfb?.numericValue ||
           pageData.performance?.responseTime || 0;
  }

  countBlockingScripts(pageData) {
    if (!pageData.pageHTML) return 0;
    const $ = require('cheerio').load(pageData.pageHTML);
    return $('script:not([defer]):not([async])').length;
  }

  countRenderBlockingScripts(pageData) {
    if (!pageData.pageHTML) return 0;
    const $ = require('cheerio').load(pageData.pageHTML);
    return $('script:not([defer]):not([async])').length;
  }

  countScripts(pageData) {
    if (!pageData.pageHTML) return 0;
    const $ = require('cheerio').load(pageData.pageHTML);
    return $('script').length;
  }

  estimateAvgImageSize(pageData) {
    // Estimación basada en número de imágenes
    const imageCount = pageData.performance?.imageCount || 0;
    if (imageCount === 0) return 0;

    // Estimación conservadora: 100KB promedio por imagen
    return 100;
  }

  estimateScriptSize(pageData) {
    // Estimación basada en número de scripts
    const scriptCount = this.countScripts(pageData);
    return scriptCount * 50; // 50KB promedio por script
  }

  // Método principal para calcular todos los impactos
  calculateAllImpacts(pageData, psiData = null) {
    return {
      imageOptimization: this.calculateImageOptimizationImpact(pageData, psiData),
      serverCaching: this.calculateServerCachingImpact(pageData, psiData),
      scriptOptimization: this.calculateScriptOptimizationImpact(pageData, psiData)
    };
  }

  // ===== NUEVA FUNCIONALIDAD: ANÁLISIS COMPLETO DE SERVIDOR =====

  analyzeServerConfiguration(pageData) {
    const headers = pageData.responseHeaders || {};
    const server = this.detectServerType(headers);
    const cacheAnalysis = this.analyzeCacheHeaders(headers);
    const compressionAnalysis = this.analyzeCompression(headers);
    const securityHeadersAnalysis = this.analyzeSecurityHeaders(headers);

    return {
      serverType: server,
      cacheHeaders: cacheAnalysis,
      compression: compressionAnalysis,
      securityHeaders: securityHeadersAnalysis,
      overallScore: this.calculateServerScore(cacheAnalysis, compressionAnalysis, securityHeadersAnalysis),
      recommendations: this.generateServerRecommendations(cacheAnalysis, compressionAnalysis, securityHeadersAnalysis)
    };
  }

  detectServerType(headers) {
    const serverHeader = headers['server'] || '';

    if (serverHeader.toLowerCase().includes('nginx')) {
      return { type: 'nginx', version: this.extractVersion(serverHeader), confidence: 'high' };
    }
    if (serverHeader.toLowerCase().includes('apache')) {
      return { type: 'apache', version: this.extractVersion(serverHeader), confidence: 'high' };
    }
    if (serverHeader.toLowerCase().includes('iis')) {
      return { type: 'iis', version: this.extractVersion(serverHeader), confidence: 'high' };
    }
    if (serverHeader.toLowerCase().includes('cloudflare')) {
      return { type: 'cloudflare', version: null, confidence: 'high' };
    }
    if (serverHeader.toLowerCase().includes('litespeed')) {
      return { type: 'litespeed', version: this.extractVersion(serverHeader), confidence: 'high' };
    }

    return { type: 'unknown', version: null, confidence: 'low' };
  }

  extractVersion(serverHeader) {
    const versionMatch = serverHeader.match(/(\d+\.\d+(?:\.\d+)?)/);
    return versionMatch ? versionMatch[1] : null;
  }

  analyzeCacheHeaders(headers) {
    const cacheControl = headers['cache-control'] || '';
    const expires = headers['expires'] || '';
    const etag = headers['etag'] || '';
    const lastModified = headers['last-modified'] || '';
    const age = headers['age'] || '';

    const analysis = {
      cacheControl: {
        present: !!cacheControl,
        value: cacheControl,
        directives: this.parseCacheControl(cacheControl),
        score: 0
      },
      expires: {
        present: !!expires,
        value: expires,
        isValid: this.isValidExpires(expires),
        score: 0
      },
      etag: {
        present: !!etag,
        value: etag,
        score: 0
      },
      lastModified: {
        present: !!lastModified,
        value: lastModified,
        score: 0
      },
      age: {
        present: !!age,
        value: age,
        score: 0
      },
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    // Analizar Cache-Control
    if (analysis.cacheControl.present) {
      analysis.cacheControl.score = 80; // Base score

      const directives = analysis.cacheControl.directives;

      // Penalizaciones
      if (directives['no-cache'] || directives['no-store']) {
        analysis.cacheControl.score -= 30;
        analysis.issues.push('Cache deshabilitado (no-cache/no-store)');
      }
      if (directives['max-age'] && directives['max-age'] < 300) {
        analysis.cacheControl.score -= 20;
        analysis.issues.push('Cache muy agresivo (max-age < 5min)');
      }
      if (directives['max-age'] && directives['max-age'] > 31536000) {
        analysis.cacheControl.score -= 10;
        analysis.issues.push('Cache muy conservador (max-age > 1 año)');
      }
      if (!directives['public'] && !directives['private']) {
        analysis.cacheControl.score -= 10;
        analysis.issues.push('Directiva de visibilidad de cache no especificada');
      }
    } else {
      analysis.cacheControl.score = 20;
      analysis.issues.push('Header Cache-Control no presente');
    }

    // Analizar Expires
    if (analysis.expires.present && analysis.expires.isValid) {
      analysis.expires.score = 70;
    } else if (analysis.expires.present && !analysis.expires.isValid) {
      analysis.expires.score = 30;
      analysis.issues.push('Header Expires con fecha inválida');
    } else {
      analysis.expires.score = 20;
      analysis.issues.push('Header Expires no presente');
    }

    // Analizar ETag
    if (analysis.etag.present) {
      analysis.etag.score = 90;
    } else {
      analysis.etag.score = 40;
      analysis.issues.push('Header ETag no presente (útil para validación de cache)');
    }

    // Analizar Last-Modified
    if (analysis.lastModified.present) {
      analysis.lastModified.score = 80;
    } else {
      analysis.lastModified.score = 50;
      analysis.issues.push('Header Last-Modified no presente');
    }

    // Score general
    analysis.overallScore = Math.round(
      (analysis.cacheControl.score * 0.4) +
      (analysis.expires.score * 0.2) +
      (analysis.etag.score * 0.2) +
      (analysis.lastModified.score * 0.2)
    );

    // Generar recomendaciones
    analysis.recommendations = this.generateCacheRecommendations(analysis);

    return analysis;
  }

  parseCacheControl(cacheControl) {
    const directives = {};
    if (!cacheControl) return directives;

    const parts = cacheControl.split(',').map(part => part.trim());
    parts.forEach(part => {
      if (part.includes('=')) {
        const [key, value] = part.split('=');
        directives[key] = value;
      } else {
        directives[part] = true;
      }
    });

    return directives;
  }

  isValidExpires(expires) {
    if (!expires) return false;
    const date = new Date(expires);
    return !isNaN(date.getTime()) && date > new Date();
  }

  analyzeCompression(headers) {
    const contentEncoding = headers['content-encoding'] || '';
    const acceptEncoding = headers['accept-encoding'] || '';
    const vary = headers['vary'] || '';

    const analysis = {
      contentEncoding: {
        present: !!contentEncoding,
        value: contentEncoding,
        supportsGzip: contentEncoding.includes('gzip'),
        supportsBrotli: contentEncoding.includes('br'),
        score: 0
      },
      acceptEncoding: {
        present: !!acceptEncoding,
        value: acceptEncoding,
        supportsGzip: acceptEncoding.includes('gzip'),
        supportsBrotli: acceptEncoding.includes('br'),
        score: 0
      },
      vary: {
        present: !!vary,
        value: vary,
        properVary: vary.includes('Accept-Encoding'),
        score: 0
      },
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    // Analizar Content-Encoding
    if (analysis.contentEncoding.present) {
      analysis.contentEncoding.score = 90;
      if (analysis.contentEncoding.supportsBrotli) {
        analysis.contentEncoding.score = 100;
      }
    } else {
      analysis.contentEncoding.score = 30;
      analysis.issues.push('Contenido no comprimido');
    }

    // Analizar Accept-Encoding
    if (analysis.acceptEncoding.present) {
      analysis.acceptEncoding.score = 80;
      if (analysis.acceptEncoding.supportsBrotli) {
        analysis.acceptEncoding.score += 10;
      }
    } else {
      analysis.acceptEncoding.score = 50;
      analysis.issues.push('Accept-Encoding no especificado');
    }

    // Analizar Vary
    if (analysis.vary.present && analysis.vary.properVary) {
      analysis.vary.score = 90;
    } else if (analysis.vary.present && !analysis.vary.properVary) {
      analysis.vary.score = 60;
      analysis.issues.push('Header Vary no incluye Accept-Encoding');
    } else {
      analysis.vary.score = 40;
      analysis.issues.push('Header Vary no presente');
    }

    // Score general
    analysis.overallScore = Math.round(
      (analysis.contentEncoding.score * 0.5) +
      (analysis.acceptEncoding.score * 0.3) +
      (analysis.vary.score * 0.2)
    );

    // Recomendaciones
    analysis.recommendations = this.generateCompressionRecommendations(analysis);

    return analysis;
  }

  analyzeSecurityHeaders(headers) {
    const securityHeaders = {
      'strict-transport-security': headers['strict-transport-security'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'content-security-policy': headers['content-security-policy'],
      'referrer-policy': headers['referrer-policy']
    };

    const analysis = {
      headers: {},
      overallScore: 0,
      implementedCount: 0,
      totalHeaders: Object.keys(securityHeaders).length,
      issues: [],
      recommendations: []
    };

    // Analizar cada header de seguridad
    Object.entries(securityHeaders).forEach(([header, value]) => {
      const headerAnalysis = {
        present: !!value,
        value: value,
        score: value ? 100 : 0
      };

      if (header === 'strict-transport-security' && value) {
        const maxAge = value.match(/max-age=(\d+)/);
        if (maxAge && parseInt(maxAge[1]) < 31536000) {
          headerAnalysis.score = 70;
          headerAnalysis.issue = 'HSTS max-age muy corto (debe ser al menos 1 año)';
        }
        if (!value.includes('includeSubDomains')) {
          headerAnalysis.score = Math.max(headerAnalysis.score - 20, 50);
        }
      }

      analysis.headers[header] = headerAnalysis;
      analysis.overallScore += headerAnalysis.score;

      if (!value) {
        analysis.issues.push(`Header ${header} no implementado`);
      } else {
        analysis.implementedCount++;
      }
    });

    analysis.overallScore = Math.round(analysis.overallScore / analysis.totalHeaders);

    // Recomendaciones
    analysis.recommendations = this.generateSecurityRecommendations(analysis);

    return analysis;
  }

  calculateServerScore(cacheAnalysis, compressionAnalysis, securityHeadersAnalysis) {
    const weights = {
      cache: 0.4,
      compression: 0.3,
      security: 0.3
    };

    return Math.round(
      (cacheAnalysis.overallScore * weights.cache) +
      (compressionAnalysis.overallScore * weights.compression) +
      (securityHeadersAnalysis.overallScore * weights.security)
    );
  }

  generateCacheRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.cacheControl.present) {
      recommendations.push({
        priority: 'HIGH',
        header: 'Cache-Control',
        issue: 'Header faltante',
        solution: 'Implementar Cache-Control apropiado según tipo de contenido',
        config: {
          nginx: 'add_header Cache-Control "public, max-age=31536000";',
          apache: 'Header set Cache-Control "public, max-age=31536000"'
        }
      });
    }

    if (analysis.cacheControl.directives['max-age'] && analysis.cacheControl.directives['max-age'] < 300) {
      recommendations.push({
        priority: 'MEDIUM',
        header: 'Cache-Control',
        issue: 'Cache muy agresivo',
        solution: 'Aumentar max-age para assets estáticos (1 hora mínimo)',
        config: {
          nginx: 'add_header Cache-Control "public, max-age=3600";',
          apache: 'Header set Cache-Control "public, max-age=3600"'
        }
      });
    }

    if (!analysis.etag.present) {
      recommendations.push({
        priority: 'LOW',
        header: 'ETag',
        issue: 'Header faltante',
        solution: 'Implementar ETags para validación eficiente de cache',
        config: {
          nginx: 'etag on;',
          apache: 'FileETag MTime Size'
        }
      });
    }

    return recommendations;
  }

  generateCompressionRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.contentEncoding.present) {
      recommendations.push({
        priority: 'HIGH',
        header: 'Content-Encoding',
        issue: 'Compresión no activada',
        solution: 'Activar compresión gzip o brotli',
        config: {
          nginx: 'gzip on;\n    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;',
          apache: 'AddOutputFilterByType DEFLATE text/plain\n    AddOutputFilterByType DEFLATE text/html\n    AddOutputFilterByType DEFLATE text/xml'
        }
      });
    }

    if (!analysis.vary.properVary) {
      recommendations.push({
        priority: 'MEDIUM',
        header: 'Vary',
        issue: 'Vary no incluye Accept-Encoding',
        solution: 'Agregar Accept-Encoding al header Vary',
        config: {
          nginx: 'add_header Vary "Accept-Encoding";',
          apache: 'Header append Vary "Accept-Encoding"'
        }
      });
    }

    return recommendations;
  }

  generateSecurityRecommendations(analysis) {
    const recommendations = [];

    const criticalHeaders = ['strict-transport-security', 'x-content-type-options'];
    const importantHeaders = ['x-frame-options', 'x-xss-protection', 'referrer-policy'];

    criticalHeaders.forEach(header => {
      if (!analysis.headers[header].present) {
        recommendations.push({
          priority: 'CRITICAL',
          header: header,
          issue: 'Header crítico faltante',
          solution: `Implementar ${header}`,
          config: this.getSecurityHeaderConfig(header)
        });
      }
    });

    importantHeaders.forEach(header => {
      if (!analysis.headers[header].present) {
        recommendations.push({
          priority: 'HIGH',
          header: header,
          issue: 'Header importante faltante',
          solution: `Implementar ${header}`,
          config: this.getSecurityHeaderConfig(header)
        });
      }
    });

    return recommendations;
  }

  getSecurityHeaderConfig(header) {
    const configs = {
      'strict-transport-security': {
        nginx: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
        apache: 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"'
      },
      'x-frame-options': {
        nginx: 'add_header X-Frame-Options "SAMEORIGIN" always;',
        apache: 'Header always set X-Frame-Options "SAMEORIGIN"'
      },
      'x-content-type-options': {
        nginx: 'add_header X-Content-Type-Options "nosniff" always;',
        apache: 'Header always set X-Content-Type-Options "nosniff"'
      },
      'x-xss-protection': {
        nginx: 'add_header X-XSS-Protection "1; mode=block" always;',
        apache: 'Header always set X-XSS-Protection "1; mode=block"'
      },
      'referrer-policy': {
        nginx: 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
        apache: 'Header always set Referrer-Policy "strict-origin-when-cross-origin"'
      }
    };

    return configs[header] || { nginx: '# Configuración requerida', apache: '# Configuración requerida' };
  }

  generateServerRecommendations(cacheAnalysis, compressionAnalysis, securityHeadersAnalysis) {
    const recommendations = [];

    // Recomendaciones de cache
    recommendations.push(...cacheAnalysis.recommendations);

    // Recomendaciones de compresión
    recommendations.push(...compressionAnalysis.recommendations);

    // Recomendaciones de seguridad
    recommendations.push(...securityHeadersAnalysis.recommendations);

    // Recomendaciones específicas del servidor
    if (cacheAnalysis.overallScore < 60) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Configuración de Servidor',
        issue: 'Configuración de cache subóptima',
        solution: 'Revisar configuración completa de cache del servidor',
        action: 'Auditar configuración de Nginx/Apache y optimizar headers de cache'
      });
    }

    if (compressionAnalysis.overallScore < 70) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Compresión',
        issue: 'Compresión no optimizada',
        solution: 'Mejorar configuración de compresión del servidor',
        action: 'Activar gzip/brotli y configurar tipos MIME apropiados'
      });
    }

    if (securityHeadersAnalysis.overallScore < 70) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Seguridad',
        issue: 'Headers de seguridad faltantes',
        solution: 'Implementar headers de seguridad críticos',
        action: 'Configurar HSTS, CSP, X-Frame-Options y otros headers de seguridad'
      });
    }

    return recommendations;
  }
}

export default ImpactCalculator;
