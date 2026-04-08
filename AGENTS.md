# AGENTS.md — Guide for AI Agents

## Project Overview
**Gantt Internal Management System** - Internal web application for creating, managing, and exporting Gantt diagrams focused on construction projects. Built with Next.js (App Router) + TypeScript + Tailwind CSS, backed by Supabase.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# TypeScript check
npm run type-check  # or tsc --noEmit

# Run tests (when available)
npm test
npm test -- --watch  # watch mode
npm test -- --testNamePattern="test name"  # single test
```

## Project Structure
```
/                           # Next.js App Router
├── app/                    # Main application
│   ├── (routes)/          # Route groups
│   ├── api/               # API routes
│   └── global.css         # Global styles
├── components/            # Reusable components
│   ├── gantt/            # Gantt-specific components
│   └── ui/               # Base UI components
├── lib/                   # Utilities and business logic
│   ├── date-engine.ts     # Date calculation engine
│   └── gantt-dag.ts       # DAG dependency resolution
│   └── repositories/       # Data-access layer (Supabase)
├── types/                 # TypeScript definitions
├── supabase/
│   └── migrations/         # SQL schema + RLS migrations
├── .atl/                   # SDD/agent skill registry artifacts
├── public/                # Static assets
└── docs/                  # Documentation
```

## Cursor / Copilot Rules Discovery
- Checked `.cursor/rules/`, `.cursorrules`, and `.github/copilot-instructions.md`.
- **No Cursor/Copilot rule files were found in this repository snapshot.**
- If these files are added later, agents should treat them as highest-priority local coding instructions.

## Code Style Guidelines

### TypeScript & JavaScript
- **Strict TypeScript**: Enable all strict mode options in `tsconfig.json`
- **Explicit Types**: Avoid `any`; use `unknown` for truly unknown types
- **Union Types**: Use discriminated unions for state management
- **Import Order**: Group imports: 1) React/Next.js, 2) External libraries, 3) Internal modules
- **Named Exports**: Prefer named exports over default exports for better tree-shaking
- **File Naming**: Use kebab-case for files: `date-engine.ts`, `gantt-dag.ts`

### React/Next.js Patterns
- **Server Components by Default**: Use React Server Components unless client interactivity is needed
- **Client Boundaries**: Add `"use client"` directive only when necessary
- **Data Fetching**: Use Supabase client in server components, pass data to client components as props
- **State Management**: Start with React state, move to context if prop drilling becomes excessive
- **Error Boundaries**: Wrap client components with error boundaries for graceful failure

### Component Architecture
- **Atomic Design**: Structure components as atoms → molecules → organisms → templates → pages
- **Container-Presentational**: Separate data fetching/logic from presentation
- **Prop Drilling Prevention**: Use context for deeply nested state, but avoid overuse
- **Composition over Inheritance**: Prefer component composition with `children` prop

### Naming Conventions
- **Components**: PascalCase (`GanttChart`, `TaskList`, `DatePicker`)
- **Files**: kebab-case (`date-engine.ts`, `task-list.tsx`)
- **Variables/Functions**: camelCase (`calculateDependencies`, `startDate`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TASKS_PER_PROJECT`, `DEFAULT_WORKING_DAYS`)
- **Types/Interfaces**: PascalCase with `T` prefix for generics (`Task`, `Project`, `TData`)
- **Boolean variables**: Prefix with `is`, `has`, `should` (`isLoading`, `hasDependencies`, `shouldRecalculate`)

### Error Handling
- **Try-Catch Blocks**: Use in async operations and boundary cases
- **Custom Error Classes**: Create specific error types (`DateCalculationError`, `DependencyCycleError`)
- **User Feedback**: Display user-friendly messages, log technical details to console
- **Validation**: Validate inputs at component boundaries, not just form submission
- **Fallback UI**: Provide loading states, error boundaries, and empty states

### Date & Time Handling (CRITICAL)
- **Date Library**: Use native `Date` with helper functions; consider `date-fns` if complexity grows
- **Timezone**: Store all dates as UTC, convert to local time for display
- **Business Days**: Skip Saturdays (6), Sundays (0), and holidays from database
- **Holiday Lookup**: Use Set for O(1) holiday checking
- **Date Calculations**: Pure functions for date operations: `addWorkingDays(startDate, duration, holidays)`

### Gantt-Specific Rules
- **DAG Implementation**: Use topological sort for dependency resolution
- **Cascade Updates**: When start date or duration changes, recalculate dependent tasks recursively
- **Date Engine**: Core logic must be thoroughly unit tested
- **Two View Separation**: Interactive view (`/obra/[id]`) vs print view (`/obra/[id]/print`)
- **Print Optimization**: Use HTML tables for print view, CSS Grid for interactive view

### Tailwind CSS Guidelines
- **Utility-First**: Use Tailwind utility classes directly in components
- **Design Tokens**: Define custom colors/spacing in `tailwind.config.js`
- **Responsive**: Mobile-first approach with responsive modifiers
- **Print Styles**: Use `print:` variant for print-specific styles
- **Component Extraction**: Extract repeated patterns as components, not CSS classes

### Supabase Integration
- **Row Level Security**: Enable RLS for all tables
- **Server Components**: Use Supabase client in server components for data fetching
- **Type Safety**: Generate and use TypeScript types from database schema
- **Error Handling**: Handle Supabase errors gracefully with user feedback

### Testing Strategy
- **Unit Tests**: Test date engine and DAG logic thoroughly
- **Integration Tests**: Test API routes and component interactions
- **E2E Tests**: Use Playwright for critical user flows
- **Test Naming**: `describe` for component/function, `it` for specific behavior
- **Test Data**: Use factories/fixtures for consistent test data

## Critical Business Rules
1. **"Domino Effect"**: User sets project start date → system calculates all task dates automatically
2. **Working Days Only**: Skip weekends and holidays in date calculations
3. **Dependency Graph**: Tasks form Directed Acyclic Graph (DAG) - no circular dependencies
4. **Two-View Architecture**: Interactive view (editing) separate from print view (export)
5. **Auto-Scale**: Daily format (< 60 days) vs Weekly format (≥ 60 days) for print view

## Git & Workflow
- **Branch Naming**: `feat/`, `fix/`, `docs/`, `refactor/` prefixes
- **Commit Messages**: Conventional commits format
- **Code Review**: All changes require review before merge
- **Deployment**: Automatic deployment to Vercel on main branch push

## Environment Variables
Required Supabase environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-side only
```

## AI Agent Instructions
- **Read Architecture First**: Review `DOCS/PROYECTO GANNT.md` before making changes
- **Test Date Engine**: Any date-related changes require thorough testing
- **Preserve Print Format**: Print view must maintain exact Excel-like formatting
- **Performance Matters**: Optimize date calculations and DAG resolution
- **Security First**: Always implement Row Level Security in database queries

---

*This file guides AI agents working on the Gantt Internal Management System. Refer to `DOCS/PROYECTO GANNT.md` for detailed architecture and business requirements.*
