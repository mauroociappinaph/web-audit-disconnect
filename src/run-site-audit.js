#!/usr/bin/env node

import { WebAudit } from './audit.js';

// Logger local para CLI
const logger = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  warn: (msg) => console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()}: ${msg}`),
  success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${new Date().toISOString()}: ${msg}`)
};

async function runSiteAudit() {
  const url = process.argv[2];
  const client = process.argv[3] || 'Default';
  const maxPages = parseInt(process.argv[4]) || 15;
  const mode = process.argv[5] || 'gradual';

  if (!url) {
    console.error('\x1b[31m❌ Error: Debes proporcionar una URL');
    console.log('\x1b[33m💡 Uso: node src/run-site-audit.js <url> [cliente] [max-pages] [mode]');
    console.log('\x1b[36m📖 Ejemplo: node src/run-site-audit.js https://example.com "MiCliente" 20 gradual');
    console.log('\x1b[36m📖 Modos: gradual (recomendado), full, standard, light\x1b[0m');
    process.exit(1);
  }

  console.log('\x1b[36m🚀 Iniciando auditoría SITE-WIDE...');
  console.log(`📊 URL: ${url}`);
  console.log(`🏢 Cliente: ${client}`);
  console.log(`📈 Páginas máximas: ${maxPages}`);
  console.log(`🎯 Modo: ${mode}\x1b[0m\n`);

  try {
    const audit = new WebAudit(url, client);

    // Ejecutar auditoría site-wide
    await audit.runSiteWideAudit({
      maxPages: maxPages,
      mode: mode
    });

    // Generar reportes
    const reportPath = await audit.generateReport();

    console.log('\n\x1b[32m✅ Auditoría completada exitosamente!');
    console.log(`📄 Reporte HTML: ${reportPath.html}`);
    console.log(`📋 Reporte JSON: ${reportPath.json}\x1b[0m`);

    // Mostrar resumen
    if (audit.results.siteSummary) {
      const summary = audit.results.siteSummary;
      console.log('\n\x1b[36m📊 Resumen del análisis:');
      console.log(`   📄 Páginas analizadas: ${summary.successfulPages}/${summary.totalPages}`);
      console.log(`   🎯 Cobertura: ${summary.coverage}%`);
      console.log(`   📊 Puntuación media: ${summary.averageScore}/100`);
      console.log(`   📱 Móvil: ${summary.averageMobileScore}/100`);
      console.log(`   🖥️ Desktop: ${summary.averageDesktopScore}/100`);
      console.log(`   ⚠️ Páginas críticas: ${summary.criticalPages}\x1b[0m`);
    }

    if (audit.results.siteROI) {
      const roi = audit.results.siteROI;
      console.log('\n\x1b[32m💰 Estimación de ROI:');
      console.log(`   📈 Aumento mensual: $${roi.monthlyRevenueIncrease.toLocaleString()}`);
      console.log(`   📈 Aumento anual: $${roi.annualRevenueIncrease.toLocaleString()}`);
      console.log(`   📊 Mejora conversión: ${roi.conversionImprovement}%`);
      console.log(`   ⏰ Payback: ${roi.paybackMonths} meses`);
      console.log(`   🎯 Confianza: ${roi.confidence}%\x1b[0m`);
    }

  } catch (error) {
    console.error('\x1b[31m❌ Error durante la auditoría site-wide:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runSiteAudit();
}

export { runSiteAudit };
