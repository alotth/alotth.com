import { Node, Edge } from "reactflow";

export type Priority = 'low' | 'medium' | 'high';
export type WorkflowStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface MindmapProject {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_pinned: boolean;
  is_archived: boolean;
}

export interface MindmapNodeData {
  content: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
  };
  onChange?: (newText: string) => void;
  isPinned?: boolean;
  isArchived?: boolean;
  priority?: Priority;
  workflowStatus?: WorkflowStatus;
  dueDate?: string | null;
}

export interface MindmapNode {
  id: string;
  content: string;
  position: { x: number; y: number };
  style: Record<string, any>;
  project_id: string;
  created_at?: string;
  updated_at?: string;
  is_pinned: boolean;
  is_archived: boolean;
  priority: Priority | null;
  workflow_status: WorkflowStatus | null;
  due_date?: string | null;
}

export interface MindmapNodeProject {
  node_id: string;
  project_id: string;
  position_x: number;
  position_y: number;
  created_at?: string;
  updated_at?: string;
}

export interface MindmapEdge {
  id: string;
  source_id: string;
  target_id: string;
  type?: string;
  label?: string;
  style?: Record<string, unknown>;
  project_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface MindmapData {
  project: MindmapProject;
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

export interface MindmapNodeProjectWithNode {
  node_id: string;
  position_x: number;
  position_y: number;
  style: Record<string, any> | null;
  mindmap_nodes: {
    id: string;
    content: string;
    is_pinned: boolean;
    is_archived: boolean;
    priority: Priority | null;
    workflow_status: WorkflowStatus | null;
    due_date?: string | null;
  };
}

export interface NoteWithProject extends MindmapNode {
  project_title: string;
  project_id: string;
  project_is_archived: boolean;
  project_is_pinned: boolean;
}
