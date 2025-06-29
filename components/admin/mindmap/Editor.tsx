import { useCallback, useEffect, useState, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  Background,
  Controls,
  NodeChange,
  EdgeChange,
  OnSelectionChangeFunc,
} from "reactflow";
import "reactflow/dist/style.css";

import { MindmapNode } from "./Node";
import { MindmapEdge } from "./Edge";
import { Toolbar } from "./Toolbar";
import { BulkOperationsToolbar } from "./BulkOperationsToolbar";
import { MindmapNodeData, Priority, WorkflowStatus } from "../../../types/mindmap";
import { 
  bulkToggleNodesPinned, 
  bulkToggleNodesArchived, 
  bulkDeleteNodes, 
  bulkUpdateNodesPriority, 
  bulkUpdateNodesWorkflow 
} from "@/lib/mindmap";
import { useToast } from "@/components/ui/use-toast";

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
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const { toast } = useToast();

  // Debug: log changes in nodes array
  useEffect(() => {
    console.log(`[EDITOR] Nodes array updated:`, nodes.length, nodes.map(n => ({ id: n.id, content: n.data.content })));
  }, [nodes]);

  // Force ReactFlow refresh only when needed (multi-selection or editing)
  const [reactFlowKey, setReactFlowKey] = useState(0);
  const [isEditingAny, setIsEditingAny] = useState(false);
  const prevNodesPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  useEffect(() => {
    const currentPositions = new Map(nodes.map(node => [node.id, node.position]));
    
    // Check if any node positions have changed
    let positionsChanged = false;
    currentPositions.forEach((currentPos, nodeId) => {
      const prevPos = prevNodesPositions.current.get(nodeId);
      if (prevPos && (prevPos.x !== currentPos.x || prevPos.y !== currentPos.y)) {
        positionsChanged = true;
        console.log(`[EDITOR] Node ${nodeId} position changed from (${prevPos.x}, ${prevPos.y}) to (${currentPos.x}, ${currentPos.y})`);
      }
    });
    
    // Only force ReactFlow refresh if positions changed AND we have multi-selection or editing
    if (positionsChanged && (selectedNodes.length > 1 || isEditingAny)) {
      console.log('[EDITOR] Node positions changed with multi-selection or editing, forcing ReactFlow refresh');
      setSelectedNodes([]);
      setSelectedEdges([]);
      setReactFlowKey(prev => prev + 1);
    } else if (positionsChanged && selectedNodes.length > 0) {
      // Just clear selection for single node movements to avoid stale selection
      console.log('[EDITOR] Node positions changed, clearing selection without re-render');
      setSelectedNodes([]);
      setSelectedEdges([]);
    }
    
    // Update previous positions
    prevNodesPositions.current = currentPositions;
  }, [nodes, selectedNodes.length, isEditingAny]);

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
    
    // Set editing state
    setIsEditingAny(true);
    
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

  // Listen for edit start/stop events from nodes
  useEffect(() => {
    const handleEditStart = () => {
      console.log('[EDITOR] Edit mode started');
      setIsEditingAny(true);
    };
    
    const handleEditStop = () => {
      console.log('[EDITOR] Edit mode stopped');
      setIsEditingAny(false);
    };

    // Listen for custom events from nodes
    document.addEventListener('nodeEditStart', handleEditStart);
    document.addEventListener('nodeEditStop', handleEditStop);

    return () => {
      document.removeEventListener('nodeEditStart', handleEditStart);
      document.removeEventListener('nodeEditStop', handleEditStop);
    };
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle selection changes for bulk operations
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelectedNodes(selectedNodes);
    setSelectedEdges(selectedEdges);
    console.log('[EDITOR] Selection changed:', selectedNodes.length, 'nodes,', selectedEdges.length, 'edges');
  }, []);

  // Handle node changes - pass through to hook (debounce is now handled there)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Check if any position changes occurred
    const hasPositionChanges = changes.some(change => change.type === 'position');
    
    // Clear selection after position changes to avoid stale position selection issues
    if (hasPositionChanges && selectedNodes.length > 0) {
      console.log('[EDITOR] Position changes detected, clearing selection to prevent stale position bugs');
      setSelectedNodes([]);
      setSelectedEdges([]);
    }
    
    onNodesChange(changes);
  }, [onNodesChange, selectedNodes.length]);

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

  // Bulk operations
  const clearSelection = () => {
    setSelectedNodes([]);
    setSelectedEdges([]);
  };

  const handleBulkPin = async () => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkToggleNodesPinned(nodeIds);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  const handleBulkUnpin = async () => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkToggleNodesPinned(nodeIds);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  const handleBulkArchive = async () => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkToggleNodesArchived(nodeIds);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  const handleBulkUnarchive = async () => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkToggleNodesArchived(nodeIds);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  const handleBulkDelete = async () => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkDeleteNodes(nodeIds, projectId);
    // Remove nodes from the flow
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'remove',
    })));
    clearSelection();
  };

  const handleBulkPriorityChange = async (priority: Priority) => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkUpdateNodesPriority(nodeIds, priority);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  const handleBulkWorkflowChange = async (workflowStatus: WorkflowStatus) => {
    const nodeIds = selectedNodes.map(node => node.id);
    await bulkUpdateNodesWorkflow(nodeIds, workflowStatus);
    // Trigger a re-render by updating the nodes
    onNodesChange(selectedNodes.map(node => ({
      id: node.id,
      type: 'select',
      selected: false,
    })));
  };

  return (
    <div className="h-full relative">
      <BulkOperationsToolbar
        selectedCount={selectedNodes.length}
        onClearSelection={clearSelection}
        onBulkPin={handleBulkPin}
        onBulkUnpin={handleBulkUnpin}
        onBulkArchive={handleBulkArchive}
        onBulkUnarchive={handleBulkUnarchive}
        onBulkDelete={handleBulkDelete}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkWorkflowChange={handleBulkWorkflowChange}
      />

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
        key={reactFlowKey}
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodeDragThreshold={5}
        nodesDraggable={true}
        multiSelectionKeyCode="Control"
        selectionKeyCode="Shift"
        fitView
        className="text-gray-900"
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
