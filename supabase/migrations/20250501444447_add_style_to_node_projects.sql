-- Add style column to mindmap_node_projects
alter table mindmap_node_projects
add column if not exists style jsonb default '{}'::jsonb;

-- Add comment to explain the column
comment on column mindmap_node_projects.style is 'JSON object containing node style properties for this specific project';

-- Create an index on style column for better query performance
create index if not exists mindmap_node_projects_style_idx on mindmap_node_projects using gin (style); 