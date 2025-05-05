-- First, drop any foreign key constraints
alter table mindmap_nodes
drop constraint if exists mindmap_nodes_referenced_project_id_fkey;

-- Drop any indexes on the column
drop index if exists mindmap_nodes_referenced_project_id_idx;

-- Drop any views that might depend on the column
drop view if exists mindmap_nodes_with_references;

-- Drop any functions that might depend on the column
drop function if exists get_referenced_nodes(uuid);

-- Then drop the column
alter table mindmap_nodes
drop column if exists referenced_project_id cascade; 