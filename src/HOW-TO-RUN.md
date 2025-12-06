# 🚀 Cómo Ejecutar web-audit-disconnect Localmente

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/mauroociappinaph/web-audit-disconnect.git
cd web-audit-disconnect
```

## Paso 2: Instalar Dependencias

```bash
npm install
```

**Alternativa con Yarn:**
```bash
yarn install
```

## Paso 3: Ejecutar la Auditoría

### Opción A: Auditoría Simple

Auditar un único sitio web:

```bash
npm run audit -- --url https://github.com
```

### Opción B: Auditoría Verbose (Con Logs Detallados)

```bash
npm run audit -- --url https://github.com --verbose
```

### Opción C: Auditoría con Timeout Personalizado

```bash
npm run audit -- --url https://github.com --timeout 60000
```

### Opción D: Auditoría Múltiple desde Archivo

1. Crea un archivo `urls.json` en la raíz del proyecto:

```json
{
  "sites": [
    { "url": "https://github.com", "timeout": 30000 },
    { "url": "https://nodejs.org", "timeout": 30000 },
    { "url": "https://stackoverflow.com", "timeout": 30000 }
  ]
}
```

2. Ejecuta la auditoría en lote:

```bash
npm run audit:batch -- --file urls.json
```

### Opción E: Exportar Resultados

**En JSON:**
```bash
npm run audit -- --url https://github.com --output ./results.json --format json
```

**En CSV:**
```bash
npm run audit -- --url https://github.com --output ./results.csv --format csv
```

**En HTML (Reporte Visual):**
```bash
npm run audit -- --url https://github.com --output ./report.html --format html
```

Luego abre el archivo HTML en tu navegador.

## Paso 4: Ver los Resultados

### Ver Resultados de la Demo

El repositorio incluye un archivo con resultados de auditoría de demo:

```bash
cat src/AUDIT-DEMO-RESULTS.json
```

### Ver el Resumen Ejecutivo

Lee el resumen visual:

```bash
cat src/AUDIT-SUMMARY.md
```

## Ejemplo Completo de Ejecución

```bash
# 1. Clonar y entrar al proyecto
git clone https://github.com/mauroociappinaph/web-audit-disconnect.git
cd web-audit-disconnect

# 2. Instalar dependencias
npm install

# 3. Ejecutar auditoría simple
npm run audit -- --url https://github.com --verbose

# 4. Los resultados se guardarán automáticamente en ./logs/
ls -la logs/

# 5. Ver el archivo de resultados
cat logs/audit-*.json
```

## Entender los Resultados

Cada auditoría genera un JSON con:

- **metadata**: Información de la ejecución
- **audits**: Detalles de cada sitio auditado
- **summary**: Estadísticas agregadas
- **recommendations**: Recomendaciones para mejorar

### Ejemplos de Métricas

```json
{
  "url": "https://example.com",
  "httpStatus": 200,
  "healthScore": 98,
  "latency": 145,
  "disconnectionEvents": [...],
  "sslCertificate": {...}
}
```

## Troubleshooting

### Error: "Cannot find module"

```bash
# Asegúrate de estar en el directorio correcto
cd web-audit-disconnect

# Reinicia la instalación
rm -rf node_modules package-lock.json
npm install
```

### Error: "Connection timeout"

Aumenta el timeout:

```bash
npm run audit -- --url https://example.com --timeout 120000
```

### Error: "ECONNREFUSED"

Verifica que el sitio sea accesible:

```bash
curl https://example.com
```

Si no está disponible, intenta con otro sitio.

## Scripts Disponibles

```bash
npm run audit          # Ejecutar auditoría individual
npm run audit:batch    # Ejecutar auditoría en lote
npm run audit:simulate # Ejecutar con simulación de desconexiones
npm run logs:view      # Ver logs recientes
npm run logs:clean     # Limpiar logs antiguos
```

## Archivos de Demo Incluidos

- `src/AUDIT-DEMO-RESULTS.json` - Resultados de auditoría de ejemplo
- `src/AUDIT-SUMMARY.md` - Resumen ejecutivo visual
- `src/EXECUTION-GUIDE.md` - Guía detallada de ejecución
- `src/HOW-TO-RUN.md` - Este archivo (instrucciones rápidas)

## Próximos Pasos

1. **Configura URLs personalizadas** en tu archivo `urls.json`
2. **Ejecuta auditorías** periódicamente
3. **Analiza los resultados** usando el formato JSON
4. **Toma acciones** basadas en las recomendaciones
5. **Monitorea mejoras** ejecutando nuevas auditorías

## Ayuda y Documentación

Para más información, consulta:

- `README.md` - Descripción del proyecto
- `EXECUTION-GUIDE.md` - Guía detallada completa
- `AUDIT-SUMMARY.md` - Ejemplo de resultados

---

**Créditos:** web-audit-disconnect v1.0.0
**Autor:** Mauro Ciappina
**Repo:** https://github.com/mauroociappinaph/web-audit-disconnect
