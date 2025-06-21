import { Node, Edge } from "reactflow";
import { useState } from "react";
import { ProjectSelectorModal } from "./ProjectSelectorModal";
import { ImportNodesModal } from "./ImportNodesModal";
import { Plus, Link, Upload, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";

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
  onAutoOrganize: () => void;
}

export function Toolbar({
  onAddNode,
  onAddProjectNode,
  onStyleChange,
  onImportJSON,
  selectedNode,
  selectedEdge,
  currentProjectId,
  onAutoOrganize,
}: ToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
    setIsProjectSelectorOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 sm:p-3 rounded-md shadow-md text-gray-900 min-w-0">
      {/* Toggle collapse button - show on all screen sizes */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="self-end text-gray-700 hover:text-gray-900 p-1"
        title={collapsed ? "Expand toolbar" : "Collapse toolbar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onAddNode}
          title="Add Node"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          {!collapsed && <span className="hidden sm:inline">Add Node</span>}
        </button>

        <button
          onClick={() => setIsProjectSelectorOpen(true)}
          title="Add Node from a Project"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors whitespace-nowrap"
        >
          <Link size={14} className="sm:w-4 sm:h-4" />
          {!collapsed && <span className="hidden sm:inline">Add Node from a Project</span>}
        </button>

        <button
          onClick={onAutoOrganize}
          title="Auto Organize"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          <LayoutGrid size={14} className="sm:w-4 sm:h-4" />
          {!collapsed && <span className="hidden sm:inline">Auto Organize</span>}
        </button>

        <button
          onClick={() => setIsImportModalOpen(true)}
          title="Import Nodes"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors whitespace-nowrap"
        >
          <Upload size={14} className="sm:w-4 sm:h-4" />
          {!collapsed && <span className="hidden sm:inline">Import Nodes</span>}
        </button>
      </div>

      {/* Node style controls */}
      {!collapsed && selectedNode && (
        <div className="mt-2 sm:mt-4 p-2 sm:p-3 border rounded min-w-0 w-full sm:w-auto">
          <h3 className="text-xs sm:text-sm font-medium mb-2 text-gray-900">Node Style</h3>
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
                className="w-full h-8 sm:h-6 rounded"
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
                className="w-full h-8 sm:h-6 rounded"
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
                className="w-full px-2 py-2 sm:py-1 text-xs sm:text-sm border rounded text-gray-900"
                min="8"
                max="32"
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      <ProjectSelectorModal
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        onSelect={handleProjectSelect}
        currentProjectId={currentProjectId}
      />

      {/* Import Modal */}
      <ImportNodesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(data) => {
          onImportJSON(data);
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
}
