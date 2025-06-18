# Mindmap Implementation Guide

## Overview

This document outlines the implementation steps for creating an interactive mindmap feature with admin-only access. The mindmap will allow dragging text boxes, styling them similar to Excalidraw, and connecting ideas in a flow-style mindmap format.

## Features

- Admin-only access
- Draggable text boxes
- Excalidraw-like styling
- Project-based mindmaps
- Cross-project connections
- Hover preview for connected projects
- Interactive connections between ideas

## Technical Stack

- Next.js 14 (App Router)
- React for frontend
- React Flow for mindmap visualization
- TailwindCSS for styling
- Supabase for database and authentication
- TypeScript for type safety

## Project Structure

```
app/
  ├── admin/            # Admin routes
  │   ├── mindmap/      # Mindmap feature routes (admin only)
  │   │   ├── page.tsx  # Main mindmap list page
  │   │   ├── [id]/     # Individual mindmap routes
  │   │   │   └── page.tsx  # Mindmap editor page
  │   │   └── layout.tsx    # Mindmap layout
  │   └── layout.tsx    # Admin layout with auth check
  └── layout.tsx        # Root layout

components/
  ├── admin/            # Admin components
  │   └── mindmap/      # Mindmap components
  │       ├── Editor.tsx    # Main editor component
  │       ├── Node.tsx      # Custom node component
  │       ├── Edge.tsx      # Custom edge component
  │       └── Toolbar.tsx   # Editor toolbar
  └── auth/             # Authentication components

lib/
  ├── supabase/         # Supabase client and utilities
  └── themes/           # Theme configuration

supabase/
  └── migrations/       # Database migrations
```

## Database Schema (Supabase)

```sql
-- Mindmap projects table
create table mindmap_projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null
);

-- Mindmap nodes table
create table mindmap_nodes (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  position jsonb not null, -- { x: number, y: number }
  style jsonb not null,    -- { backgroundColor, borderColor, etc }
  project_id uuid references mindmap_projects(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Mindmap edges table
create table mindmap_edges (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references mindmap_nodes(id) on delete cascade not null,
  target_id uuid references mindmap_nodes(id) on delete cascade not null,
  project_id uuid references mindmap_projects(id) on delete cascade not null,
  label text,
  style jsonb,           -- { stroke, strokeWidth, etc }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table mindmap_projects enable row level security;
alter table mindmap_nodes enable row level security;
alter table mindmap_edges enable row level security;

-- Projects policies (admin only)
create policy "Only admins can view projects"
  on mindmap_projects for select
  using (auth.uid() in (select user_id from admin_users));

create policy "Only admins can create projects"
  on mindmap_projects for insert
  with check (auth.uid() in (select user_id from admin_users));

create policy "Only admins can update projects"
  on mindmap_projects for update
  using (auth.uid() in (select user_id from admin_users));

create policy "Only admins can delete projects"
  on mindmap_projects for delete
  using (auth.uid() in (select user_id from admin_users));

-- Similar policies for nodes and edges
```

## API Routes (Next.js App Router)

1. `app/api/admin/project/projects/route.ts`

   - GET: List all projects for admins
   - POST: Create a new project

2. `app/api/admin/project/projects/[id]/route.ts`

   - GET: Get project details
   - PUT: Update project
   - DELETE: Delete project

3. `app/api/admin/project/projects/[id]/nodes/route.ts`

   - GET: List nodes in project
   - POST: Create new node

4. `app/api/admin/project/projects/[id]/edges/route.ts`
   - GET: List edges in project
   - POST: Create new edge

## Frontend Components

### 1. Project List Component (`components/admin/project/ProjectList.tsx`)

- Display list of mindmap projects
- Create new project button
- Project preview cards

### 2. Mindmap Editor Component (`components/admin/project/Editor.tsx`)

- React Flow integration
- Custom node types
- Edge customization
- Node styling panel
- Project connection handling

### 3. Node Component (`components/admin/project/Node.tsx`)

- Draggable functionality
- Text editing
- Style customization
- Connection points

### 4. Edge Component (`components/admin/project/Edge.tsx`)

- Custom edge types
- Label support
- Style customization

## Implementation Phases

### Phase 1: Basic Setup

1. Set up Supabase tables and RLS policies
2. Create basic API routes with admin authentication
3. Implement admin-only middleware
4. Create project list view in admin area

### Phase 2: Core Mindmap Features

1. Implement React Flow integration
2. Create basic node and edge components
3. Add drag and drop functionality
4. Implement node editing

### Phase 3: Styling and Customization

1. Add node styling options
2. Implement edge customization
3. Add color picker
4. Create style presets

### Phase 4: Project Connections

1. Implement project linking
2. Add hover previews
3. Create navigation between projects
4. Add connection validation

### Phase 5: Polish and Optimization

1. Add undo/redo functionality
2. Implement auto-save
3. Add keyboard shortcuts
4. Optimize performance

## Getting Started

1. Install dependencies:

```bash
npm install @reactflow/core @reactflow/node-resizer @reactflow/background @reactflow/controls @reactflow/minimap
```

2. Create the database tables:

```bash
supabase migration new admin_mindmap_tables
```

3. Create the basic project structure:

```bash
mkdir -p app/admin/project
mkdir -p components/admin/project
```

4. Start implementing components following the phases outlined above.

## Security Considerations

- Admin-only access through middleware
- Row Level Security (RLS) policies in Supabase
- API route authentication middleware
- Input validation and sanitization
- Rate limiting
- Audit logging

## Testing Strategy

1. Unit tests for components
2. API route tests
3. E2E tests for critical flows
4. Performance testing
5. Security testing

## Next Steps

1. Review and approve the implementation plan
2. Set up the development environment
3. Begin with Phase 1 implementation
4. Regular progress reviews and adjustments
