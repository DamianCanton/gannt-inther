# Blueprint de Arquitectura: Sistema Interno de Gestión Gantt

## 1. Visión General del Producto

> **Nota de alineación documental (Abr 2026):** este blueprint conserva la numeración de macro-fases (1-4) como marco arquitectónico. Si otros documentos operativos (por ejemplo, README) muestran milestones técnicos con otro detalle, debe prevalecer esta estructura como narrativa base para evitar drift de “Fase 2”.

Aplicación web interna para la creación, gestión y exportación (PDF) de diagramas de Gantt enfocados en obras. Diseñada para reemplazar un flujo de trabajo manual en Excel, priorizando la automatización de fechas ("Efecto Dominó") y la fidelidad visual en la exportación a papel.

Usuarios: 3 a 6 usuarios internos (requiere autenticación, sin concurrencia estricta/realtime).

Volumen: 3 tipos de obras predeterminadas, ~10 tareas base por obra (modificables).

Premisa UX ("A prueba de tontos"): El usuario define la Fecha de Inicio de la Obra y las duraciones/dependencias de las tareas. El sistema autocalcula TODAS las fechas de inicio y fin, saltando fines de semana y feriados.

## 2. Stack Tecnológico Definido

Frontend: Next.js (App Router) + TypeScript + Tailwind CSS.

Backend as a Service (BaaS): Supabase (PostgreSQL + Auth + Row Level Security).

Hosting: Vercel.

Librería Gantt: NINGUNA. Desarrollo In-House del motor de fechas y la capa de renderizado visual para garantizar control total sobre feriados, dependencias y formato de impresión.

### 3. Modelo de Datos Core (PostgreSQL en Supabase)El esquema relacional mínimo viable para soportar la lógica en cascada.

Tabla obras id (uuid, PK) nombre (text) cliente (text) tipo_obra (text) - Enum: Tipo A, B, C. fecha_inicio_global (date) - La variable madre. vigencia_texto (text) - Dato estático para el PDF. created_at , updated_at

Tabla tareas id (uuid, PK) obra_id (uuid, FK -> obras.id)

nombre (text) duracion_dias (integer) - Único input manual de tiempo. depende_de_id (uuid, FK -> tareas.id, nullable) - Enlace de dependencia. orden (integer) - Para mantener el listado visual.

Nota: fecha_inicio y fecha_fin NO se guardan en la DB si son estrictamente dependientes, se calculan al vuelo en el cliente para evitar desincronización, o se guardan como caché (requiere triggers complejos). Recomendación: Calcular en memoria (Frontend).

Tabla feriados (Global) fecha (date, PK) descripcion (text)

## 4. Motor de Reglas de Negocio (El "Cerebro")

Para lograr el "efecto dominó" a prueba de errores, el Frontend implementará un Grafo Dirigido Acíclico (DAG).

- 1. Regla de Salto (Date Engine): Función pura addWorkingDays(startDate, duration, holidaysSet) . Ignora sábados (6) y domingos (0), y comprueba contra el Set de feriados (O(1)).

- 2. Regla de Cascada (Topological Sort): * Cuando el usuario cambia la fecha_inicio_global de la obra, o la duracion_dias de la Tarea 1.


El motor recalcula la Tarea 1.

Busca todas las tareas donde depende_de_id === Tarea 1 .

Asigna su fecha_inicio = fecha_fin de Tarea 1 + 1 día laborable.

Itera recursivamente.

## 5. Arquitectura Frontend (Dos Vistas Separadas)

Separar la interfaz interactiva de la interfaz de impresión es el pilar de esta arquitectura. Intentar hacer que un componente web interactivo se imprima perfecto es una causa perdida.

#### A. Vista Interactiva ( /obra/[id] )

Propósito: Interacción del usuario, drag & drop (opcional), edición de duraciones y encadenamiento.

Tecnología: CSS Grid o posicionamiento absolute sobre divs .

UX: Panel izquierdo (lista de tareas), panel derecho (grilla de tiempo con scroll horizontal infinito).

#### B. Vista de Exportación ( /obra/[id]/print )

Propósito: Renderizar un clon exacto del Excel original para generar el PDF.

Tecnología: HTML puro <table> , <thead> , <tbody> . Clases de Tailwind estrictas ( wfull , border-collapse ).

Regla de Escala: * Si Duración Obra < 60 días -> Formato Gantt Diario (Columnas = Días). Si Duración Obra >= 60 días -> Formato Gantt Semanal (Columnas = Semanas de Lunes a Viernes agrupadas). Esto evita que el navegador rompa la tabla por falta de ancho en el papel A4.

- 6. Estrategia de Exportación PDF Se usará el motor nativo del navegador del usuario.

Acción: Botón "Exportar PDF" en la vista interactiva.

Flujo: 1. Abre la ruta /print en una nueva pestaña (o iframe oculto). 2. Espera a que los datos rendericen la tabla. 3. Dispara automáticamente window.print() .

CSS Crítico: * @media print { * { -webkit-print-color-adjust: exact; printcolor-adjust: exact; } } (Para obligar a imprimir las barras azules y grises).

@page { size: A4 landscape; margin: 10mm; } (Para preconfigurar la impresora del usuario).

page-break-inside: avoid; en los <tr> (Para no cortar tareas a la mitad).

- 7. Plan de Acción (Fases de Desarrollo recomendadas)


#### 1. Fase 1: Setup y Motor (Sin UI)

Configurar Supabase y Next.js.

Escribir y testear exhaustivamente (Unit Tests) la función addWorkingDays y el calculador del Grafo de dependencias. Si esto falla, el proyecto fracasa.

#### 2. Fase 2: UI Interactiva (El Canvas)

Crear el formulario de creación de obra (plantillas predeterminadas).

Renderizar el Gantt visual con Tailwind ( divs absolutos).

#### 3. Fase 3: Exportación (La Tabla)

Maquetar el clon del Excel usando <table> .

Implementar lógica de Switch Automático (Diario vs Semanal) basado en la duración total.

#### 4. Fase 4: Pulido

Row Level Security en Supabase (solo usuarios logueados pueden ver/editar).

Manejo de estados de error (ej. dependencias circulares: "Tarea A depende de B y B depende de A").
