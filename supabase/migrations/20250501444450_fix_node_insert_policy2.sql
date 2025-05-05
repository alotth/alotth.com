-- Drop the existing insert policy
drop policy if exists "Users can create nodes in their projects" on mindmap_nodes;

-- Add new simplified insert policy
create policy "Users can create nodes"
  on mindmap_nodes for insert
  with check (
    auth.role() = 'authenticated'
  ); 