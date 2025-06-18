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
}: EditorProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [pendingPositionSaves, setPendingPositionSaves] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Debug: log changes in nodes array
  useEffect(() => {
    console.log(`[EDITOR] Nodes array updated:`, nodes.length, nodes.map(n => ({ id: n.id, content: n.data.content })));
  }, [nodes]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Save node position with debounce per node
  const saveNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    // Cancel any existing timeout for this node
    const existingTimeout = pendingPositionSaves.get(nodeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for this node
    const timeout = setTimeout(() => {
      console.log(`[EDITOR] Salvando posição do node ${nodeId}:`, position);
      updateNode(nodeId, { position });
      setPendingPositionSaves(prev => {
        const newMap = new Map(prev);
        newMap.delete(nodeId);
        return newMap;
      });
    }, 500);

    setPendingPositionSaves(prev => {
      const newMap = new Map(prev);
      newMap.set(nodeId, timeout);
      return newMap;
    });
  }, [updateNode]);

  // Handle node drag stop (save position)
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    saveNodePosition(node.id, node.position);
  }, [saveNodePosition]);

  // Handle node changes - cancel debounce for deleted nodes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Check for deleted nodes and cancel their pending debounced saves
    const deletedNodes = changes.filter(change => change.type === 'remove');
    deletedNodes.forEach(change => {
      console.log(`[EDITOR] Cancelando save pendente para node deletado: ${change.id}`);
      const timeout = pendingPositionSaves.get(change.id);
      if (timeout) {
        clearTimeout(timeout);
        setPendingPositionSaves(prev => {
          const newMap = new Map(prev);
          newMap.delete(change.id);
          return newMap;
        });
        console.log(`[EDITOR] ✅ Save cancelado para node: ${change.id}`);
      }
    });

    // Pass to hook
    onNodesChange(changes);
  }, [onNodesChange, pendingPositionSaves]);

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
        />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="text-gray-900"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
