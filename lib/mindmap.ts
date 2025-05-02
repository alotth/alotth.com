import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  MindmapProject,
  MindmapNode,
  MindmapEdge,
  MindmapData,
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

  console.log('Fetching mindmap project:', id, 'with cache bust:', cacheBust);

  try {
    // Get project
    const { data: project, error: projectError } = await supabase
      .from("mindmap_projects")
      .select()
      .eq("id", id)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      throw projectError;
    }

    // Get nodes with cache busting
    const { data: nodes, error: nodesError } = await supabase
      .from("mindmap_nodes")
      .select()
      .eq("project_id", id)
      .order('created_at', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      throw nodesError;
    }

    // Get edges with cache busting
    const { data: edges, error: edgesError } = await supabase
      .from("mindmap_edges")
      .select()
      .eq("project_id", id)
      .order('created_at', { ascending: true });

    if (edgesError) {
      console.error('Error fetching edges:', edgesError);
      throw edgesError;
    }

    console.log('Fetched mindmap data:', {
      project,
      nodesCount: nodes?.length,
      edgesCount: edges?.length
    });

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

export async function updateMindmapNodes(
  projectId: string,
  nodes: Node[]
): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  console.log('Updating mindmap nodes:', nodes);
  const { error } = await supabase.from("mindmap_nodes").upsert(
    nodes.map((node) => ({
      id: node.id,
      content: node.data.content || '',
      position: node.position,
      style: node.data.style || {},
      project_id: projectId,
      referenced_project_id: node.data.referencedProjectId,
      referenced_project_name: node.data.referencedProjectName,
    }))
  );

  if (error) throw error;
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

  const { error } = await supabase.from("mindmap_edges").upsert(
    edges.map((edge) => ({
      id: edge.id,
      source_id: edge.source,
      target_id: edge.target,
      type: edge.type || 'mindmap',
      label: edge.label || '',
      style: edge.style || {},
      project_id: projectId,
    }))
  );

  if (error) {
    console.error('Edge creation error:', error);
    throw error;
  }
}

export async function deleteMindmapNode(nodeId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  console.log('Deleting node:', nodeId);

  try {
    // First delete all edges connected to this node
    const { error: edgesError, data: deletedEdges } = await supabase
      .from("mindmap_edges")
      .delete()
      .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
      .select();

    console.log('Deleted edges:', deletedEdges);
    if (edgesError) {
      console.error('Error deleting edges:', edgesError);
      throw edgesError;
    }

    // Then delete the node
    const { error, data: deletedNode } = await supabase
      .from("mindmap_nodes")
      .delete()
      .eq("id", nodeId)
      .select();

    console.log('Deleted node:', deletedNode);
    if (error) {
      console.error('Error deleting node:', error);
      throw error;
    }

    // Verify deletion by checking if the node exists in the current project
    const { data: projectNodes } = await supabase
      .from("mindmap_nodes")
      .select("id")
      .eq("id", nodeId);

    if (projectNodes && projectNodes.length > 0) {
      console.error('Node still exists after deletion:', projectNodes);
      throw new Error('Failed to delete node');
    }

    console.log('Node deletion verified successfully');
  } catch (error) {
    console.error('Error in deleteMindmapNode:', error);
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
