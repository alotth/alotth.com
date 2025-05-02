-- Add referenced_project_name column to mindmap_nodes table
alter table mindmap_nodes
add column referenced_project_name text;

-- Add comment to explain the column's purpose
comment on column mindmap_nodes.referenced_project_name is 'Name of the referenced project for display purposes'; 