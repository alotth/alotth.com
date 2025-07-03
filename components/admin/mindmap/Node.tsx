import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn, extractUrlsFromContent } from "@/lib/utils";
import { getNodeProjects } from "@/lib/mindmap";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
import { useReactFlow } from 'reactflow';

interface MindmapNodeData {
  content: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
  };
  onChange?: (newText: string) => void;
  lastProjectNodeAdded?: number; // Timestamp of last project node addition
  onAddNode?: () => Promise<string | undefined>;
}

const truncateText = (text: string, maxLength: number) => {
  // Remove extra spaces and trim
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length <= 20) return cleanText;
  return cleanText.slice(0, 20) + "...";
};

export const MindmapNode = memo(({ data, isConnectable, id }: NodeProps<MindmapNodeData>): JSX.Element => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const [projects, setProjects] = useState<{ project_id: string; project_title: string }[]>([]);
  const { getNode } = useReactFlow();

  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const currentProjectId = pathname?.split("/admin/project/")[1]?.split("/")[0] || "";

  // Debug: Log onChange status on render
  useEffect(() => {
    console.log(`[NODE-${id}] Rendered with data.onChange:`, !!data.onChange, `content: "${data.content}"`);
  }, [data.onChange, data.content, id]);

  // Sync local text with data.content when it changes from external updates
  useEffect(() => {
    if (data.content !== text && !isEditing) {
      console.log(`[NODE-${id}] Syncing text from "${text}" to "${data.content}"`);
      setText(data.content);
    }
  }, [data.content, text, isEditing, id]);

  // Check if content has URLs
  const hasUrls = extractUrlsFromContent(text).length > 0;

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = contentRef.current.clientHeight;
      const hasOverflow = contentHeight > containerHeight;
      const hasMultipleLines = text.split('\n').length > 3;
      const moreThan20Chars = text.length > 20;
      setShouldShowExpand(hasOverflow || hasMultipleLines || moreThan20Chars);
    }
  }, [text]);

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
  }, [id, data.lastProjectNodeAdded]);

  // Keep textarea focused when styles change
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [data.style, isEditing]);

  // Listen for custom edit events from ReactFlow
  useEffect(() => {
    const handleEditEvent = (event: any) => {
      if (event.detail.nodeId === id) {
        setIsEditing(true);
        // Emit edit start event
        document.dispatchEvent(new CustomEvent('nodeEditStart'));
      }
    };

    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      nodeElement.addEventListener('triggerEdit', handleEditEvent);
      return () => {
        nodeElement.removeEventListener('triggerEdit', handleEditEvent);
      };
    }
  }, [id]);

  // Simplified double click detection
  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    setIsEditing(true);
    // Emit edit start event
    document.dispatchEvent(new CustomEvent('nodeEditStart'));
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleBlur = () => {
    console.log(`[NODE-${id}] handleBlur called - isEditing: ${isEditing}, text: "${text}"`);
    console.log(`[NODE-${id}] data.onChange exists:`, !!data.onChange);
    
    setIsEditing(false);
    // Emit edit stop event
    document.dispatchEvent(new CustomEvent('nodeEditStop'));
    
    if (data.onChange) {
      console.log(`[NODE-${id}] 🔄 Calling data.onChange with text: "${text}"`);
      data.onChange(text);
    } else {
      console.error(`[NODE-${id}] ❌ data.onChange is not defined!`);
    }
  };

  // Add handler for text area change to see if it's being updated
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    console.log(`[NODE-${id}] Text changed from "${text}" to "${newText}"`);
    setText(newText);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleHandleDoubleClick = async (event: React.MouseEvent, handleType: 'source' | 'target') => {
    event.preventDefault();
    event.stopPropagation();

    if (!data.onAddNode) {
      console.error('onAddNode callback not provided');
      return;
    }

    try {
      const newNodeId = await data.onAddNode();
      if (newNodeId) {
        const currentNode = getNode(id);
        if (!currentNode) return;

        // Calculate new node position based on handle type
        const offset = handleType === 'source' ? 200 : -200;
        const newPosition = {
          x: currentNode.position.x + offset,
          y: currentNode.position.y,
        };

        // Emit a custom event to update node position and create connection
        document.dispatchEvent(new CustomEvent('newNodeFromHandle', {
          detail: {
            newNodeId,
            position: newPosition,
            connection: handleType === 'source' 
              ? { source: id, target: newNodeId }
              : { source: newNodeId, target: id }
          }
        }));
      }
    } catch (error) {
      console.error("Error creating node from handle:", error);
    }
  };

  return (
    <>
    <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="!w-2 !h-2 !z-10 !bg-gray-400 hover:!bg-gray-600 transition-colors"
        onDoubleClick={(e) => handleHandleDoubleClick(e, 'target')}
      />
    <div
      className={cn(
        "px-4 py-2 shadow-md rounded-md bg-white  transition-all duration-200 nopan relative group",
        isExpanded ? "w-[600px]" : "w-[200px]",
        !isExpanded && !isEditing && "max-h-[160px] overflow-hidden"
      )}
      style={{
        backgroundColor: data.style?.backgroundColor || "#ffffff",
        border: "1px solid #000000",
        fontSize: data.style?.fontSize || 14,
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      

      {/* Status indicator for links */}
      {hasUrls && !isEditing && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1 z-0" title="Contém links">
          <ExternalLink size={10} />
        </div>
      )}
      
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 z-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Link button */}
        {!isEditing && hasUrls && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const urls = extractUrlsFromContent(text);
              if (urls.length > 0) {
                window.open(urls[0], '_blank', 'noopener,noreferrer');
              }
            }}
            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded-full transition-all duration-150"
            title="Abrir primeiro link em nova aba"
            aria-label="Abrir primeiro link em nova aba"
          >
            <ExternalLink size={14} />
          </button>
        )}
        
        {/* Expand/collapse button */}
        {!isEditing && shouldShowExpand && (
          <button
            onClick={toggleExpand}
            className="p-1.5 bg-white/80 hover:bg-white border border-border hover:border-border rounded-full transition-all duration-150"
            title={isExpanded ? "Recolher" : "Expandir"}
            aria-label={isExpanded ? "Recolher nota" : "Expandir nota"}
          >
            {isExpanded ? (
              <ChevronLeft size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            className={cn(
              "w-full font-medium bg-transparent border-none focus:outline-none resize-none prose prose-sm max-w-none text-gray-900",
              isExpanded ? "min-h-[200px]" : "min-h-[100px]",
              "overflow-auto max-h-[500px]"
            )}
            style={{
              fontSize: data.style?.fontSize || 14,
            }}
            autoFocus
            aria-label="Editar conteúdo da nota"
          />
        </div>
      ) : (
        <div className="relative">
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none text-gray-900"
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-2">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-4 mb-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 mb-2">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 rounded">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {!isExpanded ? truncateText(text, 20) : text}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {projects.length > 1 && (
        <div className="mt-2 text-xs text-gray-500">
          <div>Shared with:</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {projects
              .filter(project => project.project_id !== currentProjectId)
              .map(project => (
                <Link
                  key={project.project_id}
                  href={`/admin/project/${project.project_id}`}
                  className="text-blue-600 underline hover:text-blue-800 transition-colors px-0 py-0 rounded-none bg-transparent"
                >
                  {project.project_title}
                </Link>
              ))}
          </div>
        </div>
      )}
      
    </div>
    <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="!w-2 !h-2 !z-10 !bg-gray-400 hover:!bg-gray-600 transition-colors"
        onDoubleClick={(e) => handleHandleDoubleClick(e, 'source')}
      />
      </>
  );
});

MindmapNode.displayName = "MindmapNode";

