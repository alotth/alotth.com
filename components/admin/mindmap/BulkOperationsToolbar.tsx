"use client";

import { useState } from "react";
import { Pin, Archive, Trash2, PinOff, ArchiveRestore, X, Save, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { Priority, WorkflowStatus } from "@/types/mindmap";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip } from "@/components/ui/tooltip";

interface BulkOperationsToolbarProps {
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
  className?: string;
  variant?: "floating" | "inline";
}

export function BulkOperationsToolbar({
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
  className = "",
  variant = "inline",
}: BulkOperationsToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleOperation = async (operation: () => Promise<void>, operationName: string) => {
    setLoading(true);
    try {
      await operation();
      toast({
        title: "✅ Concluído",
        description: `${operationName} aplicado a ${selectedCount} nota(s).`,
        duration: 2000,
      });
      if (variant === "floating") setIsExpanded(false);
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

  const handleBulkDelete = async () => {
    if (window.confirm(`🗑️ Excluir ${selectedCount} nota(s)?`)) {
      await handleOperation(onBulkDelete, "exclusão");
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
        if (variant === "floating") setIsExpanded(false);
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

  if (selectedCount === 0) return null;

  // Render inline version (Gmail-style)
  if (variant === "inline") {
    return (
             <div className={`w-full bg-black/20 backdrop-blur-md border border-border rounded-lg p-3 animate-slideDown shadow-xl ${className}`}>
         <div className="flex items-center justify-between gap-3 flex-wrap">
           {/* Left side - Counter, actions and workflow controls */}
           <div className="flex items-center gap-3 flex-wrap">
             <div className="flex items-center gap-2 px-3 py-1 bg-primary/30 backdrop-blur-sm rounded-full border border-border">
               <span className="text-sm font-medium text-primary">{selectedCount}</span>
               <span className="text-xs text-white/80">selecionada(s)</span>
             </div>
             
             <div className="flex items-center gap-1">
               <Tooltip content="Fixar" side="top">
                 <Button
                   onClick={() => handleOperation(onBulkPin, "fixar")}
                   disabled={loading}
                   size="sm"
                   variant="ghost"
                   className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                 >
                   <Pin size={14} />
                 </Button>
               </Tooltip>
               
               <Tooltip content="Desafixar" side="top">
                 <Button
                   onClick={() => handleOperation(onBulkUnpin, "desafixar")}
                   disabled={loading}
                   size="sm"
                   variant="ghost"
                   className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                 >
                   <PinOff size={14} />
                 </Button>
               </Tooltip>
               
               <Tooltip content="Arquivar" side="top">
                 <Button
                   onClick={() => handleOperation(onBulkArchive, "arquivar")}
                   disabled={loading}
                   size="sm"
                   variant="ghost"
                   className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                 >
                   <Archive size={14} />
                 </Button>
               </Tooltip>
               
               <Tooltip content="Desarquivar" side="top">
                 <Button
                   onClick={() => handleOperation(onBulkUnarchive, "desarquivar")}
                   disabled={loading}
                   size="sm"
                   variant="ghost"
                   className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                 >
                   <ArchiveRestore size={14} />
                 </Button>
               </Tooltip>
             </div>

             <div className="h-4 w-px bg-border" />
             
             <div className="flex items-center gap-3">
               <Tooltip content="Alterar prioridade" side="top">
                 <div className="w-28">
                   <PrioritySelect
                     value={null}
                     onValueChange={(priority) => handleOperation(() => onBulkPriorityChange(priority), "prioridade")}
                     disabled={loading}
                     className="h-8 text-xs"
                   />
                 </div>
               </Tooltip>
               
               <Tooltip content="Alterar workflow" side="top">
                 <div className="w-28">
                   <WorkflowSelect
                     value={null}
                     onValueChange={(status) => handleOperation(() => onBulkWorkflowChange(status), "workflow")}
                     disabled={loading}
                     className="h-8 text-xs"
                   />
                 </div>
               </Tooltip>
             </div>
           </div>

           {/* Right side - Save and danger actions */}
           <div className="flex items-center gap-1">
             {onSave && (
               <Tooltip content="Salvar alterações" side="top">
                 <Button
                   onClick={handleSave}
                   disabled={loading}
                   size="sm"
                   variant="default"
                   className="h-8 px-3 text-xs"
                 >
                   <Save size={12} className="mr-1" />
                   Salvar
                 </Button>
               </Tooltip>
             )}
             
             <Tooltip content="Excluir selecionadas" side="top">
               <Button
                 onClick={handleBulkDelete}
                 disabled={loading}
                 size="sm"
                 variant="destructive"
                 className="h-8 w-8 p-0"
               >
                 <Trash2 size={14} />
               </Button>
             </Tooltip>
             
             <Tooltip content="Limpar seleção" side="top">
               <Button
                 onClick={onClearSelection}
                 disabled={loading}
                 size="sm"
                 variant="ghost"
                 className="h-8 w-8 p-0 hover:bg-muted"
               >
                 <X size={14} />
               </Button>
             </Tooltip>
           </div>
         </div>

        <style jsx>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slideDown {
            animation: slideDown 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // Render floating version (FAB style)
  const actions = [
    { icon: Pin, action: () => handleOperation(onBulkPin, "fixar"), tooltip: "Fixar notas", color: "hover:bg-blue-50 hover:text-blue-600" },
    { icon: PinOff, action: () => handleOperation(onBulkUnpin, "desafixar"), tooltip: "Desafixar notas", color: "hover:bg-blue-50 hover:text-blue-600" },
    { icon: Archive, action: () => handleOperation(onBulkArchive, "arquivar"), tooltip: "Arquivar notas", color: "hover:bg-orange-50 hover:text-orange-600" },
    { icon: ArchiveRestore, action: () => handleOperation(onBulkUnarchive, "desarquivar"), tooltip: "Desarquivar notas", color: "hover:bg-orange-50 hover:text-orange-600" },
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Expanded Actions */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-2 mb-2">
          {/* Quick Actions */}
          {actions.map(({ icon: Icon, action, tooltip, color }, index) => (
            <Tooltip key={index} content={tooltip} side="left">
              <Button
                onClick={action}
                disabled={loading}
                size="icon"
                variant="secondary"
                className={`h-12 w-12 rounded-full shadow-lg border bg-background ${color} transition-all duration-200 hover:scale-105`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'slideInRight 0.2s ease-out forwards'
                }}
              >
                <Icon size={18} />
              </Button>
            </Tooltip>
          ))}

          {/* Workflow Controls */}
          <div className="space-y-2">
            <Tooltip content="Alterar prioridade" side="left">
              <div className="animate-slideInRight">
                <PrioritySelect
                  value={null}
                  onValueChange={(priority) => handleOperation(() => onBulkPriorityChange(priority), "prioridade")}
                  disabled={loading}
                  className="h-12 w-12 rounded-full shadow-lg border"
                />
              </div>
            </Tooltip>
            
            <Tooltip content="Alterar workflow" side="left">
              <div className="animate-slideInRight">
                <WorkflowSelect
                  value={null}
                  onValueChange={(status) => handleOperation(() => onBulkWorkflowChange(status), "workflow")}
                  disabled={loading}
                  className="h-12 w-12 rounded-full shadow-lg border"
                />
              </div>
            </Tooltip>
          </div>

          {/* Save Button */}
          {onSave && (
            <Tooltip content="Salvar e sincronizar" side="left">
              <Button
                onClick={handleSave}
                disabled={loading}
                size="icon"
                variant="default"
                className="h-12 w-12 rounded-full shadow-lg animate-slideInRight hover:scale-105 transition-all duration-200"
              >
                <Save size={18} />
              </Button>
            </Tooltip>
          )}

          {/* Delete Button */}
          <Tooltip content="Excluir selecionadas" side="left">
            <Button
              onClick={handleBulkDelete}
              disabled={loading}
              size="icon"
              variant="destructive"
              className="h-12 w-12 rounded-full shadow-lg animate-slideInRight hover:scale-105 transition-all duration-200"
            >
              <Trash2 size={18} />
            </Button>
          </Tooltip>

          {/* Clear Selection */}
          <Tooltip content="Limpar seleção" side="left">
            <Button
              onClick={onClearSelection}
              disabled={loading}
              size="icon"
              variant="outline"
              className="h-12 w-12 rounded-full shadow-lg animate-slideInRight hover:scale-105 transition-all duration-200"
            >
              <X size={18} />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Main FAB */}
      <Tooltip content={isExpanded ? "Fechar menu" : `${selectedCount} nota(s) selecionada(s)`} side="left">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={loading}
          size="icon"
          className={`h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all duration-300 ${
            isExpanded ? 'rotate-45' : 'hover:scale-105'
          }`}
        >
          {isExpanded ? (
            <X size={24} className="transition-transform duration-300" />
          ) : (
            <div className="flex flex-col items-center">
              <MoreHorizontal size={20} />
              <span className="text-xs font-medium">{selectedCount}</span>
            </div>
          )}
        </Button>
      </Tooltip>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
} 