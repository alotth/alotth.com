"use client";

import { EditorMindmap } from "@/components/admin/mindmap/Editor";
import { Toolbar } from "@/components/admin/mindmap/Toolbar";
import { useMindmap } from "@/hooks/useMindmap";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Node } from "reactflow";
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
    onNodesChange: saveNodesChange,
    onEdgesChange,
    onConnect,
    getMindmapTitle,
    updateNode,
  } = useMindmap(id);

  const title = getMindmapTitle();

  // Add new node
  const handleAddNode = useCallback(async () => {
    try {
      const newNode: Node = {
        id: uuidv4(),
        type: "mindmap",
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
      } as Node;

      console.log("Chamando saveNodesChange para adicionar node", newNode);
      await saveNodesChange({
        changes: [
          {
            type: "add",
            item: newNode,
          },
        ],
      });
    } catch (error) {
      console.error("Error adding node:", error);
    }
  }, [saveNodesChange]);

  // Add new project node
  const handleAddProjectNode = useCallback(
    async (linkedProjectId: string, projectName: string, nodeId?: string) => {
      try {
        const newNode: Node = {
          id: nodeId || uuidv4(),
          type: "mindmap",
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
        } as Node;

        await saveNodesChange({
          changes: [
            {
              type: "add",
              item: newNode,
            },
          ],
          linkedProjectId: linkedProjectId,
        });
      } catch (error) {
        console.error("Error adding project node:", error);
      }
    },
    [saveNodesChange]
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
          <h1 className="text-2xl font-bold">Project {title}</h1>
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
          initialEdges={edges}
          projectId={id}
          onEdgesChangeProp={onEdgesChange}
          onConnectProp={onConnect}
          handleAddNode={handleAddNode}
          handleAddProjectNode={handleAddProjectNode}
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
