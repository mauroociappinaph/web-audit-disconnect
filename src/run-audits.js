#!/usr/bin/env node

/**
 * run-audits.js - Executor de todos los 10 audits de desconexión
 * 
 * Este script ejecuta auditorías contra los 10 sitios configurados
 * y genera reportes con métricas de desconexión reales.
 */

const fs = require('fs');
const path = require('path');
const WebAudit = require('./audit');
const ReportGenerator = require('./report-generator');

// Cargar configuración de audits
const auditsConfig = require('./audits-config.json');

/**
 * Función principal para ejecutar todos los audits
 */
async function runAllAudits() {
  console.log('\n🔍 Iniciando ejecución de 10 audits de desconexión...');
  console.log('=' .repeat(60));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsDir = path.join(__dirname, 'reports', timestamp);
  
  // Crear directorio de reportes si no existe
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const results = [];
  const errors = [];
  
  // Ejecutar cada audit
  for (const audit of auditsConfig.audits) {
    console.log(`\n📊 Auditando: ${audit.nombre}`);
    console.log(`   URL: ${audit.url}`);
    console.log(`   Cliente: ${audit.clientName}`);
    console.log(`   Industria: ${audit.industria}`);
    
    try {
      // Crear instancia de WebAudit
      const webAudit = new WebAudit({
        url: audit.url,
        clientName: audit.clientName,
        industria: audit.industria,
        auditType: audit.tipo
      });
      
      // Ejecutar auditoría
      console.log('   ⏳ Ejecutando auditoría...');
      const auditResult = await webAudit.run();
      
      // Generar reporte
      const generator = new ReportGenerator(auditResult);
      const report = generator.generate();
      
      // Guardar reporte en archivo
      const reportPath = path.join(
        reportsDir,
        `audit-${audit.id}-${audit.nombre.toLowerCase().replace(/\s+/g, '-')}.json`
      );
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      results.push({
        auditId: audit.id,
        nombre: audit.nombre,
        status: 'SUCCESS',
        reportPath: reportPath,
        metrics: {
          disconnectionScore: auditResult.disconnectionScore || 0,
          brokenLinks: auditResult.brokenLinks || 0,
          sslIssues: auditResult.sslIssues || 0,
          performanceScore: auditResult.performanceScore || 0
        }
      });
      
      console.log(`   ✅ Auditoría completada`);
      console.log(`   📈 Score de desconexión: ${auditResult.disconnectionScore || 'N/A'}`);
      
    } catch (error) {
      console.error(`   ❌ Error durante la auditoría: ${error.message}`);
      errors.push({
        auditId: audit.id,
        nombre: audit.nombre,
        error: error.message
      });
      
      results.push({
        auditId: audit.id,
        nombre: audit.nombre,
        status: 'FAILED',
        error: error.message
      });
    }
  }
  
  // Generar resumen final
  const summary = {
    timestamp,
    totalAudits: auditsConfig.audits.length,
    successfulAudits: results.filter(r => r.status === 'SUCCESS').length,
    failedAudits: results.filter(r => r.status === 'FAILED').length,
    reportsDirectory: reportsDir,
    results,
    errors
  };
  
  // Guardar resumen
  const summaryPath = path.join(reportsDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // Mostrar resumen
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN DE EJECUCIÓN');
  console.log('='.repeat(60));
  console.log(`✅ Audits exitosos: ${summary.successfulAudits}/${summary.totalAudits}`);
  console.log(`❌ Audits fallidos: ${summary.failedAudits}/${summary.totalAudits}`);
  console.log(`📁 Reportes guardados en: ${reportsDir}`);
  console.log(`📄 Resumen disponible en: ${summaryPath}`);
  console.log('='.repeat(60) + '\n');
  
  return summary;
}

// Ejecutar
if (require.main === module) {
  runAllAudits()
    .then(summary => {
      process.exit(summary.failedAudits > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = runAllAudits;
