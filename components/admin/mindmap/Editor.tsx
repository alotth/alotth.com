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
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";

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
}

export function Editor({
  // initialNodes = [],
  initialEdges = [],
  projectId,
  // onNodesChangeProp,
  onEdgesChangeProp,
  onConnectProp,
}: EditorProps) {
  // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { onNodesChange: saveNodesChange, nodes } = useMindmap(projectId)
  const [isDragging, setIsDragging] = useState(false);

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

    // setNodes((nds) => [...nds, newNode]);
    saveNodesChange({ changes: [{
      type: 'add',
      item: newNode,
    }]});
    
  }, [saveNodesChange]);

  // Add new project node
  const handleAddProjectNode = useCallback(async (linkedProjectId: string, projectName: string, nodeId?: string) => {
    try {
      const newNode: Node = {
        id: nodeId || uuidv4(),
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
        },
      };

      // Add the node to the current project
      // setNodes((nds) => [...nds, newNode]);
      
      saveNodesChange({ 
        changes: [{
          type: 'add',
          item: newNode,
        }], 
        linkedProjectId: linkedProjectId
      });
      
    } catch (error) {
      console.error('Error adding project node:', error);
    }
  }, [saveNodesChange]);

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
      // If we're dragging, only update local state
      if (changes.length > 0 && changes[0].type === "position" && changes[0]?.dragging === true) {
        console.log("dragging", changes);
        // applyNodeChanges(changes, nodes);

        // // Update nodes through saveNodesChange but don't save to database
        saveNodesChange({ changes, skipSave: true });
        return;
      }

      // For non-drag changes, save to database
      saveNodesChange({changes});
    },
    [saveNodesChange, nodes, isDragging]
  );

  // Handle node drag stop
  const handleNodeDragStop = useCallback(() => {
    setIsDragging(false);
    // Save final positions to database
    // saveNodesChange({changes: [{
    //   type: 'position',
    //   id: selectedNode?.id || '',
    //   position: selectedNode?.position || { x: 0, y: 0 },
    // }]});
  }, [saveNodesChange, selectedNode]);

  // Handle node drag start
  const handleNodeDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (onEdgesChangeProp) {changes
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
        // onNodeDragStart={handleNodeDragStart}
        // onNodeDragStop={handleNodeDragStop}
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
