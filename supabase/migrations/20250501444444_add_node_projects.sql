-- First, drop the old referenced_project_name column if it exists
alter table mindmap_nodes
drop column if exists referenced_project_name;

-- Create table for node-project relationships
create table mindmap_node_projects (
  node_id uuid references mindmap_nodes(id) on delete cascade not null,
  project_id uuid references mindmap_projects(id) on delete cascade not null,
  position_x float not null,
  position_y float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (node_id, project_id)
);

-- Enable RLS
alter table mindmap_node_projects enable row level security;

-- Create policies
create policy "Users can view their own node projects"
  on mindmap_node_projects for select
  using (
    auth.uid() = (select user_id from mindmap_projects where id = project_id)
  );

create policy "Users can create their own node projects"
  on mindmap_node_projects for insert
  with check (
    auth.uid() = (select user_id from mindmap_projects where id = project_id)
  );

create policy "Users can update their own node projects"
  on mindmap_node_projects for update
  using (
    auth.uid() = (select user_id from mindmap_projects where id = project_id)
  );

create policy "Users can delete their own node projects"
  on mindmap_node_projects for delete
  using (
    auth.uid() = (select user_id from mindmap_projects where id = project_id)
  );

-- Remove the referenced_node_id column from mindmap_nodes as it's no longer needed
alter table mindmap_nodes
drop column if exists referenced_node_id;

-- Drop the old node references table if it exists
drop table if exists mindmap_node_references;

-- Create a function to get all projects a node belongs to
create or replace function get_node_projects(node_id uuid)
returns table (
  project_id uuid,
  project_title text,
  position_x float,
  position_y float
) as $$
begin
  return query
  select 
    mp.id as project_id,
    mp.title as project_title,
    mnp.position_x,
    mnp.position_y
  from mindmap_node_projects mnp
  join mindmap_projects mp on mp.id = mnp.project_id
  where mnp.node_id = get_node_projects.node_id;
end;
$$ language plpgsql security definer; 