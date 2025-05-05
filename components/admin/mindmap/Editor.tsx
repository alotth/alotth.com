import { useCallback, useState } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";

import { MindmapNode } from "./Node";
import { MindmapEdge } from "./Edge";
import { Toolbar } from "./Toolbar";

const nodeTypes = {
  mindmap: MindmapNode,
};

const edgeTypes = {
  mindmap: MindmapEdge,
};

interface EditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  projectId: string;
  onNodesChangeProp?: (changes: NodeChange[]) => void;
  onEdgesChangeProp?: (changes: EdgeChange[]) => void;
  onConnectProp?: (connection: Connection) => void;
}

export function Editor({
  initialNodes = [],
  initialEdges = [],
  projectId,
  onNodesChangeProp,
  onEdgesChangeProp,
  onConnectProp,
}: EditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

  // Add new node
  const handleAddNode = useCallback(() => {
    const newNode: Node = {
      id: uuidv4(),
      type: "mindmap",
      position: { x: 100, y: 100 },
      data: {
        content: "New Node",
        style: {
          backgroundColor: "#ffffff",
          borderColor: "#000000",
          borderWidth: 2,
          fontSize: 14,
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    if (onNodesChangeProp) {
      onNodesChangeProp([{
        type: 'add',
        item: newNode,
      }]);
    }
  }, [setNodes, onNodesChangeProp]);

  // Add new project node
  const handleAddProjectNode = useCallback((projectId: string, projectName: string) => {
    const newNode: Node = {
      id: uuidv4(),
      type: "mindmap",
      position: { x: 100, y: 100 },
      data: {
        content: projectName,
        style: {
          backgroundColor: "#ffffff",
          borderColor: "#000000",
          borderWidth: 2,
          fontSize: 14,
        },
        referencedProjectId: projectId,
        referencedProjectName: projectName,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    
    // Trigger node change event to save to database
    if (onNodesChangeProp) {
      onNodesChangeProp([{
        type: 'add',
        item: newNode,
      }]);
    }
  }, [setNodes, onNodesChangeProp]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      if (onNodesChangeProp) {
        onNodesChangeProp(changes);
      }
    },
    [onNodesChange, onNodesChangeProp]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (onEdgesChangeProp) {
        onEdgesChangeProp(changes);
      }
    },
    [onEdgesChange, onEdgesChangeProp]
  );

  return (
    <div className="h-full relative">
      <div className="absolute top-4 right-4 z-10">
        <Toolbar
          onAddNode={handleAddNode}
          onAddProjectNode={handleAddProjectNode}
          onStyleChange={() => {}}
          selectedNode={selectedNode}
          selectedEdge={null}
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
