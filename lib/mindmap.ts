import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  MindmapProject,
  MindmapNode,
  MindmapEdge,
  MindmapData,
  MindmapNodeProjectWithNode,
} from "@/types/mindmap";
import { Node, Edge } from "reactflow";

export async function createMindmapProject(
  title: string,
  description?: string
): Promise<MindmapProject> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("mindmap_projects")
    .insert([{ title, description, user_id: session.user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMindmapProject(id: string, cacheBust?: string): Promise<MindmapData> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    // Get project
    const { data: project, error: projectError } = await supabase
      .from("mindmap_projects")
      .select()
      .eq("id", id)
      .single();

    if (projectError) throw projectError;

    // Get nodes for this project with their positions and styles
    const { data: nodeProjects, error: nodeProjectsError } = await supabase
      .from("mindmap_node_projects")
      .select(`
        node_id,
        position_x,
        position_y,
        style,
        mindmap_nodes:node_id (
          id,
          content
        )
      `)
      .eq("project_id", id) as { data: MindmapNodeProjectWithNode[] | null, error: any };

    if (nodeProjectsError) throw nodeProjectsError;

    // Get edges
    const { data: edges, error: edgesError } = await supabase
      .from("mindmap_edges")
      .select()
      .eq("project_id", id);

    if (edgesError) throw edgesError;
    console.log(nodeProjects);
    // Transform nodeProjects into nodes
    const nodes = nodeProjects?.map(np => ({
      id: np.node_id,
      content: np.mindmap_nodes.content,
      position: { x: np.position_x, y: np.position_y },
      style: np.style || {},
      project_id: id,
    })) || [];

    return {
      project,
      nodes,
      edges,
    };
  } catch (error) {
    console.error('Error in getMindmapProject:', error);
    throw error;
  }
}

export async function updateMindmapNodes({
  projectId,
  nodes,
  linkedProjectId,
}: {
  projectId: string,
  nodes: Node[],
  linkedProjectId?: string
}): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // First, check if the project exists and belongs to the user
  const { data: project, error: projectError } = await supabase
    .from("mindmap_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", session.user.id)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found or access denied");
  }

  // For each node, first create the node
  for (const node of nodes) {
    // First, try to insert the node
    const { error: nodeError } = await supabase
      .from("mindmap_nodes")
      .upsert({
        id: node.id,
        content: node.data.content || '',
      }, {
        onConflict: 'id'
      });

    if (nodeError) throw nodeError;

    // Then, create or update the node-project relationship for the current project
    const { error: nodeProjectError } = await supabase
      .from("mindmap_node_projects")
      .upsert({
        node_id: node.id,
        project_id: projectId,
        position_x: node.position.x,
        position_y: node.position.y,
        style: node.data.style || {},
      }, {
        onConflict: 'node_id,project_id'
      });

    if (nodeProjectError) {
      // Se a posição falhar por violação de FK (por exemplo, node foi deletado entre requisições), apenas loga e continua.
      if ((nodeProjectError as any).code === '23503') {
        console.warn(`[updateMindmapNodes] FK violation ao salvar relação node-projeto para node ${node.id}. Provavelmente foi deletado. Pulando.`);
      } else {
        throw nodeProjectError;
      }
    }

    // If this is a shared node with another project, create the relationship there too
    if (linkedProjectId) {
      const { error: linkedProjectError } = await supabase
        .from("mindmap_node_projects")
        .upsert({
          node_id: node.id,
          project_id: linkedProjectId,
          position_x: node.position.x,
          position_y: node.position.y,
          style: node.data.style || {},
        }, {
          onConflict: 'node_id,project_id'
        });

      if (linkedProjectError) throw linkedProjectError;
    }
  }
}

export async function updateMindmapEdges(
  projectId: string,
  edges: Edge[]
): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (const edge of edges) {
    let retries = 0;
    let success = false;

    while (!success && retries < maxRetries) {
      try {
        const { error } = await supabase.from("mindmap_edges").upsert({
          id: edge.id,
          source_id: edge.source,
          target_id: edge.target,
          type: edge.type || 'mindmap',
          label: edge.label || '',
          style: edge.style || {},
          project_id: projectId,
        });

        if (error) {
          if (error.code === '23503' && retries < maxRetries - 1) {
            // Foreign key violation - wait and retry
            console.log(`[EDGE] Retry ${retries + 1}/${maxRetries} for edge ${edge.id} (${edge.source} -> ${edge.target})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries++;
            continue;
          }
          throw error;
        }

        success = true;
        console.log(`[EDGE] Successfully created edge ${edge.id} (${edge.source} -> ${edge.target})`);
      } catch (error) {
        if (retries === maxRetries - 1) {
          console.error(`[EDGE] Failed to create edge after ${maxRetries} retries:`, error);
          throw error;
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

export async function deleteMindmapNode(nodeId: string, projectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  console.log(`[DELETE] Iniciando deleção do node ${nodeId} no projeto ${projectId}`);

  try {
    // 1. Delete all edges connected to this node in this project
    console.log(`[DELETE] Deletando edges conectadas ao node ${nodeId} no projeto ${projectId}`);
    const { data: deletedEdges, error: edgesError } = await supabase
      .from("mindmap_edges")
      .delete()
      .eq("project_id", projectId)
      .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
      .select();

    if (edgesError) {
      console.error(`[DELETE] Erro ao deletar edges:`, edgesError);
      throw edgesError;
    }
    console.log(`[DELETE] Deletadas ${deletedEdges?.length || 0} edges`);

    // Small delay to ensure edge deletion is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Delete the node-project relationship for this specific project
    console.log(`[DELETE] Deletando relacionamento node-projeto: ${nodeId} <-> ${projectId}`);
    const { data: deletedRelation, error: nodeProjectsError } = await supabase
      .from("mindmap_node_projects")
      .delete()
      .eq("node_id", nodeId)
      .eq("project_id", projectId)
      .select();

    if (nodeProjectsError) {
      console.error(`[DELETE] Erro ao deletar relacionamento node-projeto:`, nodeProjectsError);
      throw nodeProjectsError;
    }
    console.log(`[DELETE] Deletado relacionamento:`, deletedRelation);

    // Verify the relationship was actually deleted
    const { data: verifyDeletion, error: verifyError } = await supabase
      .from("mindmap_node_projects")
      .select("*")
      .eq("node_id", nodeId)
      .eq("project_id", projectId);

    if (verifyError) {
      console.error(`[DELETE] Erro ao verificar deleção do relacionamento:`, verifyError);
      throw verifyError;
    }

    if (verifyDeletion && verifyDeletion.length > 0) {
      console.error(`[DELETE] ❌ ERRO: Relacionamento não foi deletado! Ainda existe:`, verifyDeletion);
      throw new Error("Failed to delete node-project relationship");
    }
    console.log(`[DELETE] ✅ Relacionamento confirmado como deletado`);

    // Small delay before checking other projects
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Check if this node exists in other projects
    console.log(`[DELETE] Verificando se o node ${nodeId} existe em outros projetos`);
    const { data: remainingProjects, error: checkError } = await supabase
      .from("mindmap_node_projects")
      .select("project_id")
      .eq("node_id", nodeId);

    if (checkError) {
      console.error(`[DELETE] Erro ao verificar projetos restantes:`, checkError);
      throw checkError;
    }
    
    console.log(`[DELETE] Node ${nodeId} existe em ${remainingProjects?.length || 0} outros projetos:`, remainingProjects);

    // 4. If no other projects use this node, delete the node itself
    if (!remainingProjects || remainingProjects.length === 0) {
      console.log(`[DELETE] Node ${nodeId} não é usado em outros projetos. Deletando node principal.`);
      
      // Small delay before final deletion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: deletedNode, error: nodeError } = await supabase
        .from("mindmap_nodes")
        .delete()
        .eq("id", nodeId)
        .select();

      if (nodeError) {
        console.error(`[DELETE] Erro ao deletar node principal:`, nodeError);
        throw nodeError;
      }
      console.log(`[DELETE] Node principal deletado:`, deletedNode);

      // Final verification - ensure node is really gone
      const { data: verifyNodeDeletion, error: verifyNodeError } = await supabase
        .from("mindmap_nodes")
        .select("id")
        .eq("id", nodeId);

      if (verifyNodeError) {
        console.error(`[DELETE] Erro ao verificar deleção do node principal:`, verifyNodeError);
        throw verifyNodeError;
      }

      if (verifyNodeDeletion && verifyNodeDeletion.length > 0) {
        console.error(`[DELETE] ❌ ERRO: Node principal não foi deletado! Ainda existe:`, verifyNodeDeletion);
        throw new Error("Failed to delete main node");
      }
      console.log(`[DELETE] ✅ Node principal confirmado como deletado`);
    } else {
      console.log(`[DELETE] Node ${nodeId} mantido pois é usado em outros projetos`);
    }

    console.log(`[DELETE] ✅ Deleção do node ${nodeId} concluída com sucesso`);
  } catch (error) {
    console.error(`[DELETE] ❌ Erro na deleção do node ${nodeId}:`, error);
    throw error;
  }
}

export async function deleteMindmapEdge(edgeId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("mindmap_edges")
    .delete()
    .eq("id", edgeId);

  if (error) throw error;
}

export async function getAvailableProjects(currentProjectId: string): Promise<MindmapProject[]> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("mindmap_projects")
    .select("*")
    .neq("id", currentProjectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createNodeReference(
  sourceNodeId: string,
  targetNodeId: string,
  sourceProjectId: string,
  targetProjectId: string
): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Check for circular references
  const { data: existingRefs } = await supabase
    .from("mindmap_node_references")
    .select("source_node_id, target_node_id")
    .eq("source_node_id", targetNodeId)
    .eq("target_node_id", sourceNodeId);

  if (existingRefs && existingRefs.length > 0) {
    throw new Error("Circular references are not allowed");
  }

  // Check reference depth
  const { data: targetRefs } = await supabase
    .from("mindmap_node_references")
    .select("source_node_id")
    .eq("target_node_id", targetNodeId);

  if (targetRefs && targetRefs.length >= 5) {
    throw new Error("Maximum reference depth reached (5 levels)");
  }

  const { error } = await supabase
    .from("mindmap_node_references")
    .insert({
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      source_project_id: sourceProjectId,
      target_project_id: targetProjectId,
    });

  if (error) throw error;
}

export async function getNodeReferences(nodeId: string): Promise<{
  sourceReferences: { node_id: string; project_id: string }[];
  targetReferences: { node_id: string; project_id: string }[];
}> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data: sourceRefs, error: sourceError } = await supabase
    .from("mindmap_node_references")
    .select("source_node_id, source_project_id")
    .eq("target_node_id", nodeId);

  if (sourceError) throw sourceError;

  const { data: targetRefs, error: targetError } = await supabase
    .from("mindmap_node_references")
    .select("target_node_id, target_project_id")
    .eq("source_node_id", nodeId);

  if (targetError) throw targetError;

  return {
    sourceReferences: sourceRefs?.map(ref => ({
      node_id: ref.source_node_id,
      project_id: ref.source_project_id,
    })) || [],
    targetReferences: targetRefs?.map(ref => ({
      node_id: ref.target_node_id,
      project_id: ref.target_project_id,
    })) || [],
  };
}

export async function getMindmapNode(nodeId: string): Promise<MindmapNode> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("mindmap_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();

  if (error) throw error;
  return data;
}

export async function getNodeProjects(nodeId: string): Promise<{ project_id: string; project_title: string }[]> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .rpc('get_node_projects', { node_id: nodeId });

  if (error) throw error;
  return data;
}

export async function createProjectNode(
  currentProjectId: string,
  linkedProjectId: string,
  projectName: string,
  nodeId?: string
): Promise<{ node_id: string }> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const newNodeId = nodeId || crypto.randomUUID();

  // First, create the node
  const { error: nodeError } = await supabase
    .from("mindmap_nodes")
    .upsert({
      id: newNodeId,
      content: projectName,
    }, {
      onConflict: 'id'
    });

  if (nodeError) throw nodeError;

  // Create node-project relationship for the current project
  const { error: currentProjectError } = await supabase
    .from("mindmap_node_projects")
    .upsert({
      node_id: newNodeId,
      project_id: currentProjectId,
      position_x: 100, // Default position
      position_y: 100,
      style: {
        backgroundColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        fontSize: 14,
      },
    }, {
      onConflict: 'node_id,project_id'
    });

  if (currentProjectError) throw currentProjectError;

  // Create node-project relationship for the linked project
  const { error: linkedProjectError } = await supabase
    .from("mindmap_node_projects")
    .upsert({
      node_id: newNodeId,
      project_id: linkedProjectId,
      position_x: 100, // Default position
      position_y: 100,
      style: {
        backgroundColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        fontSize: 14,
      },
    }, {
      onConflict: 'node_id,project_id'
    });

  if (linkedProjectError) throw linkedProjectError;

  return { node_id: newNodeId };
}

export async function deleteMindmapProject(projectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    // Delete the project (this will cascade delete all node-project relationships)
    const { error: deleteError } = await supabase
      .from("mindmap_projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) throw deleteError;

    // Clean up orphaned nodes
    const { data: deletedNodes, error: cleanupError } = await supabase
      .rpc('cleanup_orphaned_nodes');

    if (cleanupError) {
      console.error('Error cleaning up orphaned nodes:', cleanupError);
      // We don't throw here because the project was already deleted successfully
    } else {
      console.log(`Cleaned up ${deletedNodes?.length || 0} orphaned nodes`);
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export async function getMindmapProjects(): Promise<MindmapProject[]> {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase
    .from("mindmap_projects")
    .select("*");

  if (error) throw error;
  return data;
}

// ===================== PROJECT OVERVIEW (USER-LEVEL) =====================

export interface ProjectOverviewNode {
  project_id: string;
  position: { x: number; y: number };
  style?: any;
}

export interface ProjectOverviewEdge {
  id: string;
  source_project_id: string;
  target_project_id: string;
  label?: string;
  style?: any;
}

export async function getProjectOverview(): Promise<{
  nodes: ProjectOverviewNode[];
  edges: ProjectOverviewEdge[];
}> {
  const supabase = createClientComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Fetch nodes
  const { data: nodesData, error: nodesError } = await supabase
    .from("project_view_nodes")
    .select("project_id, position_x, position_y, style");
  if (nodesError) throw nodesError;

  // Fetch edges
  const { data: edgesData, error: edgesError } = await supabase
    .from("project_view_edges")
    .select();
  if (edgesError) throw edgesError;

  const nodes: ProjectOverviewNode[] = (nodesData || []).map((n: any) => ({
    project_id: n.project_id,
    position: { x: n.position_x, y: n.position_y },
    style: n.style || {},
  }));

  const edges: ProjectOverviewEdge[] = (edgesData || []) as any;

  return { nodes, edges };
}

export async function upsertProjectOverviewNodes(nodes: ProjectOverviewNode[]): Promise<void> {
  const supabase = createClientComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const rows = nodes.map((n) => ({
    user_id: session.user.id,
    project_id: n.project_id,
    position_x: n.position.x,
    position_y: n.position.y,
    style: n.style || {},
  }));

  const { error } = await supabase.from("project_view_nodes").upsert(rows, {
    onConflict: "user_id,project_id",
  });
  if (error) throw error;
}

export async function upsertProjectOverviewEdges(edges: ProjectOverviewEdge[]): Promise<void> {
  const supabase = createClientComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const rows = edges.map((e) => ({
    id: e.id,
    user_id: session.user.id,
    source_project_id: e.source_project_id,
    target_project_id: e.target_project_id,
    label: e.label,
    style: e.style || {},
  }));

  const { error } = await supabase.from("project_view_edges").upsert(rows, {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function deleteProjectOverviewEdge(edgeId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("project_view_edges")
    .delete()
    .eq("id", edgeId);

  if (error) throw error;
}

// ===================== IMPORTER UTILS =====================

/**
 * Import an array of projects (with their nodes and edges) in one go.
 * The JSON shape expected:
 * [
 *   {
 *     "title": string,
 *     "description"?: string,
 *     "nodes": [
 *       {
 *         "content": string,
 *         "position": { "x": number, "y": number },
 *         "style"?: any
 *       }
 *     ],
 *     "edges": [
 *       {
 *         "source": number,   // index of source node in nodes array
 *         "target": number    // index of target node in nodes array
 *       }
 *     ]
 *   }
 * ]
 */

export interface RawImportProject {
  title: string;
  description?: string;
  nodes: {
    content: string;
    position: { x: number; y: number };
    style?: any;
  }[];
  edges: {
    source: number | string;
    target: number | string;
  }[];
}

export async function importMindmapProjects(rawProjects: RawImportProject[]) {
  for (const raw of rawProjects) {
    // 1. Create project first
    const project = await createMindmapProject(raw.title, raw.description);

    // 2. Convert raw nodes -> RF Nodes with new ids
    const idxToId = new Map<number, string>();
    const rfNodes: Node[] = raw.nodes.map((n, idx) => {
      const newId = crypto.randomUUID();
      idxToId.set(idx, newId);
      return {
        id: newId,
        position: n.position,
        data: {
          content: n.content,
          style: n.style || {
            backgroundColor: "#ffffff",
            borderColor: "#000000",
            borderWidth: 2,
            fontSize: 14,
          },
        },
      } as unknown as Node;
    });

    // 3. Insert nodes
    await updateMindmapNodes({ projectId: project.id, nodes: rfNodes });

    // 4. Map raw edges using idx mapping
    const rfEdges: Edge[] = raw.edges.map((e) => {
      const sourceId = idxToId.get(typeof e.source === "string" ? parseInt(e.source) : (e.source as number));
      const targetId = idxToId.get(typeof e.target === "string" ? parseInt(e.target) : (e.target as number));
      if (!sourceId || !targetId) {
        throw new Error(`Edge references missing node. Source: ${e.source}, Target: ${e.target}`);
      }
      return {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId,
        type: "default",
      } as unknown as Edge;
    });

    // 5. Insert edges
    await updateMindmapEdges(project.id, rfEdges);
  }
}