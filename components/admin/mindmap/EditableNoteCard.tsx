"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Pin, Archive, ExternalLink, Calendar, Clock, Edit2, Save, X, ArrowRight, Trash2, PinOff, ArchiveRestore, Expand, Minimize2 } from "lucide-react";
import { cn, extractUrlsFromContent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { DatePicker } from "@/components/ui/date-picker";
import { NoteWithProject, MindmapProject, Priority, WorkflowStatus } from "@/types/mindmap";
import { updateNoteContent, moveNoteToProject, getAvailableProjectsForNote, deleteMindmapNode, toggleNodePinned, toggleNodeArchived, updateNoteMetadata } from "@/lib/mindmap";
import { useToast } from "@/components/ui/use-toast";

// Interface for when used in NotesView (with project info)
interface EditableNoteCardPropsWithProject {
  note: NoteWithProject;
  onUpdate: (updatedNote: NoteWithProject) => void;
  onRemove: (noteId: string, projectId: string) => void;
  onSelect?: (event: React.MouseEvent) => void;
  hideProjectSelector?: never;
}

// Interface for when used in Project page (without project info)
interface EditableNoteCardPropsWithoutProject {
  id: string;
  content: string;
  projectId: string;
  isPinned?: boolean;
  isArchived?: boolean;
  priority?: Priority | null;
  workflowStatus?: WorkflowStatus | null;
  dueDate?: string | null;
  onContentChange: (id: string, newContent: string) => void;
  onPinnedChange?: (id: string, isPinned: boolean) => void;
  onArchivedChange?: (id: string, isArchived: boolean) => void;
  onPriorityChange?: (id: string, priority: Priority) => void;
  onWorkflowStatusChange?: (id: string, status: WorkflowStatus) => void;
  onDueDateChange?: (id: string, dueDate: string | null) => void;
  onRemove?: (nodeId: string, projectId: string) => void;
  onSelect?: (event: React.MouseEvent) => void;
  hideProjectSelector: true;
  note?: never;
  onUpdate?: never;
}

type EditableNoteCardProps = EditableNoteCardPropsWithProject | EditableNoteCardPropsWithoutProject;

const markdownComponents = {
  ul: ({ children, ...props }: any) => <ul className="list-disc pl-4 my-1" {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="list-decimal pl-4 my-1" {...props}>{children}</ol>,
  li: ({ children, ...props }: any) => <li className="my-0" {...props}>{children}</li>,
  p: ({ children, ...props }: any) => <p className="my-1" {...props}>{children}</p>,
  h1: ({ children, ...props }: any) => <h1 className="text-base font-bold my-1" {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 className="text-sm font-bold my-1" {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-sm font-semibold my-1" {...props}>{children}</h3>,
  a: ({ children, href, ...props }: any) => (
    <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
};

export function EditableNoteCard(props: EditableNoteCardProps) {
  // Normalize props based on usage mode
  // Force correct mode detection: if we have a note prop, we're in NotesView mode
  const isProjectMode = props.hideProjectSelector === true && !props.note;
  
  const noteId = isProjectMode ? props.id : props.note.id;
  const noteContent = isProjectMode ? props.content : props.note.content;
  const notePinned = isProjectMode ? (props.isPinned || false) : props.note.is_pinned;
  const noteArchived = isProjectMode ? (props.isArchived || false) : props.note.is_archived;
  const notePriority = isProjectMode ? props.priority : props.note.priority;
  const noteWorkflowStatus = isProjectMode ? props.workflowStatus : props.note.workflow_status;
  const noteDueDate = isProjectMode ? props.dueDate : props.note.due_date;

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [selectedProjectId, setSelectedProjectId] = useState(isProjectMode ? '' : props.note.project_id);
  const [priority, setPriority] = useState<Priority | null>(notePriority || null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(noteWorkflowStatus || null);
  const [dueDate, setDueDate] = useState<string | null>(noteDueDate || null);
  const [availableProjects, setAvailableProjects] = useState<MindmapProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if content has URLs
  const hasUrls = extractUrlsFromContent(content).length > 0;

  const handleCancel = useCallback(() => {
    setContent(noteContent);
    if (!isProjectMode) {
      setSelectedProjectId(props.note.project_id);
    }
    setPriority(notePriority || null);
    setWorkflowStatus(noteWorkflowStatus || null);
    setDueDate(noteDueDate || null);
    setIsEditing(false);
  }, [noteContent, isProjectMode, notePriority, noteWorkflowStatus, noteDueDate]);

  useEffect(() => {
    if (!isProjectMode) {
      const loadProjects = async () => {
        try {
          const projects = await getAvailableProjectsForNote();
          setAvailableProjects(projects);
        } catch (error) {
          console.error("Error loading projects:", error);
        }
      };
      loadProjects();
    }
  }, [isProjectMode]);

  // Effect to handle clicks outside the component to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSelectOpen) {
        return;
      }

      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // Check if the click is on a select item, which lives outside the ref
        if ((event.target as HTMLElement).closest('[data-radix-select-content]')) {
          return;
        }
        console.log('[NOTE CARD] Click outside detected, cancelling edit');
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside, true);
    } else {
      document.removeEventListener("mousedown", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isEditing, handleCancel, isSelectOpen]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent from handling this event
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleSingleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent from handling this event
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleTogglePinned = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodePinned(noteId);
      
      if (isProjectMode) {
        props.onPinnedChange?.(noteId, !notePinned);
      } else {
        // Optimistically update UI
        const updatedNote = { ...props.note, is_pinned: !props.note.is_pinned };
        props.onUpdate(updatedNote);
      }
    } catch (error) {
      console.error('Error toggling node pinned:', error);
      toast({ title: "Error", description: "Could not toggle pin status.", variant: "destructive" });
    }
  };

  const handleToggleArchived = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodeArchived(noteId);
      
      if (isProjectMode) {
        props.onArchivedChange?.(noteId, !noteArchived);
      } else {
        // Optimistically update UI
        const updatedNote = { ...props.note, is_archived: !props.note.is_archived };
        props.onUpdate(updatedNote);
      }
    } catch (error) {
      console.error('Error toggling node archived:', error);
      toast({ title: "Error", description: "Could not toggle archive status.", variant: "destructive" });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm("Tem certeza que deseja remover esta nota deste projeto? A nota poderá ser permanentemente excluída se não estiver em outros projetos.")) {
      setLoading(true);
      try {
        if (isProjectMode) {
          await deleteMindmapNode(noteId, props.projectId);
          props.onRemove?.(noteId, props.projectId);
        } else {
          await deleteMindmapNode(props.note.id, props.note.project_id);
          props.onRemove(props.note.id, props.note.project_id);
        }
        
        toast({
          title: "Nota removida",
          description: "A nota foi removida do projeto.",
        });
      } catch (error) {
        console.error("Error deleting note:", error);
        toast({
          title: "Erro ao remover nota",
          description: "Não foi possível remover a nota. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority);
  };

  const handleWorkflowStatusChange = (newStatus: WorkflowStatus) => {
    setWorkflowStatus(newStatus);
  };

  const handleDueDateChange = (newDueDate: string | null) => {
    setDueDate(newDueDate);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getWorkflowColor = (status: string | null) => {
    switch (status) {
      case 'todo': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'done': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'blocked': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isProjectMode) {
        // In project mode, use the unified updateNode flow from useMindmap hook
        // This avoids duplicate saves and race conditions
        if (content !== noteContent) {
          props.onContentChange(noteId, content);
        }
        
        if (priority !== notePriority) {
          props.onPriorityChange?.(noteId, priority!);
        }
        
        if (workflowStatus !== noteWorkflowStatus) {
          props.onWorkflowStatusChange?.(noteId, workflowStatus!);
        }
        
        if (dueDate !== noteDueDate) {
          props.onDueDateChange?.(noteId, dueDate);
        }
      } else {
        // In notes view mode, save directly to database as before
        // Check if we need to update content
        if (content !== noteContent) {
          await updateNoteContent(noteId, content);
        }

        // Check if we need to update metadata (priority, workflow, due_date)
        if (priority !== notePriority || workflowStatus !== noteWorkflowStatus || dueDate !== noteDueDate) {
          await updateNoteMetadata(noteId, {
            priority,
            workflow_status: workflowStatus,
            due_date: dueDate
          });
        }
      }

      if (!isProjectMode) {
        // Move to different project if changed
        if (selectedProjectId !== props.note.project_id) {
          await moveNoteToProject(noteId, props.note.project_id, selectedProjectId);
          
          // Remove from current view since it's moved to another project
          props.onRemove(noteId, props.note.project_id);
          
          toast({
            title: "Nota movida",
            description: "A nota foi movida para outro projeto com sucesso.",
            duration: 3000,
          });
        } else {
          // Update the note in place
          const updatedNote: NoteWithProject = {
            ...props.note,
            content,
            priority,
            workflow_status: workflowStatus,
            due_date: dueDate,
            updated_at: new Date().toISOString(),
          };
          props.onUpdate(updatedNote);
          
          toast({
            title: "Nota atualizada",
            description: "O conteúdo foi salvo com sucesso.",
            duration: 3000,
          });
        }
      } else {
        toast({
          title: "Nota atualizada",
          description: "O conteúdo foi salvo com sucesso.",
          duration: 3000,
        });
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

  return (
    <div
      ref={cardRef}
      className={cn(
        "p-4 border rounded-lg hover:shadow-md transition-all duration-200 relative group bg-card text-card-foreground cursor-pointer",
        noteArchived && "opacity-60 bg-muted/30",
        isEditing && "ring-2 ring-primary cursor-default",
        !isExpanded && !isEditing && "max-h-[300px] overflow-hidden"
      )}
      onDoubleClick={!isEditing ? handleDoubleClick : undefined}
      onClick={!isEditing ? handleSingleClick : undefined}
      onMouseDown={(e) => {
        // Check if clicking on interactive elements
        const target = e.target as HTMLElement;
        const isInteractiveElement = target.closest('button, input, select, textarea, a, [role="button"], .markdown-editor, [contenteditable]');
        
        if (isInteractiveElement) {
          e.stopPropagation();
        } else if (isEditing) {
          // If editing, don't handle selection
          return;
        } else {
          // Call the selection callback directly
          if (props.onSelect) {
            props.onSelect(e);
          }
        }
      }}
    >
      {/* Status Indicators */}
      <div className="absolute top-2 left-2 flex gap-1 z-0">
        {notePinned && (
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <Pin size={10} />
          </div>
        )}
        {noteArchived && (
          <div className="bg-muted text-muted-foreground rounded-full p-1">
            <Archive size={10} />
          </div>
        )}
        {hasUrls && (
          <div className="bg-blue-500 text-white rounded-full p-1" title="Contém links">
            <ExternalLink size={10} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-0">
        {!isEditing ? (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} title={isExpanded ? "Recolher" : "Expandir"}>
              {isExpanded ? <Minimize2 size={12} /> : <Expand size={12} />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTogglePinned} title={notePinned ? "Desafixar" : "Fixar"}>
              {notePinned ? <PinOff size={12} /> : <Pin size={12} />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleToggleArchived} title={noteArchived ? "Desarquivar" : "Arquivar"}>
              {noteArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
            </Button>
            {hasUrls && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-500 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  const urls = extractUrlsFromContent(content);
                  if (urls.length > 0) {
                    window.open(urls[0], '_blank', 'noopener,noreferrer');
                  }
                }}
                title="Abrir primeiro link em nova aba"
              >
                <ExternalLink size={12} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={loading}
              title="Excluir nota"
            >
              <Trash2 size={12} />
            </Button>
            {!isProjectMode && (
              <Link
                href={`/admin/project/${props.note.project_id}`}
                className="text-muted-foreground hover:text-primary p-1"
                title={`Ir para projeto: ${props.note.project_title}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} />
              </Link>
            )}
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={loading}
              title="Salvar alterações"
            >
              <Save size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              disabled={loading}
              title="Cancelar edição"
            >
              <X size={12} />
            </Button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="pt-6 space-y-4">
          <MarkdownEditor value={content} onChange={setContent} />
          
          {/* Workflow Controls */}
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Controles de Workflow</div>
            <div className="flex flex-wrap gap-2">
              <PrioritySelect
                value={priority}
                onValueChange={handlePriorityChange}
              />
              <WorkflowSelect
                value={workflowStatus}
                onValueChange={handleWorkflowStatusChange}
              />
              <DatePicker
                value={dueDate}
                onValueChange={handleDueDateChange}
                placeholder="Nenhuma data"
              />
            </div>
          </div>
          
          {!isProjectMode && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Projeto:</label>
              <Select 
                value={selectedProjectId} 
                onValueChange={(value) => setSelectedProjectId(value)}
                disabled={loading}
                onOpenChange={setIsSelectOpen}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span>{project.title}</span>
                        {project.is_pinned && <Pin size={8} />}
                        {selectedProjectId !== props.note.project_id && project.id === selectedProjectId && (
                          <ArrowRight size={8} className="text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectId !== props.note.project_id && (
                <div className="text-xs text-primary">
                  Será movida para: {selectedProject?.title}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {!isProjectMode && (
            <div className="mb-3 pt-6">
              <Link 
                href={`/admin/project/${props.note.project_id}`}
                className="text-xs font-medium text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {props.note.project_title}
                {props.note.project_is_pinned && <Pin size={8} className="inline ml-1" />}
              </Link>
            </div>
          )}
          <div className={cn("prose prose-sm dark:prose-invert max-w-none text-sm leading-normal mb-3", isProjectMode && "pt-6")}>
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </>
      )}

      {/* Workflow Status Indicators - only show if at least one field has a value and not editing */}
      {!isEditing && (priority || workflowStatus || dueDate) && (
        <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
          {priority && (
            <span className={cn("px-2 py-1 rounded-full font-medium text-xs", getPriorityColor(priority))}>
              {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'}
            </span>
          )}
          {workflowStatus && (
            <span className={cn("px-2 py-1 rounded-full font-medium text-xs", getWorkflowColor(workflowStatus))}>
              {workflowStatus === 'todo' ? 'A fazer' : 
               workflowStatus === 'in_progress' ? 'Em progresso' :
               workflowStatus === 'done' ? 'Concluído' : 'Bloqueado'}
            </span>
          )}
          {dueDate && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Calendar size={10} />
              <span>Prazo: {formatDate(dueDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Metadata - only show if not editing */}
      {!isEditing && !isProjectMode && (
        <div className="space-y-2 text-xs mt-4">
          {/* Last Updated */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock size={10} />
            <span>Atualizado: {formatDate(props.note.updated_at || props.note.created_at || '')}</span>
          </div>
        </div>
      )}
    </div>
  );
} 