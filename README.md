# 🔍 web-audit-disconnect

**Sistema completo de auditorías de desconexión** - Detecta webs rotas, problemas de SSL, performance y valida código. Genera scripts personalizados por cliente.

## ✨ Características

✅ **Auditoría SSL/HTTPS** - Verifica certificados y protocolo seguro
✅ **Detección de Links Rotos** - Identifica URLs no funcionales
✅ **Análisis de Performance** - Tiempo de carga, recursos, optimización
✅ **Verificación de Uptime** - Response time y disponibilidad
✅ **SEO Básico** - Title, meta description, estructura de headings
✅ **Reportes HTML** - Visuales hermosos y profesionales
✅ **Reportes JSON** - Datos estructurados para integración
✅ **Personalizable por Cliente** - Nombres y datos customizados

## 🚀 Inicio Rápido

### Requisitos
- Node.js 16+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/mauroociappinaph/web-audit-disconnect
cd web-audit-disconnect

# Instalar dependencias
npm install
```

### Primera Auditoría

```bash
# Auditar una web
node src/audit.js https://ejemplo.com "NombreCliente"

# Ejemplos
node src/audit.js https://google.com "Google Test"
node src/audit.js https://github.com "GitHub Audit"
node src/audit.js mi-negocio.ar "Mi Negocio"
```

## 📊 Output

### Carpeta `reports/`
```
reports/
├── NombreCliente_2025-12-05T13-30-45-123Z.html  # Reporte visual
└── NombreCliente_2025-12-05T13-30-45-123Z.json  # Datos raw
```

### Reporte HTML
- Dashboard con tarjetas informativas
- Código de color (verde=bueno, naranja=advertencia, rojo=error)
- Tabla de links rotos
- Métricas de performance
- SEO checklist

### Reporte JSON
```json
{
  "client": "NombreCliente",
  "url": "https://ejemplo.com",
  "timestamp": "2025-12-05T13:30:45Z",
  "ssl": {...},
  "links": {...},
  "uptime": {...},
  "performance": {...},
  "seo": {...},
  "duration": "4.23s"
}
```

## 📝 Uso Avanzado

### Integración en Scripts

```javascript
import WebAudit from './src/audit.js';

const audit = new WebAudit('https://ejemplo.com', 'Mi Cliente');
const results = await audit.runFullAudit();
await audit.generateReport('html'); // 'json' o 'both'
```

### Auditorías Múltiples

```bash
#!/bin/bash
webs=(
  "https://cliente1.com"
  "https://cliente2.com"
  "https://cliente3.com"
)

for web in "${webs[@]}"; do
  node src/audit.js "$web" "$(echo $web | cut -d'/' -f3)"
done
```

## 🎯 Casos de Uso

### 1. Vendedor de Servicios Web
- Audita webs de prospects
- Genera reportes visuales
- Usa de sales pitch

### 2. Agencia Digital
- Audita clientes antes/después
- Trackea mejoras en tiempo
- Reportes para stakeholders

### 3. Desarrollador Autónomo
- QA de proyectos
- Entrega de auditoría final
- Documentación técnica

### 4. Manager de Proyectos
- Validación pre-launch
- Health checks periódicos
- Dashboard de métricas

## 🔧 Stack Técnico

- **Runtime:** Node.js (ES Modules)
- **HTTP:** Axios
- **Scraping:** Cheerio
- **Reporting:** HTML + CSS vanilla
- **Logging:** Console nativa con colores

## 📦 Dependencias

```json
{
  "axios": "^1.6.0",
  "cheerio": "^1.0.0-rc.12",
  "dotenv": "^16.0.3"
}
```

## 🚧 Roadmap

- [ ] Script de descubrimiento de prospects
- [ ] Dashboard web para ver reportes
- [ ] Automatización con GitHub Actions
- [ ] API REST
- [ ] Base de datos para historico
- [ ] Notificaciones por email
- [ ] Integración con Lighthouse
- [ ] Multi-URL en un solo comando

## 💡 Ideas de Monetización

1. **SaaS Auditorías** - Suscripción mensual
2. **Lead Generation** - Vende webs rotas como prospects
3. **Consultoría** - Ofrece planes de mejora
4. **Automatización** - Auditorías programadas
5. **Templates** - Reportes personalizados por industria

## 📄 Licencia

MIT - Libre para usar y modificar

## 👨‍💻 Autor

**Mauro** - Full-stack developer de Argentina
- GitHub: [@mauroociappinaph](https://github.com/mauroociappinaph)
- LinkedIn: [Mauro](https://linkedin.com/in/mauro)

---

**¿Preguntas?** Abre un issue en el repositorio o contacta directamente.
