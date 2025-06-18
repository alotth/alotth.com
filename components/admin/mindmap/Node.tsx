import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { getNodeProjects } from "@/lib/mindmap";

interface MindmapNodeData {
  content: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
  };
  onChange?: (newText: string) => void;
}

const truncateText = (text: string, maxLength: number) => {
  // Remove extra spaces and trim
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length <= 20) return cleanText;
  return cleanText.slice(0, 20) + "...";
};

export const MindmapNode = memo(({ data, isConnectable, id }: NodeProps<MindmapNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const [projects, setProjects] = useState<{ project_id: string; project_title: string }[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [id]);

  // Keep textarea focused when styles change
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [data.style, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
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
        "px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 transition-all duration-200",
        isExpanded ? "w-[600px]" : "w-[200px]",
        !isExpanded && !isEditing && "max-h-[160px] overflow-hidden"
      )}
      style={{
        backgroundColor: data.style?.backgroundColor || "#ffffff",
        borderColor: data.style?.borderColor || "#000000",
        borderWidth: data.style?.borderWidth || 2,
        fontSize: data.style?.fontSize || 14,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
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
              "overflow-y-auto max-h-[500px]"
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
          {!isEditing && shouldShowExpand && (
            <button
              onClick={toggleExpand}
              className="absolute bottom-0 right-0 px-2 py-1 bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 rounded-tl transition-colors"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
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
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
              >
                {project.project_title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 !bg-stone-400"
      />
    </div>
  );
});

MindmapNode.displayName = "MindmapNode";
