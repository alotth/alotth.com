import { Node, Edge } from "reactflow";
import { useState } from "react";
import { ProjectSelectorModal } from "./ProjectSelectorModal";
import { ImportNodesModal } from "./ImportNodesModal";
import { Plus, Link, Upload, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

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
    <div className="flex items-center gap-1 p-1 rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Main action buttons */}
      <div className="flex items-center gap-1">
        <Tooltip content="Adicionar nova nota" side="top">
          <Button
            onClick={onAddNode}
            size="sm"
            variant="default"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Adicionar nota de outro projeto" side="top">
          <Button
            onClick={() => setIsProjectSelectorOpen(true)}
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
          >
            <Link className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Organizar automaticamente" side="top">
          <Button
            onClick={onAutoOrganize}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Importar notas de arquivo JSON" side="top">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      {/* Separator and style controls for selected nodes */}
      {selectedNode && (
        <>
          <div className="h-6 w-px bg-border mx-1" />
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">BG:</label>
              <Tooltip content="Cor de fundo da nota" side="top">
                <input
                  type="color"
                  value={nodeStyle.backgroundColor || defaultStyle.backgroundColor}
                  onChange={(e) =>
                    onStyleChange({
                      ...nodeStyle,
                      backgroundColor: e.target.value,
                    })
                  }
                  className="w-6 h-6 rounded border border-input cursor-pointer"
                />
              </Tooltip>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">Border:</label>
              <Tooltip content="Cor da borda da nota" side="top">
                <input
                  type="color"
                  value={nodeStyle.borderColor || defaultStyle.borderColor}
                  onChange={(e) =>
                    onStyleChange({
                      ...nodeStyle,
                      borderColor: e.target.value,
                    })
                  }
                  className="w-6 h-6 rounded border border-input cursor-pointer"
                />
              </Tooltip>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">Size:</label>
              <Tooltip content="Tamanho da fonte (8-32px)" side="top">
                <input
                  type="number"
                  value={nodeStyle.fontSize || defaultStyle.fontSize}
                  onChange={(e) =>
                    onStyleChange({
                      ...nodeStyle,
                      fontSize: parseInt(e.target.value),
                    })
                  }
                  className="w-12 h-6 px-1 text-xs border border-input rounded bg-background"
                  min="8"
                  max="32"
                />
              </Tooltip>
            </div>
          </div>
        </>
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
