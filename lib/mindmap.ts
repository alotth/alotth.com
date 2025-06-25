import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  MindmapProject,
  MindmapNode,
  MindmapEdge,
  MindmapData,
  MindmapNodeProjectWithNode,
  NoteWithProject,
} from "@/types/mindmap";
import { Node, Edge } from "reactflow";

export async function createMindmapProject(
  title: string,
  description?: string,
  is_pinned?: boolean,
  is_archived?: boolean
): Promise<MindmapProject> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("mindmap_projects")
    .insert([{ 
      title, 
      description, 
      user_id: session.user.id,
      is_pinned: is_pinned || false,
      is_archived: is_archived || false
    }])
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
          content,
          is_pinned,
          is_archived,
          priority,
          workflow_status,
          due_date
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
      is_pinned: np.mindmap_nodes.is_pinned || false,
      is_archived: np.mindmap_nodes.is_archived || false,
      priority: np.mindmap_nodes.priority || null,
      workflow_status: np.mindmap_nodes.workflow_status || null,
      due_date: np.mindmap_nodes.due_date || null,
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
        is_pinned: node.data.isPinned || node.data.is_pinned || false,
        is_archived: node.data.isArchived || node.data.is_archived || false,
        priority: node.data.priority || null,
        workflow_status: node.data.workflowStatus || node.data.workflow_status || null,
        due_date: node.data.dueDate || node.data.due_date || null,
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

export async function deleteAllMindmapProjects(): Promise<number> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    // First get the count of projects to be deleted
    const { data: projects, error: countError } = await supabase
      .from("mindmap_projects")
      .select("id")
      .eq("user_id", session.user.id);

    if (countError) throw countError;

    const projectCount = projects?.length || 0;

    if (projectCount === 0) {
      return 0;
    }

    // Delete all projects for the current user (this will cascade delete all node-project relationships)
    const { error: deleteError } = await supabase
      .from("mindmap_projects")
      .delete()
      .eq("user_id", session.user.id);

    if (deleteError) throw deleteError;

    // Clean up orphaned nodes
    const { data: deletedNodes, error: cleanupError } = await supabase
      .rpc('cleanup_orphaned_nodes');

    if (cleanupError) {
      console.error('Error cleaning up orphaned nodes:', cleanupError);
      // We don't throw here because the projects were already deleted successfully
    } else {
      console.log(`Cleaned up ${deletedNodes?.length || 0} orphaned nodes`);
    }

    return projectCount;
  } catch (error) {
    console.error('Error deleting all projects:', error);
    throw error;
  }
}

export async function getMindmapProjects(): Promise<MindmapProject[]> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("mindmap_projects")
    .select("*")
    .eq("user_id", session.user.id)
    .order("is_pinned", { ascending: false })
    .order("is_archived", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
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

// ===================== IMAGE PROCESSING FOR IMPORTS =====================

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
  is_pinned?: boolean;
  is_archived?: boolean;
  nodes: {
    content: string;
    position: { x: number; y: number };
    style?: any;
    is_pinned?: boolean;
    is_archived?: boolean;
    priority?: 'low' | 'medium' | 'high';
    workflow_status?: 'todo' | 'in_progress' | 'done' | 'blocked';
    due_date?: string;
  }[];
  edges: {
    source: number | string;
    target: number | string;
  }[];
}

/**
 * Process markdown content and upload any referenced images
 * Replaces local image references with Supabase Storage URLs
 */
export async function processImagesInContent(content: string, userId: string = 'import'): Promise<string> {
  const supabase = createClientComponentClient();
  
  // Regex to find markdown image references
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let processedContent = content;
  const matches = Array.from(content.matchAll(imageRegex));
  
  for (const match of matches) {
    const fullMatch = match[0];
    const altText = match[1];
    const imagePath = match[2];
    
    // Skip if it's already a URL (http/https)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      continue;
    }
    
    // Skip if it's already a Supabase URL
    if (imagePath.includes('supabase')) {
      continue;
    }
    
    try {
      // For local file references, we'll need to handle them differently
      // For now, we'll create placeholder URLs
      console.log(`⚠️ Local image reference found: ${imagePath}`);
      console.log(`Consider uploading this image manually or via the upload script`);
      
      // You could extend this to:
      // 1. Check if file exists locally
      // 2. Upload to Supabase Storage
      // 3. Replace with new URL
      
    } catch (error) {
      console.error(`Failed to process image: ${imagePath}`, error);
    }
  }
  
  return processedContent;
}

/**
 * Enhanced import function that processes images in content
 */
export async function importMindmapProjectsWithImages(rawProjects: RawImportProject[]) {
  const { data: { session } } = await createClientComponentClient().auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }
  
  for (const raw of rawProjects) {
    // 1. Create project first
    const project = await createMindmapProject(raw.title, raw.description, raw.is_pinned, raw.is_archived);

    // 2. Process images in project description
    const processedDescription = await processImagesInContent(raw.description || '', session.user.id);
    if (processedDescription !== raw.description) {
      // Update project with processed description
      const supabase = createClientComponentClient();
      await supabase
        .from("mindmap_projects")
        .update({ description: processedDescription })
        .eq("id", project.id);
    }

    // 3. Convert raw nodes -> RF Nodes with processed images
    const idxToId = new Map<number, string>();
    const rfNodes: Node[] = await Promise.all(
      raw.nodes.map(async (n: RawImportProject['nodes'][0], idx: number) => {
        const newId = crypto.randomUUID();
        idxToId.set(idx, newId);
        
        // Process images in node content
        const processedContent = await processImagesInContent(n.content, session.user.id);
        
        return {
          id: newId,
          position: n.position,
          data: {
            content: processedContent,
            style: n.style || {
              backgroundColor: "#ffffff",
              borderColor: "#000000",
              borderWidth: 2,
              fontSize: 14,
            },
            is_pinned: n.is_pinned || false,
            is_archived: n.is_archived || false,
            priority: n.priority || null,
            workflow_status: n.workflow_status || null,
            due_date: n.due_date || null,
          },
        } as unknown as Node;
      })
    );

    // 4. Insert nodes
    await updateMindmapNodes({ projectId: project.id, nodes: rfNodes });

    // 5. Map raw edges using idx mapping
    const rfEdges: Edge[] = raw.edges.map((e: RawImportProject['edges'][0]) => {
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

    // 6. Insert edges
    await updateMindmapEdges(project.id, rfEdges);
  }
}

/**
 * Apply image URL mapping to update local image references with Supabase URLs
 * This is useful after running the upload-keep-images.js script
 */
export async function applyImageUrlMapping(urlMapping: Record<string, string>) {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  let updatedNodes = 0;
  let updatedProjects = 0;

  try {
    // Get all projects and nodes for the current user
    const { data: projects, error: projectsError } = await supabase
      .from("mindmap_projects")
      .select("id, description")
      .eq("user_id", session.user.id);

    if (projectsError) throw projectsError;

    const { data: nodes, error: nodesError } = await supabase
      .from("mindmap_nodes")
      .select("id, content");

    if (nodesError) throw nodesError;

    // Update project descriptions
    for (const project of projects || []) {
      if (project.description) {
        let updatedDescription = project.description;
        let hasUpdates = false;

        // Replace all mapped URLs in description
        Object.entries(urlMapping).forEach(([localPath, supabaseUrl]) => {
          const patterns = [
            `(./images/${localPath})`,
            `(./${localPath})`,
            `(${localPath})`,
            `(./references/Keep/${localPath})`
          ];

          patterns.forEach(pattern => {
            if (updatedDescription.includes(pattern)) {
              updatedDescription = updatedDescription.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `(${supabaseUrl})`);
              hasUpdates = true;
            }
          });
        });

        if (hasUpdates) {
          const { error } = await supabase
            .from("mindmap_projects")
            .update({ description: updatedDescription })
            .eq("id", project.id);

          if (error) {
            console.error(`Failed to update project ${project.id}:`, error);
          } else {
            updatedProjects++;
            console.log(`✅ Updated project: ${project.id}`);
          }
        }
      }
    }

    // Update node contents
    for (const node of nodes || []) {
      if (node.content) {
        let updatedContent = node.content;
        let hasUpdates = false;

        // Replace all mapped URLs in content
        Object.entries(urlMapping).forEach(([localPath, supabaseUrl]) => {
          const patterns = [
            `(./images/${localPath})`,
            `(./${localPath})`,
            `(${localPath})`,
            `(./references/Keep/${localPath})`
          ];

          patterns.forEach(pattern => {
            if (updatedContent.includes(pattern)) {
              updatedContent = updatedContent.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `(${supabaseUrl})`);
              hasUpdates = true;
            }
          });
        });

        if (hasUpdates) {
          const { error } = await supabase
            .from("mindmap_nodes")
            .update({ content: updatedContent })
            .eq("id", node.id);

          if (error) {
            console.error(`Failed to update node ${node.id}:`, error);
          } else {
            updatedNodes++;
            console.log(`✅ Updated node: ${node.id}`);
          }
        }
      }
    }

    console.log(`\n📊 Image URL Mapping Applied:`);
    console.log(`- ✅ Updated Projects: ${updatedProjects}`);
    console.log(`- ✅ Updated Nodes: ${updatedNodes}`);
    console.log(`- 📋 Total URL Mappings: ${Object.keys(urlMapping).length}`);

    return {
      success: true,
      updatedProjects,
      updatedNodes,
      totalMappings: Object.keys(urlMapping).length
    };

  } catch (error) {
    console.error('Error applying image URL mapping:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      updatedProjects,
      updatedNodes
    };
  }
}

export async function importMindmapProjects(rawProjects: RawImportProject[]) {
  for (const raw of rawProjects) {
    // 1. Create project first
    const project = await createMindmapProject(raw.title, raw.description, raw.is_pinned, raw.is_archived);

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
          is_pinned: n.is_pinned || false,
          is_archived: n.is_archived || false,
          priority: n.priority || null,
          workflow_status: n.workflow_status || null,
          due_date: n.due_date || null,
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

// Toggle project pinned status
export async function toggleProjectPinned(projectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // First get current state
  const { data: project, error: getError } = await supabase
    .from("mindmap_projects")
    .select("is_pinned")
    .eq("id", projectId)
    .eq("user_id", session.user.id)
    .single();

  if (getError) throw getError;

  // Toggle the pinned state
  const { error } = await supabase
    .from("mindmap_projects")
    .update({ is_pinned: !project.is_pinned })
    .eq("id", projectId)
    .eq("user_id", session.user.id);

  if (error) throw error;
}

// Toggle project archived status
export async function toggleProjectArchived(projectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // First get current state
  const { data: project, error: getError } = await supabase
    .from("mindmap_projects")
    .select("is_archived")
    .eq("id", projectId)
    .eq("user_id", session.user.id)
    .single();

  if (getError) throw getError;

  // Toggle the archived state
  const { error } = await supabase
    .from("mindmap_projects")
    .update({ is_archived: !project.is_archived })
    .eq("id", projectId)
    .eq("user_id", session.user.id);

  if (error) throw error;
}

// Toggle node pinned status
export async function toggleNodePinned(nodeId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // First get current state
  const { data: node, error: getError } = await supabase
    .from("mindmap_nodes")
    .select("is_pinned")
    .eq("id", nodeId)
    .single();

  if (getError) throw getError;

  // Toggle the pinned state
  const { error } = await supabase
    .from("mindmap_nodes")
    .update({ is_pinned: !node.is_pinned })
    .eq("id", nodeId);

  if (error) throw error;
}

// Toggle node archived status
export async function toggleNodeArchived(nodeId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // First get current state
  const { data: node, error: getError } = await supabase
    .from("mindmap_nodes")
    .select("is_archived")
    .eq("id", nodeId)
    .single();

  if (getError) throw getError;

  // Toggle the archived state
  const { error } = await supabase
    .from("mindmap_nodes")
    .update({ is_archived: !node.is_archived })
    .eq("id", nodeId);

  if (error) throw error;
}

// ===================== NOTES VIEW =====================

export async function getAllNotes(searchQuery?: string): Promise<NoteWithProject[]> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Get all notes with project information
  const { data, error } = await supabase
    .from("mindmap_nodes")
    .select(`
      id,
      content,
      is_pinned,
      is_archived,
      priority,
      workflow_status,
      due_date,
      updated_at,
      created_at,
      mindmap_node_projects!inner (
        project_id,
        position_x,
        position_y,
        mindmap_projects!inner (
          id,
          title,
          is_pinned,
          is_archived,
          user_id
        )
      )
    `)
    .eq("mindmap_node_projects.mindmap_projects.user_id", session.user.id);

  if (error) throw error;

  // Transform the data to flatten the structure
  const notes: NoteWithProject[] = [];
  
  if (data) {
    for (const node of data as any[]) {
      for (const nodeProject of node.mindmap_node_projects) {
        const project = nodeProject.mindmap_projects;
        
        const note: NoteWithProject = {
          id: node.id,
          content: node.content,
          position: { x: nodeProject.position_x, y: nodeProject.position_y },
          style: {},
          project_id: project.id,
          project_title: project.title,
          project_is_archived: project.is_archived,
          project_is_pinned: project.is_pinned,
          is_pinned: node.is_pinned || false,
          is_archived: node.is_archived || false,
          priority: node.priority || null,
          workflow_status: node.workflow_status || null,
          due_date: node.due_date || null,
          created_at: node.created_at,
          updated_at: node.updated_at,
        };
        
        // Apply search filter if provided
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesContent = note.content.toLowerCase().includes(query);
          const matchesProject = note.project_title.toLowerCase().includes(query);
          
          if (matchesContent || matchesProject) {
            notes.push(note);
          }
        } else {
          notes.push(note);
        }
      }
    }
  }

  // Sort notes by pinned, archived, then by date
  return notes.sort((a, b) => {
    // First by pinned status (pinned first)
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }
    
    // Then by archived status (non-archived first)
    if (a.is_archived !== b.is_archived) {
      return a.is_archived ? 1 : -1;
    }
    
    // Finally by updated date (most recent first)
    return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
  });
}

// Update note content
export async function updateNoteContent(nodeId: string, content: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("mindmap_nodes")
    .update({ 
      content,
      updated_at: new Date().toISOString()
    })
    .eq("id", nodeId);

  if (error) throw error;
}

// Move note to a different project
export async function moveNoteToProject(nodeId: string, currentProjectId: string, newProjectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Check if the new project exists and belongs to the user
  const { data: newProject, error: projectError } = await supabase
    .from("mindmap_projects")
    .select("id")
    .eq("id", newProjectId)
    .eq("user_id", session.user.id)
    .single();

  if (projectError || !newProject) {
    throw new Error("Project not found or access denied");
  }

  // Get current position in old project
  const { data: currentNodeProject, error: currentError } = await supabase
    .from("mindmap_node_projects")
    .select("position_x, position_y, style")
    .eq("node_id", nodeId)
    .eq("project_id", currentProjectId)
    .single();

  if (currentError) throw currentError;

  // Remove from old project
  const { error: deleteError } = await supabase
    .from("mindmap_node_projects")
    .delete()
    .eq("node_id", nodeId)
    .eq("project_id", currentProjectId);

  if (deleteError) throw deleteError;

  // Add to new project with same position or default position
  const { error: insertError } = await supabase
    .from("mindmap_node_projects")
    .insert({
      node_id: nodeId,
      project_id: newProjectId,
      position_x: currentNodeProject?.position_x || 100,
      position_y: currentNodeProject?.position_y || 100,
      style: currentNodeProject?.style || {}
    });

  if (insertError) throw insertError;
}

// Get available projects for moving notes
export async function getAvailableProjectsForNote(excludeProjectId?: string): Promise<MindmapProject[]> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  let query = supabase
    .from("mindmap_projects")
    .select("*")
    .eq("user_id", session.user.id)
    .order("is_pinned", { ascending: false })
    .order("title");

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}