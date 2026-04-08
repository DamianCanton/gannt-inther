# Gantt Interno - Sistema de Gestión de Cronogramas

Sistema web interno para crear, gestionar y exportar diagramas de Gantt enfocados en proyectos de construcción. Construido con Next.js (App Router) + TypeScript + Tailwind CSS, respaldado por Supabase.

## Descripción

Gantt Interno es una aplicación web interna que permite a los equipos de construcción:

- **Crear y gestionar cronogramas de obra** con tareas y dependencias
- **Calcular fechas automáticamente** basadas en días hábiles (excluyendo fines de semana y feriados)
- **Visualizar el cronograma** en una vista interactiva tipo Gantt
- **Exportar a PDF** con formato optimizado para impresión (A4 horizontal)

## Estado del Proyecto

**Fase Actual**: Fase de hardening post-archive (alineación documental + cobertura de tests) ✅

> **Nota de alineación de fases (Abr 2026):**
> `DOCS/PROYECTO GANNT.md` define **macro-fases de blueprint** (1: Setup+Motor, 2: UI, 3: Exportación, 4: Pulido).
> Este README venía usando una numeración operativa distinta para implementación incremental.
> Para evitar drift, desde ahora se usa la narrativa del blueprint como referencia arquitectónica y este README mantiene milestones técnicos complementarios.

Este scaffold proporciona:
- ✅ Configuración de build (Next.js, TypeScript strict mode, Tailwind CSS)
- ✅ Integración con Supabase (clientes server y browser)
- ✅ Estructura de rutas y componentes base
- ✅ Lógica de negocio base implementada (date-engine, gantt-dag)
- ✅ Suite inicial de tests unitarios/integración en Vitest
- ⏳ Vista interactiva de Gantt (Phase 3)
- ⏳ Vista de impresión con tabla HTML (Phase 4)
- ⏳ Operaciones CRUD de tareas (Phase 5)
- ✅ Autenticación y autorización base (Phase 6 en progreso)

## Prerrequisitos

- **Node.js** 18.0.0 o superior
- **npm** 9.0.0 o superior
- **Cuenta de Supabase** (gratuita en [supabase.com](https://supabase.com))

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd gannt-inther
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa con tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

Edita `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

**Cómo obtener las credenciales:**

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Project Settings** > **API**
3. Copia **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copia **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Ejecutar migraciones de base de datos

Las migraciones SQL están en `supabase/migrations/`. Para aplicarlas:

**Opción A: Supabase CLI (recomendado)**
```bash
npx supabase db push
```

**Opción B: Ejecutar manualmente en el SQL Editor de Supabase**
- Ve al SQL Editor en tu proyecto Supabase
- Copia el contenido de `supabase/migrations/20260401_gantt_schema_rls.sql`
- Ejecuta el script

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts de Desarrollo

```bash
# Servidor de desarrollo (con hot-reload)
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start

# Verificar tipos de TypeScript
npm run type-check

# Ejecutar linter (ESLint)
npm run lint

# Ejecutar tests unitarios (Vitest)
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

## Estructura del Proyecto

```
/
├── app/                    # Next.js App Router (rutas y páginas)
│   ├── (routes)/          # Grupo de rutas (no afecta URL)
│   │   ├── obras/         # Lista de obras
│   │   └── obra/[id]/     # Vista de obra individual
│   │       ├── page.tsx   # Vista interactiva
│   │       └── print/     # Vista de impresión
│   ├── layout.tsx         # Layout raíz
│   ├── page.tsx           # Página de inicio
│   └── globals.css        # Estilos globales (Tailwind + print)
├── components/
│   ├── ui/                # Componentes base (Button, Input, Card)
│   └── gantt/             # Componentes específicos de Gantt
│       ├── gantt-interactive.tsx  # Cliente (interactivo)
│       └── gantt-print-table.tsx  # Servidor (impresión)
├── lib/
│   ├── supabase/          # Clientes Supabase (server + browser)
│   ├── repositories/      # Capa de acceso a datos (GanttRepo)
│   ├── date-engine.ts     # Cálculos de fechas hábiles (stub)
│   └── gantt-dag.ts       # Resolución de dependencias (stub)
├── types/
│   └── gantt.ts           # Definiciones TypeScript
├── supabase/
│   └── migrations/        # Migraciones SQL
├── public/                # Assets estáticos
├── package.json           # Dependencias y scripts
├── tsconfig.json          # Configuración TypeScript
├── tailwind.config.js     # Configuración Tailwind
└── next.config.js         # Configuración Next.js
```

## Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL con Row Level Security)
- **Testing**: Vitest (unit tests), Playwright (E2E - futuro)
- **Deployment**: Vercel (recomendado)

### Patrones de Diseño

- **Server Components por defecto**: Mejor performance, menor bundle size
- **Client Components solo cuando necesario**: Interactividad explícita
- **Data fetching en servidor**: Evita waterfalls, mejor SEO
- **Arquitectura en capas**: Routing → Components → Business Logic → Data

### Lógica de Negocio (Milestone técnico implementado)

**Date Engine** (`lib/date-engine.ts`):
- `addWorkingDays()`: Suma días hábiles a una fecha (excluyendo fines de semana y feriados)
- `isWorkingDay()`: Verifica si una fecha es día hábil
- `countWorkingDays()`: Cuenta días hábiles entre dos fechas

**Gantt DAG** (`lib/gantt-dag.ts`):
- `resolveDependencies()`: Calcula fechas de inicio/fin de todas las tareas basándose en dependencias
- `detectCycle()`: Detecta dependencias circulares (error)
- `topologicalSort()`: Ordena tareas respetando dependencias

**Estado actual**: Implementada con tests unitarios e integración en ejecución bajo Vitest.

## Roadmap de Fases (milestones técnicos internos)

### ✅ Phase 1: Foundation Scaffold (Completo)
- Configuración de build y tooling
- Estructura de rutas y componentes base
- Integración básica con Supabase
- Stubs de lógica de negocio

### ⏳ Phase 2: Date Engine Implementation
- Implementar `date-engine.ts` con tests exhaustivos
- Implementar `gantt-dag.ts` con tests exhaustivos
- Cobertura de tests >90%

### ⏳ Phase 3: Interactive Gantt View
- Vista interactiva con drag-and-drop
- Edición de duraciones y dependencias
- Estado local con React

### ⏳ Phase 4: Print View
- Tabla HTML optimizada para impresión
- Auto-escalado (formato diario vs semanal)
- Estilos A4 horizontal

### ⏳ Phase 5: CRUD Operations
- Crear/editar/eliminar tareas
- Crear/editar/eliminar dependencias
- Server Actions para mutaciones

### ⏳ Phase 6: Authentication & Authorization (en progreso)
- ✅ Login/signup/signout con Supabase Auth
- ✅ Scope de proyecto derivado de membresías (`project_memberships`)
- ✅ Guards server-side para `/obras`, `/obra/[id]`, `/obra/[id]/print` y Server Actions
- ✅ Fallback por `NEXT_PUBLIC_DEFAULT_PROJECT_ID` removido de code paths críticos
- ⏳ Definir selector de proyecto para usuarios multi-membership

## Limitaciones Conocidas (estado actual)

1. **Selector multi-proyecto pendiente**: hoy el proyecto activo se resuelve con regla determinística (membership más antigua por `created_at`, desempate por `project_id`).
2. **Cobertura no uniforme**: hay áreas con muy buena cobertura (motor de fechas y DAG) y otras con cobertura baja o nula (middleware/config/rutas no testeadas).
3. **Vista Gantt placeholder**: Componentes interactivos y de impresión muestran mensaje "En desarrollo".
4. **Testing en expansión**: ya existen tests unitarios e integración en Vitest, pero faltan E2E y casos de borde adicionales.
5. **Accesibilidad básica**: Componentes UI no tienen atributos ARIA ni navegación por teclado.

## Contribuir

Lee [AGENTS.md](./AGENTS.md) para entender:
- Convenciones de código (TypeScript strict, Tailwind utilities)
- Patrones de componentes (Server vs Client)
- Estrategias de testing
- Reglas de linting

### Flujo de Trabajo

1. Crea una rama: `git checkout -b feat/nueva-funcionalidad`
2. Escribe código siguiendo [AGENTS.md](./AGENTS.md)
3. Verifica: `npm run type-check && npm run lint && npm test`
4. Commit: Usa [Conventional Commits](https://www.conventionalcommits.org/)
5. Push y abre Pull Request

## Recursos

- [Documentación Next.js](https://nextjs.org/docs)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación Tailwind CSS](https://tailwindcss.com/docs)
- [Arquitectura del Proyecto](./DOCS/PROYECTO%20GANNT.md)

## Licencia

Uso interno. Todos los derechos reservados.
