import { useCallback, useEffect, useState } from "react";
import { Node, Edge, Connection, addEdge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import { useRouter } from "next/navigation";
import {
  getMindmapProject,
  updateMindmapNodes,
  updateMindmapEdges,
  deleteMindmapNode,
  deleteMindmapEdge,
  createProjectNode,
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

  const getMindmapTitle = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }
    const { data } = await supabase.from("mindmap_projects").select("title").eq("id", projectId).single();
    return data?.title;
  }, [projectId, supabase]);

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
        setLoading(true);
        const data = await getMindmapProject(projectId, Date.now().toString());
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
        console.error('Error loading data:', err);
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
    async ({changes, linkedProjectId, skipSave}: {changes: NodeChange[], linkedProjectId?: string, skipSave?: boolean}) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }
        

        // For other changes, preserve the entire data object
        const updatedNodes = applyNodeChanges(changes, nodes)
        // .map(updatedNode => {
        //   const originalNode = nodes.find(node => node.id === updatedNode.id);
        //   if (originalNode) {
        //     return {
        //       ...updatedNode,
        //       data: {
        //         ...originalNode.data,
        //         ...updatedNode.data,
        //       },
        //     };
        //   }
        //   return updatedNode;
        // });

        setNodes(updatedNodes);
        
        // Only save to database if skipSave is not true
        if (!skipSave) {
          // Check if this is a deletion change
          const deletionChange = changes.find(
            (change) => change.type === "remove"
          );
          if (deletionChange) {
            // First delete the node from the database
            await deleteMindmapNode(deletionChange.id, projectId);
            // Then update local state
            const updatedNodes = nodes.filter(
              (node) => node.id !== deletionChange.id
            );
            setNodes(updatedNodes);
            return;
          }

          await updateMindmapNodes({
            projectId,
            nodes: updatedNodes,
            linkedProjectId,
          });
        }
      } catch (err) {
        console.error('Error updating nodes:', err);
        setError(
          err instanceof Error ? err : new Error("Failed to update nodes")
        );
      }
    },
    [projectId, nodes, supabase]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    async (changes: EdgeChange[]) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Check if this is a deletion change
        const deletionChange = changes.find(change => change.type === 'remove');
        if (deletionChange) {
          // First delete the edge from the database
          await deleteMindmapEdge(deletionChange.id);
          // Then update local state
          const updatedEdges = edges.filter(edge => edge.id !== deletionChange.id);
          setEdges(updatedEdges);
          return;
        }

        // For other changes, proceed as normal
        const updatedEdges = applyEdgeChanges(changes, edges);
        setEdges(updatedEdges);
        
        // Save to database
        await updateMindmapEdges(projectId, updatedEdges);
      } catch (err) {
        console.error('Error updating edges:', err);
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

  return {
    nodes,
    edges,
    loading,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    getMindmapTitle,
  };
}
