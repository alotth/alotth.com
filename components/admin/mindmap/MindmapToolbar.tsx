import { Node, Edge } from "reactflow";
import { useState } from "react";
import { ProjectSelectorModal } from "./ProjectSelectorModal";
import { ImportNodesModal } from "./ImportNodesModal";
import { 
  Plus, 
  Link, 
  Upload, 
  LayoutGrid, 
  Keyboard,
  Pin, 
  Archive, 
  Trash2, 
  PinOff, 
  ArchiveRestore, 
  X, 
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { Priority, WorkflowStatus } from "@/types/mindmap";
import { useToast } from "@/components/ui/use-toast";

interface MindmapToolbarProps {
  // Basic toolbar props
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
  
  // Bulk operations props
  selectedCount: number;
  onClearSelection: () => void;
  onBulkPin: () => Promise<void>;
  onBulkUnpin: () => Promise<void>;
  onBulkArchive: () => Promise<void>;
  onBulkUnarchive: () => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkPriorityChange: (priority: Priority) => Promise<void>;
  onBulkWorkflowChange: (status: WorkflowStatus) => Promise<void>;
  onSave?: () => Promise<void>;
}

export function MindmapToolbar({
  // Basic toolbar props
  onAddNode,
  onAddProjectNode,
  onStyleChange,
  onImportJSON,
  selectedNode,
  selectedEdge,
  currentProjectId,
  onAutoOrganize,
  
  // Bulk operations props
  selectedCount,
  onClearSelection,
  onBulkPin,
  onBulkUnpin,
  onBulkArchive,
  onBulkUnarchive,
  onBulkDelete,
  onBulkPriorityChange,
  onBulkWorkflowChange,
  onSave,
}: MindmapToolbarProps) {
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isBulkSectionExpanded, setIsBulkSectionExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleBulkOperation = async (operation: () => Promise<void>, operationName: string) => {
    setLoading(true);
    try {
      await operation();
      toast({
        title: "✅ Concluído",
        description: `${operationName} aplicado a ${selectedCount} nota(s).`,
        duration: 2000,
      });
    } catch (error) {
      console.error(`Error in bulk ${operationName}:`, error);
      toast({
        title: "❌ Erro",
        description: `Não foi possível aplicar ${operationName}.`,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteWithConfirm = async () => {
    if (window.confirm(`🗑️ Excluir ${selectedCount} nota(s)?`)) {
      await handleBulkOperation(onBulkDelete, "exclusão");
    }
  };

  const handleSave = async () => {
    if (onSave) {
      setLoading(true);
      try {
        await onSave();
        toast({
          title: "💾 Atualizado",
          description: "Dados sincronizados com sucesso!",
          duration: 2000,
        });
      } catch (error) {
        console.error("Error saving:", error);
        toast({
          title: "❌ Erro",
          description: "Falha na sincronização.",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-black/20 backdrop-blur-md text-white shadow-xl max-w-sm">
      {/* Basic Actions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/90">Ações</span>
          <Tooltip content="Atalhos de teclado" side="left">
            <Button
              onClick={() => setShowShortcuts(!showShortcuts)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <Keyboard className="h-3 w-3" />
            </Button>
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-1 flex-wrap">
          <Tooltip content="Adicionar nova nota (Ctrl+N)" side="bottom">
            <Button
              onClick={onAddNode}
              size="sm"
              variant="default"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Conectar projeto (Ctrl+L)" side="bottom">
            <Button
              onClick={() => setIsProjectSelectorOpen(true)}
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
            >
              <Link className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Auto-organizar (Ctrl+Shift+O)" side="bottom">
            <Button
              onClick={onAutoOrganize}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Importar JSON (Ctrl+I)" side="bottom">
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

        {/* Keyboard shortcuts */}
        {showShortcuts && (
          <div className="border-t pt-2 space-y-1">
             <div className="text-xs font-medium text-white/90 mb-1">Atalhos:</div>
             <div className="text-xs space-y-0.5 text-white/80">
               <div>• <kbd className="px-1 py-0.5 bg-black/40 rounded text-xs text-white/80">Del</kbd> Deletar seleção</div>
               <div>• <kbd className="px-1 py-0.5 bg-black/40 rounded text-xs text-white/80">Ctrl+N</kbd> Nova nota</div>
               <div>• <kbd className="px-1 py-0.5 bg-black/40 rounded text-xs text-white/80">Duplo-click</kbd> Editar</div>
               <div>• <kbd className="px-1 py-0.5 bg-black/40 rounded text-xs text-white/80">Ctrl+L</kbd> Conectar projeto</div>
               <div>• <kbd className="px-1 py-0.5 bg-black/40 rounded text-xs text-white/80">Ctrl+click</kbd> Seleção múltipla</div>
            </div>
          </div>
        )}
      </div>



      {/* Bulk Operations Section - Only show when nodes are selected */}
      {selectedCount > 0 && (
        <div className="border-t pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-xs font-medium text-white/90">Seleção</span>
               <div className="flex items-center gap-1 px-2 py-1 bg-primary/30 backdrop-blur-sm rounded-full border border-border">
                 <span className="text-xs font-medium text-primary">{selectedCount}</span>
                 <span className="text-xs text-white/80">nota(s)</span>
               </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip content={isBulkSectionExpanded ? "Recolher" : "Expandir"} side="left">
                <Button
                  onClick={() => setIsBulkSectionExpanded(!isBulkSectionExpanded)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  {isBulkSectionExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </Tooltip>
              <Tooltip content="Limpar seleção" side="left">
                <Button
                  onClick={onClearSelection}
                  disabled={loading}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {isBulkSectionExpanded && (
            <div className="space-y-3">
              {/* Pin/Archive Actions */}
              <div className="space-y-2">
                 <div className="text-xs font-medium text-white/90">Organização</div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Tooltip content="Fixar" side="bottom">
                    <Button
                      onClick={() => handleBulkOperation(onBulkPin, "fixar")}
                      disabled={loading}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                    >
                      <Pin className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Desafixar" side="bottom">
                    <Button
                      onClick={() => handleBulkOperation(onBulkUnpin, "desafixar")}
                      disabled={loading}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                    >
                      <PinOff className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Arquivar" side="bottom">
                    <Button
                      onClick={() => handleBulkOperation(onBulkArchive, "arquivar")}
                      disabled={loading}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Desarquivar" side="bottom">
                    <Button
                      onClick={() => handleBulkOperation(onBulkUnarchive, "desarquivar")}
                      disabled={loading}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {/* Workflow Controls */}
              <div className="space-y-2">
                                  <div className="text-xs font-medium text-white/90">Atributos</div>
                  <div className="space-y-2">
                   <div>
                     <label className="text-xs text-white/80 mb-1 block">
                       Prioridade:
                       {selectedCount === 1 && selectedNode?.data?.priority && (
                         <span className="ml-1 text-primary font-medium">({selectedNode.data.priority})</span>
                       )}
                     </label>
                     <Tooltip content={selectedCount === 1 ? "Alterar prioridade da nota" : "Alterar prioridade em lote"} side="bottom">
                       <div className="w-full">
                         <PrioritySelect
                           value={selectedCount === 1 ? selectedNode?.data?.priority || null : null}
                           onValueChange={(priority) => handleBulkOperation(() => onBulkPriorityChange(priority), "prioridade")}
                           disabled={loading}
                           className="h-8 text-xs"
                         />
                       </div>
                     </Tooltip>
                   </div>
                   
                   <div>
                     <label className="text-xs text-white/80 mb-1 block">
                       Workflow:
                       {selectedCount === 1 && selectedNode?.data?.workflowStatus && (
                         <span className="ml-1 text-primary font-medium">({selectedNode.data.workflowStatus})</span>
                       )}
                     </label>
                     <Tooltip content={selectedCount === 1 ? "Alterar workflow da nota" : "Alterar workflow em lote"} side="bottom">
                       <div className="w-full">
                         <WorkflowSelect
                           value={selectedCount === 1 ? selectedNode?.data?.workflowStatus || null : null}
                           onValueChange={(status) => handleBulkOperation(() => onBulkWorkflowChange(status), "workflow")}
                           disabled={loading}
                           className="h-8 text-xs"
                         />
                       </div>
                     </Tooltip>
                   </div>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 pt-2 border-t">
                {onSave && (
                  <Tooltip content="Salvar alterações" side="bottom">
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      size="sm"
                      variant="default"
                      className="h-8 px-3 text-xs flex-1"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                  </Tooltip>
                )}
                
                <Tooltip content="Excluir selecionadas" side="bottom">
                  <Button
                    onClick={handleBulkDeleteWithConfirm}
                    disabled={loading}
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Style controls - only show when single node is selected */}
      {selectedNode && selectedCount <= 1 && (
        <div className="border-t pt-2 space-y-2">
           <span className="text-xs font-medium text-white/90">Estilo da Nota</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                                 <label className="text-xs text-white/80">Fundo:</label>
              <Tooltip content="Cor de fundo da nota" side="left">
                <input
                  type="color"
                  value={nodeStyle.backgroundColor || defaultStyle.backgroundColor}
                  onChange={(e) =>
                    onStyleChange({
                      ...nodeStyle,
                      backgroundColor: e.target.value,
                    })
                  }
                  className="w-8 h-6 rounded border border-input cursor-pointer"
                />
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
                                 <label className="text-xs text-white/80">Borda:</label>
              <Tooltip content="Cor da borda da nota" side="left">
                <input
                  type="color"
                  value={nodeStyle.borderColor || defaultStyle.borderColor}
                  onChange={(e) =>
                    onStyleChange({
                      ...nodeStyle,
                      borderColor: e.target.value,
                    })
                  }
                  className="w-8 h-6 rounded border border-input cursor-pointer"
                />
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
                                 <label className="text-xs text-white/80">Fonte:</label>
              <Tooltip content="Tamanho da fonte (8-32px)" side="left">
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