import { Node, Edge } from "reactflow";
import { useState } from "react";
import { ProjectSelectorModal } from "./ProjectSelectorModal";
import { ImportNodesModal } from "./ImportNodesModal";
import { Plus, Link, Upload, ChevronLeft, ChevronRight } from "lucide-react";

interface ToolbarProps {
  onAddNode: () => void;
  onAddProjectNode: (
    linkedProjectId: string,
    projectName: string,
    nodeId?: string
  ) => void;
  onStyleChange: (style: any) => void;
  onImportJSON: (data: {
    nodes: { content: string; position: { x: number; y: number }; style?: any }[];
    edges: { source: string; target: string }[];
  }) => void;
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  currentProjectId: string;
}

export function Toolbar({
  onAddNode,
  onAddProjectNode,
  onStyleChange,
  onImportJSON,
  selectedNode,
  selectedEdge,
  currentProjectId,
}: ToolbarProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const nodeStyle = selectedNode?.data?.style || {};
  const defaultStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 2,
    fontSize: 14,
  };

  const handleProjectSelect = (
    linkedProjectId: string,
    projectName: string,
    nodeId?: string
  ) => {
    onAddProjectNode(linkedProjectId, projectName, nodeId);
    setIsProjectModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 bg-white p-2 rounded-md shadow-md text-gray-900">
      {/* Toggle collapse button */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="self-end text-gray-700 hover:text-gray-900"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Action buttons */}
      <button
        onClick={onAddNode}
        title="Add Node"
        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        <Plus size={16} />
        {!collapsed && <span>Add Node</span>}
      </button>

      <button
        onClick={() => setIsProjectModalOpen(true)}
        title="Add Node from a Project"
        className="flex items-center gap-2 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        <Link size={16} />
        {!collapsed && <span>Add Node from a Project</span>}
      </button>

      <button
        onClick={() => setIsImportModalOpen(true)}
        title="Import Nodes"
        className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
      >
        <Upload size={16} />
        {!collapsed && <span>Import Nodes</span>}
      </button>

      {/* Node style controls only visible when expanded */}
      {!collapsed && selectedNode && (
        <div className="mt-4 p-2 border rounded">
          <h3 className="text-sm font-medium mb-2 text-gray-900">Node Style</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs block text-gray-900">Background Color</label>
              <input
                type="color"
                value={nodeStyle.backgroundColor || defaultStyle.backgroundColor}
                onChange={(e) =>
                  onStyleChange({
                    ...nodeStyle,
                    backgroundColor: e.target.value,
                  })
                }
                className="w-full h-6 rounded"
              />
            </div>
            <div>
              <label className="text-xs block text-gray-900">Border Color</label>
              <input
                type="color"
                value={nodeStyle.borderColor || defaultStyle.borderColor}
                onChange={(e) =>
                  onStyleChange({
                    ...nodeStyle,
                    borderColor: e.target.value,
                  })
                }
                className="w-full h-6 rounded"
              />
            </div>
            <div>
              <label className="text-xs block text-gray-900">Font Size</label>
              <input
                type="number"
                value={nodeStyle.fontSize || defaultStyle.fontSize}
                onChange={(e) =>
                  onStyleChange({
                    ...nodeStyle,
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                min="8"
                max="32"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProjectSelectorModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSelect={handleProjectSelect}
        currentProjectId={currentProjectId}
      />

      <ImportNodesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportJSON}
      />
    </div>
  );
}
