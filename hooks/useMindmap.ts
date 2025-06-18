import { useCallback, useEffect, useState, useRef } from "react";
import { 
  Node, 
  Edge, 
  Connection, 
  addEdge, 
  NodeChange, 
  EdgeChange, 
  applyNodeChanges, 
  applyEdgeChanges
} from "reactflow";
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
        // This will be set by the hook
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
  
  // Debug: Track all state changes
  useEffect(() => {
    console.log(`[STATE-DEBUG] nodes state changed to: ${nodes.length} nodes`, nodes.map(n => n.id));
  }, [nodes]);
  const supabase = createClientComponentClient();
  
  // Track pending operations to avoid race conditions
  const pendingOperations = useRef(new Set<string>());
  // Prevent ReactFlow from overriding our node additions
  const addingNodeProtection = useRef<boolean>(false);

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
    console.log(`[HOOK] handleTextChange chamado para node ${nodeId}:`, newText);
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
    let isMounted = true;
    async function loadMindmap() {
      try {
        console.log(`[LOAD] Iniciando carregamento do projeto ${projectId}`);
        setLoading(true);
        const data = await getMindmapProject(projectId, Date.now().toString());
        if (!isMounted) return;
        
        console.log(`[LOAD] Dados carregados do banco:`, data);
        console.log(`[LOAD] Nodes encontrados: ${data.nodes?.length || 0}`);
        console.log(`[LOAD] Edges encontradas: ${data.edges?.length || 0}`);
        
        // Create handleTextChange function locally to avoid dependency issues
        const localHandleTextChange = (nodeId: string, newText: string) => {
          console.log(`[HOOK] handleTextChange chamado para node ${nodeId}:`, newText);
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
        };
        
        const initialNodes = data.nodes.map((node: any) => ({
          ...convertToReactFlowNode(node),
          data: {
            ...convertToReactFlowNode(node).data,
            onChange: (newText: string) => localHandleTextChange(node.id, newText),
          },
        }));
        
        const initialEdges = data.edges.map(convertToReactFlowEdge);
        
        console.log(`[LOAD] ✅ Configurando estado inicial com ${initialNodes.length} nodes e ${initialEdges.length} edges`);
        console.log(`[LOAD] 🔄 setNodes chamado com ${initialNodes.length} nodes (INITIAL LOAD)`);
        setNodes(initialNodes);
        setEdges(initialEdges);
        setError(null);
      } catch (err) {
        console.error(`[LOAD] ❌ Erro ao carregar dados:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    loadMindmap();
    return () => { isMounted = false; };
  }, [projectId]); // Remove handleTextChange from dependencies

  // CRUD Operations using standard React state management

  const addNode = useCallback(async (nodeData: Partial<Node>, linkedProjectId?: string) => {
    const timestamp = Date.now();
    console.log(`[HOOK-${timestamp}] addNode chamado:`, nodeData, `linkedProjectId:`, linkedProjectId);
    
    // Prevent duplicate operations
    if (pendingOperations.current.has('addNode')) {
      console.log(`[HOOK-${timestamp}] ❌ addNode já está em execução, ignorando chamada duplicada`);
      return;
    }
    
    pendingOperations.current.add('addNode');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const nodeId = nodeData.id || crypto.randomUUID();
      const newNode: Node = {
        id: nodeId,
        type: "mindmap",
        position: nodeData.position || { x: 100, y: 100 },
        data: {
          content: nodeData.data?.content || "New Node",
          style: nodeData.data?.style || {
            backgroundColor: "#ffffff",
            borderColor: "#000000", 
            borderWidth: 2,
            fontSize: 14,
          },
          onChange: (newText: string) => {
            console.log(`[NODE] onChange called for node ${nodeId} with text:`, newText);
            handleTextChange(nodeId, newText);
          },
        },
        ...nodeData,
      };

      console.log(`[HOOK-${timestamp}] Node criado:`, newNode);

      // Activate protection to prevent ReactFlow from overriding our addition
      addingNodeProtection.current = true;
      console.log(`[HOOK-${timestamp}] 🔒 Proteção ativada contra onNodesChange`);

      // Update state immediately - this is the key fix!
      console.log(`[HOOK-${timestamp}] ✅ Adicionando node ao estado local`);
      console.log(`[HOOK-${timestamp}] 🔄 setNodes chamado (ADD NODE)`);
      setNodes((currentNodes) => {
        const updatedNodes = [...currentNodes, newNode];
        console.log(`[HOOK-${timestamp}] Estado atualizado: ${currentNodes.length} → ${updatedNodes.length} nodes`);
        return updatedNodes;
      });
      
      // Save to database after state update
      console.log(`[HOOK-${timestamp}] Salvando no banco...`);
      try {
        await updateMindmapNodes({
          projectId,
          nodes: [...nodes, newNode], // Use current nodes + new node
          linkedProjectId,
        });
        console.log(`[HOOK-${timestamp}] ✅ Node salvo no banco com sucesso`);
      } catch (err) {
        console.error(`[HOOK-${timestamp}] ❌ Erro ao salvar no banco:`, err);
        setError(err instanceof Error ? err : new Error("Failed to save node"));
      }

      // Remove protection after a much longer delay to ensure ReactFlow settles completely
      setTimeout(() => {
        addingNodeProtection.current = false;
        console.log(`[HOOK-${timestamp}] 🔓 Proteção removida após 1 segundo`);
      }, 1000);

      return newNode;
    } catch (err) {
      console.error(`[HOOK-${timestamp}] ❌ Erro em addNode:`, err);
      setError(err instanceof Error ? err : new Error("Failed to add node"));
      addingNodeProtection.current = false; // Reset protection on error
      throw err;
    } finally {
      pendingOperations.current.delete('addNode');
      console.log(`[HOOK-${timestamp}] 🔓 Operação addNode finalizada`);
    }
  }, [projectId, supabase, handleTextChange]);

  const removeNode = useCallback(async (nodeId: string) => {
    const operationId = `removeNode-${nodeId}`;
    console.log(`[HOOK] removeNode chamado para: ${nodeId}`);
    
    if (pendingOperations.current.has(operationId)) {
      console.log(`[HOOK] ❌ removeNode já está em execução para ${nodeId}, ignorando`);
      return;
    }
    
    pendingOperations.current.add(operationId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      console.log(`[HOOK] Chamando deleteMindmapNode para: ${nodeId}, projeto: ${projectId}`);
      // Remove from database first
      await deleteMindmapNode(nodeId, projectId);
      console.log(`[HOOK] deleteMindmapNode concluído para: ${nodeId}`);

      // Update local state
      console.log(`[HOOK] ✅ Removendo node ${nodeId} do estado local`);
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter(node => node.id !== nodeId);
        console.log(`[HOOK] Estado atualizado: ${currentNodes.length} → ${updatedNodes.length} nodes`);
        return updatedNodes;
      });
      console.log(`[HOOK] ✅ removeNode concluído para: ${nodeId}`);
    } catch (err) {
      console.error(`[HOOK] ❌ Erro em removeNode para ${nodeId}:`, err);
      setError(err instanceof Error ? err : new Error("Failed to remove node"));
      throw err;
    } finally {
      pendingOperations.current.delete(operationId);
    }
  }, [projectId, supabase]);

  const updateNode = useCallback(async (
    nodeId: string,
    updates: {
      content?: string;
      position?: { x: number; y: number };
      style?: any;
    }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // 1. Encontra o node atual em memória
      const currentNode = nodes.find((n) => n.id === nodeId);
      if (!currentNode) {
        console.warn(`updateNode: node ${nodeId} não encontrado, ignorando update`);
        return;
      }

      // 2. Cria a versão atualizada do node (sem mutar o original)
      const updatedNode: Node = {
        ...currentNode,
        ...(updates.position ? { position: updates.position } : {}),
        data: {
          ...currentNode.data,
          ...(updates.content !== undefined ? { content: updates.content } : {}),
          ...(updates.style ? { style: { ...currentNode.data.style, ...updates.style } } : {}),
        },
      };

      // 3. Atualiza o estado local
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? updatedNode : n)));

      // 4. Salva apenas esse node no banco para evitar colisões com nodes possivelmente deletados
      updateMindmapNodes({
        projectId,
        nodes: [updatedNode],
      }).catch((err) => {
        console.error("Error saving node update:", err);
        setError(err instanceof Error ? err : new Error("Failed to update node"));
      });
    } catch (err) {
      console.error("Error updating node:", err);
      setError(err instanceof Error ? err : new Error("Failed to update node"));
    }
  }, [projectId, supabase, nodes]);

  // ReactFlow Integration - Standard controlled approach
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const timestamp = Date.now();
    console.log(`[HOOK-${timestamp}] onNodesChange chamado com changes:`, changes);
    
    // If we're in the middle of adding a node, ignore ReactFlow changes
    if (addingNodeProtection.current) {
      console.log(`[HOOK-${timestamp}] ⚠️ onNodesChange IGNORADO - proteção ativa contra sobrescrita`);
      return;
    }
    
    // Additional protection: ignore dimension changes that would reduce node count
    const dimensionChanges = changes.filter(change => change.type === 'dimensions');
    if (dimensionChanges.length === changes.length && dimensionChanges.length > 0) {
      // This is only dimension changes - check if it would reduce our node count
      setNodes((currentNodes) => {
        const updatedNodes = applyNodeChanges(changes, currentNodes);
        if (updatedNodes.length < currentNodes.length) {
          console.log(`[HOOK-${timestamp}] ⚠️ IGNORANDO mudanças de dimensão que reduziriam nodes: ${currentNodes.length} → ${updatedNodes.length}`);
          return currentNodes; // Keep current state
        }
        console.log(`[HOOK-${timestamp}] ✅ Aplicando mudanças de dimensão: ${currentNodes.length} → ${updatedNodes.length} nodes`);
        return updatedNodes;
      });
      return;
    }
    
    // Handle deletion changes
    const deletionChanges = changes.filter(change => change.type === 'remove');
    deletionChanges.forEach(change => {
      console.log(`[HOOK-${timestamp}] Processando remoção de node: ${change.id}`);
      removeNode(change.id);
    });

    // Apply other changes using ReactFlow's built-in logic
    const otherChanges = changes.filter(change => change.type !== 'remove');
    if (otherChanges.length > 0) {
      console.log(`[HOOK-${timestamp}] Aplicando mudanças nativas do ReactFlow:`, otherChanges);
      
      // Use setNodes with callback to get fresh state
      setNodes((currentNodes) => {
        console.log(`[HOOK-${timestamp}] Estado atual no callback: ${currentNodes.length} nodes`);
        
        // Apply changes to current nodes
        const updatedNodes = applyNodeChanges(otherChanges, currentNodes);
        
        // IMPORTANT: Only apply if the change doesn't reduce node count unexpectedly
        if (updatedNodes.length >= currentNodes.length || deletionChanges.length > 0) {
          console.log(`[HOOK-${timestamp}] ✅ Aplicando mudança válida: ${currentNodes.length} → ${updatedNodes.length} nodes`);
          console.log(`[HOOK-${timestamp}] 🔄 setNodes retornando (ON NODES CHANGE)`);
          return updatedNodes;
        } else {
          console.log(`[HOOK-${timestamp}] ⚠️ IGNORANDO mudança suspeita: ${currentNodes.length} → ${updatedNodes.length} nodes sem deleções`);
          return currentNodes; // Keep current state
        }
      });
    }
  }, [removeNode]); // Remove nodes from dependencies to avoid stale closures

  // Enhanced onEdgesChange that handles deletions properly  
  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    console.log(`[HOOK] onEdgesChange chamado com changes:`, changes);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Handle deletion
      const deletionChange = changes.find(change => change.type === 'remove');
      if (deletionChange) {
        console.log(`[HOOK] Processando remoção de edge: ${deletionChange.id}`);
        await deleteMindmapEdge(deletionChange.id);
        setEdges((currentEdges) => currentEdges.filter(edge => edge.id !== deletionChange.id));
        return;
      }

      // Apply other changes using ReactFlow's built-in logic
      const otherChanges = changes.filter(change => change.type !== 'remove');
      if (otherChanges.length > 0) {
        console.log(`[HOOK] Aplicando mudanças nativas do ReactFlow para edges:`, otherChanges);
        setEdges((currentEdges) => {
          const updatedEdges = applyEdgeChanges(otherChanges, currentEdges);
          
          // Save significant changes
          const isSignificantChange = otherChanges.some(change => 
            change.type === 'add' || change.type === 'reset'
          );
          
          if (isSignificantChange) {
            updateMindmapEdges(projectId, updatedEdges).catch((err) => {
              console.error('Error saving edge changes:', err);
              setError(err instanceof Error ? err : new Error("Failed to update edges"));
            });
          }
          
          return updatedEdges;
        });
      }
    } catch (err) {
      console.error('Error updating edges:', err);
      setError(err instanceof Error ? err : new Error("Failed to update edges"));
    }
  }, [projectId, supabase]);

  const onConnect = useCallback(async (connection: Connection) => {
    console.log(`[HOOK] onConnect chamado:`, connection);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const newEdge = {
        ...connection,
        id: crypto.randomUUID(),
        type: "mindmap",
      } as Edge;
      
      console.log(`[HOOK] Criando nova edge:`, newEdge);
      
      // Update local state and save to database
      try {
        // Save to database first
        await updateMindmapEdges(projectId, [newEdge]);
        console.log(`[HOOK] ✅ Edge salva no banco com sucesso`);
        
        // Then update local state
        setEdges((currentEdges) => addEdge(newEdge, currentEdges));
      } catch (err) {
        console.error('Error creating connection:', err);
        setError(err instanceof Error ? err : new Error("Failed to create connection"));
        // Don't update local state if database save failed
      }
    } catch (err) {
      console.error('Error in onConnect:', err);
      setError(err instanceof Error ? err : new Error("Failed to create connection"));
    }
  }, [projectId, supabase]);

  return {
    // State
    nodes,
    edges,
    loading,
    error,
    
    // CRUD Operations
    addNode,
    removeNode,
    updateNode,
    
    // ReactFlow Integration
    onNodesChange,
    onEdgesChange,
    onConnect,
    
    // Utilities
    getMindmapTitle,
  };
}
