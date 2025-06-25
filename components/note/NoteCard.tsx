import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getNodeProjects, toggleNodePinned, toggleNodeArchived } from "@/lib/mindmap";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Pin, Archive, PinOff, ArchiveRestore, Expand, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrioritySelect } from "@/components/ui/priority-select";
import { WorkflowSelect } from "@/components/ui/workflow-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Priority, WorkflowStatus } from "@/types/mindmap";

interface NoteCardProps {
  id: string;
  content: string;
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
}

const NoteCard = ({ 
  id, 
  content, 
  isPinned = false, 
  isArchived = false,
  priority = null,
  workflowStatus = null,
  dueDate = null,
  onContentChange,
  onPinnedChange,
  onArchivedChange,
  onPriorityChange,
  onWorkflowStatusChange,
  onDueDateChange
}: NoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [projects, setProjects] = useState<{ project_id: string; project_title: string }[]>([]);

  useEffect(() => {
    async function loadProjects() {
      try {
        const nodeProjects = await getNodeProjects(id);
        setProjects(nodeProjects);
      } catch (err) {
        console.error("Failed to load node projects:", err);
      }
    }

    loadProjects();
  }, [id]);

  const handleOnClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    onContentChange(id, text);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setText(content); // Reset to original content
  };

  const handleTogglePinned = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodePinned(id);
      onPinnedChange?.(id, !isPinned);
    } catch (error) {
      console.error('Error toggling node pinned:', error);
    }
  };

  const handleToggleArchived = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleNodeArchived(id);
      onArchivedChange?.(id, !isArchived);
    } catch (error) {
      console.error('Error toggling node archived:', error);
    }
  };

  const handlePriorityChange = (newPriority: Priority) => {
    onPriorityChange?.(id, newPriority);
  };

  const handleWorkflowStatusChange = (newStatus: WorkflowStatus) => {
    onWorkflowStatusChange?.(id, newStatus);
  };

  const handleDueDateChange = (newDueDate: string | null) => {
    onDueDateChange?.(id, newDueDate);
  };
  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:ring-1 hover:ring-primary/50 transition-all duration-200 relative group",
        isExpanded ? "w-full" : "w-full",
        !isExpanded && !isEditing && "max-h-[250px] sm:max-h-[300px] overflow-hidden",
        isArchived && "opacity-60 bg-muted/30"
      )}
      onClick={!isEditing ? handleOnClick : undefined}
    >
      {/* Pin/Archive status indicators */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {isPinned && (
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <Pin size={12} className="text-gray-600 dark:text-gray-300" />
          </div>
        )}
        {isArchived && (
          <div className="bg-muted text-muted-foreground rounded-full p-1">
            <Archive size={12} className="text-gray-600 dark:text-gray-300" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          title={isExpanded ? "Recolher" : "Expandir"}
        >
          {isExpanded ? <Minimize2 size={12} className="text-gray-600 dark:text-gray-300" /> : <Expand size={12} className="text-gray-600 dark:text-gray-300" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleTogglePinned}
          title={isPinned ? "Desafixar" : "Fixar"}
        >
          {isPinned ? <PinOff size={12} className="text-gray-600 dark:text-gray-300" /> : <Pin size={12} className="text-gray-600 dark:text-gray-300" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleToggleArchived}
          title={isArchived ? "Desarquivar" : "Arquivar"}
        >
          {isArchived ? <ArchiveRestore size={12} className="text-gray-600 dark:text-gray-300" /> : <Archive size={12} className="text-gray-600 dark:text-gray-300" />}
        </Button>
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <MarkdownEditor
            value={text}
            onChange={setText}
            rows={6}
            preview={false}
          />
          
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
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex-1 sm:flex-initial"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm flex-1 sm:flex-initial"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-200 dark:prose-invert">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg sm:text-2xl font-bold mb-2">{children}</h1>
              ),
              h2: ({ children }) => {
                if (typeof children === 'string' && children.includes('Imagens')) {
                  return null;
                }
                if (Array.isArray(children) && children.some(child => 
                  typeof child === 'string' && child.includes('Imagens')
                )) {
                  return null;
                }
                return <h2 className="text-base sm:text-xl font-bold mb-2">{children}</h2>;
              },
              h3: ({ children }) => (
                <h3 className="text-sm sm:text-lg font-bold mb-2">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-2 text-sm sm:text-base">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 text-sm sm:text-base">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 text-sm sm:text-base">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-gray-100 px-1 rounded text-xs sm:text-sm">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto text-xs sm:text-sm">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2 text-sm sm:text-base">
                  {children}
                </blockquote>
              ),
              img: ({ src, alt, ...props }) => (
                <img 
                  src={src} 
                  alt={alt} 
                  className="max-w-full h-auto rounded-md my-2 shadow-sm" 
                  loading="lazy"
                  {...props} 
                />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Workflow Status Indicators - only show if at least one field has a value */}
      {!isEditing && (priority || workflowStatus || dueDate) && (
        <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
          {priority && (
            <PrioritySelect
              value={priority}
              onValueChange={handlePriorityChange}
              className="pointer-events-auto"
            />
          )}
          {workflowStatus && (
            <WorkflowSelect
              value={workflowStatus}
              onValueChange={handleWorkflowStatusChange}
              className="pointer-events-auto"
            />
          )}
          {dueDate && (
            <DatePicker
              value={dueDate}
              onValueChange={handleDueDateChange}
              placeholder="Nenhuma data"
              className="pointer-events-auto"
            />
          )}
        </div>
      )}
      
      {projects.length > 1 && (
        <div className="mt-2 text-xs text-gray-500">
          <div>Shared in {projects.length} project{projects.length > 1 ? 's' : ''}:</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {projects.map(project => (
              <Link
                key={project.project_id}
                href={`/admin/project/${project.project_id}`}
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors text-xs"
              >
                {project.project_title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteCard;
