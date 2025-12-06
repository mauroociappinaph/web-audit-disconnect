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
            /generator.*wordpress/i,
            /wp-emoji/i,
            /wp-embed/i,
            /admin-ajax\.php/i,
            /xmlrpc\.php/i,
            /wp-login/i
          ],
          headers: ['x-powered-by: wordpress', 'link:.*wp-json'],
          confidence: 0
        },
        wix: {
          patterns: [
            /wix-code/i,
            /wix-static/i,
            /wix-image/i,
            /wix-viewer/i,
            /static\.wixstatic\.com/i,
            /wix\.com/i,
            /data-site-cache/i
          ],
          headers: ['x-wix-request-id', 'x-wix-published-version'],
          confidence: 0
        },
        squarespace: {
          patterns: [
            /squarespace/i,
            /static\.squarespace\.com/i,
            /squarespace-parsed-data/i,
            /squarespace-gdpr/i,
            /squarespace\.com/i
          ],
          headers: ['server: squarespace'],
          confidence: 0
        },
        shopify: {
          patterns: [
            /shopify/i,
            /cdn\.shopify\.com/i,
            /myshopify\.com/i,
            /shopify-app/i,
            /shopify-theme/i,
            /shopify-section/i
          ],
          headers: ['x-shopify-stage', 'x-shopify-shopid'],
          confidence: 0
        },
        webflow: {
          patterns: [
            /webflow/i,
            /uploads\.webflow\.com/i,
            /fs-.*\.webflow\.com/i,
            /webflow\.com/i,
            /webflow-data/i
          ],
          headers: ['x-webflow-hostname'],
          confidence: 0
        },
        prestashop: {
          patterns: [
            /prestashop/i,
            /presta/i,
            /modules\/.*\.js/i,
            /themes\/.*\.css/i
          ],
          headers: ['powered-by: prestashop'],
          confidence: 0
        },
        magento: {
          patterns: [
            /magento/i,
            /var\/cache/i,
            /mage\/cookie/i,
            /form_key/i
          ],
          headers: ['x-magento-cache-debug'],
          confidence: 0
        },
        drupal: {
          patterns: [
            /drupal/i,
            /sites\/default/i,
            /node\//i,
            /drupal\.js/i
          ],
          headers: ['x-drupal-cache', 'x-generator: drupal'],
          confidence: 0
        },
        joomla: {
          patterns: [
            /joomla/i,
            /administrator/i,
            /components\/.*\.js/i,
            /modules\/.*\.js/i
          ],
          headers: ['x-powered-by: joomla'],
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
            /data-reactroot/i,
            /react\.js/i,
            /react\.min\.js/i
          ],
          confidence: 0
        },
        vue: {
          patterns: [
            /vue/i,
            /vue-router/i,
            /nuxt/i,
            /v-\w+/i,
            /vue\.js/i,
            /vue\.min\.js/i
          ],
          confidence: 0
        },
        angular: {
          patterns: [
            /angular/i,
            /ng-app/i,
            /ng-controller/i,
            /ng-\w+/i,
            /angular\.js/i,
            /angular\.min\.js/i
          ],
          confidence: 0
        },
        nextjs: {
          patterns: [
            /_next/i,
            /next\/build/i,
            /next\/router/i,
            /next\.js/i
          ],
          confidence: 0
        },
        nuxtjs: {
          patterns: [
            /nuxt/i,
            /__nuxt/i,
            /nuxt-link/i,
            /nuxt\.js/i
          ],
          confidence: 0
        },
        svelte: {
          patterns: [
            /svelte/i,
            /sveltekit/i,
            /svelte\.js/i
          ],
          confidence: 0
        },
        gatsby: {
          patterns: [
            /gatsby/i,
            /__gatsby/i,
            /gatsby\.js/i
          ],
          confidence: 0
        },
        astro: {
          patterns: [
            /astro/i,
            /astro\.js/i,
            /astro-island/i
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
          patterns: [/cloudflare/i],
          headers: ['cf-ray', 'server: cloudflare'],
          confidence: 0
        },
        aws: {
          patterns: [/aws/i, /amazon/i],
          headers: ['x-amz-cf-id', 'server: amazon'],
          confidence: 0
        },
        google: {
          patterns: [/google/i],
          headers: ['server: gse', 'x-google-cache-control'],
          confidence: 0
        },
        heroku: {
          patterns: [/heroku/i],
          headers: ['server: heroku', 'via: 1.1 vegur'],
          confidence: 0
        },
        digitalocean: {
          patterns: [/digitalocean/i],
          headers: ['server: nginx', 'x-powered-by: phusion passenger'],
          confidence: 0
        },
        azure: {
          patterns: [/azure/i],
          headers: ['server: microsoft-iis', 'x-azure-ref'],
          confidence: 0
        },
        github: {
          patterns: [/github\.io/i],
          headers: ['server: github.com'],
          confidence: 0
        }
      },
      cdn: {
        cloudflare: {
          patterns: [/cdnjs\.cloudflare\.com/i],
          headers: ['cf-ray'],
          confidence: 0
        },
        jsdelivr: {
          patterns: [/cdn\.jsdelivr\.net/i],
          headers: [],
          confidence: 0
        },
        unpkg: {
          patterns: [/unpkg\.com/i],
          headers: [],
          confidence: 0
        },
        google: {
          patterns: [/ajax\.googleapis\.com/i, /fonts\.googleapis\.com/i],
          headers: [],
          confidence: 0
        },
        fastly: {
          patterns: [],
          headers: ['x-served-by: fastly'],
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

    // Detect JavaScript libraries from script tags
    results.libraries = this.detectLibraries(html);

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

  detectLibraries(html) {
    const libraries = [];

    // Common JavaScript libraries and their CDN patterns
    const libraryPatterns = {
      'jQuery': [
        /jquery[\.\-][0-9]/i,
        /code\.jquery\.com/i,
        /ajax\.googleapis\.com\/ajax\/libs\/jquery/i
      ],
      'Bootstrap': [
        /bootstrap[\.\-][0-9]/i,
        /stackpath\.bootstrapcdn\.com/i,
        /cdn\.jsdelivr\.net\/npm\/bootstrap/i,
        /maxcdn\.bootstrapcdn\.com/i
      ],
      'Font Awesome': [
        /font-awesome/i,
        /fontawesome/i,
        /use\.fontawesome\.com/i,
        /kit\.fontawesome\.com/i
      ],
      'Google Fonts': [
        /fonts\.googleapis\.com/i,
        /fonts\.gstatic\.com/i
      ],
      'Google Analytics': [
        /googletagmanager\.com/i,
        /google-analytics\.com/i,
        /gtag/i,
        /ga\(/i
      ],
      'Facebook Pixel': [
        /connect\.facebook\.net/i,
        /facebook\.com\/tr/i
      ],
      'Lodash': [
        /lodash/i,
        /cdn\.jsdelivr\.net\/npm\/lodash/i
      ],
      'Axios': [
        /axios/i,
        /cdn\.jsdelivr\.net\/npm\/axios/i
      ],
      'Moment.js': [
        /moment/i,
        /cdn\.jsdelivr\.net\/npm\/moment/i
      ],
      'Chart.js': [
        /chart\.js/i,
        /cdn\.jsdelivr\.net\/npm\/chart\.js/i
      ],
      'Swiper': [
        /swiper/i,
        /cdn\.jsdelivr\.net\/npm\/swiper/i
      ],
      'AOS (Animate On Scroll)': [
        /aos/i,
        /cdn\.jsdelivr\.net\/npm\/aos/i
      ]
    };

    // Check each library pattern
    Object.keys(libraryPatterns).forEach(libraryName => {
      const patterns = libraryPatterns[libraryName];
      let detected = false;
      let version = 'Desconocida';
      let source = 'Desconocida';

      for (const pattern of patterns) {
        if (pattern.test(html)) {
          detected = true;

          // Try to extract version from URL
          const urlMatch = html.match(new RegExp(`https?://[^"']*${libraryName.toLowerCase().replace(/[\.\-\s]/g, '[\\.-\\s]*')}[^"']*`, 'i'));
          if (urlMatch) {
            const versionMatch = urlMatch[0].match(/(\d+(?:\.\d+)+)/);
            if (versionMatch) {
              version = versionMatch[1];
            }

            // Determine source
            if (urlMatch[0].includes('jsdelivr')) source = 'jsDelivr';
            else if (urlMatch[0].includes('googleapis')) source = 'Google CDN';
            else if (urlMatch[0].includes('stackpath')) source = 'BootstrapCDN';
            else if (urlMatch[0].includes('fontawesome')) source = 'Font Awesome';
            else if (urlMatch[0].includes('jquery.com')) source = 'jQuery CDN';
            else source = 'CDN Externo';
          }
          break;
        }
      }

      if (detected) {
        libraries.push({
          name: libraryName,
          version: version,
          source: source
        });
      }
    });

    return libraries;
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
