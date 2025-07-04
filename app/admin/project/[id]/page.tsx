"use client";

import { EditorMindmap } from "@/components/admin/mindmap/Editor";
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
import { EditableNoteCard } from "@/components/admin/mindmap/EditableNoteCard";
import { v4 as uuidv4 } from "uuid";
import { Dispatch, SetStateAction } from "react";
import { Node, Edge, NodeChange, Position } from "reactflow";
import Dagre from "@dagrejs/dagre";
import { MindmapProject, Priority, WorkflowStatus } from "@/types/mindmap";
import { getAvailableProjects } from "@/lib/mindmap";
import { ChevronLeft, ChevronRight, Menu, X, Upload, Plus, Search, Trash2 } from "lucide-react";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { DatePicker } from "@/components/ui/date-picker";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Save } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { ImportNodesModal } from "@/components/admin/mindmap/ImportNodesModal";
import { MultiSelect } from "@/components/ui/multi-select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { updateMindmapNodes } from "@/lib/mindmap";
import { BulkOperationsToolbar } from "@/components/admin/mindmap/BulkOperationsToolbar";
import { 
  bulkToggleNodesPinned,
  bulkToggleNodesArchived,
  bulkDeleteNodes,
  bulkUpdateNodesPriority,
  bulkUpdateNodesWorkflow,
  toggleNodePinned,
  toggleNodeArchived
} from "@/lib/mindmap";
import { useToast } from "@/components/ui/use-toast";
import { NotesSearch } from "@/components/admin/mindmap/NotesSearch";
import { createMindmapProject, deleteMindmapProject } from "@/lib/mindmap";
import { useRouter } from "next/navigation";

interface MindmapPageProps {
  params: {
    id: string;
  };
}

type ViewType = "mindmap" | "notes";    

interface QuickCreateNoteProps {
  newNoteText: string;
  setNewNoteText: Dispatch<SetStateAction<string>>;
  saveNewNote: (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null, targetProjectIds?: string[]) => void;
  currentProjectId: string;
  projects: MindmapProject[];
}

// Modal de criação de projeto
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
    if (!title.trim()) return;
    
    try {
      setSubmitting(true);
      const project = await createMindmapProject(title.trim(), description.trim() || undefined);
      onClose();
      onCreated();
      // Navegar para o projeto criado
      router.push(`/admin/project/${project.id}`);
    } catch (err) {
      console.error("Failed to create project", err);
      alert("Failed to create project. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setTitle("");
      setDescription("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-border rounded-lg p-4 sm:p-6 w-full max-w-xl shadow-lg max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Projeto</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-sm font-medium mb-1">
              Título *
            </label>
            <input
              id="project-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-base focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Nome do projeto"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium mb-1">
              Descrição (Markdown)
            </label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Descrição do projeto em markdown..."
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button 
              variant="outline" 
              type="button" 
              onClick={handleClose} 
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !title.trim()} 
              className="w-full sm:w-auto"
            >
              {submitting ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QuickCreateNote: React.FC<QuickCreateNoteProps> = ({
  newNoteText,
  setNewNoteText,
  saveNewNote,
  currentProjectId,
  projects,
}) => {
  const [priority, setPriority] = useState<Priority | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Set current project as default on mount and when projects change
  useEffect(() => {
    if (projects.length > 0) {
      console.log('🔍 Debug - currentProjectId:', currentProjectId);
      console.log('🔍 Debug - projects:', projects.map(p => ({ id: p.id, title: p.title })));
      
      // Find current project in the list
      const currentProject = projects.find(p => p.id === currentProjectId);
      console.log('🔍 Debug - currentProject found:', currentProject);
      
      if (currentProject && !selectedProjectIds.includes(currentProjectId)) {
        console.log('✅ Setting current project as default:', currentProject.title);
        setSelectedProjectIds([currentProjectId]);
      } else if (!currentProject && selectedProjectIds.length === 0) {
        console.log('❌ Current project not found, using first project:', projects[0]?.title);
        setSelectedProjectIds([projects[0].id]);
      }
    }
  }, [projects, currentProjectId]);

  const handleSave = async () => {
    if (newNoteText.trim() === "") return;
    
    // Use current project if none selected
    const targetIds = selectedProjectIds.length > 0 ? selectedProjectIds : [currentProjectId];
    
    // Pass the workflow attributes and target projects to saveNewNote
    await saveNewNote(priority, workflowStatus, dueDate, targetIds);
    // Reset form but keep current project selected
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
    setSelectedProjectIds([currentProjectId]);
  };

  const handleCancel = () => {
    setNewNoteText("");
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
    setSelectedProjectIds([currentProjectId]);
  };

  const projectOptions = projects.map(project => ({
    label: project.title,
    value: project.id
  }));

  // Ensure current project is selected if no selection exists or if current project is not selected
  const effectiveSelectedIds = (() => {
    if (selectedProjectIds.length > 0) {
      return selectedProjectIds;
    }
    // If no selection, use current project
    const currentProject = projects.find(p => p.id === currentProjectId);
    if (currentProject) {
      console.log('🔧 Using current project as effective selection:', currentProject.title);
      return [currentProjectId];
    }
    // Fallback to first project
    return projects.length > 0 ? [projects[0].id] : [];
  })();

  return (
    <div className="mb-4 sm:mb-6 w-full min-w-[100px] max-w-[600px]">
      <div className="p-2 rounded-lg border border-border bg-black/20 backdrop-blur-md text-white transition-all duration-200 shadow-xl">
        <div className="space-y-2">
          {/* Text area with controls in toolbar */}
          <MarkdownEditor
            value={newNoteText}
            onChange={setNewNoteText}
            placeholder="Take a note..."
            extraControls={
              <div className="flex items-center gap-1">
                <MultiSelect
                  options={projectOptions}
                  selected={effectiveSelectedIds}
                  onChange={setSelectedProjectIds}
                  className="w-[80px] h-6"
                />
                <PrioritySelect
                  value={priority}
                  onValueChange={setPriority}
                  className="w-[60px] h-6"
                />
                <WorkflowSelect
                  value={workflowStatus}
                  onValueChange={setWorkflowStatus}
                  className="w-[60px] h-6"
                />
                <DatePicker
                  value={dueDate}
                  onValueChange={setDueDate}
                  placeholder="📅"
                  className="w-[60px] h-6"
                />
                <div className="flex gap-1 ml-2 border-l pl-2">
                  <Button onClick={handleSave} size="sm" className="h-6 px-2 text-xs" disabled={newNoteText.trim() === ""}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button onClick={handleCancel} variant="ghost" size="sm" className="h-6 px-1 text-xs" disabled={newNoteText.trim() === "" && !priority && !workflowStatus && !dueDate}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced layout function with neuron-like organization
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  if (!nodes.length) return { nodes, edges };

  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 60;
  const CLUSTER_SPACING = 350; // Much larger spacing between groups
  const NODE_SPACING = 100; // Clean uniform spacing

  // Find connected and isolated nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));

  let positionedNodes: Node[] = [];

  // Layout connected nodes using Dagre
  if (connectedNodes.length > 0) {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    
    g.setGraph({ 
      rankdir: 'LR',
      align: 'DL',
      ranker: 'tight-tree',
      ranksep: 150,
      nodesep: 80,
      edgesep: 30,
      marginx: 20,
      marginy: 20,
    });

    // Add only connected nodes to Dagre
    connectedNodes.forEach((node) => {
      g.setNode(node.id, { 
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: node.data.content 
      });
    });

    // Add edges
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    Dagre.layout(g);

    // Position connected nodes
    const connectedPositioned = connectedNodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
             return {
         ...node,
         position: {
           x: nodeWithPosition.x - nodeWithPosition.width / 2,
           y: nodeWithPosition.y - nodeWithPosition.height / 2,
         },
         targetPosition: Position.Left,
         sourcePosition: Position.Right,
       };
    });

    positionedNodes = [...connectedPositioned];
  }

  // Group isolated nodes by content similarity and position them in clusters
  if (isolatedNodes.length > 0) {
    // Find bounds of connected nodes
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    if (connectedNodes.length > 0) {
      const positions = positionedNodes.map(n => n.position);
      minX = Math.min(...positions.map(p => p.x));
      maxX = Math.max(...positions.map(p => p.x + NODE_WIDTH));
      minY = Math.min(...positions.map(p => p.y));
      maxY = Math.max(...positions.map(p => p.y + NODE_HEIGHT));
    }

    // Simple content-based clustering (by first word or short content)
    const clusters = new Map<string, Node[]>();
    
    isolatedNodes.forEach(node => {
      const content = node.data.content.toLowerCase().trim();
      
      // Create cluster key based on content characteristics
      let clusterKey = 'misc';
      
      if (content.length < 20) {
        // Short notes - group by first word
        const firstWord = content.split(' ')[0];
        if (firstWord.length > 2) {
          clusterKey = `short_${firstWord}`;
        }
      } else if (content.includes('todo') || content.includes('tarefa')) {
        clusterKey = 'tasks';
      } else if (content.includes('idea') || content.includes('ideia')) {
        clusterKey = 'ideas';
      } else if (content.includes('note') || content.includes('nota')) {
        clusterKey = 'notes';
      } else {
        // Group by content length
        if (content.length < 50) clusterKey = 'short';
        else if (content.length < 150) clusterKey = 'medium';
        else clusterKey = 'long';
      }

      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(node);
    });

    // Position clusters around the connected graph
    const clusterArray = Array.from(clusters.entries());
    const numClusters = clusterArray.length;
    
    // Calculate starting position for isolated clusters
    let clusterStartX = maxX + CLUSTER_SPACING;
    let clusterStartY = minY;
    
    if (connectedNodes.length === 0) {
      // If no connected nodes, start from origin
      clusterStartX = 100;
      clusterStartY = 100;
    }

    clusterArray.forEach(([clusterKey, clusterNodes], clusterIndex) => {
      // Calculate cluster position
      const nodesPerRow = Math.ceil(Math.sqrt(clusterNodes.length));
      const clusterWidth = nodesPerRow * (NODE_WIDTH + NODE_SPACING);
      const clusterHeight = Math.ceil(clusterNodes.length / nodesPerRow) * (NODE_HEIGHT + NODE_SPACING);
      
      // Position this cluster
      const clusterX = clusterStartX + (clusterIndex % 3) * (clusterWidth + CLUSTER_SPACING);
      const clusterY = clusterStartY + Math.floor(clusterIndex / 3) * (clusterHeight + CLUSTER_SPACING);

             // Clean grid positioning for organized look
       const clusterPositioned = clusterNodes.map((node, index) => {
         const row = Math.floor(index / nodesPerRow);
         const col = index % nodesPerRow;
         
         // Perfect grid position with uniform spacing
         const x = clusterX + col * (NODE_WIDTH + NODE_SPACING);
         const y = clusterY + row * (NODE_HEIGHT + NODE_SPACING);
         
         return {
           ...node,
           position: { x, y },
           targetPosition: Position.Left,
           sourcePosition: Position.Right,
         };
       });

      positionedNodes.push(...clusterPositioned);
    });
  }

  return { nodes: positionedNodes, edges };
};

export default function MindmapPage({ params }: MindmapPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Selection state for notes view
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredNodes, setFilteredNodes] = useState<any[]>([]);
  
  // States para busca e criação de projetos
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<MindmapProject[]>([]);

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
    restoreState,
  } = useMindmap(id);

  // Local state for project title
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");

  // Handle custom event for opening import modal
  useEffect(() => {
    const handleOpenImportModal = () => {
      setIsImportModalOpen(true);
    };

    window.addEventListener('open-import-modal', handleOpenImportModal);
    return () => window.removeEventListener('open-import-modal', handleOpenImportModal);
  }, []);

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

  // Sync filtered nodes with nodes and apply search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNodes(nodes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = nodes.filter(node => 
        node.data.content.toLowerCase().includes(query)
      );
      setFilteredNodes(filtered);
    }
  }, [nodes, searchQuery]);

  // Filter projects based on search query
  useEffect(() => {
    if (!projectSearchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const query = projectSearchQuery.toLowerCase();
      const filtered = projects.filter(project => 
        project.title.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      );
      setFilteredProjects(filtered);
    }
  }, [projects, projectSearchQuery]);

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Function to reload projects after creation
  const reloadProjects = async () => {
    try {
      const newProjects = await getAvailableProjects(id);
      setProjects(newProjects);
    } catch (err) {
      console.error("Failed to refresh projects", err);
    }
  };

  // Function to delete current project
  const handleDeleteProject = async () => {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos permanentemente.")) {
      return;
    }

    try {
      await deleteMindmapProject(id);
      
      // Redirect to projects list after successful deletion
      router.push("/admin/project");
      
      // Show success message (though user will be redirected)
      toast({
        title: "✅ Projeto excluído",
        description: "O projeto foi excluído com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "❌ Erro ao excluir projeto",
        description: "Não foi possível excluir o projeto. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Handle undo/redo state restoration
  const handleStateRestore = useCallback((restoredNodes: Node[], restoredEdges: Edge[]) => {
    console.log('[UNDO] Restoring state with', restoredNodes.length, 'nodes and', restoredEdges.length, 'edges');
    
    // Use the restoreState function from the mindmap hook
    restoreState(restoredNodes, restoredEdges);
  }, [restoreState]);

  // Enhanced handleAddNode that can accept optional node data
  const handleAddNode = useCallback(async (nodeData?: Partial<Node>) => {
    const timestamp = Date.now();
    console.log(`[PAGE-${timestamp}] handleAddNode chamado`, nodeData);
    try {
      const newNodeId = nodeData?.id || uuidv4();
      const newNode = {
        id: newNodeId,
        position: nodeData?.position || { x: 0, y: 0 },
        data: {
          content: nodeData?.data?.content ?? "",
          style: nodeData?.data?.style || {
            backgroundColor: "#ffffff",
            borderColor: "#000000",
            borderWidth: 2,
            fontSize: 14,
          },
          priority: nodeData?.data?.priority || null,
          workflowStatus: nodeData?.data?.workflowStatus || null,
          dueDate: nodeData?.data?.dueDate || null,
        },
        ...nodeData,
      };
      // Add node to database
      await addNode(newNode);
      console.log(`[PAGE-${timestamp}] ✅ addNode concluído`);
      return newNodeId;
    } catch (error) {
      console.error(`[PAGE-${timestamp}] ❌ Erro em handleAddNode:`, error);
      return undefined;
    }
  }, [addNode]);

  // Create note in external project without updating local state
  const createNoteInProject = async (nodeData: any, targetProjectId: string) => {
    try {
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Create the note directly in the target project without affecting local state
      await updateMindmapNodes({
        projectId: targetProjectId,
        nodes: [nodeData],
      });
    } catch (error) {
      console.error(`Error creating note in project ${targetProjectId}:`, error);
      throw error;
    }
  };

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

  const clearSelection = () => {
    setSelectedNotes(new Set());
    setLastSelectedIndex(null);
  };

  // Selection handlers for notes view
  const handleNoteSelection = useCallback((nodeId: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + click: select range from last selected to current
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangesToSelect = nodes.slice(start, end + 1);
      
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        rangesToSelect.forEach(node => {
          newSet.add(node.id);
        });
        return newSet;
      });
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click: toggle selection
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
      setLastSelectedIndex(index);
    } else {
      // Regular click: clear selection and select only this note
      setSelectedNotes(new Set([nodeId]));
      setLastSelectedIndex(index);
    }
  }, [nodes, lastSelectedIndex]);

  // Bulk operations
  const getSelectedNodeObjects = () => {
    return nodes.filter(node => selectedNotes.has(node.id));
  };

  const handleBulkPin = async () => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { isPinned: true });
    });
    
    // Then update database
    for (const nodeId of nodeIds) {
      try {
        await toggleNodePinned(nodeId);
      } catch (error) {
        console.error(`Error pinning node ${nodeId}:`, error);
        // Revert on error
        updateNode(nodeId, { isPinned: false });
      }
    }
  };

  const handleBulkUnpin = async () => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { isPinned: false });
    });
    
    // Then update database
    for (const nodeId of nodeIds) {
      try {
        await toggleNodePinned(nodeId);
      } catch (error) {
        console.error(`Error unpinning node ${nodeId}:`, error);
        // Revert on error
        updateNode(nodeId, { isPinned: true });
      }
    }
  };

  const handleBulkArchive = async () => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { isArchived: true });
    });
    
    // Then update database
    for (const nodeId of nodeIds) {
      try {
        await toggleNodeArchived(nodeId);
      } catch (error) {
        console.error(`Error archiving node ${nodeId}:`, error);
        // Revert on error
        updateNode(nodeId, { isArchived: false });
      }
    }
  };

  const handleBulkUnarchive = async () => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { isArchived: false });
    });
    
    // Then update database
    for (const nodeId of nodeIds) {
      try {
        await toggleNodeArchived(nodeId);
      } catch (error) {
        console.error(`Error unarchiving node ${nodeId}:`, error);
        // Revert on error
        updateNode(nodeId, { isArchived: true });
      }
    }
  };

  const handleBulkDelete = async () => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    for (const nodeId of nodeIds) {
      try {
        await removeNode(nodeId);
      } catch (error) {
        console.error(`Error deleting node ${nodeId}:`, error);
      }
    }
    clearSelection();
  };

  const handleBulkPriorityChange = async (priority: Priority) => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { priority });
    });
    
    // The updateNode function should handle database updates automatically
    // If not, we could add explicit database calls here
  };

  const handleBulkWorkflowChange = async (workflowStatus: WorkflowStatus) => {
    const selectedNodeObjects = getSelectedNodeObjects();
    const nodeIds = selectedNodeObjects.map(node => node.id);
    
    // Update local state immediately for better UX
    nodeIds.forEach(nodeId => {
      updateNode(nodeId, { workflowStatus });
    });
    
    // The updateNode function should handle database updates automatically
    // If not, we could add explicit database calls here
  };

  // Function to reload/refresh all data
  const handleSaveAndRefresh = async () => {
    try {
      // Force a re-render by clearing selection first
      clearSelection();
      
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The nodes will be automatically refreshed from the useMindmap hook
      // since it's reactive to database changes
    } catch (error) {
      console.error("Error refreshing data:", error);
      throw error;
    }
  };

  const saveNewNote = async (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null, targetProjectIds?: string[]) => {
    if (newNoteText.trim() === "") {
      return;
    }
    try {
      const nodeId = uuidv4();
      const nodeData = {
        id: nodeId,
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
      };

      // If creating in multiple projects
      if (targetProjectIds && targetProjectIds.length > 0) {
        const currentProjectSelected = targetProjectIds.includes(id);
        
        if (currentProjectSelected) {
          // Create in current project (this updates local state)
          await addNode(nodeData);
          
          // Create the same note in other projects WITHOUT updating local state
          const otherProjects = targetProjectIds.filter(pid => pid !== id);
          for (const projectId of otherProjects) {
            await createNoteInProject(nodeData, projectId);
          }
        } else {
          // Current project not selected, create in first selected project only
          await createNoteInProject(nodeData, targetProjectIds[0]);
          
          // Create in remaining projects
          const remainingProjects = targetProjectIds.slice(1);
          for (const projectId of remainingProjects) {
            await createNoteInProject(nodeData, projectId);
          }
        }
      } else {
        // Default to current project
        await addNode(nodeData);
      }
      
      setNewNoteText("");
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
    <div className="flex h-full bg-background text-foreground">
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
        {/* Header com título e controles */}
        <div className="flex items-center justify-between p-2 border-b border-border">
          {(!sidebarCollapsed || (isMobile && sidebarOpen)) && (
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-medium text-sm sm:text-base">Projects</h3>
              <Tooltip content="Criar novo projeto" side="bottom">
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="p-1 hover:bg-accent rounded-full transition-colors"
                >
                  <Plus size={16} />
                </button>
              </Tooltip>
            </div>
          )}
          
          {sidebarCollapsed && !isMobile && (
            <Tooltip content="Criar novo projeto" side="right">
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="p-1 hover:bg-accent rounded-full transition-colors"
              >
                <Plus size={16} />
              </button>
            </Tooltip>
          )}
          
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

        {/* Campo de busca - apenas quando não está collapsed */}
        {(!sidebarCollapsed || (isMobile && sidebarOpen)) && (
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Buscar projetos..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}
        
        {/* Lista de projetos */}
        <div className="flex-1 overflow-y-auto">
          {projectsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredProjects.length === 0 && projectSearchQuery ? (
                <div className="text-center text-muted-foreground text-sm p-4">
                  Nenhum projeto encontrado para &ldquo;{projectSearchQuery}&rdquo;
                </div>
              ) : (
                filteredProjects.map((project) => (
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
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 sm:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            {/* Left side - Title */}
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
              <h1 className="text-base sm:text-xl font-bold truncate">{projectTitle ?? ""}</h1>
            </div>
            
            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
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
              
              {/* Import button - always visible */}
              <Tooltip content="Importar notas de arquivo JSON" side="top">
                <Button
                  onClick={() => {
                    // We'll need to handle this differently since we moved it out of toolbar
                    const event = new CustomEvent('open-import-modal');
                    window.dispatchEvent(event);
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              {/* Delete project button */}
              <Tooltip content="Excluir este projeto" side="top">
                <Button
                  onClick={handleDeleteProject}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Link href="/admin/project">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm whitespace-nowrap">Back to Projects</Button>
              </Link>
            </div>
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
                loading={loading}
                updateNode={updateNode}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onImportNodes={handleImportNodes}
                onAutoOrganize={handleAutoOrganize}
                onStateRestore={handleStateRestore}
              />
            </div>
          ) : (
            <div className="h-full overflow-consistent">
              {/* Sticky components */}
              <div className="sticky top-0 z-10 ">
                <div className="p-3 sm:p-6 space-y-4">
                  <BulkOperationsToolbar
                    selectedCount={selectedNotes.size}
                    onClearSelection={clearSelection}
                    onBulkPin={handleBulkPin}
                    onBulkUnpin={handleBulkUnpin}
                    onBulkArchive={handleBulkArchive}
                    onBulkUnarchive={handleBulkUnarchive}
                    onBulkDelete={handleBulkDelete}
                    onBulkPriorityChange={handleBulkPriorityChange}
                    onBulkWorkflowChange={handleBulkWorkflowChange}
                    onSave={handleSaveAndRefresh}
                    variant="inline"
                    className=""
                  />
                  
                  {/* Search for current project */}
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <NotesSearch 
                        onSearch={handleSearch}
                        placeholder={`Buscar notas em ${projectTitle || 'projeto'}...`}
                      />
                    </div>
                  </div>
                  
                  {/* Quick Create Note - full width and centered */}
                  <div className="flex justify-center">
                    <div>
                      <QuickCreateNote
                        newNoteText={newNoteText}
                        setNewNoteText={setNewNoteText}
                        saveNewNote={saveNewNote}
                        currentProjectId={id}
                        projects={projects}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="p-3 sm:p-6">

                {/* Search results and selection indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? (
                      <>Encontradas {filteredNodes.length} nota(s) para &ldquo;{searchQuery}&rdquo;</>
                    ) : (
                      <>Mostrando {filteredNodes.length} nota(s)</>
                    )}
                  </div>
                  {selectedNotes.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-primary">
                        {selectedNotes.size} nota(s) selecionada(s)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="text-xs"
                      >
                        Limpar seleção
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredNodes
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
                    .map((node, index) => {
                      const isSelected = selectedNotes.has(node.id);
                      return (
                        <div
                          key={node.id}
                          className={`relative cursor-pointer transition-all duration-150 ${
                            isSelected ? "ring-2 ring-white ring-offset-2 rounded-lg shadow-lg" : ""
                          }`}
                          onClick={(e) => {
                            // Handle selection for all clicks
                            const target = e.target as HTMLElement;
                            const isInteractiveElement = target.closest('button, input, select, textarea, a, [role="button"], .markdown-editor, [contenteditable]');
                            
                            // Only handle selection if not clicking on interactive elements
                            if (!isInteractiveElement) {
                              handleNoteSelection(node.id, index, e);
                            }
                          }}
                        >
                          <EditableNoteCard
                            id={node.id}
                            content={node.data.content}
                            projectId={id}
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
                            onRemove={(nodeId) => {
                              // Remove the node using the mindmap hook
                              removeNode(nodeId);
                              // Also remove from selection
                              setSelectedNotes(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(nodeId);
                                return newSet;
                              });
                            }}
                            onSelect={(event) => handleNoteSelection(node.id, index, event)}
                            hideProjectSelector={true}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Import Modal */}
      <ImportNodesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(data) => {
          handleImportNodes(data);
          setIsImportModalOpen(false);
        }}
      />
      
      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreated={reloadProjects}
      />
    </div>
  );
}
