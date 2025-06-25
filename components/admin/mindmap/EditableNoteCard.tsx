"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Pin, Archive, ExternalLink, Calendar, Clock, Edit2, Save, X, ArrowRight, Trash2, PinOff, ArchiveRestore, Expand, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteWithProject, MindmapProject } from "@/types/mindmap";
import { updateNoteContent, moveNoteToProject, getAvailableProjectsForNote, deleteMindmapNode, toggleNodePinned, toggleNodeArchived } from "@/lib/mindmap";
import { useToast } from "@/components/ui/use-toast";

interface EditableNoteCardProps {
  note: NoteWithProject;
  onUpdate: (updatedNote: NoteWithProject) => void;
  onRemove: (noteId: string, projectId: string) => void;
}

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

export function EditableNoteCard({ note, onUpdate, onRemove }: EditableNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [selectedProjectId, setSelectedProjectId] = useState(note.project_id);
  const [availableProjects, setAvailableProjects] = useState<MindmapProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCancel = useCallback(() => {
    setContent(note.content);
    setSelectedProjectId(note.project_id);
    setIsEditing(false);
  }, [note.content, note.project_id]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await getAvailableProjectsForNote();
        setAvailableProjects(projects);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    loadProjects();
  }, []);

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

  const handleTogglePinned = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodePinned(note.id);
      // Optimistically update UI
      const updatedNote = { ...note, is_pinned: !note.is_pinned };
      onUpdate(updatedNote);
    } catch (error) {
      console.error('Error toggling node pinned:', error);
      toast({ title: "Error", description: "Could not toggle pin status.", variant: "destructive" });
    }
  };

  const handleToggleArchived = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodeArchived(note.id);
      // Optimistically update UI
      const updatedNote = { ...note, is_archived: !note.is_archived };
      onUpdate(updatedNote);
    } catch (error) {
      console.error('Error toggling node archived:', error);
      toast({ title: "Error", description: "Could not toggle archive status.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza que deseja remover esta nota deste projeto? A nota poderá ser permanentemente excluída se não estiver em outros projetos.")) {
      setLoading(true);
      try {
        await deleteMindmapNode(note.id, note.project_id);
        onRemove(note.id, note.project_id);
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

  const handleStartEdit = () => {
    setContent(note.content);
    setSelectedProjectId(note.project_id);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    handleCancel();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update content if changed
      if (content !== note.content) {
        await updateNoteContent(note.id, content);
      }

      // Move to different project if changed
      if (selectedProjectId !== note.project_id) {
        await moveNoteToProject(note.id, note.project_id, selectedProjectId);
        
        // Remove from current view since it's moved to another project
        onRemove(note.id, note.project_id);
        
        toast({
          title: "Nota movida",
          description: "A nota foi movida para outro projeto com sucesso.",
          duration: 3000,
        });
      } else {
        // Update the note in place
        const updatedNote: NoteWithProject = {
          ...note,
          content,
          updated_at: new Date().toISOString(),
        };
        onUpdate(updatedNote);
        
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
        "p-4 border rounded-lg hover:shadow-md transition-all duration-200 relative group bg-card text-card-foreground",
        note.is_archived && "opacity-60 bg-muted/30",
        isEditing && "ring-2 ring-primary",
        !isExpanded && !isEditing && "max-h-[300px] overflow-hidden"
      )}
    >
      {/* Status Indicators */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {note.is_pinned && (
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <Pin size={10} />
          </div>
        )}
        {note.is_archived && (
          <div className="bg-muted text-muted-foreground rounded-full p-1">
            <Archive size={10} />
          </div>
        )}
      </div>

      {/* Edit/Save buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!isEditing ? (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} title={isExpanded ? "Recolher" : "Expandir"}>
              {isExpanded ? <Minimize2 size={12} /> : <Expand size={12} />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTogglePinned} title={note.is_pinned ? "Desafixar" : "Fixar"}>
              {note.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleToggleArchived} title={note.is_archived ? "Desarquivar" : "Arquivar"}>
              {note.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
            </Button>
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
            <Link
              href={`/admin/project/${note.project_id}`}
              className="text-muted-foreground hover:text-primary p-1"
              title={`Ir para projeto: ${note.project_title}`}
            >
              <ExternalLink size={12} />
            </Link>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSave}
              disabled={loading}
              title="Salvar alterações"
            >
              <Save size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCancelEditing}
              disabled={loading}
              title="Cancelar edição"
            >
              <X size={12} />
            </Button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="pt-6">
          <MarkdownEditor value={content} onChange={setContent} />
          <div className="space-y-2 mt-4">
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
                      {selectedProjectId !== note.project_id && project.id === selectedProjectId && (
                        <ArrowRight size={8} className="text-primary" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId !== note.project_id && (
              <div className="text-xs text-primary">
                Será movida para: {selectedProject?.title}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 pt-6">
            <Link 
              href={`/admin/project/${note.project_id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              {note.project_title}
              {note.project_is_pinned && <Pin size={8} className="inline ml-1" />}
            </Link>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-normal mb-3">
            <ReactMarkdown components={markdownComponents}>
              {note.content}
            </ReactMarkdown>
          </div>
        </>
      )}

      {/* Metadata */}
      <div className="space-y-2 text-xs mt-4">
        {/* Priority and Workflow */}
        <div className="flex gap-2 flex-wrap">
          {note.priority && (
            <span className={cn("px-2 py-1 rounded-full font-medium", getPriorityColor(note.priority))}>
              {note.priority === 'high' ? 'Alta' : note.priority === 'medium' ? 'Média' : 'Baixa'}
            </span>
          )}
          {note.workflow_status && (
            <span className={cn("px-2 py-1 rounded-full font-medium", getWorkflowColor(note.workflow_status))}>
              {note.workflow_status === 'todo' ? 'A fazer' : 
               note.workflow_status === 'in_progress' ? 'Em progresso' :
               note.workflow_status === 'done' ? 'Concluído' : 'Bloqueado'}
            </span>
          )}
        </div>

        {/* Due Date */}
        {note.due_date && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar size={10} />
            <span>Prazo: {formatDate(note.due_date)}</span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock size={10} />
          <span>Atualizado: {formatDate(note.updated_at || note.created_at || '')}</span>
        </div>
      </div>
    </div>
  );
} 