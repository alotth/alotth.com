-- Add type column to mindmap_edges table
ALTER TABLE mindmap_edges
ADD COLUMN type TEXT NOT NULL DEFAULT 'mindmap';

-- Add comment to explain the column
COMMENT ON COLUMN mindmap_edges.type IS 'Type of the edge, e.g., ''mindmap'' for regular connections, ''project'' for links to other mindmaps';
