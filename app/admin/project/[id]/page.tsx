"use client";

import { EditorMindmap } from "@/components/admin/mindmap/Editor";
import { Toolbar } from "@/components/admin/mindmap/Toolbar";
import { useMindmap } from "@/hooks/useMindmap";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NoteCard from "@/components/note/NoteCard";
import { v4 as uuidv4 } from "uuid";

interface MindmapPageProps {
  params: {
    id: string;
  };
}

type ViewType = "mindmap" | "notes";    

export default function MindmapPage({ params }: MindmapPageProps) {
  const { id } = params;
  const [viewType, setViewType] = useState<ViewType>("mindmap");
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

  // Add new node
  const handleAddNode = useCallback(async () => {
    const timestamp = Date.now();
    console.log(`[PAGE-${timestamp}] handleAddNode chamado`);
    try {
      await addNode({
        id: uuidv4(),
        position: { x: 100, y: 100 },
        data: {
          content: "New Node",
          style: {
            backgroundColor: "#ffffff",
            borderColor: "#000000",
            borderWidth: 2,
            fontSize: 14,
          },
        },
      });
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
      } catch (error) {
        console.error("Error adding project node:", error);
      }
    },
    [addNode]
  );

  const handleNoteContentChange = (nodeId: string, newContent: string) => {
    updateNode(nodeId, { content: newContent });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Project {projectTitle ?? ""}</h1>
          <Select
            value={viewType}
            onValueChange={(value: string) => setViewType(value as ViewType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800">
              <SelectItem value="mindmap">Mindmap View</SelectItem>
              <SelectItem value="notes">Notes View</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/admin/project">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>

      {viewType === "mindmap" ? (
        <EditorMindmap
          projectId={id}
          handleAddNode={handleAddNode}
          handleAddProjectNode={handleAddProjectNode}
          nodes={nodes}
          edges={edges}
          updateNode={updateNode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <Toolbar
              onAddNode={handleAddNode}
              onAddProjectNode={handleAddProjectNode}
              onStyleChange={() => {}}
              selectedNode={null}
              selectedEdge={null}
              currentProjectId={id}
            />
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
        </>
      )}
    </div>
  );
}
