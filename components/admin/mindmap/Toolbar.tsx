import { Node, Edge } from "reactflow";
import { useState } from "react";
import { ProjectSelectorModal } from "./ProjectSelectorModal";

interface ToolbarProps {
  onAddNode: () => void;
  onAddProjectNode: (projectId: string, projectName: string) => void;
  onStyleChange: (style: any) => void;
  selectedNode: Node | null;
  selectedEdge: Edge | null;
}

export function Toolbar({
  onAddNode,
  onAddProjectNode,
  onStyleChange,
  selectedNode,
  selectedEdge,
}: ToolbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const nodeStyle = selectedNode?.data?.style || {};
  const defaultStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 2,
    fontSize: 14,
  };

  const handleProjectSelect = (projectId: string, projectName: string) => {
    onAddProjectNode(projectId, projectName);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 bg-white p-2 rounded-md shadow-md text-gray-900">
      <button
        onClick={onAddNode}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Add Node
      </button>

      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        Add Project Node
      </button>

      {selectedNode && (
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

      <ProjectSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleProjectSelect}
      />
    </div>
  );
}
