"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteMindmapProject, getMindmapProjects, getProjectOverview, upsertProjectOverviewNodes, upsertProjectOverviewEdges, deleteProjectOverviewEdge, createMindmapProject, importMindmapProjects, toggleProjectPinned, toggleProjectArchived, deleteAllMindmapProjects, updateMindmapNodes, getAllNotes, getNotesCount, createProjectNode } from "@/lib/mindmap";
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
import { ExternalLink, ChevronRight, ChevronLeft, Edit2, Pin, Archive, PinOff, ArchiveRestore, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { supabase } from "@/lib/supabase/client";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotesView } from "@/components/admin/mindmap/NotesView";
import { MultiSelect } from "@/components/ui/multi-select";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Priority, WorkflowStatus, NoteWithProject } from "@/types/mindmap";
import { v4 as uuidv4 } from "uuid";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// QuickCreateNote component for main page
interface QuickCreateNoteProps {
  newNoteText: string;
  setNewNoteText: (text: string) => void;
  saveNewNote: (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null, targetProjectIds?: string[]) => void;
  projects: MindmapProject[];
}

const QuickCreateNote: React.FC<QuickCreateNoteProps> = ({
  newNoteText,
  setNewNoteText,
  saveNewNote,
  projects,
}) => {
  const [priority, setPriority] = useState<Priority | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Set first project as default on mount
  useEffect(() => {
    if (projects.length > 0 && selectedProjectIds.length === 0) {
      setSelectedProjectIds([projects[0].id]);
    }
  }, [projects, selectedProjectIds.length]);

  const handleSave = async () => {
    if (newNoteText.trim() === "") return;
    
    // Use first project if none selected
    const targetIds = selectedProjectIds.length > 0 ? selectedProjectIds : [projects[0]?.id].filter(Boolean);
    
    await saveNewNote(priority, workflowStatus, dueDate, targetIds);
    // Reset form but keep first project selected
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
    setSelectedProjectIds([projects[0]?.id].filter(Boolean));
  };

  const handleCancel = () => {
    setNewNoteText("");
    setPriority(null);
    setWorkflowStatus(null);
    setDueDate(null);
    setSelectedProjectIds([projects[0]?.id].filter(Boolean));
  };

  const projectOptions = projects.map(project => ({
    label: project.title,
    value: project.id
  }));

  return (
    <div className="mb-4 sm:mb-6 w-full min-w-[100px] max-w-[600px]">
      <div className="p-2 rounded-lg border bg-card text-card-foreground transition-all duration-200">
        <div className="space-y-2">
          <MarkdownEditor
            value={newNoteText}
            onChange={setNewNoteText}
            placeholder="Create a new note..."
            extraControls={
              <div className="flex items-center gap-1">
                <MultiSelect
                  options={projectOptions}
                  selected={selectedProjectIds}
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

export default function MindmapPage() {
  const [projects, setProjects] = useState<MindmapProject[]>([]);
  const [viewType, setViewType] = useState<"list" | "mindmap" | "notes">("list");
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  // Notes view state
  const [newNoteText, setNewNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredNotes, setFilteredNotes] = useState<NoteWithProject[]>([]); // For main notes view
  const [searchResults, setSearchResults] = useState<NoteWithProject[]>([]); // For search component
  const [totalNotesCount, setTotalNotesCount] = useState(0); // Total count for pagination
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const NOTES_PER_PAGE = 20;

  // Calculate if we have more notes to load
  const hasMore = useMemo(() => {
    // If we have a search query, getAllNotes returns all search results at once
    // So there are no more results to load in search mode
    if (searchQuery.trim()) {
      return false;
    }
    
    // For normal mode (no search), check if we have more pages to load based on total count
    const currentlyLoaded = (page + 1) * NOTES_PER_PAGE;
    const result = totalNotesCount > currentlyLoaded;
    console.log('🔄 hasMore calculated:', {
      totalNotesCount,
      currentlyLoaded,
      page,
      NOTES_PER_PAGE,
      hasMore: result
    });
    return result;
  }, [totalNotesCount, page, searchQuery]);

  // Load more notes handler
  const handleLoadMore = useCallback(async () => {
    console.log('🔄 handleLoadMore called with:', {
      loadingMore,
      hasMore,
      searchQuery: searchQuery.trim(),
      page,
      totalNotesCount,
      filteredNotesLength: filteredNotes.length
    });
    
    // Don't load more if there's a search query active (search returns all results at once)
    if (loadingMore || !hasMore || searchQuery.trim()) {
      console.log('❌ handleLoadMore blocked:', { loadingMore, hasMore, searchQuery: searchQuery.trim() });
      return;
    }
    
    setLoadingMore(true);
    
    try {
      const nextPage = page + 1;
      const offset = nextPage * NOTES_PER_PAGE;
      
      console.log('📊 Loading more notes with pagination:', { nextPage, offset, limit: NOTES_PER_PAGE });
      
      const moreNotes = await getAllNotes(undefined, {
        limit: NOTES_PER_PAGE,
        offset: offset
      });
      
      console.log('✅ More notes loaded from DB:', moreNotes.length);
      
      if (moreNotes.length > 0) {
        setFilteredNotes(prev => [...prev, ...moreNotes]);
        setPage(nextPage);
        console.log('✅ Notes added to state, new page:', nextPage);
      } else {
        console.log('❌ No more notes returned from DB');
      }
    } catch (error) {
      console.error('❌ Error loading more notes:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, NOTES_PER_PAGE, searchQuery]);

  // Initialize notes
  useEffect(() => {
    const loadInitialNotes = async () => {
      try {
        console.log('📚 Loading initial notes with pagination...');
        
        // Load first page of notes and total count in parallel
        const [initialNotes, totalCount] = await Promise.all([
          getAllNotes(undefined, { limit: NOTES_PER_PAGE, offset: 0 }),
          getNotesCount()
        ]);
        
        console.log('📚 Initial data loaded:', {
          notesLoaded: initialNotes.length,
          totalCount,
          NOTES_PER_PAGE
        });
        
        setTotalNotesCount(totalCount);
        setFilteredNotes(initialNotes);
        setPage(0);
        
        console.log('📚 Initial notes state set:', {
          totalNotesCount: totalCount,
          initialFiltered: initialNotes.length,
          hasMore: totalCount > NOTES_PER_PAGE
        });
      } catch (error) {
        console.error("❌ Error loading initial notes:", error);
        toast({
          title: "Erro ao carregar notas",
          description: "Não foi possível carregar as notas. Por favor, tente novamente.",
          variant: "destructive"
        });
      }
    };
    
    console.log('🚀 useEffect triggered for loadInitialNotes');
    loadInitialNotes();
  }, [NOTES_PER_PAGE, toast]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]); // Clear search results when no search
      return;
    }

    try {
      const searchResults = await getAllNotes(query);
      setSearchResults(searchResults);
    } catch (error) {
      console.error("Error searching notes:", error);
      toast({
        title: "Erro ao pesquisar notas",
        description: "Não foi possível realizar a pesquisa. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Handle filtered notes change from search component
  const handleFilteredNotesChange = useCallback((notes: NoteWithProject[]) => {
    setSearchResults(notes);
  }, []);

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

  // Initialize viewType from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedViewType = localStorage.getItem("projects_view_type") as "list" | "mindmap" | "notes";
      if (savedViewType) {
        setViewType(savedViewType);
      }
    }
  }, []);

  // Save viewType to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("projects_view_type", viewType);
    }
  }, [viewType]);

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
      <div className="relative px-3 py-2 bg-black border-2 border-white rounded shadow-md min-w-[100px] max-w-[250px] text-center select-none">
        {/* Title */}
        <div className="font-medium text-white pointer-events-none mb-1 text-sm">{label}</div>

        {/* Description */}
        {expanded && description && (
          <div className="text-left px-2 text-white/80 max-w-[220px] mx-auto mb-1 relative group">
            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(id, description);
                }}
              >
                <Edit2 className="h-3 w-3 text-white hover:text-primary" />
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
            className="absolute bottom-1 left-1 text-white hover:text-primary p-1"
          >
            {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
        )}

        {/* Link icon */}
        <Link
          href={`/admin/project/${id}`}
          className="absolute top-1 right-1 text-white hover:text-primary p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
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
    if (!confirm("Tem certeza que deseja excluir este projeto?")) {
      return;
    }

    try {
      await deleteMindmapProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
      
      toast({
        title: "Projeto excluído",
        description: "O projeto foi excluído com sucesso e os nodes órfãos foram limpos.",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erro ao excluir projeto",
        description: "Não foi possível excluir o projeto. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const deleteAllProjects = async () => {
    // First confirmation
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir TODOS os projetos? Esta ação não pode ser desfeita.")) {
      return;
    }

    // Second confirmation with more explicit warning
    if (!confirm("🚨 CONFIRMAÇÃO FINAL: Você está prestes a excluir permanentemente todos os seus projetos e todos os dados relacionados. Digite 'EXCLUIR TUDO' para confirmar ou cancele esta ação.")) {
      return;
    }

    try {
      const deletedCount = await deleteAllMindmapProjects();
      
      if (deletedCount === 0) {
        toast({
          title: "Nenhum projeto encontrado",
          description: "Não há projetos para excluir.",
          duration: 3000,
        });
        return;
      }

      setProjects([]);
      setFlowNodes([]);
      setFlowEdges([]);
      
      toast({
        title: "Todos os projetos excluídos",
        description: `${deletedCount} projeto(s) foram excluídos com sucesso, incluindo todos os dados relacionados.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting all projects:', error);
      toast({
        title: "Erro ao excluir projetos",
        description: "Não foi possível excluir todos os projetos. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleTogglePinned = async (projectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      await toggleProjectPinned(projectId);
      setProjects((prev) => prev.map(p => 
        p.id === projectId ? { ...p, is_pinned: !p.is_pinned } : p
      ));
      
      toast({
        title: "Projeto atualizado",
        description: "O status de fixado foi alterado com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error toggling project pinned:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status de fixado.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleToggleArchived = async (projectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      await toggleProjectArchived(projectId);
      setProjects((prev) => prev.map(p => 
        p.id === projectId ? { ...p, is_archived: !p.is_archived } : p
      ));
      
      toast({
        title: "Projeto atualizado",
        description: "O status de arquivado foi alterado com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error toggling project archived:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status de arquivado.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-xl shadow-lg max-h-[90vh] overflow-consistent">
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
                className="w-full px-3 py-2 border rounded-md text-gray-900 text-base"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Markdown)</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write description in markdown..."
                rows={1}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">{submitting ? "Creating..." : "Create"}</Button>
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
    const [processImages, setProcessImages] = useState(false);

    const exampleJson = [
      {
        "title": "Example Project A",
        "description": "Demo project with **two** interconnected nodes and an image.\n\n![Example](https://via.placeholder.com/300x200?text=Example+Image)",
        "is_pinned": false,
        "is_archived": false,
        "nodes": [
          {
            "content": "Start Node\n\n![Node Image](https://via.placeholder.com/150x100?text=Node+Image)",
            "position": { "x": 0, "y": 0 },
            "is_pinned": false,
            "is_archived": false,
            "priority": "high",
            "workflow_status": "todo",
            "due_date": "2025-07-15"
          },
          {
            "content": "End Node\n\n**This is the final step** with some _emphasis_.",
            "position": { "x": 250, "y": 0 },
            "is_pinned": false,
            "is_archived": false,
            "priority": "medium",
            "workflow_status": "done"
          }
        ],
        "edges": [
          { "source": 0, "target": 1 }
        ]
      },
      {
        "title": "Example Project B",
        "description": "Another project demonstrating nodes _and_ edges with markdown formatting.\n\n- Point 1\n- Point 2\n\n### Features\n- Feature A\n- Feature B",
        "is_pinned": true,
        "is_archived": false,
        "nodes": [
          {
            "content": "# Main Idea\n\nThis is the central concept of our project.\n\n- Research\n- Analysis\n- Documentation",
            "position": { "x": 0, "y": 0 },
            "is_pinned": true,
            "is_archived": false,
            "priority": "high",
            "workflow_status": "in_progress"
          },
          {
            "content": "## Implementation\n\n```javascript\nconst implementation = () => {\n  return 'Working code';\n};\n```\n\nReady to deploy!",
            "position": { "x": 300, "y": 100 },
            "is_pinned": false,
            "is_archived": false,
            "priority": "low",
            "workflow_status": "todo"
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
        
        // Use the appropriate import function based on image processing option
        if (processImages) {
          const { importMindmapProjectsWithImages } = await import("@/lib/mindmap");
          await importMindmapProjectsWithImages(data);
        } else {
          await importMindmapProjects(data);
        }
        
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-consistent">
          <h2 className="text-lg font-semibold mb-4">Import Projects (JSON)</h2>
          <div className="mb-4">
            <Button variant="outline" onClick={copyExample} type="button" className="text-sm w-full sm:w-auto">
              Load Example JSON
            </Button>
          </div>
          
          {/* Image Processing Option */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="processImages"
              checked={processImages}
              onChange={(e) => setProcessImages(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="processImages" className="text-sm font-medium">
              🖼️ Process images in content (Beta)
            </label>
          </div>
          {processImages && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">📋 Image Processing Enabled</p>
              <p className="text-blue-600 dark:text-blue-300">
                This will scan for markdown image references and prepare them for upload.
                Local image files will need to be uploaded separately using the upload script.
              </p>
            </div>
          )}
          
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border rounded-md text-gray-900 mb-4 text-sm"
            placeholder="Paste JSON here..."
          />
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleImport} disabled={importing} className="w-full sm:w-auto">{importing ? "Importing..." : "Import"}</Button>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-consistent">
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
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? "Saving..." : "Save"}</Button>
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

  // Create note in project function
  const createNoteInProject = async (nodeData: any, targetProjectId: string) => {
    try {
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await updateMindmapNodes({
        projectId: targetProjectId,
        nodes: [nodeData],
      });
    } catch (error) {
      console.error(`Error creating note in project ${targetProjectId}:`, error);
      throw error;
    }
  };

  // Save new note function
  const saveNewNote = async (priority?: Priority | null, workflowStatus?: WorkflowStatus | null, dueDate?: string | null, targetProjectIds?: string[]) => {
    if (newNoteText.trim() === "" || !targetProjectIds || targetProjectIds.length === 0) {
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

      // Create note in all selected projects
      for (const projectId of targetProjectIds) {
        await createNoteInProject(nodeData, projectId);
      }
      
      setNewNoteText("");
      
      toast({
        title: "✅ Nota criada",
        description: `Nota criada em ${targetProjectIds.length} projeto(s)`,
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to create note", err);
      toast({
        title: "❌ Erro",
        description: "Não foi possível criar a nota",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Memoized NotesView components
  const SearchNotesView = useMemo(() => (
    <NotesView 
      searchOnly 
      onSearchChange={handleSearch}
      onFilteredNotesChange={handleFilteredNotesChange}
      searchQuery={searchQuery}
      filteredNotes={searchQuery.trim() ? searchResults : []}
      hasMore={false}
      loadingMore={false}
      onLoadMore={() => {}}
    />
  ), [handleSearch, handleFilteredNotesChange, searchQuery, searchResults]);

  const MainNotesView = useMemo(() => {
    // Use search results when there's an active search, otherwise use main filtered notes
    const notesToShow = searchQuery.trim() ? searchResults : filteredNotes;
    const hasMoreNotes = searchQuery.trim() ? false : hasMore; // No pagination for search results
    
    return (
      <NotesView 
        notesOnly 
        searchQuery={searchQuery} // Pass the search query to show proper context
        filteredNotes={notesToShow} // Use correct notes based on search state
        onLoadMore={searchQuery.trim() ? () => {} : handleLoadMore} // Disable load more for search
        hasMore={hasMoreNotes}
        loadingMore={searchQuery.trim() ? false : loadingMore} // No loading for search
      />
    );
  }, [filteredNotes, searchResults, searchQuery, handleLoadMore, hasMore, loadingMore]);

  // Debug state changes
  useEffect(() => {
    console.log('📊 State updated:', {
      totalNotesCount,
      filteredNotesLength: filteredNotes.length,
      page,
      hasMore,
      searchQuery
    });
  }, [totalNotesCount, filteredNotes.length, page, hasMore, searchQuery]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with title and view selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold">Mindmap</h1>
        
        {/* View type selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button
            variant={viewType === "list" ? "default" : "outline"}
            onClick={() => setViewType("list")}
            className="whitespace-nowrap text-sm"
          >
            List View
          </Button>
          <Button
            variant={viewType === "mindmap" ? "default" : "outline"}
            onClick={() => setViewType("mindmap")}
            className="whitespace-nowrap text-sm"
          >
            Mindmap View
          </Button>
          <Button
            variant={viewType === "notes" ? "default" : "outline"}
            onClick={() => setViewType("notes")}
            className="whitespace-nowrap text-sm"
          >
            Notes View
          </Button>
        </div>
      </div>

      {/* Content area - takes remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewType === "list" && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold">Your Projects</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setShowCreateModal(true)} className="text-sm">Create New Project</Button>
                <Button variant="outline" onClick={() => setShowImportModal(true)} className="text-sm">Import Projects</Button>
                {projects.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={deleteAllProjects} 
                    className="text-sm"
                    title="Excluir todos os projetos"
                  >
                    Delete All Projects
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-h-full pb-4">
                {projects?.map((project) => (
                  <div
                    key={project.id}
                    className={`block p-3 sm:p-4 border rounded-lg hover:border-primary transition-colors relative ${
                      project.is_archived ? 'opacity-60 bg-muted/30' : ''
                    }`}
                  >
                    {/* Pin/Archive status indicators */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {project.is_pinned && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Pin size={12} />
                        </div>
                      )}
                      {project.is_archived && (
                        <div className="bg-muted text-muted-foreground rounded-full p-1">
                          <Archive size={12} />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleTogglePinned(project.id, e)}
                        title={project.is_pinned ? "Desafixar" : "Fixar"}
                      >
                        {project.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleToggleArchived(project.id, e)}
                        title={project.is_archived ? "Desarquivar" : "Arquivar"}
                      >
                        {project.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                      </Button>
                    </div>

                    <Link href={`/admin/project/${project.id}`} className="block group">
                      <h3 className={`font-medium mb-2 text-sm sm:text-base ${
                        project.is_archived ? 'text-muted-foreground' : ''
                      }`}>
                        {project.title}
                      </h3>
                      <div className="relative">
                        {project.description && (
                          <div className="text-sm text-muted-foreground mb-2 group/desc">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 opacity-0 group-hover/desc:opacity-100 transition-opacity h-6 w-6"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEdit(project.id, project.description || '');
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
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
                      className="mt-2 w-full sm:w-auto text-sm"
                      size="sm"
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
            </div>
          </div>
        )}

        {viewType === "mindmap" && (
          <div className="h-full border rounded">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        )}

        {viewType === "notes" && (
          <div className="h-full flex flex-col">
            {/* Sticky header row with title, QuickCreateNote and Search */}
            <div className="sticky top-0 z-10 bg-transparent backdrop-blur-sm flex-shrink-0">
              <div className="p-3 sm:p-6">
                <div className="flex flex-row items-start gap-4 justify-between">
                  <div className="flex-1 flex justify-center min-w-0">
                    <QuickCreateNote
                      newNoteText={newNoteText}
                      setNewNoteText={setNewNoteText}
                      saveNewNote={saveNewNote}
                      projects={projects}
                    />
                  </div>
                  
                  <div className="w-80 hidden sm:block">
                    {SearchNotesView}
                  </div>
                </div>
                
                {/* Mobile search - shown below on small screens */}
                <div className="mt-4 sm:hidden">
                  {SearchNotesView}
                </div>
              </div>
            </div>

            {/* Scrollable notes area */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="p-3 sm:p-6">
                {MainNotesView}
              </div>
            </div>
          </div>
        )}
      </div>

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