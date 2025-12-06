# Guía de Ejecución - web-audit-disconnect

## Opción 1: Ejecutar Auditorías

### Descripción General
Esta opción permite ejecutar auditorías de desconexiones en sitios web especificados, detectando y registrando eventos de pérdida de conexión con traceo de eventos detallado.

### Requisitos Previos

- Node.js 18+ instalado
- npm o yarn como gestor de paquetes
- Acceso a internet para las auditorías remotas
- Credenciales configuradas (si es necesario para APIs externas)

### Instalación de Dependencias

```bash
npm install
# o
yarn install
```

### Estructura del Proyecto

```
src/
├── auditor.ts         # Lógica principal de auditoría
├── disconnect-tracker.ts  # Rastreador de desconexiones
├── event-logger.ts    # Sistema de logging de eventos
├── config.ts          # Configuración global
└── types/
    └── index.ts       # Tipos TypeScript
```

### Ejecución de Auditorías

#### 1. Auditoría Simple

```bash
npm run audit -- --url https://example.com
```

**Parámetros:**
- `--url`: URL del sitio a auditar (requerido)
- `--timeout`: Tiempo máximo de auditoría en ms (default: 30000)
- `--verbose`: Habilitar logging detallado

**Ejemplo:**
```bash
npm run audit -- --url https://example.com --timeout 60000 --verbose
```

#### 2. Auditoría Múltiple

```bash
npm run audit:batch -- --file urls.json
```

**Formato de urls.json:**
```json
{
  "sites": [
    {
      "url": "https://site1.com",
      "timeout": 30000
    },
    {
      "url": "https://site2.com",
      "timeout": 45000
    }
  ]
}
```

#### 3. Auditoría con Simulación de Desconexión

```bash
npm run audit:simulate -- --url https://example.com --disconnect-delay 5000
```

**Parámetros:**
- `--disconnect-delay`: Tiempo antes de simular desconexión (ms)
- `--duration`: Duración de la simulación (ms, default: 10000)

### Configuración de Auditorías

Crea un archivo `audit.config.ts` en la raíz del proyecto:

```typescript
export const auditConfig = {
  timeout: 30000,
  retries: 3,
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    format: 'json', // 'json' o 'text'
    outputFile: './logs/audit.log'
  },
  tracking: {
    trackEventTiming: true,
    trackNetworkActivity: true,
    trackErrorStacks: true
  }
};
```

### Interpretación de Resultados

#### Formato de Salida

```json
{
  "auditId": "audit-123456",
  "url": "https://example.com",
  "timestamp": "2025-12-06T11:00:00Z",
  "disconnectEvents": [
    {
      "type": "connection-lost",
      "timestamp": "2025-12-06T11:00:15Z",
      "duration": 5000,
      "recovered": true,
      "errorMessage": null,
      "stackTrace": null
    }
  ],
  "summary": {
    "totalEvents": 1,
    "totalDowntime": 5000,
    "avgRecoveryTime": 2300,
    "healthScore": 95
  }
}
```

#### Métricas Clave

- **Health Score**: Puntuación de 0-100 basada en eventos y tiempo de recuperación
- **Total Downtime**: Tiempo total sin conexión (ms)
- **Avg Recovery Time**: Tiempo promedio de recuperación (ms)
- **Total Events**: Cantidad de eventos de desconexión detectados

### Troubleshooting

#### Error: "Connection timeout"
```bash
# Aumentar timeout
npm run audit -- --url https://example.com --timeout 120000
```

#### Error: "ECONNREFUSED"
```bash
# Verificar que el sitio sea accesible
curl https://example.com

# Intentar con un proxy si es necesario
npm run audit -- --url https://example.com --proxy http://proxy:8080
```

#### Logging en Modo Debug
```bash
npm run audit -- --url https://example.com --verbose 2>&1 | tee debug.log
```

### Scripts Disponibles

```bash
# Ejecutar auditoría individual
npm run audit

# Ejecutar auditoría en lote
npm run audit:batch

# Ejecutar auditoría con simulación
npm run audit:simulate

# Ver logs recientes
npm run logs:view

# Limpiar logs antiguos
npm run logs:clean
```

### Exportar Resultados

```bash
# Exportar en JSON
npm run audit -- --url https://example.com --output ./results.json --format json

# Exportar en CSV
npm run audit -- --url https://example.com --output ./results.csv --format csv

# Exportar en HTML (reporte visual)
npm run audit -- --url https://example.com --output ./report.html --format html
```

### Ejemplo Completo

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar auditoría con logging detallado
npm run audit -- \
  --url https://github.com \
  --timeout 60000 \
  --verbose \
  --output ./github-audit.json \
  --format json

# 3. Ver resultados
cat ./github-audit.json
```

### Próximos Pasos

- Ver **Opción 2** para procesar y analizar auditorías guardadas
- Ver **Opción 3** para configurar monitoreo continuo
- Consulta la documentación de API para integraciones personalizadas
