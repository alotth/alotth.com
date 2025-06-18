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

  const updateNode = useCallback(async (nodeId: string, updates: { content?: string; position?: { x: number; y: number } }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Update local state
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              ...(updates.position ? { position: updates.position } : {}),
              data: {
                ...node.data,
                ...(updates.content !== undefined ? { content: updates.content } : {}),
              },
            };
          }
          return node;
        })
      );

      // Save to database
      await updateMindmapNodes({
        projectId,
        nodes: nodes.map(node => 
          node.id === nodeId 
            ? {
                ...node,
                ...(updates.position ? { position: updates.position } : {}),
                data: {
                  ...node.data,
                  ...(updates.content !== undefined ? { content: updates.content } : {}),
                },
              }
            : node
        ),
      });
    } catch (err) {
      console.error('Error updating node:', err);
      setError(err instanceof Error ? err : new Error("Failed to update node"));
    }
  }, [projectId, nodes, supabase]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    async function loadMindmap() {
      try {
        setLoading(true);
        const data = await getMindmapProject(projectId, Date.now().toString());
        if (!isMounted) return;
        setNodes(data.nodes.map((node: any)  =>   ({
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
      } finally {
        setLoading(false);
      }
    }
    loadMindmap();
    return () => { isMounted = false; };
  }, [projectId]);

  // Handle node changes
  const onNodesChange = useCallback(
    async ({changes, linkedProjectId, skipSave}: {changes: NodeChange[], linkedProjectId?: string, skipSave?: boolean}) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }
        
        // Trata adição de node
        const addChange = changes.find((change) => change.type === "add" && "item" in change);
        if (addChange) {
          const newNode = (addChange as any).item as Node;
          setNodes((prevNodes) => {
            const updatedNodes = [...prevNodes, newNode];
            console.log("updatedNodes after setNodes callback", updatedNodes);
            // Salva no banco usando o array atualizado
            if (!skipSave) {
              updateMindmapNodes({
                projectId,
                nodes: updatedNodes,
                linkedProjectId,
              });
            }
            return updatedNodes;
          });
          return;
        }

        // Check if this is a deletion change
        const deletionChange = changes.find(
          (change) => change.type === "remove"
        );
        if (deletionChange) {
          console.log("Tentando deletar node do banco:", deletionChange.id, projectId);
          await deleteMindmapNode(deletionChange.id, projectId);
          console.log("Delete do banco chamado para:", deletionChange.id);
          setNodes((prevNodes) => prevNodes.filter(
            (node) => node.id !== deletionChange.id
          ));
          return;
        }

        // For other changes, preserve the entire data object
        const updatedNodes = applyNodeChanges(changes, nodes)
        console.log("updatedNodes", updatedNodes);
        console.log("changes", changes);
        setNodes(updatedNodes);
        
        // Only save to database if skipSave is not true
        if (!skipSave) {
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
          // First update local state
          const updatedEdges = edges.filter(edge => edge.id !== deletionChange.id);
          setEdges(updatedEdges);
          
          // Then delete from database in the background
          deleteMindmapEdge(deletionChange.id).catch(err => {
            console.error('Error deleting edge:', err);
            // Revert local state if delete fails
            setEdges(edges);
          });
          return;
        }

        // For other changes, proceed as normal
        const updatedEdges = applyEdgeChanges(changes, edges);
        setEdges(updatedEdges);
        
        // Only save to database if it's a significant change (not just selection)
        const isSignificantChange = changes.some(change => 
          change.type === 'add' || 
          change.type === 'reset' ||
          (change.type === 'select' && change.selected === false)
        );
        
        if (isSignificantChange) {
          // Save to database in the background
          updateMindmapEdges(projectId, updatedEdges).catch(err => {
            console.error('Error updating edges:', err);
            // Revert local state if update fails
            setEdges(edges);
          });
        }
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
        
        // Update local state first
        setEdges((eds) => addEdge(newEdge, eds));
        
        // Save to database in the background without waiting
        updateMindmapEdges(projectId, [...edges, newEdge]).catch(err => {
          console.error('Error saving edge:', err);
          // Revert local state if save fails
          setEdges(eds => eds.filter(e => e.id !== newEdge.id));
        });
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
    updateNode,
  };
}
