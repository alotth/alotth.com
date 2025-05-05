-- Drop all existing policies for mindmap_nodes
drop policy if exists "Users can create nodes" on mindmap_nodes;
drop policy if exists "Users can update nodes in their projects" on mindmap_nodes;
drop policy if exists "Users can view nodes in their projects" on mindmap_nodes;
drop policy if exists "Users can delete nodes in their projects" on mindmap_nodes;

-- Add new policies
create policy "Enable insert for authenticated users"
  on mindmap_nodes for insert
  with check (auth.role() = 'authenticated');

create policy "Enable select for authenticated users"
  on mindmap_nodes for select
  using (auth.role() = 'authenticated');

create policy "Enable update for authenticated users"
  on mindmap_nodes for update
  using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users"
  on mindmap_nodes for delete
  using (auth.role() = 'authenticated'); 