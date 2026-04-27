# Gantt Interno

Un tablero de obra hecho para que el cronograma no sea una planilla triste. Acá se planifican tareas, se respetan días hábiles, se imprimen vistas limpias y se exporta con formato de obra, no de powerpoint roto.

## Qué resuelve

- **Cronogramas de obra** con tareas y dependencias.
- **Cálculo automático de fechas** usando días hábiles.
- **Vista interactiva tipo Gantt** para editar y revisar avances.
- **Exportación e impresión** listas para compartir.
- **Seguridad por proyecto** con Supabase y RLS.

## Lo que hace hoy

- Crear, editar y eliminar tareas.
- Resolver dependencias y detectar ciclos.
- Filtrar tareas por nombre, duración, dependencia, rango de fechas y visibilidad.
- Mostrar días no laborables con una señal visual más clara.
- Exportar manteniendo la vista elegida: **días / semanas / mes**.

## Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Vitest + Testing Library

## Estructura rápida

```txt
app/                 rutas y páginas
components/gantt/    UI y lógica de Gantt
lib/                 motor de fechas y dependencias
types/               contratos TypeScript
supabase/migrations/ esquema y RLS
DOCS/                blueprint del proyecto
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000.

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Scripts

```bash
npm run dev
npm run lint
npm run type-check
npm test
npm run test:watch
```

## Notas de arquitectura

- Server Components por defecto.
- Client Components solo donde hay interacción.
- Cálculo de fechas en UTC.
- No se cuentan sábados ni domingos como laborables.
- La exportación usa una vista de impresión separada de la edición.

## Tests

Hay cobertura en:

- motor de fechas
- DAG de dependencias
- vista interactiva
- exportación / impresión
- acciones y repositorios

## Documento guía

Para entender el mapa completo del sistema, leé:

- `AGENTS.md`
- `DOCS/PROYECTO GANNT.md`

## Licencia

Uso interno.
