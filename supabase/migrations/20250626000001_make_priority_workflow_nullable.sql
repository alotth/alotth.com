-- Make priority, workflow status nullable and remove default values
-- This allows nodes to start without these fields set

-- Remove NOT NULL constraint and default values from priority
ALTER TABLE mindmap_nodes 
  ALTER COLUMN priority DROP NOT NULL,
  ALTER COLUMN priority DROP DEFAULT;

-- Remove NOT NULL constraint and default values from workflow_status  
ALTER TABLE mindmap_nodes 
  ALTER COLUMN workflow_status DROP NOT NULL,
  ALTER COLUMN workflow_status DROP DEFAULT;

-- Update comments to reflect nullable status
COMMENT ON COLUMN mindmap_nodes.priority IS 'Priority level: low, medium, high (nullable)';
COMMENT ON COLUMN mindmap_nodes.workflow_status IS 'Workflow status: todo, in_progress, done, blocked (nullable)';
COMMENT ON COLUMN mindmap_nodes.due_date IS 'Optional due date for the task/node (nullable)'; 