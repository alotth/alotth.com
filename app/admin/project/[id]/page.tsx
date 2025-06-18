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
import { MindmapProject } from "@/types/mindmap";
import { getAvailableProjects } from "@/lib/mindmap";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  saveNewNote: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const QuickCreateNote: React.FC<QuickCreateNoteProps> = ({
  creatingNote,
  setCreatingNote,
  newNoteText,
  setNewNoteText,
  saveNewNote,
  textareaRef,
}) => {
  return (
    <div className="mb-6 w-full min-w-[100px] max-w-[500px]">
      <div className="p-4 shadow-md rounded-md bg-white border-2 border-stone-400 transition-all duration-200">
        {creatingNote ? (
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onBlur={saveNewNote}
              placeholder="Write your note..."
              className="w-full min-h-[80px] font-medium bg-transparent border-none focus:outline-none resize-none prose prose-sm max-w-none text-gray-900"
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveNewNote();
              }}
              className="self-end p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Add note"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        ) : (
          <div
            className="text-gray-500 cursor-text"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const saveNewNote = async () => {
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
        },
      });
      setNewNoteText("");
      setCreatingNote(false);
    } catch (err) {
      console.error("Failed to create note", err);
    }
  };

  useEffect(() => {
    if (creatingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [creatingNote]);

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
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Project List Sidebar */}
      <div 
        className={`border-r border-border bg-background transition-all duration-200 ${
          sidebarCollapsed ? 'w-12' : 'w-64'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          {!sidebarCollapsed && <h3 className="font-medium">Projects</h3>}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="p-1 hover:bg-accent rounded-full"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
                  className={`block p-2 rounded-md transition-colors ${
                    project.id === id 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  {!sidebarCollapsed && (
                    <div>
                      <div className="font-medium truncate">{project.title}</div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {project.description}
                        </div>
                      )}
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
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Project {projectTitle ?? ""}</h1>
            <Select
              value={viewType}
              onValueChange={(value: string) => setViewType(value as ViewType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mindmap">Mindmap View</SelectItem>
                <SelectItem value="notes">Notes View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link href="/admin/project">
            <Button variant="outline">Back to Projects</Button>
          </Link>
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
            <div className="p-6 overflow-auto">
              <div className="flex items-center mb-6">
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
                <div className="w-full flex items-center justify-center gap-4">
                  <QuickCreateNote
                    creatingNote={creatingNote}
                    setCreatingNote={setCreatingNote}
                    newNoteText={newNoteText}
                    setNewNoteText={setNewNoteText}
                    saveNewNote={saveNewNote}
                    textareaRef={textareaRef}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodes.map((node) => (
                  <NoteCard
                    key={node.id}
                    id={node.id}
                    content={node.data.content}
                    onContentChange={handleNoteContentChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
