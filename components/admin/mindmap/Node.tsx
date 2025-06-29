import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { getNodeProjects } from "@/lib/mindmap";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";

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

  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const currentProjectId = pathname?.split("/admin/project/")[1]?.split("/")[0] || "";

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
        console.log('[NODE] Custom edit event received for node:', id);
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

  // Double click detection with proper timing
  const lastClickTime = useRef(0);

  const handleClick = (event: React.MouseEvent) => {
    console.log('Node click handler called for node:', id);
    event.stopPropagation();
    
    const now = Date.now();
    const timeDiff = now - lastClickTime.current;
    
    // If clicks are within double-click threshold (300ms), treat as double-click
    if (timeDiff < 300 && timeDiff > 0) {
      console.log('Manual double click detected on node:', id);
      setIsEditing(true);
      // Emit edit start event
      document.dispatchEvent(new CustomEvent('nodeEditStart'));
      lastClickTime.current = 0; // Reset to prevent triple-click
    } else {
      lastClickTime.current = now;
      console.log('Single click on node:', id);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    console.log('Native double click handler called for node:', id);
    event.stopPropagation();
    event.preventDefault();
    
    setIsEditing(true);
    // Emit edit start event
    document.dispatchEvent(new CustomEvent('nodeEditStart'));
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    console.log('Mouse down on node:', id);
    event.stopPropagation();
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Emit edit stop event
    document.dispatchEvent(new CustomEvent('nodeEditStop'));
    
    if (data.onChange) {
      data.onChange(text);
      console.log("text", text);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={cn(
        "px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 transition-all duration-200 nopan",
        isExpanded ? "w-[600px]" : "w-[200px]",
        !isExpanded && !isEditing && "max-h-[160px] overflow-hidden"
      )}
      style={{
        backgroundColor: data.style?.backgroundColor || "#ffffff",
        borderColor: data.style?.borderColor || "#000000",
        borderWidth: data.style?.borderWidth || 2,
        fontSize: data.style?.fontSize || 14,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-stone-400"
      />
      {isEditing ? (
        <div className="relative">
          {/* TODO: Fix scroll behavior in edit mode
           * Current issue: ReactFlow captures scroll events before they reach the textarea
           * Potential solutions to try:
           * 1. Use a custom scroll container with higher z-index
           * 2. Implement a custom scroll handler that prevents default on ReactFlow
           * 3. Use a portal to render the textarea outside of ReactFlow's event system
           * 4. Add a transparent overlay that captures scroll events
           */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className={cn(
              "w-full font-medium bg-transparent border-none focus:outline-none resize-none prose prose-sm max-w-none text-gray-900",
              isExpanded ? "min-h-[200px]" : "min-h-[100px]",
              "overflow-consistent max-h-[500px]"
            )}
            style={{
              fontSize: data.style?.fontSize || 14,
            }}
            autoFocus
            onMouseEnter={(e) => {
              e.currentTarget.style.overflowY = "auto";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.overflowY = "hidden";
            }}
          />
        </div>
      ) : (
        <div className="relative">
          {/* Botão de expand/collapse no topo direito */}
          {!isEditing && shouldShowExpand && (
            <button
              onClick={toggleExpand}
              className="absolute top-1 right-1 p-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full z-10"
              title={isExpanded ? "Recolher" : "Expandir"}
              style={{ lineHeight: 0 }}
            >
              {isExpanded ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          )}
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
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-stone-400"
      />
    </div>
  );
});

MindmapNode.displayName = "MindmapNode";

