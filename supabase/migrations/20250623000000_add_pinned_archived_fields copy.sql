-- Add isPinned and isArchived fields to mindmap_projects
ALTER TABLE mindmap_projects
ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add isPinned and isArchived fields to mindmap_nodes
ALTER TABLE mindmap_nodes
ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add comments to explain the columns
COMMENT ON COLUMN mindmap_projects.is_pinned IS 'Whether the project is pinned for priority display';
COMMENT ON COLUMN mindmap_projects.is_archived IS 'Whether the project is archived and shown with reduced visibility';
COMMENT ON COLUMN mindmap_nodes.is_pinned IS 'Whether the node is pinned for priority display';
COMMENT ON COLUMN mindmap_nodes.is_archived IS 'Whether the node is archived and shown with reduced visibility';

-- Create indexes for better performance when filtering by these fields
CREATE INDEX idx_mindmap_projects_is_pinned ON mindmap_projects(is_pinned);
CREATE INDEX idx_mindmap_projects_is_archived ON mindmap_projects(is_archived);
CREATE INDEX idx_mindmap_nodes_is_pinned ON mindmap_nodes(is_pinned);
CREATE INDEX idx_mindmap_nodes_is_archived ON mindmap_nodes(is_archived); 