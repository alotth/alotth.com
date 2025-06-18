import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { debounce } from "@/lib/utils";

import { MindmapNode } from "./Node";
import { MindmapEdge } from "./Edge";
import { Toolbar } from "./Toolbar";
import { useMindmap } from "@/hooks/useMindmap";

const nodeTypes = {
  mindmap: MindmapNode,
};

const edgeTypes = {
  mindmap: MindmapEdge,
};

interface EditorProps {
  // initialNodes?: Node[];
  initialEdges?: Edge[];
  projectId: string;
  // onNodesChangeProp?: (changes: NodeChange[]) => void;
  onEdgesChangeProp?: (changes: EdgeChange[]) => void;
  onConnectProp?: (connection: Connection) => void;
  handleAddNode: () => void;
  handleAddProjectNode: (linkedProjectId: string, projectName: string, nodeId?: string) => void;
}

export function EditorMindmap({
  // initialNodes = [],
  initialEdges = [],
  projectId,
  // onNodesChangeProp,
  onEdgesChangeProp,
  onConnectProp,
  handleAddNode,
  handleAddProjectNode,
}: EditorProps) {
  // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { onNodesChange: saveNodesChange, nodes, updateNode } = useMindmap(projectId)

  useEffect(() => {
    console.log("nodes in EditorMindmap", nodes);
  }, [nodes]);
  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: uuidv4(),
        type: "mindmap",
      } as Edge;
      
      setEdges((eds) => addEdge(newEdge, eds));
      if (onConnectProp) {
        onConnectProp(params);
      }
    },
    [setEdges, onConnectProp]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Debounced save for node position
  const debouncedSavePosition = useCallback(
    debounce((nodeId: string, position: { x: number; y: number }) => {
      updateNode(nodeId, { position });
    }, 500),
    [updateNode]
  );

  // Handle node drag stop (save position)
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    debouncedSavePosition(node.id, node.position);
  }, [debouncedSavePosition]);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Se for drag, só atualiza localmente
      if (changes.length > 0 && changes[0].type === "position" && changes[0]?.dragging === true) {
        saveNodesChange({ changes, skipSave: true });
        return;
      }
      // Se for add/remove ou outros, salva normalmente
      saveNodesChange({changes});
    },
    [saveNodesChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Update local state first
      onEdgesChange(changes);

      // Only propagate changes if they are significant (not just selection)
      const isSignificantChange = changes.some(change => 
        change.type === 'add' || 
        change.type === 'remove' ||
        change.type === 'reset'
      );

      if (isSignificantChange && onEdgesChangeProp) {
        onEdgesChangeProp(changes);
      }
    },
    [onEdgesChange, onEdgesChangeProp]
  );

  // Handle style changes
  const handleStyleChange = useCallback((newStyle: any) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map((node) => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            style: {
              ...node.data.style,
              ...newStyle,
            },
          },
        };
      }
      return node;
    });

    // setNodes(updatedNodes);
    
    // Update the selected node reference with new style
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
    
    // Trigger node change event to save to database
    saveNodesChange({ changes: [{
      type: 'select',
      id: selectedNode.id,
      selected: true,
    }]});
    
  }, [selectedNode, nodes, saveNodesChange]);

  return (
    <div className="h-full relative">
      <div className="absolute top-4 right-4 z-10">
        <Toolbar
          onAddNode={handleAddNode}
          onAddProjectNode={handleAddProjectNode}
          onStyleChange={handleStyleChange}
          selectedNode={selectedNode}
          selectedEdge={null}
          currentProjectId={projectId}
        />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
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
