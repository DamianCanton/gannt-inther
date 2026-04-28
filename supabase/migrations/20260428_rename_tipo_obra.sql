-- Migration: Rename tipo_obra values
-- Changes: Tipo A -> SPLIT, Tipo B -> OTM, Tipo C -> Respaldo

-- ============================================================
-- 1. Update obras table constraint and migrate data
-- ============================================================

-- First, drop the existing check constraint
alter table public.obras drop constraint if exists obras_tipo_obra_check;

-- Update existing data
update public.obras set tipo_obra = 'SPLIT' where tipo_obra = 'Tipo A';
update public.obras set tipo_obra = 'OTM' where tipo_obra = 'Tipo B';
update public.obras set tipo_obra = 'Respaldo' where tipo_obra = 'Tipo C';

-- Add new check constraint with updated values
alter table public.obras add constraint obras_tipo_obra_check 
  check (tipo_obra in ('SPLIT', 'OTM', 'Respaldo'));

-- ============================================================
-- 2. Update template_tareas table constraint and migrate data
-- ============================================================

-- Drop existing check constraint
alter table public.template_tareas drop constraint if exists template_tareas_tipo_obra_check;

-- Update existing data
update public.template_tareas set tipo_obra = 'SPLIT' where tipo_obra = 'Tipo A';
update public.template_tareas set tipo_obra = 'OTM' where tipo_obra = 'Tipo B';
update public.template_tareas set tipo_obra = 'Respaldo' where tipo_obra = 'Tipo C';

-- Add new check constraint with updated values
alter table public.template_tareas add constraint template_tareas_tipo_obra_check 
  check (tipo_obra in ('SPLIT', 'OTM', 'Respaldo'));

-- ============================================================
-- 3. Update default templates (sentinel project)
-- ============================================================

-- Note: The default templates were already updated via the UPDATE statements above
-- since they are in template_tareas table. No additional action needed.
