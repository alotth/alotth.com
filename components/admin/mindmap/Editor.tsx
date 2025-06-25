import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  Background,
  Controls,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

import { MindmapNode } from "./Node";
import { MindmapEdge } from "./Edge";
import { Toolbar } from "./Toolbar";
import { MindmapNodeData } from "../../../types/mindmap";

// Define nodeTypes and edgeTypes outside component to prevent ReactFlow warnings
const nodeTypes = {
  mindmap: MindmapNode,
};

const edgeTypes = {
  mindmap: MindmapEdge,
};

interface EditorProps {
  projectId: string;
  handleAddNode: () => void;
  handleAddProjectNode: (
    linkedProjectId: string,
    projectName: string,
    nodeId?: string
  ) => void;
  // Mindmap state and callbacks coming from parent
  nodes: Node[];
  edges: Edge[];
  updateNode: (
    nodeId: string,
    updates: {
      content?: string;
      position?: { x: number; y: number };
      style?: any;
    }
  ) => void | Promise<void>;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onImportNodes?: (data: {
    nodes: { content: string; position: { x: number; y: number }; style?: any }[];
    edges: { source: string; target: string }[];
  }) => void;
  onAutoOrganize: () => void;
}

export function EditorMindmap({
  projectId,
  handleAddNode,
  handleAddProjectNode,
  nodes,
  edges,
  updateNode,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onImportNodes,
  onAutoOrganize,
}: EditorProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Debug: log changes in nodes array
  useEffect(() => {
    console.log(`[EDITOR] Nodes array updated:`, nodes.length, nodes.map(n => ({ id: n.id, content: n.data.content })));
  }, [nodes]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[EDITOR] ReactFlow onNodeClick called for node:', node.id);
    setSelectedNode(node);
  }, []);

  // Handle node double click
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[EDITOR] ReactFlow onNodeDoubleClick called for node:', node.id);
    event.stopPropagation();
    event.preventDefault();
    
    // Trigger edit mode directly using custom event
    setTimeout(() => {
      const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
      if (nodeElement) {
        console.log('[EDITOR] Dispatching triggerEdit event for node:', node.id);
        const editEvent = new CustomEvent('triggerEdit', { detail: { nodeId: node.id } });
        nodeElement.dispatchEvent(editEvent);
      }
    }, 0);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle node changes - pass through to hook (debounce is now handled there)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Handle style changes
  const handleStyleChange = useCallback((newStyle: any) => {
    if (!selectedNode) return;

    // Update node style
    updateNode(selectedNode.id, { style: newStyle });

    // Update selected node reference
    setSelectedNode(prevNode => {
      if (!prevNode) return null;
      return {
        ...prevNode,
        data: {
          ...prevNode.data,
          style: {
            ...prevNode.data.style,
            ...newStyle,
          },
        },
      };
    });
  }, [selectedNode, updateNode]);

  return (
    <div className="h-full relative">
      <div className="absolute top-4 right-4 z-10">
        <Toolbar
          onAddNode={handleAddNode}
          onAddProjectNode={handleAddProjectNode}
          onStyleChange={handleStyleChange}
          onImportJSON={onImportNodes || (() => {})}
          selectedNode={selectedNode}
          selectedEdge={null}
          currentProjectId={projectId}
          onAutoOrganize={onAutoOrganize}
        />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodeDragThreshold={5}
        nodesDraggable={true}
        fitView
        className="text-gray-900"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
