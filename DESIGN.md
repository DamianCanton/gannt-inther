# Gantt Internal Management System — DESIGN.md

## 0. Propósito del sistema de diseño

Este documento define las reglas visuales y de interacción para mantener alineadas todas las vistas del proyecto:

- listado de obras;
- vista interna de Gantt;
- vista de impresión/exportación;
- formularios de creación/edición;
- drawers, modales y estados vacíos.

El objetivo es que la aplicación se perciba como un único producto profesional, no como pantallas aisladas. Toda nueva vista debe respetar estos criterios antes de considerarse terminada.

---

## 1. Filosofía de diseño: Data-Dense Minimalism

El sistema combina una estética SaaS técnica y limpia con una interfaz pensada para planificación de obra. La app debe permitir ver mucha información sin sentirse pesada.

### Principios

1. **Claridad operativa sobre decoración**  
   Cada elemento visible debe ayudar a decidir, editar, entender o exportar.

2. **El Gantt es el centro del producto**  
   En vistas de planificación, la línea de tiempo y las tareas tienen prioridad visual. Los formularios no deben competir con el cronograma.

3. **Edición contextual**  
   La edición compleja vive en drawers laterales o modales. La vista principal debe conservar el contexto.

4. **Consistencia entre dashboard y detalle**  
   El listado de obras debe sentirse visualmente conectado con la vista `/obras/[id]`.

5. **Exportación profesional**  
   Todo output para cliente debe ser legible, sobrio y visualmente estable. La exportación no debe depender únicamente de la escala de impresión A4 si el Gantt requiere más ancho.

---

## 2. Paleta de colores y tokens INTHER

El sistema usa un alto contraste entre la navegación corporativa y un lienzo de trabajo claro.

### 2.1. Colores base

| Token | Hex | Uso |
|---|---:|---|
| `primary` | `#263a54` | Sidebar, navegación, estructura, texto institucional fuerte |
| `accent` | `#f69323` | Marca INTHER, estado activo de navegación, acentos puntuales |
| `action` | `#2563eb` | Acciones primarias de producto: abrir diagrama, guardar cambios, exportar |
| `actionHover` | `#1d4ed8` | Hover de acciones primarias |
| `danger` | `#dc2626` | Acciones destructivas: eliminar obra, eliminar tarea |
| `success` | `#16a34a` | Estados positivos: activa, completada, correcto |
| `warning` | `#f59e0b` | Advertencias no destructivas |

### 2.2. Regla de uso entre naranja y azul

El naranja INTHER es **marca y navegación**, no debe usarse como color primario de todos los botones.

- Usar `accent` para:
  - logo;
  - item activo de sidebar;
  - detalles de marca;
  - separadores o acentos muy puntuales.

- Usar `action` para:
  - “Crear diagrama nuevo”;
  - “Abrir diagrama”;
  - “Guardar cambios”;
  - “Exportar”;
  - acciones principales dentro del flujo de producto.

Esto evita que la marca compita con las acciones operativas.

### 2.3. Superficies y grises

| Token sugerido | Tailwind | Uso |
|---|---|---|
| Canvas | `bg-slate-50` o `bg-gray-50/50` | Fondo general de app |
| Surface | `bg-white` | Cards, paneles, drawers, tablas |
| Border | `border-slate-200` | Bordes estándar |
| Border subtle | `border-slate-100` | Separadores internos |
| Text strong | `text-slate-950` | Títulos principales |
| Text body | `text-slate-700` | Texto normal |
| Text muted | `text-slate-500` | Labels, metadata |
| Text faint | `text-slate-400` | Placeholders, ayuda secundaria |

---

## 3. Tipografía y densidad

### 3.1. Jerarquía tipográfica

| Elemento | Clase sugerida |
|---|---|
| Título de vista | `text-2xl font-semibold tracking-tight text-slate-950` |
| Subtítulo de vista | `text-sm text-slate-500` |
| Título de card | `text-base font-semibold tracking-tight text-slate-950` |
| Título de sección | `text-sm font-semibold text-slate-800` |
| Label | `text-xs font-medium text-slate-500` |
| Metadata | `text-xs text-slate-500` |
| Botón | `text-sm font-medium` |

### 3.2. Números y fechas

Fechas, duraciones, offsets, días y coordenadas temporales deben usar:

```txt
font-mono tabular-nums
```

Esto es obligatorio en:

- headers del Gantt;
- columnas de días/semanas/meses;
- duraciones;
- rangos de fechas;
- exportación PDF/PNG/JPG.

Motivo: en un Gantt, la alineación temporal es matemática. Las cifras no deben variar de ancho.

---

## 4. Layout base de aplicación

### 4.1. App Shell

La estructura global recomendada es:

```txt
┌─────────────────────┬────────────────────────────────────────────┐
│ Sidebar fija         │ Main content                               │
│ Navy                 │ Header + contenido                         │
│                     │                                            │
└─────────────────────┴────────────────────────────────────────────┘
```

### 4.2. Sidebar

La sidebar es fija, dark navy y consistente en todo el proyecto.

Características:

- ancho desktop sugerido: `240px` a `260px`;
- background: `bg-primary` o gradiente muy sutil basado en `primary`;
- logo arriba;
- navegación principal en el primer bloque;
- acciones de sesión/navegación al fondo;
- divisores sutiles con `border-white/10`.

### 4.3. Estado activo de navegación

El item activo debe usar el naranja de marca.

Clase conceptual:

```txt
bg-accent text-white shadow-sm
```

Items no activos:

```txt
text-white/80 hover:bg-white/10 hover:text-white
```

### 4.4. Área principal

Para dashboards y listados:

```txt
max-w-7xl mx-auto px-6 py-8
```

Para la vista Gantt, puede usarse más ancho disponible:

```txt
w-full px-6 py-6
```

La vista Gantt debe priorizar espacio horizontal.

---

## 5. Botones y acciones

### 5.1. Botón primario

Usar para la acción principal de cada contexto.

Ejemplos:

- “Crear diagrama nuevo”;
- “Abrir diagrama”;
- “Guardar cambios”;
- “Exportar”.

Clase conceptual:

```txt
bg-action text-white hover:bg-actionHover rounded-lg shadow-sm
focus-visible:ring-2 focus-visible:ring-blue-500/40
```

### 5.2. Botón secundario

Usar para acciones neutrales:

- cancelar;
- volver;
- opciones;
- filtros;
- vista días/semanas/mes.

Clase conceptual:

```txt
bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg
```

### 5.3. Acción destructiva

Eliminar no debe competir con la acción principal.

Preferir:

```txt
text-danger border border-red-100 bg-white hover:bg-red-50
```

Reglas:

- “Eliminar obra” es secundaria.
- Siempre debe tener confirmación.
- No usar rojo como botón principal grande salvo en confirmación final destructiva.

---

## 6. Cards y superficies

### 6.1. Cards base

Las cards son superficies blancas con borde y sombra muy suave.

```txt
bg-white border border-slate-200 rounded-2xl shadow-sm
```

Hover para cards clickeables:

```txt
hover:border-slate-300 hover:shadow-md transition-all duration-200
```

Usar `hover:-translate-y-[1px]` o `hover:-translate-y-[2px]` solo en dashboards, no en tablas densas.

### 6.2. Cards de obra

Cada card del listado de obras debe contener:

1. título de obra;
2. badge de tipo;
3. cantidad de tareas;
4. cliente;
5. fecha de inicio;
6. mini preview decorativo;
7. botón principal “Abrir diagrama”;
8. acción secundaria “Eliminar obra”;
9. estado “Activa”.

La card debe comunicar rápidamente: “esta es una obra con cronograma disponible”.

### 6.3. Mini preview decorativo

El preview en el dashboard es decorativo, no debe depender del motor Gantt real en la primera versión.

Debe incluir:

- grilla sutil;
- mini columna de tarea;
- 3 o 4 filas;
- barras azules redondeadas;
- una línea vertical punteada;
- fechas mínimas en header si entran sin ruido.

No debe:

- recalcular dependencias;
- cargar tareas completas;
- generar sobrecosto importante;
- reemplazar al Gantt real.

---

## 7. Vista de listado de obras

### 7.1. Objetivo

La vista de obras es un dashboard operativo. Debe permitir encontrar y abrir una obra rápidamente.

### 7.2. Estructura visual

```txt
Header de vista
└── Título + subtítulo

Action row
├── Buscador
├── contador de obras
└── Crear diagrama nuevo

Grid de cards
├── Obra card
├── Obra card
└── Obra card
```

### 7.3. Buscador

Debe ser visible y estar en la primera línea operativa.

```txt
placeholder: Buscar por nombre o cliente...
```

Debe filtrar por:

- nombre de obra;
- cliente;
- tipo si ya existe soporte.

### 7.4. Crear diagrama nuevo

Debe ser botón primario azul. El naranja queda reservado para navegación/marca.

---

## 8. Vista Gantt interactiva `/obras/[id]`

### 8.1. Objetivo

La vista Gantt es la pantalla principal de trabajo. Debe maximizar lectura, edición rápida y contexto temporal.

### 8.2. Estructura

```txt
Header compacto
Toolbar de Gantt
Canvas principal
├── Task tree
└── Timeline
Drawer derecho de edición
```

### 8.3. Header compacto

Debe incluir:

- volver;
- nombre de obra;
- metadata resumida;
- botón “Nueva tarea”;
- menú/exportación.

No mostrar UUIDs técnicos como información principal.

### 8.4. Toolbar Gantt

Debe incluir:

- selector Días / Semanas / Mes;
- toggle Dependencias;
- toggle Feriados;
- buscador de tarea;
- filtros si aplica.

### 8.5. Task tree

Debe mostrar jerarquía clara:

- grupos;
- tareas principales;
- subtareas;
- indentación;
- chevrons;
- iconos simples;
- fila seleccionada.

### 8.6. Timeline

Debe ser menos Excel y más herramienta de planificación:

- grilla sutil;
- weekends diferenciados;
- barras redondeadas;
- línea “Hoy”;
- selección visible;
- hover con feedback.

---

## 9. Drawers y edición contextual

### 9.1. Regla general

Los formularios complejos no deben vivir fijos dentro del canvas principal. Deben abrirse en drawer derecho.

Usar drawers para:

- crear tarea;
- editar tarea;
- editar datos de obra;
- opciones avanzadas;
- configuración de exportación.

### 9.2. Drawer visual

```txt
bg-white border-l border-slate-200 shadow-xl
```

Ancho sugerido:

- desktop: `360px` a `420px`;
- pantallas chicas: ocupar ancho completo.

### 9.3. Estructura de drawer

```txt
Header
├── título
├── badge/tipo
└── cerrar

Body
├── campos principales
├── ayuda contextual
└── opciones avanzadas colapsables

Footer
├── acción primaria
└── acción destructiva/secundaria
```

---

## 10. Exportación e impresión

### 10.1. Principio

La exportación para cliente debe ser tratada como un artefacto profesional, no como una simple captura de la vista interactiva.

### 10.2. Modos esperados

La aplicación debe tender a soportar:

- PNG alta resolución;
- JPG;
- PDF tamaño automático;
- PDF A4 horizontal como compatibilidad.

### 10.3. Regla de legibilidad

El Gantt exportado no debe comprimir columnas hasta volver ilegibles las fechas.

Si el contenido no entra legible en A4:

- usar PDF tamaño automático;
- usar escala semanal;
- o exportar PNG de alta resolución.

### 10.4. Export surface

Toda exportación debe salir de un componente dedicado, no de la UI interactiva.

```txt
GanttExportSurface
├── Header profesional
├── Metadata de obra
├── Tabla/Gantt
└── Footer
```

Debe conservar:

- logo;
- obra;
- cliente;
- vigencia;
- duración;
- desde/hasta;
- tareas;
- duraciones;
- escala;
- barras;
- fecha de impresión/exportación.

---

## 11. Tablas y Gantt exportable

### 11.1. Tabla exportable

La vista exportable puede ser más tabular que la interactiva, porque su objetivo es presentación y legibilidad.

Reglas:

- header azul fuerte;
- texto legible;
- filas con altura consistente;
- barras visibles;
- fines de semana diferenciados;
- meses agrupados;
- no pisar fechas;
- no cortar contenido.

### 11.2. Anchos mínimos

Valores sugeridos:

```txt
Columna tarea: 240px a 320px
Columna duración: 48px a 64px
Columna diaria: 28px mínimo, ideal 32px a 40px
Row height: 28px a 36px
Header export: 110px a 150px
Footer: 28px a 40px
```

---

## 12. Badges y estados

### 12.1. Badge de tipo de obra

```txt
bg-slate-100 text-slate-700 ring-1 ring-slate-200
```

Ejemplos:

- `TIPO A`
- `TIPO B`
- `TIPO C`

### 12.2. Estado activo

```txt
bg-green-50 text-green-700 ring-1 ring-green-600/10
```

O en forma mínima:

```txt
punto verde + Activa
```

### 12.3. Estado en progreso

```txt
bg-blue-50 text-blue-700 ring-1 ring-blue-600/10
```

### 12.4. Estado pausado

```txt
bg-amber-50 text-amber-700 ring-1 ring-amber-600/10
```

### 12.5. Estado finalizado

```txt
bg-slate-100 text-slate-600 ring-1 ring-slate-300
```

---

## 13. Formularios

### 13.1. Campos

Inputs y selects:

```txt
h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm
focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500
```

### 13.2. Labels

```txt
text-sm font-medium text-slate-700
```

### 13.3. Texto de ayuda

```txt
text-xs text-slate-500
```

### 13.4. Opciones avanzadas

Deben estar colapsadas por defecto salvo que el usuario esté editando una tarea compleja.

---

## 14. Estados vacíos, carga y errores

### 14.1. Empty state

Usar cuando no hay obras, tareas o resultados de búsqueda.

```txt
border border-dashed border-slate-300 rounded-2xl bg-white
```

Debe incluir:

- icono sutil;
- título claro;
- explicación breve;
- acción principal si corresponde.

### 14.2. Loading

Usar skeletons en lugar de spinners invasivos.

### 14.3. Errores

Los errores deben mostrarse inline o en toast controlado. Evitar `alert()` del navegador.

---

## 15. Responsive

### 15.1. Dashboard de obras

- desktop: 3 columnas;
- tablet: 2 columnas;
- mobile: 1 columna;
- buscador y botón pueden apilarse en mobile.

### 15.2. Gantt

- desktop: split task tree + timeline;
- pantallas chicas: mantener scroll horizontal;
- drawer ocupa ancho completo en mobile;
- no intentar comprimir el timeline hasta romperlo.

---

## 16. Accesibilidad

Reglas mínimas:

- todo botón debe tener texto o `aria-label`;
- focus visible obligatorio;
- contraste suficiente;
- acciones destructivas con confirmación;
- inputs con label o `aria-label`;
- navegación con teclado viable en formularios y drawers.

---

## 17. Reglas de implementación

### 17.1. No duplicar patrones

Si existe un componente común para:

- sidebar;
- botón;
- card;
- drawer;
- badge;
- input;

se debe reutilizar o extender antes de crear uno nuevo.

### 17.2. Componentización recomendada

```txt
components/layout/
├── AppSidebar.tsx
└── AppShell.tsx

components/obras/
├── ObrasPageHeader.tsx
├── ObrasToolbar.tsx
├── ObraCard.tsx
└── MiniGanttPreview.tsx

components/gantt/
├── GanttToolbar.tsx
├── TaskTree.tsx
├── GanttTimeline.tsx
├── TaskEditDrawer.tsx
└── GanttBar.tsx

components/gantt/export/
├── GanttExportSurface.tsx
├── GanttExportHeader.tsx
├── GanttExportTable.tsx
└── GanttExportFooter.tsx
```

Adaptar nombres y paths a la estructura real del proyecto.

---

## 18. Visual matching loop

Toda refactorización visual relevante debe cerrarse con una comparación contra la referencia visual definida.

Proceso:

1. levantar app local;
2. abrir la vista modificada;
3. tomar screenshot desktop 16:9;
4. comparar contra la imagen modelo;
5. ajustar espaciado, proporciones, jerarquía, colores y densidad;
6. repetir hasta que el resultado sea coherente.

No se exige pixel-perfect, pero sí coherencia fuerte de producto.

---

## 19. Tailwind config sugerido

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#263a54',   // Navy INTHER — sidebar, navegación, estructura
        accent: '#f69323',    // Naranja INTHER — marca y navegación activa
        action: '#2563eb',    // Azul operativo — acciones primarias
        actionHover: '#1d4ed8',
        danger: '#dc2626',
        success: '#16a34a',
        text: '#333333',
        background: '#ffffff',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
};
```

---

## 20. Checklist de alineación por vista

Antes de cerrar cualquier vista, verificar:

- [ ] usa sidebar común;
- [ ] respeta navy/orange/blue según la función de cada color;
- [ ] tiene header claro;
- [ ] las acciones principales son azules;
- [ ] las acciones destructivas son secundarias y rojas;
- [ ] las cards/paneles usan `bg-white`, borde sutil y sombra suave;
- [ ] fechas y números usan `font-mono tabular-nums`;
- [ ] el espaciado coincide con el resto del producto;
- [ ] responsive básico correcto;
- [ ] focus visible;
- [ ] no hay UUIDs o datos técnicos expuestos innecesariamente;
- [ ] se hizo visual matching loop contra la referencia correspondiente.
