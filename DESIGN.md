# Gantt Internal Management System — DESIGN.md

## 1. Filosofía de Diseño
El sistema utiliza una estética fuertemente inspirada en **Vercel** y **Linear.app**, fusionada con los colores corporativos de la marca. 
- **Objetivo:** Precisión técnica, alta legibilidad, foco en la productividad y una interfaz "limpia" que no abrume al usuario.
- **Regla de Oro:** El contenido y los datos (diagramas, listados) son los protagonistas. Los formularios complejos y acciones secundarias deben vivir en Modales (Dialogs) o Drawers para no contaminar la vista principal.

## 2. Paleta de Colores y Tokens

### Brand Colors (Definidos en Tailwind)
- **Primary (`bg-primary`, `text-primary`):** Usado para los Call to Action (CTA) principales, botones de confirmación, y acentos visuales clave.
- **Accent (`bg-accent`, `text-accent`):** Usado para estados secundarios o distintivos de la marca.

### Escala de Grises (Vercel/Linear style)
- **Backgrounds:** `bg-gray-50/30` para fondos de página (App Shell). `bg-white` para tarjetas, modales y contenedores de contenido.
- **Textos:** 
  - Títulos: `text-gray-900`
  - Cuerpo: `text-gray-600`
  - Metadatos/Secundarios: `text-gray-500` o `text-gray-400`

## 3. Bordes, Sombras y Formas

- **Bordes ultra sutiles:** Nunca usar negro puro para bordes. El estándar es `border-gray-200/80` o `border-gray-200`.
- **Sombras elegantes:** 
  - Cards e Inputs: `shadow-xs`
  - Hover states: `shadow-sm`
  - Modales/Dropdowns: `shadow-lg ring-1 ring-black/5`
- **Redondeo (Border Radius):** 
  - Inputs y Botones pequeños: `rounded-md`
  - Cards y Contenedores medios: `rounded-lg` o `rounded-xl`
  - Modales: `rounded-xl` o `rounded-2xl`

## 4. Tipografía y Datos

- **Títulos:** Usar `tracking-tight` (letter-spacing negativo sutil) para dar un look moderno tipo SaaS. Ej: `text-[15px] font-semibold tracking-tight`.
- **Números (CRÍTICO):** Todos los números, fechas, contadores de tareas e IDs deben usar la clase `tabular-nums`. Esto evita que los anchos de los caracteres bailen cuando cambian los valores.
- **Jerarquía:** Mantener tamaños controlados. No abusar de `text-2xl` o mayores a menos que sea un hero header. El estándar SaaS es `text-[13px]` para cuerpo y `text-[14px]/[15px]` para elementos importantes.

## 5. Estados Interactivos (Focus & Hover)

- **Focus Rings:** Todo elemento interactivo debe tener un anillo de foco visible para accesibilidad (WCAG), pero elegante. 
  - Estándar: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50`.
- **Hover en Cards:** En lugar de levantar la tarjeta violentamente, oscurecer sutilmente el borde (`hover:border-primary/30`) o mostrar una línea de acento sutil (`via-primary/40`).
- **Botones Secundarios:** Usar estilo "ghost" (`hover:bg-gray-100 text-gray-700`) en lugar de botones con fondo sólido para no competir con el Primary CTA.

## 6. Patrones de Componentes

### 6.1. Empty States (Estados Vacíos)
- Deben tener un borde punteado (`border-dashed border-gray-300`).
- Incluir un ícono SVG claro y descriptivo en el centro (tono `text-gray-400`).
- Texto explicativo y un **Primary CTA** visible para salir del estado vacío (ej. "Crear diagrama nuevo").

### 6.2. Modales (Dialogs)
- **Fondo:** El overlay debe usar un desenfoque sutil (`backdrop-blur-[2px] bg-black/20`).
- **Comportamiento:** Deben cerrarse con la tecla `Escape` y al hacer clic afuera (si no hay datos sin guardar).
- **Acciones:** Los botones del footer del modal deben ir alineados a la derecha, con la acción principal destacada (`bg-primary`) y la secundaria atenuada.

### 6.3. Manejo de Errores
- **Nunca redirigir:** Evitar redirecciones con `?error=X` en la URL. 
- Usar el patrón `ActionResponse` (Server Actions que devuelven `{ success, error }`).
- Mostrar los errores inline, cerca de donde ocurrió la acción, con un ícono de warning rojo y texto en `text-red-600 text-[13px]`.