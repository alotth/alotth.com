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
import { MindmapNode, MindmapEdge, Priority, WorkflowStatus } from "@/types/mindmap";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function convertToReactFlowNode(node: MindmapNode): Node {
  return {
    id: node.id,
    type: "mindmap",
    position: node.position,
    data: {
      content: node.content,
      style: node.style || {},
      isPinned: node.is_pinned || false,
      isArchived: node.is_archived || false,
      priority: node.priority || null,
      workflowStatus: node.workflow_status || null,
      dueDate: node.due_date || null,
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
  // Debounce saves for position changes during drag
  const positionSaveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Track click times for double-click detection through position changes
  const lastClickTimes = useRef<Map<string, number>>(new Map());
  // Debounce text saves to avoid race conditions when typing fast
  const textSaveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const getMindmapTitle = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }
    const { data } = await supabase.from("mindmap_projects").select("title").eq("id", projectId).single();
    return data?.title;
  }, [projectId, supabase]);

  // Handle text changes with debounce
  const handleTextChange = useCallback((nodeId: string, newText: string) => {
    console.log(`[HOOK] handleTextChange chamado para node ${nodeId}:`, newText);
    
    // Update local state immediately (synchronously) for responsive UI
    let updatedNode: Node | null = null;
    console.log(`[HOOK] Atualizando estado local...`);
    setNodes((nds) => {
      console.log(`[HOOK] setNodes callback executado, nds.length:`, nds.length);
      return nds.map((node) => {
        if (node.id === nodeId) {
          console.log(`[HOOK] Node encontrado para update:`, node.id);
          updatedNode = {
            ...node,
            data: {
              ...node.data,
              content: newText,
            },
          };
          console.log(`[HOOK] updatedNode criado:`, updatedNode);
          return updatedNode;
        }
        return node;
      });
    });

    // Simplified database save with shorter debounce
    if (updatedNode) {
      console.log(`[HOOK] 💾 Agendando salvamento de texto para node ${nodeId}:`, newText);
      
      // Clear existing timeout for this node
      const existingTimeout = textSaveTimeouts.current.get(nodeId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        console.log(`[HOOK] ⏰ Cancelando salvamento anterior para node ${nodeId}`);
      }
      
      // Set new timeout for debounced save with shorter delay
      const timeout = setTimeout(async () => {
        console.log(`[HOOK] 💾 Executando salvamento debounced para node ${nodeId}:`, newText);
        try {
          console.log(`[HOOK] Verificando sessão...`);
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error(`[HOOK] ❌ Sessão não encontrada`);
            throw new Error("Not authenticated");
          }
          console.log(`[HOOK] ✅ Sessão válida encontrada`);

          // Use more direct update to reduce race conditions
          const { error } = await supabase
            .from("mindmap_nodes")
            .update({ 
              content: newText,
              updated_at: new Date().toISOString()
            })
            .eq("id", nodeId);

          if (error) {
            console.error(`[HOOK] ❌ Erro ao salvar no banco:`, error);
            throw error;
          }

          console.log(`[HOOK] ✅ Texto salvo no banco com sucesso para node ${nodeId}`);
          
          // Emit event for undo/redo tracking
          document.dispatchEvent(new CustomEvent('nodeTextSaved', {
            detail: { nodeId, newText }
          }));
        } catch (err) {
          console.error('Error saving text change:', err);
          setError(err instanceof Error ? err : new Error("Failed to save text"));
        } finally {
          textSaveTimeouts.current.delete(nodeId);
        }
      }, 500); // Reduced from 1000ms to 500ms for faster saving
      
      textSaveTimeouts.current.set(nodeId, timeout);
    } else {
      console.error(`[HOOK] ❌ updatedNode é null, não salvando`);
    }
  }, [projectId, supabase]);

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
        
        // Use the main handleTextChange function that saves to database
        const initialNodes = data.nodes.map((node: any) => ({
          ...convertToReactFlowNode(node),
          data: {
            ...convertToReactFlowNode(node).data,
            onChange: (newText: string) => {
              console.log(`[LOAD] onChange triggered for node ${node.id} with text:`, newText);
              handleTextChange(node.id, newText);
            },
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
    
    // Cleanup function to clear all timeouts when component unmounts
    return () => { 
      isMounted = false;
      
      // Clear all pending text save timeouts
      textSaveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      textSaveTimeouts.current.clear();
      
      // Clear all pending position save timeouts
      positionSaveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      positionSaveTimeouts.current.clear();
    };
  }, [projectId, handleTextChange]);

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
      
      // Ensure onChange is ALWAYS properly configured and never overridden
      const newNode: Node = {
        id: nodeId,
        type: "mindmap",
        position: nodeData.position || { x: 100, y: 100 },
        // Merge existing nodeData but ensure critical data properties are preserved
        ...nodeData,
        data: {
          // Start with default values
          content: "New Node",
          style: {
            backgroundColor: "#ffffff",
            borderColor: "#000000", 
            borderWidth: 2,
            fontSize: 14,
          },
          priority: null,
          workflowStatus: null,
          dueDate: null,
          isPinned: false,
          isArchived: false,
          // Merge with any provided data
          ...nodeData.data,
          // But ALWAYS override onChange to ensure text saving works
          onChange: (newText: string) => {
            console.log(`[NODE] onChange called for node ${nodeId} with text:`, newText);
            handleTextChange(nodeId, newText);
          },
        },
      };

      console.log(`[HOOK-${timestamp}] Node criado:`, newNode);
      console.log(`[HOOK-${timestamp}] 🔍 Verificando onChange:`, typeof newNode.data.onChange);

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
          nodes: [newNode], // Just save the new node instead of all nodes
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
  }, [projectId, supabase, handleTextChange, nodes]);

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
      priority?: Priority;
      workflowStatus?: WorkflowStatus;
      dueDate?: string | null;
      isPinned?: boolean;
      isArchived?: boolean;
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
          ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
          ...(updates.workflowStatus !== undefined ? { workflowStatus: updates.workflowStatus } : {}),
          ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
          ...(updates.isPinned !== undefined ? { isPinned: updates.isPinned } : {}),
          ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
          // ALWAYS preserve the onChange function - this is critical for text saving
          onChange: currentNode.data.onChange || ((newText: string) => {
            console.log(`[NODE-FALLBACK] onChange called for node ${nodeId} with text:`, newText);
            handleTextChange(nodeId, newText);
          }),
        },
      };

      console.log(`[UPDATE] Updating node ${nodeId} with:`, updates);
      console.log(`[UPDATE] 🔍 Verificando onChange preserved:`, typeof updatedNode.data.onChange);

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
  }, [projectId, supabase, nodes, handleTextChange]);

  // ReactFlow Integration - Standard controlled approach
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const timestamp = Date.now();
    console.log(`[HOOK-${timestamp}] onNodesChange chamado com changes:`, changes);
    
    // If we're in the middle of adding a node, ignore ReactFlow changes
    if (addingNodeProtection.current) {
      console.log(`[HOOK-${timestamp}] ⚠️ onNodesChange IGNORADO - proteção ativa contra sobrescrita`);
      return;
    }
    
    // Separate position changes from other changes
    const positionChanges = changes.filter(change => change.type === 'position');
    const otherChanges = changes.filter(change => change.type !== 'position');
    
    // Handle position changes with debounce (no immediate save)
    if (positionChanges.length > 0) {
      console.log(`[HOOK-${timestamp}] Aplicando mudanças de posição (sem salvar):`, positionChanges);
      setNodes((currentNodes) => {
        const updatedNodes = applyNodeChanges(positionChanges, currentNodes);
        
        // Set up debounced save for each position change
        positionChanges.forEach(change => {
          if (change.type === 'position' && change.position) {
            const nodeId = change.id;
            const now = Date.now();
            
            // Just track timing for future use, but don't trigger edit through position changes
            lastClickTimes.current.set(nodeId, now);
            
            // Clear existing timeout for this node
            const existingTimeout = positionSaveTimeouts.current.get(nodeId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            
            // Set new timeout for debounced save
            const timeout = setTimeout(() => {
              console.log(`[HOOK] 💾 Salvando posição do node ${nodeId} após debounce:`, change.position);
              updateNode(nodeId, { position: change.position! }).catch((err) => {
                console.error('Error saving position:', err);
              });
              positionSaveTimeouts.current.delete(nodeId);
            }, 800); // 800ms debounce
            
            positionSaveTimeouts.current.set(nodeId, timeout);
          }
        });
        
        // Force a re-creation of the nodes array to ensure ReactFlow recognizes position changes
        // This is necessary to fix the selection bug where moved nodes are selected at old positions
        return updatedNodes.map(node => ({ ...node }));
      });
    }
    
    // Handle non-position changes normally
    if (otherChanges.length > 0) {
      // Additional protection: ignore dimension changes that would reduce node count
      const dimensionChanges = otherChanges.filter(change => change.type === 'dimensions');
      if (dimensionChanges.length === otherChanges.length && dimensionChanges.length > 0) {
        // This is only dimension changes - check if it would reduce our node count
        setNodes((currentNodes) => {
          const updatedNodes = applyNodeChanges(otherChanges, currentNodes);
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
      const deletionChanges = otherChanges.filter(change => change.type === 'remove');
      deletionChanges.forEach(change => {
        console.log(`[HOOK-${timestamp}] Processando remoção de node: ${change.id}`);
        
        // Cancel any pending position save for deleted node
        const existingTimeout = positionSaveTimeouts.current.get(change.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          positionSaveTimeouts.current.delete(change.id);
          console.log(`[HOOK-${timestamp}] ✅ Cancelado save de posição para node deletado: ${change.id}`);
        }
        
        removeNode(change.id);
      });

      // Apply remaining changes using ReactFlow's built-in logic
      const remainingChanges = otherChanges.filter(change => change.type !== 'remove');
      if (remainingChanges.length > 0) {
        console.log(`[HOOK-${timestamp}] Aplicando mudanças nativas do ReactFlow:`, remainingChanges);
        
        // Use setNodes with callback to get fresh state
        setNodes((currentNodes) => {
          console.log(`[HOOK-${timestamp}] Estado atual no callback: ${currentNodes.length} nodes`);
          
          // Apply changes to current nodes
          const updatedNodes = applyNodeChanges(remainingChanges, currentNodes);
          
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
    }
  }, [removeNode, updateNode]); // Remove nodes from dependencies to avoid stale closures

  // Enhanced onEdgesChange that handles deletions properly  
  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    console.log(`[HOOK] onEdgesChange chamado com changes:`, changes);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error(`[HOOK] ❌ Não autenticado para editar edges`);
        throw new Error("Not authenticated");
      }

      // Handle deletion
      const deletionChange = changes.find(change => change.type === 'remove');
      if (deletionChange) {
        console.log(`[HOOK] 🗑️ Processando remoção de edge: ${deletionChange.id}`);
        
        try {
          // Delete from database first
          await deleteMindmapEdge(deletionChange.id);
          console.log(`[HOOK] ✅ Edge ${deletionChange.id} deletada do banco com sucesso`);
          
          // Then update local state
          setEdges((currentEdges) => {
            const filteredEdges = currentEdges.filter(edge => edge.id !== deletionChange.id);
            console.log(`[HOOK] ✅ Estado local atualizado: ${currentEdges.length} → ${filteredEdges.length} edges`);
            return filteredEdges;
          });
          
          console.log(`[HOOK] ✅ Deleção de edge ${deletionChange.id} concluída`);
          return;
        } catch (err) {
          console.error(`[HOOK] ❌ Erro ao deletar edge ${deletionChange.id}:`, err);
          setError(err instanceof Error ? err : new Error(`Failed to delete edge: ${err}`));
          return;
        }
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

  // Restore state from undo/redo
  const restoreState = useCallback(async (restoredNodes: Node[], restoredEdges: Edge[]) => {
    console.log(`[HOOK] Restoring state with ${restoredNodes.length} nodes and ${restoredEdges.length} edges`);
    
    try {
      // Temporarily disable protection to allow restore
      addingNodeProtection.current = true;
      
      // Clear all pending timeouts to avoid conflicts
      positionSaveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      positionSaveTimeouts.current.clear();
      textSaveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      textSaveTimeouts.current.clear();
      
      // Update local state immediately
      setNodes(restoredNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Ensure onChange is properly set for each restored node
          onChange: (newText: string) => {
            console.log(`[RESTORED-NODE] onChange called for node ${node.id} with text:`, newText);
            handleTextChange(node.id, newText);
          },
        },
      })));
      
      setEdges(restoredEdges);
      
      console.log(`[HOOK] ✅ State restored locally`);
      
      // Save restored state to database (without triggering undo events)
      try {
        await updateMindmapNodes({
          projectId,
          nodes: restoredNodes,
        });
        
        if (restoredEdges.length > 0) {
          await updateMindmapEdges(projectId, restoredEdges);
        }
        
        console.log(`[HOOK] ✅ State saved to database`);
      } catch (dbError) {
        console.warn(`[HOOK] ⚠️ Database save failed during restore:`, dbError);
        // Continue anyway since local state is updated
      }
      
      // Remove protection after a delay
      setTimeout(() => {
        addingNodeProtection.current = false;
        console.log(`[HOOK] 🔓 Protection removed after restore`);
      }, 1000);
      
    } catch (err) {
      console.error(`[HOOK] ❌ Error restoring state:`, err);
      setError(err instanceof Error ? err : new Error("Failed to restore state"));
      addingNodeProtection.current = false;
    }
  }, [projectId, handleTextChange]);

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
    
    // Undo/Redo
    restoreState,
  };
}
