import { Node, Edge } from "reactflow";

export interface MindmapProject {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
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
}

export interface MindmapNode {
  id: string;
  content: string;
  position: { x: number; y: number };
  style: Record<string, any>;
  project_id: string;
  referenced_project_id?: string;
  referenced_project_name?: string;
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
