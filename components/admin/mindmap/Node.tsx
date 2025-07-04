import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "reactflow";
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
  onAddNode?: (nodeData?: Partial<Node>) => Promise<string | undefined>;
}

const truncateText = (text: string, maxLength: number) => {
  // Remove extra spaces and trim
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length <= 20) return cleanText;
  return cleanText.slice(0, 20) + "...";
};

export const MindmapNode = memo(({ data, isConnectable, id, selected }: NodeProps<MindmapNodeData>): JSX.Element => {
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

  // Monitor onChange and content changes for debugging if needed
  // useEffect(() => {
  //   console.log(`[NODE-${id}] Rendered with data.onChange:`, !!data.onChange, `content: "${data.content}"`);
  // }, [data.onChange, data.content, id]);

  // Sync local text with data.content when it changes from external updates
  useEffect(() => {
    if (data.content !== text && !isEditing) {
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

  // Listen for custom edit events from ReactFlow (backup method)
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

  // Click management state
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Handle clicks with distinction between single and double click
  const handleClick = (event: React.MouseEvent) => {
    clickCountRef.current += 1;
    console.log(`🖱️ [NODE-${id}] Click #${clickCountRef.current}`);
    
    if (clickCountRef.current === 1) {
      // Start timeout for single click - let ReactFlow handle selection
      clickTimeoutRef.current = setTimeout(() => {
        // This is a single click - ReactFlow already handled selection
        console.log(`👆 [NODE-${id}] Single click confirmed - selection handled by ReactFlow`);
        clickCountRef.current = 0;
      }, 300); // 300ms delay to detect double click
    } else if (clickCountRef.current === 2) {
      // This is a double click
      console.log(`🎯 [NODE-${id}] DOUBLE CLICK DETECTED`);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      clickCountRef.current = 0;
      
      // Prevent default and propagation for double click only
      event.preventDefault();
      event.stopPropagation();
      setIsEditing(true);
      console.log(`✅ [NODE-${id}] Editing mode activated`);
      // Emit edit start event
      document.dispatchEvent(new CustomEvent('nodeEditStart'));
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    // Allow ReactFlow to handle drag and selection normally
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Emit edit stop event
    document.dispatchEvent(new CustomEvent('nodeEditStop'));
    
    if (data.onChange) {
      data.onChange(text);
    } else {
      console.error(`[NODE-${id}] ❌ data.onChange is not defined!`);
    }
  };

  // Handle text area changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
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
      const currentNode = getNode(id);
      if (!currentNode) return;

      // Calculate new node position with increased distance and random vertical offset
      const horizontalOffset = handleType === 'source' ? 400 : -400;
      const verticalOffset = Math.random() * 100 - 50; // Random value between -50 and 50
      const newPosition = {
        x: currentNode.position.x + horizontalOffset,
        y: currentNode.position.y + verticalOffset,
      };

      // Call onAddNode with position data
      const newNodeId = await data.onAddNode({ 
        position: newPosition,
        data: { content: "" },
        type: "mindmap"
      });

      if (newNodeId) {
        // Emit a custom event to create connection
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
        !isExpanded && !isEditing && "max-h-[160px] overflow-hidden",
        selected && "ring-2 ring-blue-500 ring-offset-1"
      )}
      style={{
        backgroundColor: data.style?.backgroundColor || "#ffffff",
        border: selected 
          ? "2px solid #3b82f6" 
          : `${data.style?.borderWidth || 1}px solid ${data.style?.borderColor || "#000000"}`,
        fontSize: data.style?.fontSize || 14,
      }}
      onClick={handleClick}
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

