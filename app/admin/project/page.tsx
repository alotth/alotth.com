"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteMindmapProject, getMindmapProjects, getProjectOverview, upsertProjectOverviewNodes, upsertProjectOverviewEdges, deleteProjectOverviewEdge, createMindmapProject, importMindmapProjects } from "@/lib/mindmap";
import { useState, useMemo, useEffect, useRef } from "react";
import { MindmapProject } from "@/types/mindmap";
import ReactFlow, {
  Node as FlowNode,
  NodeChange,
  Edge as FlowEdge,
  Connection,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { ExternalLink, ChevronRight, ChevronLeft, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { supabase } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/ui/markdown-editor";

export default function MindmapPage() {
  const [projects, setProjects] = useState<MindmapProject[]>([]);
  const [viewType, setViewType] = useState<"list" | "mindmap">(
    (typeof window !== "undefined" && (localStorage.getItem("projects_view_type") as "list" | "mindmap")) || "list"
  );
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  // Markdown components configuration
  const markdownComponents: Components = {
    ul: ({node, children, ...props}) => <ul className="list-disc pl-4 my-1" {...props}>{children}</ul>,
    ol: ({node, children, ...props}) => <ol className="list-decimal pl-4 my-1" {...props}>{children}</ol>,
    li: ({node, children, ...props}) => <li className="my-0" {...props}>{children}</li>,
    p: ({node, children, ...props}) => <p className="my-1" {...props}>{children}</p>,
    h1: ({node, children, ...props}) => <h1 className="text-base font-bold my-1" {...props}>{children}</h1>,
    h2: ({node, children, ...props}) => <h2 className="text-sm font-bold my-1" {...props}>{children}</h2>,
    h3: ({node, children, ...props}) => <h3 className="text-sm font-semibold my-1" {...props}>{children}</h3>,
    a: ({node, children, href, ...props}) => (
      <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  };

  // Fetch overview data (positions) once on mount in parallel with projects list
  useEffect(() => {
    (async () => {
      try {
        setInitializing(true);
        const [projectList, overview] = await Promise.all([
          getMindmapProjects(),
          getProjectOverview(),
        ]);
        setProjects(projectList);

        // Build nodes merging DB positions w/ fallback layout
        const nodeMap: Record<string, { x: number; y: number; style?: any }> = {};
        overview.nodes.forEach((n) => {
          nodeMap[n.project_id] = { x: n.position.x, y: n.position.y, style: n.style };
        });

        const builtNodes: FlowNode[] = projectList.map((p, idx) => ({
          id: p.id,
          type: "projectNode",
          position: nodeMap[p.id] || { x: idx * 180, y: idx * 100 },
          data: { id: p.id, label: p.title, description: p.description ?? "" },
          //@ts-ignore
          style: nodeMap[p.id]?.style || {},
        }));
        setFlowNodes(builtNodes);

        // Build edges from overview
        const builtEdges: FlowEdge[] = overview.edges.map((e: any) => ({
          id: e.id,
          source: e.source_project_id,
          target: e.target_project_id,
          type: "default",
        }));
        setFlowEdges(builtEdges);
      } catch (err) {
        console.error("Error initializing project overview:", err);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // When projects list changes (e.g., after delete), ensure nodes list stays in sync
  useEffect(() => {
    setFlowNodes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newNodes = [...prev];
      projects.forEach((p, idx) => {
        if (!existingIds.has(p.id)) {
          newNodes.push({
            id: p.id,
            type: "projectNode",
            position: { x: idx * 180, y: idx * 100 },
            data: { id: p.id, label: p.title, description: p.description ?? "" },
          });
        }
      });
      return newNodes.filter((n) => projects.some((p) => p.id === n.id));
    });
  }, [projects]);

  const onNodesChange = (changes: NodeChange[]) => {
    setFlowNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      // Persist the positions in DB (debounced by simple timeout)
      persistPositions(updated);
      return updated;
    });
  };

  // Debounce saving positions
  const persistTimeout = useRef<NodeJS.Timeout | null>(null);
  const persistPositions = (nodes: FlowNode[]) => {
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      const payload = nodes.map((n) => ({
        project_id: n.id,
        position: n.position,
        style: n.style || {},
      }));
      upsertProjectOverviewNodes(payload).catch((err) => console.error("Failed to save overview positions", err));
    }, 500);
  };

  const persistEdgesTimeout = useRef<NodeJS.Timeout | null>(null);
  const persistEdges = (edges: FlowEdge[]) => {
    if (persistEdgesTimeout.current) clearTimeout(persistEdgesTimeout.current);
    persistEdgesTimeout.current = setTimeout(() => {
      const payload = edges.map((e) => ({
        id: e.id,
        source_project_id: e.source,
        target_project_id: e.target,
        label: typeof e.label === "string" ? e.label : undefined,
        style: e.style || {},
      })) as any;
      upsertProjectOverviewEdges(payload).catch((err) => console.error("Failed to save overview edges", err));
    }, 500);
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setFlowEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      persistEdges(updated);
      // detect removed edges to delete from DB
      changes.forEach((c) => {
        if (c.type === "remove") {
          deleteProjectOverviewEdge(c.id as string).catch((err) => console.error("Failed to delete edge", err));
        }
      });
      return updated;
    });
  };

  const onConnect = (connection: Connection) => {
    setFlowEdges((eds) => {
      const newEdge: FlowEdge = {
        id: crypto.randomUUID(),
        source: connection.source!,
        target: connection.target!,
        type: "default",
      };
      const updated = addEdge(newEdge, eds);
      persistEdges(updated);
      return updated;
    });
  };

  const ProjectNodeComponent = ({ data }: NodeProps) => {
    const { id, label, description } = data as any;
    const [expanded, setExpanded] = useState(false);

    const toggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    };

    return (
      <div className="relative px-4 py-2 bg-black border-2 border-white rounded shadow-md min-w-[120px] text-center select-none">
        {/* Title */}
        <div className="font-medium text-white pointer-events-none mb-1">{label}</div>

        {/* Description */}
        {expanded && description && (
          <div className="text-left px-2 text-white/80 max-w-[300px] mx-auto mb-1 relative group">
            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(id, description);
                }}
              >
                <Edit2 className="h-4 w-4 text-white hover:text-primary" />
              </Button>
            </div>
            <div className="pointer-events-none">
              <ReactMarkdown 
                className="prose prose-invert prose-sm max-w-none"
                components={markdownComponents}
              >
                {description}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Expand / Collapse button */}
        {description && (
          <button
            onClick={toggle}
            className="absolute bottom-1 left-1 text-white hover:text-primary"
          >
            {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Link icon */}
        <Link
          href={`/admin/project/${id}`}
          className="absolute top-1 right-1 text-white hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </Link>

        {/* Connection handles */}
        <Handle type="source" position={Position.Right} />
        <Handle type="target" position={Position.Left} />
      </div>
    );
  };

  // Node types map (memoized to avoid re-creation warnings)
  const nodeTypes = useMemo(
    () => ({
      projectNode: ProjectNodeComponent,
    }) as any,
    []
  );

  const deleteProject = async (id: string) => {
    try {
      await deleteMindmapProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Persist viewType whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("projects_view_type", viewType);
    }
  }, [viewType]);

  // ==================== CREATE PROJECT MODAL ====================

  interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
  }

  const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ open, onClose, onCreated }) => {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setSubmitting(true);
        const project = await createMindmapProject(title, description);
        onClose();
        onCreated();
        router.push(`/admin/project/${project.id}`);
      } catch (err) {
        console.error("Failed to create project", err);
        alert("Failed to create project. See console for details.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Markdown)</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write description in markdown..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ==================== IMPORT PROJECTS MODAL ====================

  interface ImportProjectsModalProps {
    open: boolean;
    onClose: () => void;
    onImported: () => void;
  }

  const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({ open, onClose, onImported }) => {
    const [jsonText, setJsonText] = useState("");
    const [importing, setImporting] = useState(false);

    const exampleJson = [
      {
        "title": "Example Project A",
        "description": "Demo project with **two** interconnected nodes and an image.\n\n![Example](https://via.placeholder.com/300x200?text=Example+Image)",
        "nodes": [
          {
            "content": "Start Node\n\n![Node Image](https://via.placeholder.com/150x100?text=Node+Image)",
            "position": { "x": 0, "y": 0 }
          },
          {
            "content": "End Node\n\n**This is the final step** with some _emphasis_.",
            "position": { "x": 250, "y": 0 }
          }
        ],
        "edges": [
          { "source": 0, "target": 1 }
        ]
      },
      {
        "title": "Example Project B",
        "description": "Another project demonstrating nodes _and_ edges with markdown formatting.\n\n- Point 1\n- Point 2\n\n### Features\n- Feature A\n- Feature B",
        "nodes": [
          {
            "content": "# Main Idea\n\nThis is the central concept of our project.\n\n- Research\n- Analysis\n- Documentation",
            "position": { "x": 0, "y": 0 }
          },
          {
            "content": "## Implementation\n\n```javascript\nconst implementation = () => {\n  return 'Working code';\n};\n```\n\nReady to deploy!",
            "position": { "x": 300, "y": 100 }
          }
        ],
        "edges": [
          { "source": 0, "target": 1 }
        ]
      }
    ];

    const copyExample = () => {
      setJsonText(JSON.stringify(exampleJson, null, 2));
    };

    if (!open) return null;

    const handleImport = async () => {
      try {
        setImporting(true);
        const data = JSON.parse(jsonText);
        if (!Array.isArray(data)) {
          alert("JSON must be an array of projects");
          return;
        }
        await importMindmapProjects(data);
        onClose();
        onImported();
      } catch (err) {
        console.error("Failed to import projects", err);
        alert("Failed to import projects. Check console for details.");
      } finally {
        setImporting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Import Projects (JSON)</h2>
          <div className="mb-2">
            <Button variant="outline" onClick={copyExample} type="button" className="text-sm">
              Load Example JSON
            </Button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border rounded-md text-gray-900 mb-4"
            placeholder="Paste JSON here..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>{importing ? "Importing..." : "Import"}</Button>
          </div>
        </div>
      </div>
    );
  };

  // ====== MODAL STATE HOOKS ======

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Function to refresh projects list after creation/import
  const reloadProjects = async () => {
    try {
      const newProjects = await getMindmapProjects();
      setProjects(newProjects);
    } catch (err) {
      console.error("Failed to refresh projects", err);
    }
  };

  // Add function to update project description
  const updateProjectDescription = async (id: string, description: string) => {
    try {
      // Update in Supabase
      const { data, error } = await supabase
        .from('mindmap_projects')
        .update({ description })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, description } : p
      ));

      return true;
    } catch (err) {
      console.error('Error updating project:', err);
      return false;
    }
  };

  // Edit Description Modal Component
  interface EditDescriptionModalProps {
    open: boolean;
    onClose: () => void;
    projectId: string;
    currentDescription: string;
    onSave: (description: string) => Promise<boolean>;
  }

  const EditDescriptionModal: React.FC<EditDescriptionModalProps> = ({
    open,
    onClose,
    projectId,
    currentDescription,
    onSave
  }) => {
    const [description, setDescription] = useState(currentDescription);
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      const success = await onSave(description);
      setSaving(false);
      if (success) onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Edit Description</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Markdown)</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write description in markdown..."
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Add edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{id: string, description: string} | null>(null);

  const handleEdit = (id: string, description: string) => {
    setEditingProject({ id, description });
    setEditModalOpen(true);
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mindmap</h1>

      {/* View type selector */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={viewType === "list" ? "default" : "outline"}
          onClick={() => setViewType("list")}
        >
          List View
        </Button>
        <Button
          variant={viewType === "mindmap" ? "default" : "outline"}
          onClick={() => setViewType("mindmap")}
        >
          Mindmap View
        </Button>
      </div>

      {viewType === "list" && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateModal(true)}>Create New Project</Button>
              <Button variant="outline" onClick={() => setShowImportModal(true)}>Import Projects</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map((project) => (
              <div
                key={project.id}
                className="block p-4 border rounded-lg hover:border-primary transition-colors"
              >
                <Link href={`/admin/project/${project.id}`} className="block">
                  <h3 className="font-medium mb-2">{project.title}</h3>
                  <div className="relative">
                    {project.description && (
                      <div className="text-sm text-muted-foreground mb-2 group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEdit(project.id, project.description || '');
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <ReactMarkdown 
                          className="prose dark:prose-invert prose-sm max-w-none"
                          components={markdownComponents}
                        >
                          {project.description}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => deleteProject(project.id)}
                  className="mt-2"
                >
                  Delete
                </Button>
              </div>
            ))}

            {projects?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No mindmaps yet. Create your first one!
              </div>
            )}
          </div>
        </>
      )}

      {viewType === "mindmap" && (
        <div className="h-[70vh] border rounded">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={reloadProjects}
      />
      <ImportProjectsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={reloadProjects}
      />

      {/* Edit Description Modal */}
      <EditDescriptionModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProject(null);
        }}
        projectId={editingProject?.id || ''}
        currentDescription={editingProject?.description || ''}
        onSave={async (description) => {
          const success = await updateProjectDescription(editingProject?.id || '', description);
          if (success) {
            // Update nodes if in mindmap view
            setFlowNodes(prev => prev.map(node => 
              node.id === editingProject?.id 
                ? { ...node, data: { ...node.data, description } }
                : node
            ));
          }
          return success;
        }}
      />
    </div>
  );
}