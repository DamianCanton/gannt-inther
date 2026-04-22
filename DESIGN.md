# Gantt Internal Management System — DESIGN.md

## 1. Filosofía de Diseño: "Data-Dense Minimalism"
El sistema fusiona la estética técnica de **Linear.app** con la modularidad de los dashboards modernos premiados (estilo Bento UI).
- **Objetivo:** Precisión técnica absoluta. El usuario (Project Manager) necesita ver mucha información de un vistazo sin sentirse abrumado.
- **Regla de Oro:** Funcionalidad sobre decoración. Cero elementos superfluos. Formularios complejos, historiales y acciones destructivas viven en Drawers (paneles laterales) o Modales para no perder el contexto de la vista principal.

## 2. Paleta de Colores y Tokens (INTHER Brand)

El sistema de diseño usa un alto contraste entre la barra lateral corporativa y el lienzo de trabajo ultra-limpio.

### Brand Colors (Tailwind Config)
- **Primary (`bg-primary`, `#263a54`):** Azul marino profundo. Color de la sidebar, navegación y elementos estructurales.
- **Accent (`bg-accent`, `#f69323`):** Naranja INTHER. Color de acción. Usado SOLO para el "Happy Path" (ej. "Crear obra", "Exportar PDF"). No abusar para no diluir su peso.
- **Hover/Selección:** `bg-accent/10` o `bg-primary/10` para estados de selección suaves.

### Escala de Grises y Superficies
- **Canvas (Fondo App):** `bg-gray-50/50`. Apenas un respiro para que las tarjetas destaquen.
- **Superficies (Cards/Paneles):** `bg-white`.
- **Textos:** - Títulos/Métricas clave: `text-gray-900`
  - Cuerpo/Labels: `text-gray-600`
  - Metadatos/Fechas/Estados atenuados: `text-gray-400`

## 3. Arquitectura Visual: Bento Grid y Sombras

Para la vista de Dashboard, abandonamos el listado simple. Usaremos un sistema de grilla (Bento) donde cada card tiene un peso visual basado en su importancia.

- **Bordes ultra sutiles:** El estándar es `border-gray-200`. NUNCA negro translúcido.
- **Sombras arquitectónicas:** - Cards base: `shadow-sm`
  - Hover en elementos clickeables: `shadow-md transition-shadow duration-200`
  - Dropdowns/Modales: `shadow-xl ring-1 ring-black/5`
- **Radios (Border Radius):** - Estándar global: `rounded-xl` para contenedores principales (suaviza la rigidez del Gantt).
  - Componentes internos (botones, badges): `rounded-lg`.

## 4. Tipografía y Densidad de Datos

- **Títulos y Métricas:** Usar `tracking-tight` (letter-spacing: -0.025em). Los números de contadores globales deben ser grandes y audaces (ej. `text-3xl font-bold tracking-tighter`).
- **Números (CRÍTICO):** Fechas, duraciones e IDs llevan `tabular-nums font-mono text-[13px]`. Es innegociable en un Gantt para alinear columnas matemáticamente.
- **Jerarquía SaaS:** - Header de vista: `text-[18px] font-semibold`.
  - Título de card (Obra): `text-[14px] font-medium`.
  - Metadatos (Cliente, Inicio): `text-[12px] uppercase tracking-wider text-gray-500`.

## 5. Estados Interactivos y Micro-interacciones

- **Focus Rings:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inther-orange/40 focus-visible:border-inther-orange`.
- **Interacción de Cards (Dashboard):** - Hover: El borde muta a `hover:border-gray-300`, y un sutil desplazamiento `hover:-translate-y-[2px]` (usar con moderación, solo en cards que sean links a la obra).
- **Badges de Estado:** Usar fondos suaves con texto fuerte. Ej: `bg-blue-50 text-blue-700 ring-1 ring-blue-600/10` para "En progreso".

## 6. Patrones de Componentes Core

### 6.1. Layout Base (App Shell)
Sidebar fijo a la izquierda (Navy). Topbar minimalista (breadcrumbs y avatar). Área principal con `max-w-7xl mx-auto px-6 py-8` para contener la grilla.

### 6.2. Drawers (Slide-overs) sobre Modales
Para gestionar la información de una Obra (que eventualmente tendrá muchas tareas y adjuntos), usar Drawers que entran desde la derecha en lugar de Modales centrales. Mantienen el contexto visual del Gantt de fondo.
- **Fondo:** `backdrop-blur-sm bg-gray-900/20`.

### 6.3. Empty States y Errores
- Bordes punteados (`border-dashed border-gray-300`), íconos en `text-gray-400`.
- Errores en Server Actions renderizados inline, NUNCA en alertas invasivas del navegador.

## 7. Referencias para el Setup de Tailwind (Config real del proyecto)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#263a54',   // Navy INTHER — sidebar, estructural
        accent: '#f69323',    // Naranja INTHER — acción, happy path
        text: '#333333',
        background: '#ffffff',
      }
    }
  }
}
