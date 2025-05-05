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

    if (nodeProjectError) throw nodeProjectError;

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

  if (error) throw error;
}

export async function deleteMindmapNode(nodeId: string, projectId: string): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    // First delete all edges connected to this node
    const { error: edgesError } = await supabase
      .from("mindmap_edges")
      .delete()
      .eq("project_id", projectId)
      .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`);

    if (edgesError) throw edgesError;

    // Then delete the node-project relationships
    const { error: nodeProjectsError } = await supabase
      .from("mindmap_node_projects")
      .delete()
      .eq("node_id", nodeId)
      .eq("project_id", projectId);

    if (nodeProjectsError) throw nodeProjectsError;

    // Get the node projects
    const { data: nodeProjects, error: nodeProjectsError2 } = await supabase
      .from("mindmap_node_projects")
      .select("*")
      .eq("node_id", nodeId);

    if (nodeProjectsError2) throw nodeProjectsError2;

    if (nodeProjects?.length === 0) {
      // Finally delete the node itself
      const { error: nodeError } = await supabase
        .from("mindmap_nodes")
        .delete()
        .eq("id", nodeId);

      if (nodeError) throw nodeError;
    }
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
