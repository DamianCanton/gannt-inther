# Fases de Desarrollo (estado actual)

> Última actualización: 2026-04-07
> Fuente de verdad arquitectónica: `DOCS/PROYECTO GANNT.md` (macro-fases 1–4).
> Nota operativa: `README.md` también usa milestones técnicos 1–6; se listan abajo para mantener trazabilidad.

## A) Macro-fases del Blueprint (1–4)

| Fase | Estado | Resumen corto | Engram ID(s) útiles |
|---|---|---|---|
| 1. Setup y Motor (sin UI) | ✅ Realizada | Implementación engine-first completada y archivada via SDD (motor de fechas + DAG + contratos + pruebas). | `81` (explore), `84` (proposal), `86` (spec), `88` (design), `92` (tasks), `97` (apply), `99` (verify), `113` (archive), `112` (state) |
| 2. UI Interactiva (canvas) | ✅ Realizada | Cambio SDD `roadmap-phase-3-interactive-gantt-view` implementado, verificado (PASS) y archivado en Engram. | `208` (explore), `211` (proposal), `215` (spec), `218` (design), `222` (tasks), `224` (apply), `228` (verify), `239` (archive) |
| 3. Exportación (tabla / print) | ✅ Realizada | Cambio SDD `roadmap-phase-4-print-view` implementado, verificado (PASS WITH WARNINGS) y archivado en Engram. | `248` (explore), `250` (proposal), `252` (spec), `256` (design), `260` (tasks), `264` (apply), `270` (verify), `277` (archive) |
| 4. Pulido (RLS + errores + hardening) | ✅ Realizada | Auth/RLS, CRUD, UX async (carga visible), fix atómico de creación con dependencias y hardening completados y archivados. | `151` (archive phase 6), `206` (archive phase 5), `239` (archive phase 3), `326` (archive A4 fixes) |

## B) Milestones técnicos operativos (README)

| Phase (README) | Estado | Prioridad sugerida | Resumen corto | Engram ID(s) útiles |
|---|---|---|---|---|
| Phase 1: Foundation Scaffold | ✅ Realizada | — | Scaffold base del proyecto y estructura inicial. | `81` (explore describe scaffold/base) |
| Phase 2: Date Engine Implementation | ✅ Realizada | — | Cambio SDD `start with the second phase of develop` completado y archivado. | `84`, `86`, `88`, `92`, `97`, `99`, `113`, `112` |
| Phase 3: Interactive Gantt View | ✅ Realizada | — | Cambio SDD `roadmap-phase-3-interactive-gantt-view` completado con timeline interactivo + intents + reconciliación server-authoritative. | `208`, `211`, `215`, `218`, `222`, `224`, `228`, `239` |
| Phase 4: Print View | ✅ Realizada | — | Cambio SDD `roadmap-phase-4-print-view` completado, re-verificado y archivado en Engram. | `248`, `250`, `252`, `256`, `260`, `264`, `270`, `277` |
| Phase 5: CRUD Operations | ✅ Realizada | — | Cambio SDD `roadmap-phase-5-crud-operations` completado, re-verificado y archivado en Engram. | `156`, `159`, `163`, `166`, `170`, `173`, `195`, `206` |
| Phase 6: Authentication & Authorization | ✅ Realizada | — | Cambio SDD `roadmap-phase-6-critical modo auto` verificado y archivado en Engram. | `124`, `128`, `130`, `133`, `140`, `151` |

## IDs recomendados para profundizar rápido

- `239` → Archive report final de **Phase 3 Interactive Gantt View**.
- `206` → Archive report final de **Phase 5 CRUD Operations**.
- `151` → Archive report final de **Phase 6 Auth & Authorization**.
- `228` → Verify report de Phase 3 (cierre de warnings + PASS).
- `195` → Verify report de Phase 5 (antes de cierre final y archive).

## Mapa de equivalencias (A ↔ B)

| Macro-fase A (Blueprint) | Milestones B (README) relacionados | Nota |
|---|---|---|
| A1. Setup y Motor | B1 Foundation Scaffold + B2 Date Engine | A1 quedó cubierta con el scaffold base y el cierre del change engine-first. |
| A2. UI Interactiva | B3 Interactive Gantt View + parte de B5 CRUD | La UI necesita interacción completa y operaciones de edición para considerarse cerrada. |
| A3. Exportación | B4 Print View | Equivalencia casi 1:1 (tabla/print y exportación PDF). |
| A4. Pulido | B6 Auth + parte de B5 CRUD + hardening transversal | Incluye seguridad (RLS/Auth), manejo de errores y cierre de brechas de calidad. |

### Cómo leer el estado sin confusiones

- Si querés visión de arquitectura/producto → mirá **A**.
- Si querés planificación de ejecución detallada → mirá **B**.
- Regla práctica: un change SDD cerrado no implica que todo el roadmap A/B esté cerrado; sólo cierra el alcance de ese change.

## Orden de ejecución sugerido (próximo tramo)

1. **Revisión final de estabilización E2E** o inicio de una nueva feature (MVP finalizado y estabilizado).

> Nota: Todas las fases principales de arquitectura (1 a 4) y roadmap operativo (1 a 6) se encuentran ✅ Realizadas y estabilizadas.
