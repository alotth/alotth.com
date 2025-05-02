import { useCallback, useEffect, useState } from "react";
import { Node, Edge, Connection, addEdge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import { useRouter } from "next/navigation";
import {
  getMindmapProject,
  updateMindmapNodes,
  updateMindmapEdges,
  deleteMindmapNode,
  deleteMindmapEdge,
} from "@/lib/mindmap";
import { MindmapNode, MindmapEdge } from "@/types/mindmap";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function convertToReactFlowNode(node: MindmapNode): Node {
  return {
    id: node.id,
    type: "mindmap",
    position: node.position,
    data: {
      content: node.content,
      style: node.style || {},
      referencedProjectId: node.referenced_project_id,
      referencedProjectName: node.referenced_project_name,
      onChange: (newText: string) => {
        // This will be set by the Editor component
        return newText;
      },
    },
  };
}

function convertToReactFlowEdge(edge: MindmapEdge): Edge {
  return {
    id: edge.id,
    source: edge.source_id,
    target: edge.target_id,
    type: "mindmap",
    label: edge.label,
    style: edge.style,
  };
}

export function useMindmap(projectId: string) {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  // Handle text changes
  const handleTextChange = useCallback((nodeId: string, newText: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              content: newText,
            },
          };
        }
        return node;
      })
    );
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadMindmap() {
      try {
        console.log('useMindmap - Loading mindmap for projectId:', projectId);
        setLoading(true);
        const data = await getMindmapProject(projectId, Date.now().toString());
        console.log('useMindmap - Data loaded:', {
          nodes: data.nodes,
          edges: data.edges
        });
        setNodes(data.nodes.map(node => ({
          ...convertToReactFlowNode(node),
          data: {
            ...convertToReactFlowNode(node).data,
            onChange: (newText: string) => handleTextChange(node.id, newText),
          },
        })));
        setEdges(data.edges.map(convertToReactFlowEdge));
        setError(null);
      } catch (err) {
        console.error('useMindmap - Error loading data:', err);
        setError(err as Error);
        
        // Check if it's a connection timeout error
        if (err instanceof Error && 
            err.cause && 
            typeof err.cause === 'object' && 
            'code' in err.cause && 
            err.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
          // Redirect to login page
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }

    loadMindmap();
  }, [projectId, router, handleTextChange]);

  // Handle node changes
  const onNodesChange = useCallback(
    async (changes: NodeChange[]) => {
      try {
        console.log('useMindmap - Node changes received:', changes);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Check if this is a deletion change
        const deletionChange = changes.find(change => change.type === 'remove');
        if (deletionChange) {
          console.log('useMindmap - Node deletion detected:', deletionChange);
          // First delete the node from the database
          await deleteMindmapNode(deletionChange.id);
          // Then update local state
          const updatedNodes = nodes.filter(node => node.id !== deletionChange.id);
          console.log('useMindmap - Nodes after deletion:', updatedNodes);
          setNodes(updatedNodes);
          return;
        }

        // For other changes, preserve the entire data object
        const updatedNodes = applyNodeChanges(changes, nodes).map(updatedNode => {
          const originalNode = nodes.find(node => node.id === updatedNode.id);
          if (originalNode) {
            return {
              ...updatedNode,
              data: {
                ...originalNode.data,
                ...updatedNode.data,
              },
            };
          }
          return updatedNode;
        });

        console.log('useMindmap - Updated nodes:', updatedNodes);
        setNodes(updatedNodes);
        
        // Save to database
        await updateMindmapNodes(projectId, updatedNodes);
      } catch (err) {
        console.error('useMindmap - Error updating nodes:', err);
        setError(
          err instanceof Error ? err : new Error("Failed to update nodes")
        );
        
        // Check if it's a connection timeout error
        if (err instanceof Error && 
            err.cause && 
            typeof err.cause === 'object' && 
            'code' in err.cause && 
            err.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
          // Redirect to login page
          router.push('/login');
        }
      }
    },
    [projectId, nodes, supabase, router]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    async (changes: EdgeChange[]) => {
      try {
        console.log('useMindmap - Edge changes received:', changes);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Check if this is a deletion change
        const deletionChange = changes.find(change => change.type === 'remove');
        if (deletionChange) {
          console.log('useMindmap - Edge deletion detected:', deletionChange);
          // First delete the edge from the database
          await deleteMindmapEdge(deletionChange.id);
          // Then update local state
          const updatedEdges = edges.filter(edge => edge.id !== deletionChange.id);
          console.log('useMindmap - Edges after deletion:', updatedEdges);
          setEdges(updatedEdges);
          return;
        }

        // For other changes, proceed as normal
        const updatedEdges = applyEdgeChanges(changes, edges);
        console.log('useMindmap - Updated edges:', updatedEdges);
        setEdges(updatedEdges);
        
        // Save to database
        await updateMindmapEdges(projectId, updatedEdges);
      } catch (err) {
        console.error('useMindmap - Error updating edges:', err);
        setError(
          err instanceof Error ? err : new Error("Failed to update edges")
        );
      }
    },
    [projectId, edges, supabase]
  );

  // Handle connections
  const onConnect = useCallback(
    async (connection: Connection) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        const newEdge = {
          ...connection,
          id: crypto.randomUUID(),
          type: "mindmap",
        } as Edge;
        
        setEdges((eds) => addEdge(newEdge, eds));
        await updateMindmapEdges(projectId, [...edges, newEdge]);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create edge")
        );
      }
    },
    [projectId, edges, supabase]
  );

  // Handle node deletion
  const onDeleteNode = useCallback(
    async (nodeId: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        await deleteMindmapNode(nodeId);
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to delete node")
        );
      }
    },
    [supabase]
  );

  // Handle edge deletion
  const onDeleteEdge = useCallback(
    async (edgeId: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        await deleteMindmapEdge(edgeId);
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to delete edge")
        );
      }
    },
    [supabase]
  );

  return {
    nodes,
    edges,
    loading,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDeleteNode,
    onDeleteEdge,
  };
}
