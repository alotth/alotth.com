"use client";

import { EditorMindmap } from "@/components/admin/mindmap/Editor";
import { Toolbar } from "@/components/admin/mindmap/Toolbar";
import { useMindmap } from "@/hooks/useMindmap";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NoteCard from "@/components/note/NoteCard";
import { v4 as uuidv4 } from "uuid";
import { Dispatch, SetStateAction } from "react";
import { Node, Edge, NodeChange } from "reactflow";
import Dagre from "@dagrejs/dagre";
import { MindmapProject, Priority, WorkflowStatus } from "@/types/mindmap";
import { getAvailableProjects } from "@/lib/mindmap";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { DatePicker } from "@/components/ui/date-picker";
import { MarkdownEditor } from "@/components/ui/markdown-editor";

interface MindmapPageProps {
  params: {
    id: string;
  };
}

type ViewType = "mindmap" | "notes";    

interface QuickCreateNoteProps {
  creatingNote: boolean;
  setCreatingNote: Dispatch<SetStateAction<boolean>>;
  newNoteText: string;
  setNewNoteText: Dispatch<SetStateAction<string>>;
  saveNewNote: (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null) => void;
}

const QuickCreateNote: React.FC<QuickCreateNoteProps> = ({
  creatingNote,
  setCreatingNote,
  newNoteText,
  setNewNoteText,
  saveNewNote,
}) => {
  const [priority, setPriority] = useState<Priority | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);

  const handleSave = async () => {
    // Pass the workflow attributes to saveNewNote
    await saveNewNote(priority, workflowStatus, dueDate);
    // Reset form
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
  };

  const handleCancel = () => {
    setCreatingNote(false);
    setNewNoteText("");
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
  };

  return (
    <div className="mb-4 sm:mb-6 w-full min-w-[100px] max-w-[500px]">
      <div className="p-4 rounded-lg border bg-card text-card-foreground transition-all duration-200">
        {creatingNote ? (
          <div className="space-y-4">
            <MarkdownEditor
              value={newNoteText}
              onChange={setNewNoteText}
              placeholder="Write your note..."
            />
            
            <div className="space-y-2 border-t dark:border-gray-700 pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Controles de Workflow</div>
              <div className="flex flex-wrap gap-2">
                <PrioritySelect
                  value={priority}
                  onValueChange={setPriority}
                />
                <WorkflowSelect
                  value={workflowStatus}
                  onValueChange={setWorkflowStatus}
                />
                <DatePicker
                  value={dueDate}
                  onValueChange={setDueDate}
                  placeholder="Nenhuma data"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave}>
                Save
              </Button>
              <Button onClick={handleCancel} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-muted-foreground cursor-text text-sm sm:text-base"
            onClick={() => setCreatingNote(true)}
          >
            Take a note...
          </div>
        )}
      </div>
    </div>
  );
};

// Add layout function
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  if (!nodes.length) return { nodes, edges };

  // Create a new graph
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  
  // Set graph direction and spacing
  g.setGraph({ 
    rankdir: 'LR', // Left to Right layout for tree-like structure
    align: 'DL', // Down-Left alignment
    ranker: 'tight-tree', // Use tight-tree for more compact tree layout
    ranksep: 150, // Horizontal spacing between ranks
    nodesep: 80, // Vertical spacing between nodes
    edgesep: 30, // Edge spacing
    marginx: 20, // Margin in x direction
    marginy: 20, // Margin in y direction
  });

  // Add nodes with their dimensions
  nodes.forEach((node) => {
    g.setNode(node.id, { 
      width: 200,
      height: 60,
      label: node.data.content 
    });
  });

  // Add edges
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run the layout
  Dagre.layout(g);

  // Get the positioned nodes with proper centering
  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
      // Add source/target positions based on graph direction
      targetPosition: 'left',
      sourcePosition: 'right',
    };
  });

  return { nodes: positionedNodes, edges };
};

export default function MindmapPage({ params }: MindmapPageProps) {
  const { id } = params;
  const [viewType, setViewType] = useState<ViewType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`project_view_type_${id}`);
      if (saved === "notes" || saved === "mindmap") return saved as ViewType;
    }
    return "mindmap";
  });
  const [lastProjectNodeAdded, setLastProjectNodeAdded] = useState<number>(0);
  const [projects, setProjects] = useState<MindmapProject[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Auto-collapse on mobile by default
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile overlay
  const [projectsLoading, setProjectsLoading] = useState(true);

  const {
    nodes,
    edges,
    loading,
    error,
    addNode,
    removeNode,
    updateNode,
    onEdgesChange,
    onConnect,
    getMindmapTitle,
    onNodesChange,
  } = useMindmap(id);

  // Local state for project title
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setSidebarCollapsed(true);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`project_view_type_${id}`, viewType);
    }
  }, [viewType, id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const title = await getMindmapTitle();
        if (isMounted) setProjectTitle(title ?? "");
      } catch (err) {
        console.error("Erro ao obter título do projeto:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [getMindmapTitle]);

  // Load projects
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const availableProjects = await getAvailableProjects(id);
        if (isMounted) {
          setProjects(availableProjects);
          setProjectsLoading(false);
        }
      } catch (err) {
        console.error("Error loading projects:", err);
        if (isMounted) setProjectsLoading(false);
      }
    }
    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Modify handleAddNode to NOT use layout
  const handleAddNode = useCallback(async () => {
    const timestamp = Date.now();
    console.log(`[PAGE-${timestamp}] handleAddNode chamado`);
    try {
      const newNodeId = uuidv4();
      const newNode = {
        id: newNodeId,
        position: { x: 0, y: 0 },
        data: {
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
        },
      };

      // Add node to database
      await addNode(newNode);
      console.log(`[PAGE-${timestamp}] ✅ addNode concluído`);
    } catch (error) {
      console.error(`[PAGE-${timestamp}] ❌ Erro em handleAddNode:`, error);
    }
  }, [addNode]);

  // Add new project node
  const handleAddProjectNode = useCallback(
    async (linkedProjectId: string, projectName: string, nodeId?: string) => {
      try {
        await addNode({
          id: nodeId || uuidv4(),
          position: { x: 100, y: 100 },
          data: {
            content: projectName,
            style: {
              backgroundColor: "#ffffff",
              borderColor: "#000000",
              borderWidth: 2,
              fontSize: 14,
            },
            priority: null,
            workflowStatus: null,
            dueDate: null,
          },
        }, linkedProjectId);
        setLastProjectNodeAdded(Date.now());
      } catch (error) {
        console.error("Error adding project node:", error);
      }
    },
    [addNode]
  );

  // Handle JSON import
  const handleImportNodes = useCallback(async (data: {
    nodes: { content: string; position: { x: number; y: number }; style?: any }[];
    edges: { source: string; target: string }[];
  }) => {
    try {
      console.log("[IMPORT] Starting import of", data.nodes.length, "nodes and", data.edges.length, "edges");

      // Map original index -> new node ID
      const indexToId = new Map<number, string>();

      // Add nodes sequentially to avoid concurrency protection in addNode
      for (let i = 0; i < data.nodes.length; i++) {
        const nodeData = data.nodes[i];
        const newId = uuidv4();
        indexToId.set(i, newId);

        await addNode({
          id: newId,
          position: nodeData.position,
          data: {
            content: nodeData.content,
            style: nodeData.style || {
              backgroundColor: "#ffffff",
              borderColor: "#000000",
              borderWidth: 2,
              fontSize: 14,
            },
            priority: null,
            workflowStatus: null,
            dueDate: null,
          },
        });
      }

      console.log("[IMPORT] ✅ Successfully imported all nodes");

      // Small delay to ensure DB transactions complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create edges sequentially as well
      for (const edgeData of data.edges) {
        const sourceId = indexToId.get(parseInt(edgeData.source));
        const targetId = indexToId.get(parseInt(edgeData.target));

        if (!sourceId || !targetId) {
          console.warn("[IMPORT] ⚠️ Skipping edge due to missing node:", edgeData);
          continue;
        }

        try {
          await onConnect({
            source: sourceId,
            target: targetId,
            sourceHandle: null,
            targetHandle: null,
          });
          console.log(
            `[IMPORT] ✅ Successfully created edge from ${sourceId} to ${targetId}`
          );
        } catch (error) {
          console.error("[IMPORT] ❌ Error creating edge:", error);
        }
      }

      console.log("[IMPORT] ✅ Successfully imported all edges");
    } catch (error) {
      console.error("[IMPORT] ❌ Error importing data:", error);
      alert("Error importing data. Please check the console for details.");
    }
  }, [addNode, onConnect]);

  const handleNoteContentChange = (nodeId: string, newContent: string) => {
    updateNode(nodeId, { content: newContent });
  };

  const handleNotePinnedChange = (nodeId: string, isPinned: boolean) => {
    updateNode(nodeId, { isPinned });
  };

  const handleNoteArchivedChange = (nodeId: string, isArchived: boolean) => {
    updateNode(nodeId, { isArchived });
  };

  const handleNotePriorityChange = (nodeId: string, priority: Priority) => {
    updateNode(nodeId, { priority });
  };

  const handleNoteWorkflowStatusChange = (nodeId: string, workflowStatus: WorkflowStatus) => {
    updateNode(nodeId, { workflowStatus });
  };

  const handleNoteDueDateChange = (nodeId: string, dueDate: string | null) => {
    updateNode(nodeId, { dueDate });
  };

  const saveNewNote = async (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null) => {
    if (newNoteText.trim() === "") {
      setCreatingNote(false);
      setNewNoteText("");
      return;
    }
    try {
      await addNode({
        id: uuidv4(),
        position: { x: 100, y: 100 },
        data: {
          content: newNoteText,
          style: {
            backgroundColor: "#ffffff",
            borderColor: "#000000",
            borderWidth: 2,
            fontSize: 14,
          },
          priority: priority || null,
          workflowStatus: workflowStatus || null,
          dueDate: dueDate || null,
        },
      });
      setNewNoteText("");
      setCreatingNote(false);
    } catch (err) {
      console.error("Failed to create note", err);
    }
  };

  // Add handleAutoOrganize for the toolbar
  const handleAutoOrganize = useCallback(() => {
    if (nodes.length > 0) {
      const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
      
      // Update positions in state
      const changes = layoutedNodes.map(node => ({
        type: 'position' as const,
        id: node.id,
        position: node.position,
      }));
      onNodesChange(changes);

      // Save each node's new position to the database
      layoutedNodes.forEach(node => {
        updateNode(node.id, { position: node.position });
      });
    }
  }, [nodes, edges, onNodesChange, updateNode]);

  // Modify the nodes to include lastProjectNodeAdded
  const nodesWithTimestamp = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      lastProjectNodeAdded,
    }
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="text-red-500 text-center text-sm sm:text-base">Error: {error.message}</div>
      </div>
    );
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile overlay for sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Project List Sidebar */}
      <div 
        className={`border-r border-border bg-background transition-all duration-200 z-50 ${
          isMobile 
            ? `fixed left-0 top-0 h-full ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`
            : sidebarCollapsed ? 'w-12' : 'w-64'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          {(!sidebarCollapsed || (isMobile && sidebarOpen)) && <h3 className="font-medium text-sm sm:text-base">Projects</h3>}
          <button
            onClick={() => {
              if (isMobile) {
                setSidebarOpen(false);
              } else {
                setSidebarCollapsed(prev => !prev);
              }
            }}
            className="p-1 hover:bg-accent rounded-full"
          >
            {isMobile ? <X size={18} /> : (sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {projectsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {projects.map((project) => (
                <Link 
                  key={project.id} 
                  href={`/admin/project/${project.id}`}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={`block p-2 rounded-md transition-colors ${
                    project.id === id 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  {(!sidebarCollapsed || (isMobile && sidebarOpen)) ? (
                    <div>
                      <div className="font-medium truncate text-sm">{project.title}</div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {project.description}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="font-medium text-sm text-center">
                      {project.title.slice(0, 3)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 sm:p-6 border-b border-border space-y-3">
          {/* Top row with controls */}
          <div className="flex items-center justify-between">
            <Select
              value={viewType}
              onValueChange={(value: string) => setViewType(value as ViewType)}
            >
              <SelectTrigger className="w-[140px] sm:w-[180px] text-sm">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mindmap">Mindmap View</SelectItem>
                <SelectItem value="notes">Notes View</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/admin/project">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm whitespace-nowrap">Back to Projects</Button>
            </Link>
          </div>
          
          {/* Bottom row with title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-accent rounded-full flex-shrink-0"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="text-base sm:text-xl font-bold truncate">Project {projectTitle ?? ""}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewType === "mindmap" ? (
            <div className="h-full">
              <EditorMindmap
                projectId={id}
                handleAddNode={handleAddNode}
                handleAddProjectNode={handleAddProjectNode}
                nodes={nodesWithTimestamp}
                edges={edges}
                updateNode={updateNode}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onImportNodes={handleImportNodes}
                onAutoOrganize={handleAutoOrganize}
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-6 gap-4">
                  <div className="w-full sm:w-auto overflow-x-auto">
                    <Toolbar
                      onAddNode={handleAddNode}
                      onAddProjectNode={handleAddProjectNode}
                      onStyleChange={() => {}}
                      onImportJSON={() => {}}
                      selectedNode={null}
                      selectedEdge={null}
                      currentProjectId={id}
                      onAutoOrganize={handleAutoOrganize}
                    />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    <QuickCreateNote
                      creatingNote={creatingNote}
                      setCreatingNote={setCreatingNote}
                      newNoteText={newNoteText}
                      setNewNoteText={setNewNoteText}
                      saveNewNote={saveNewNote}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {nodes
                    .sort((a, b) => {
                      // Sort by pinned first, then by archived (non-archived first), then by creation date
                      if (a.data.isPinned !== b.data.isPinned) {
                        return a.data.isPinned ? -1 : 1;
                      }
                      if (a.data.isArchived !== b.data.isArchived) {
                        return a.data.isArchived ? 1 : -1;
                      }
                      return 0;
                    })
                    .map((node) => (
                      <NoteCard
                        key={node.id}
                        id={node.id}
                        content={node.data.content}
                        isPinned={node.data.isPinned}
                        isArchived={node.data.isArchived}
                        priority={node.data.priority}
                        workflowStatus={node.data.workflowStatus}
                        dueDate={node.data.dueDate}
                        onContentChange={handleNoteContentChange}
                        onPinnedChange={handleNotePinnedChange}
                        onArchivedChange={handleNoteArchivedChange}
                        onPriorityChange={handleNotePriorityChange}
                        onWorkflowStatusChange={handleNoteWorkflowStatusChange}
                        onDueDateChange={handleNoteDueDateChange}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
