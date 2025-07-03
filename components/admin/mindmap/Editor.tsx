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
  ReactFlowInstance,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { MindmapNode } from "./Node";
import { MindmapEdge } from "./Edge";
import { MindmapToolbar } from "./MindmapToolbar";
import { MindmapNodeData, Priority, WorkflowStatus } from "../../../types/mindmap";
import { 
  bulkToggleNodesPinned, 
  bulkToggleNodesArchived, 
  bulkDeleteNodes, 
  bulkUpdateNodesPriority, 
  bulkUpdateNodesWorkflow 
} from "@/lib/mindmap";
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";

// Define nodeTypes and edgeTypes outside component to prevent ReactFlow warnings
const nodeTypes = {
  mindmap: MindmapNode,
};

const edgeTypes = {
  mindmap: MindmapEdge,
};

interface EditorProps {
  projectId: string;
  handleAddNode: () => Promise<string | undefined>;
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
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Simplified ReactFlow refresh logic
  const [reactFlowKey, setReactFlowKey] = useState(0);
  const [isEditingAny, setIsEditingAny] = useState(false);
  
  // Track selection clearing after position changes
  useEffect(() => {
    // Clear selection when nodes array changes significantly (additions/deletions)
    // but not for position-only changes
    if (selectedNodes.length > 1 || isEditingAny) {
      setSelectedNodes([]);
      setSelectedEdges([]);
    }
  }, [nodes.length, isEditingAny]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle node double click
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Set editing state
    setIsEditingAny(true);
    
    // Trigger edit mode directly using custom event
    setTimeout(() => {
      const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
      if (nodeElement) {
        const editEvent = new CustomEvent('triggerEdit', { detail: { nodeId: node.id } });
        nodeElement.dispatchEvent(editEvent);
      }
    }, 0);
  }, []);

  // Track double clicks on pane
  const lastPaneClickTime = useRef<number>(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // ms

  // Handle pane click (deselect and detect double clicks)
  const onPaneClick = useCallback(async (event: React.MouseEvent) => {
    setSelectedNode(null);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastPaneClickTime.current;
    if (timeDiff < DOUBLE_CLICK_THRESHOLD) {
      // Double click detected - create new node
      event.preventDefault();
      if (!reactFlowInstance.current) return;
      const position = reactFlowInstance.current.project({
        x: event.clientX,
        y: event.clientY,
      });
      try {
        const newNodeId = await handleAddNode();
        if (newNodeId) {
          setTimeout(() => {
            updateNode(newNodeId, { position });
            setPendingEditNodeId(newNodeId); // Sinaliza para ativar edição depois
          }, 50);
        }
      } catch (error) {
        console.error("Error creating node:", error);
        toast({
          title: "Error",
          description: "Failed to create node",
          variant: "destructive",
        });
      }
    }
    lastPaneClickTime.current = currentTime;
  }, [handleAddNode, updateNode, toast]);

  // Handle selection changes for bulk operations
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelectedNodes(selectedNodes);
    setSelectedEdges(selectedEdges);
  }, []);

  // Handle node changes - simplified
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Clear selection after position changes to avoid stale selection
    const hasPositionChanges = changes.some(change => change.type === 'position');
    if (hasPositionChanges && selectedNodes.length > 0) {
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

  const [pendingEditNodeId, setPendingEditNodeId] = useState<string | null>(null);

  // Efeito para ativar edição após proteção e renderização do node
  useEffect(() => {
    if (!pendingEditNodeId) return;
    // Aguarda proteção ser removida e node estar no DOM
    const timer = setTimeout(() => {
      const nodeElement = document.querySelector(`[data-id="${pendingEditNodeId}"]`);
      if (nodeElement) {
        const editEvent = new CustomEvent('triggerEdit', { detail: { nodeId: pendingEditNodeId } });
        nodeElement.dispatchEvent(editEvent);
        setIsEditingAny(true);
        setPendingEditNodeId(null); // Limpa o estado
      }
    }, 1150); // 1.15s para garantir proteção removida e DOM atualizado
    return () => clearTimeout(timer);
  }, [pendingEditNodeId, nodes]);

  // Listen for new node creation from handle double click
  useEffect(() => {
    const handleNewNodeFromHandle = (event: CustomEvent) => {
      const { newNodeId, position, connection } = event.detail;
      
      // Update node position
      updateNode(newNodeId, { position });
      
      // Create connection
      onConnect({
        ...connection,
        sourceHandle: null,
        targetHandle: null,
      });
    };

    document.addEventListener('newNodeFromHandle', handleNewNodeFromHandle as EventListener);
    return () => {
      document.removeEventListener('newNodeFromHandle', handleNewNodeFromHandle as EventListener);
    };
  }, [updateNode, onConnect]);

  return (
    <div className="h-full relative">
      <div className="absolute top-4 right-4 z-10">
        <MindmapToolbar
          // Basic toolbar props
          onAddNode={handleAddNode}
          onAddProjectNode={handleAddProjectNode}
          onStyleChange={handleStyleChange}
          onImportJSON={onImportNodes || (() => {})}
          selectedNode={selectedNode}
          selectedEdge={null}
          currentProjectId={projectId}
          onAutoOrganize={onAutoOrganize}
          
          // Bulk operations props
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
      </div>
      <ReactFlow
        key={reactFlowKey}
        nodes={nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onAddNode: handleAddNode,
          }
        }))}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
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
