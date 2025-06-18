import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MindmapProject } from "@/types/mindmap";
import { getNodeProjects, getMindmapProject } from "@/lib/mindmap";

interface ProjectNode {
  id: string;
  content: string;
}

interface NodeProject {
  node_id: string;
  mindmap_nodes: {
    id: string;
    content: string;
  }[];
}

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string, projectName: string, nodeId?: string) => void;
  currentProjectId: string;
}

export function ProjectSelectorModal({
  isOpen,
  onClose,
  onSelect,
  currentProjectId,
}: ProjectSelectorModalProps) {
  const [projects, setProjects] = useState<MindmapProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<MindmapProject | null>(null);
  const [nodes, setNodes] = useState<ProjectNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        const { data, error } = await supabase
          .from("mindmap_projects")
          .select()
          .neq("id", currentProjectId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, supabase, currentProjectId]);

  const loadProjectNodes = async (projectId: string) => {
    setLoadingNodes(true);
    try {
      const { nodes } = await getMindmapProject(projectId);
      setNodes(nodes.map((node: any) => ({
        id: node.id,
        content: node.content
      })));
    } catch (err) {
      console.error("Error loading nodes:", err);
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleProjectSelect = (project: MindmapProject) => {
    setSelectedProject(project);
    loadProjectNodes(project.id);
  };

  const handleBack = () => {
    setSelectedProject(null);
    setNodes([]);
  };

  const handleNodeSelect = (nodeId: string, nodeContent: string) => {
    if (selectedProject) {
      onSelect(selectedProject.id, nodeContent, nodeId);
      onClose();
    }
  };

  const handleNewNode = () => {
    if (selectedProject) {
      onSelect(selectedProject.id, selectedProject.title);
      onClose();
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedProject ? `Select Node from ${selectedProject.title}` : "Select a Project"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {selectedProject ? (
          <>
            <div className="mb-4">
              <button
                onClick={handleBack}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                ← Back to Projects
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingNodes ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleNewNode}
                    className="w-full p-3 text-left border rounded-md hover:bg-gray-50 transition-colors bg-green-50 border-green-200"
                  >
                    <div className="font-medium">Create New Node</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Add a new node to this project
                    </div>
                  </button>

                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeSelect(node.id, node.content)}
                      className="w-full p-3 text-left border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{node.content}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No projects found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="w-full p-3 text-left border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{project.title}</div>
                      {project.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {project.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 