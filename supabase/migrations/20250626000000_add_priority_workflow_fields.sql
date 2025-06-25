-- Add priority, workflow status, and due date fields to mindmap_nodes
ALTER TABLE mindmap_nodes
ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'todo' CHECK (workflow_status IN ('todo', 'in_progress', 'done', 'blocked')),
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the columns
COMMENT ON COLUMN mindmap_nodes.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN mindmap_nodes.workflow_status IS 'Workflow status: todo, in_progress, done, blocked';
COMMENT ON COLUMN mindmap_nodes.due_date IS 'Optional due date for the task/node';

-- Create indexes for better performance when filtering by these fields
CREATE INDEX idx_mindmap_nodes_priority ON mindmap_nodes(priority);
CREATE INDEX idx_mindmap_nodes_workflow_status ON mindmap_nodes(workflow_status);
CREATE INDEX idx_mindmap_nodes_due_date ON mindmap_nodes(due_date);

-- Create a composite index for priority + workflow status for advanced filtering
CREATE INDEX idx_mindmap_nodes_priority_workflow ON mindmap_nodes(priority, workflow_status);

-- Create an index for due dates filtering (upcoming, overdue, etc.)
CREATE INDEX idx_mindmap_nodes_due_date_not_null ON mindmap_nodes(due_date) WHERE due_date IS NOT NULL; 