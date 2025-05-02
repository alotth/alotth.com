"use client";

import { Editor } from "@/components/admin/mindmap/Editor";
import { useMindmap } from "@/hooks/useMindmap";
import { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { updateMindmapNodes, updateMindmapEdges } from "@/lib/mindmap";

interface MindmapPageProps {
  params: {
    id: string;
  };
}

export default function MindmapPage({ params }: MindmapPageProps) {
  const { id } = params;
  const {
    nodes,
    edges,
    loading,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDeleteNode,
    onDeleteEdge,
  } = useMindmap(id);

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
      <Editor
        initialNodes={nodes}
        initialEdges={edges}
        projectId={id}
        onNodesChangeProp={onNodesChange}
        onEdgesChangeProp={onEdgesChange}
        onConnectProp={onConnect}
      />
  );
}
