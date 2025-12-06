export class TechnologyDetector {
  constructor() {
    this.technologies = {
      cms: {
        wordpress: {
          patterns: [
            /wp-content/i,
            /wp-includes/i,
            /wp-admin/i,
            /wp-json/i,
            /generator.*wordpress/i
          ],
          headers: ['x-powered-by: wordpress'],
          confidence: 0
        },
        wix: {
          patterns: [
            /wix-code/i,
            /wix-static/i,
            /wix-image/i,
            /wix-viewer/i,
            /static\.wixstatic\.com/i
          ],
          headers: ['x-wix-request-id'],
          confidence: 0
        },
        squarespace: {
          patterns: [
            /squarespace/i,
            /static\.squarespace\.com/i,
            /squarespace-parsed-data/i
          ],
          headers: [],
          confidence: 0
        },
        shopify: {
          patterns: [
            /shopify/i,
            /cdn\.shopify\.com/i,
            /myshopify\.com/i,
            /shopify-app/i
          ],
          headers: ['x-shopify-stage'],
          confidence: 0
        },
        webflow: {
          patterns: [
            /webflow/i,
            /uploads\.webflow\.com/i,
            /fs-.*\.webflow\.com/i
          ],
          headers: [],
          confidence: 0
        }
      },
      frameworks: {
        react: {
          patterns: [
            /react/i,
            /react-dom/i,
            /_next/i,
            /data-react/i,
            /data-reactroot/i
          ],
          confidence: 0
        },
        vue: {
          patterns: [
            /vue/i,
            /vue-router/i,
            /nuxt/i,
            /v-\w+/i
          ],
          confidence: 0
        },
        angular: {
          patterns: [
            /angular/i,
            /ng-app/i,
            /ng-controller/i,
            /ng-\w+/i
          ],
          confidence: 0
        },
        nextjs: {
          patterns: [
            /_next/i,
            /next\/build/i,
            /next\/router/i
          ],
          confidence: 0
        },
        nuxtjs: {
          patterns: [
            /nuxt/i,
            /__nuxt/i,
            /nuxt-link/i
          ],
          confidence: 0
        }
      },
      hosting: {
        vercel: {
          patterns: [/vercel/i],
          headers: ['x-vercel-id', 'server: vercel'],
          confidence: 0
        },
        netlify: {
          patterns: [/netlify/i],
          headers: ['x-nf-request-id', 'server: netlify'],
          confidence: 0
        },
        cloudflare: {
          patterns: [],
          headers: ['cf-ray', 'server: cloudflare'],
          confidence: 0
        },
        aws: {
          patterns: [/aws/i],
          headers: ['x-amz-cf-id', 'server: amazon'],
          confidence: 0
        },
        google: {
          patterns: [/google/i],
          headers: ['server: gse', 'x-google-cache-control'],
          confidence: 0
        }
      }
    };
  }

  detect(html, headers = {}) {
    const results = {
      cms: null,
      framework: null,
      hosting: null,
      libraries: [],
      confidence: {}
    };

    // Reset confidence scores
    this.resetConfidence();

    // Analyze HTML
    this.analyzeHTML(html);

    // Analyze headers
    this.analyzeHeaders(headers);

    // Determine results
    results.cms = this.getHighestConfidence('cms');
    results.framework = this.getHighestConfidence('frameworks');
    results.hosting = this.getHighestConfidence('hosting');

    // Calculate overall confidence
    results.confidence = {
      cms: results.cms ? this.technologies.cms[results.cms].confidence : 0,
      framework: results.framework ? this.technologies.frameworks[results.framework].confidence : 0,
      hosting: results.hosting ? this.technologies.hosting[results.hosting].confidence : 0
    };

    return results;
  }

  analyzeHTML(html) {
    // Check each technology pattern
    Object.keys(this.technologies).forEach(category => {
      Object.keys(this.technologies[category]).forEach(tech => {
        const techData = this.technologies[category][tech];
        let matches = 0;

        techData.patterns.forEach(pattern => {
          if (pattern.test(html)) {
            matches++;
          }
        });

        // Calculate confidence based on matches
        if (matches > 0) {
          techData.confidence = Math.min(100, (matches / techData.patterns.length) * 100);
        }
      });
    });
  }

  analyzeHeaders(headers) {
    const headerString = JSON.stringify(headers).toLowerCase();

    Object.keys(this.technologies).forEach(category => {
      Object.keys(this.technologies[category]).forEach(tech => {
        const techData = this.technologies[category][tech];

        if (techData.headers) {
          techData.headers.forEach(header => {
            if (headerString.includes(header.toLowerCase())) {
              techData.confidence = Math.min(100, techData.confidence + 30);
            }
          });
        }
      });
    });
  }

  resetConfidence() {
    Object.keys(this.technologies).forEach(category => {
      Object.keys(this.technologies[category]).forEach(tech => {
        this.technologies[category][tech].confidence = 0;
      });
    });
  }

  getHighestConfidence(category) {
    let highest = { tech: null, confidence: 0 };

    Object.keys(this.technologies[category]).forEach(tech => {
      const confidence = this.technologies[category][tech].confidence;
      if (confidence > highest.confidence) {
        highest = { tech, confidence };
      }
    });

    return highest.confidence > 20 ? highest.tech : null; // Minimum threshold
  }

  getTechnologyRecommendations(technologies) {
    const recommendations = [];

    // CMS-specific recommendations
    if (technologies.cms === 'wordpress') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'WordPress',
        issue: 'Optimización específica para WordPress',
        action: 'Usar plugins como WP Rocket, Smush para optimización de imágenes, y W3 Total Cache'
      });
    }

    if (technologies.cms === 'wix') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Wix',
        issue: 'Limitar elementos por página',
        action: 'Wix optimiza automáticamente imágenes, pero reducir elementos visuales mejora performance'
      });
    }

    if (technologies.cms === 'shopify') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Shopify',
        issue: 'Apps innecesarias impactan performance',
        action: 'Revisar y remover apps no utilizadas, usar theme nativo optimizado'
      });
    }

    // Framework-specific recommendations
    if (technologies.framework === 'react' || technologies.framework === 'nextjs') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'React/Next.js',
        issue: 'Bundle splitting y lazy loading',
        action: 'Implementar React.lazy(), dynamic imports, y code splitting para mejorar LCP'
      });
    }

    if (technologies.framework === 'vue' || technologies.framework === 'nuxtjs') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Vue/Nuxt.js',
        issue: 'Lazy loading de componentes',
        action: 'Usar componentes async y lazy loading para mejorar tiempo de carga inicial'
      });
    }

    return recommendations;
  }
}

export default TechnologyDetector;
