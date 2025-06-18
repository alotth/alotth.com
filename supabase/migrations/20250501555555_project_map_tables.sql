-- Migration to add tables that store project-level mind-map (overview) data
-- The overview mind-map lets a user arrange their projects as nodes and connect them with edges.
-- Each user has an independent view, therefore tables include the user_id column and Row-Level Security.

-- 1. Nodes (one per project & user)
create table project_view_nodes (
  user_id uuid not null references auth.users(id),
  project_id uuid not null references mindmap_projects(id) on delete cascade,
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  style jsonb default '{}'::jsonb,
  primary key (user_id, project_id)
);

-- 2. Edges (connections between projects for a user)
create table project_view_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_project_id uuid not null references mindmap_projects(id) on delete cascade,
  target_project_id uuid not null references mindmap_projects(id) on delete cascade,
  label text,
  style jsonb
);

-- 3. Enable Row-Level Security
alter table project_view_nodes enable row level security;
alter table project_view_edges enable row level security;

-- 4. Policies – each user can manage only their own data
create policy "Users can manage their overview nodes"
  on project_view_nodes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage their overview edges"
  on project_view_edges
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()); 