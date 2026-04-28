# Validación runtime RLS — usuarios-membresias-granulares

Este change agrega una suite de runtime real para RLS en:

- `supabase/__tests__/usuarios-membresias-granulares.runtime.test.ts`

## Qué valida en runtime real

1. **Acceso sólo por obra**: un usuario con `obra_memberships` (sin `project_memberships`) puede leer su obra y no otras.
2. **Acceso por proyecto**: un usuario con `project_memberships` mantiene acceso aunque no tenga membresía explícita por obra.
3. **Editor vs Viewer**: `viewer` no puede escribir en `tareas`; `editor` sí.
4. **Usuario inactivo**: `profiles.is_active = false` bloquea lectura y escritura aunque tenga membresías.

## Cómo ejecutarla

La suite runtime está **opt-in** para evitar mutaciones accidentales sobre entornos no dedicados:

```bash
ENABLE_SUPABASE_RLS_RUNTIME_TESTS=true \
npm test -- --run supabase/__tests__/usuarios-membresias-granulares.runtime.test.ts
```

Variables requeridas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Limitación actual (performance/planner)

En este repo no hay hoy una infraestructura de Postgres local versionada para tests (sin `supabase/config.toml` y sin Docker garantizado), y el runner Vitest actual no tiene un canal SQL directo para `EXPLAIN ANALYZE` dentro de la suite.

Por eso la verificación de performance queda dividida así:

- **Runtime real**: comportamiento funcional RLS (allow/deny) con usuarios reales.
- **Contrato SQL reforzado**: `supabase/__tests__/usuarios-membresias-granulares.migration.test.ts` valida predicados críticos alineados a paths indexables (`user_id`, `obra_id`, `project_id`) y evita regressions semánticas.

Si más adelante se incorpora stack local de Supabase/Postgres en CI, se puede extender esta suite con assertions de planner (`EXPLAIN`) para cerrar completamente el gap de performance runtime.
