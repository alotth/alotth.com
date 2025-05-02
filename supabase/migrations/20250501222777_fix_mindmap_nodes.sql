-- Add referenced_project_id column to mindmap_nodes table
alter table mindmap_nodes
add column referenced_project_id uuid references mindmap_projects(id) on delete set null;

-- Update RLS policies to include the new column
create policy "Users can view referenced projects"
  on mindmap_nodes for select
  using (
    auth.uid() = (select user_id from mindmap_projects where id = project_id) or
    (referenced_project_id is not null and auth.uid() = (select user_id from mindmap_projects where id = referenced_project_id))
  );

create policy "Users can update referenced projects"
  on mindmap_nodes for update
  using (
    auth.uid() = (select user_id from mindmap_projects where id = project_id) or
    (referenced_project_id is not null and auth.uid() = (select user_id from mindmap_projects where id = referenced_project_id))
  ); 