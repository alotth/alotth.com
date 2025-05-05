-- First, drop any triggers that might depend on these columns
drop trigger if exists mindmap_nodes_project_id_trigger on mindmap_nodes;
drop trigger if exists mindmap_nodes_position_trigger on mindmap_nodes;
drop trigger if exists mindmap_nodes_style_trigger on mindmap_nodes;

-- Drop any foreign key constraints with CASCADE
alter table mindmap_nodes
drop constraint if exists mindmap_nodes_project_id_fkey cascade;

-- Drop any indexes on the columns
drop index if exists mindmap_nodes_project_id_idx;
drop index if exists mindmap_nodes_position_idx;
drop index if exists mindmap_nodes_style_idx;

-- Drop any views that might depend on these columns
drop view if exists mindmap_nodes_with_project;
drop view if exists mindmap_nodes_with_position;
drop view if exists mindmap_nodes_with_style;

-- Drop any functions that might depend on these columns
drop function if exists get_project_nodes(uuid);
drop function if exists get_node_position(uuid);
drop function if exists get_node_style(uuid);

-- Now we can safely drop the columns with CASCADE
alter table mindmap_nodes
drop column if exists position cascade,
drop column if exists style cascade,
drop column if exists project_id cascade;

-- Update RLS policies to reflect the new structure
drop policy if exists "Users can view their own nodes" on mindmap_nodes;
drop policy if exists "Users can update their own nodes" on mindmap_nodes;
drop policy if exists "Users can delete their own nodes" on mindmap_nodes;

-- Create new policies that check access through mindmap_node_projects
create policy "Users can view nodes in their projects"
  on mindmap_nodes for select
  using (
    exists (
      select 1 from mindmap_node_projects mnp
      join mindmap_projects mp on mp.id = mnp.project_id
      where mnp.node_id = mindmap_nodes.id
      and mp.user_id = auth.uid()
    )
  );

create policy "Users can update nodes in their projects"
  on mindmap_nodes for update
  using (
    exists (
      select 1 from mindmap_node_projects mnp
      join mindmap_projects mp on mp.id = mnp.project_id
      where mnp.node_id = mindmap_nodes.id
      and mp.user_id = auth.uid()
    )
  );

create policy "Users can delete nodes in their projects"
  on mindmap_nodes for delete
  using (
    exists (
      select 1 from mindmap_node_projects mnp
      join mindmap_projects mp on mp.id = mnp.project_id
      where mnp.node_id = mindmap_nodes.id
      and mp.user_id = auth.uid()
    )
  ); 