import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MindmapNodeData {
  content: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
  };
  onChange?: (newText: string) => void;
  referencedProjectId?: string;
  referencedProjectName?: string;
}

export const MindmapNode = memo(({ data, isConnectable }: NodeProps<MindmapNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && !isExpanded) {
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = contentRef.current.clientHeight;
      setShouldShowExpand(contentHeight > containerHeight);
    }
  }, [text, isExpanded]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(text);
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
        !isExpanded && !isEditing && "max-h-[100px] overflow-hidden"
      )}
      style={data.style}
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className={cn(
              "w-full font-medium bg-transparent border-none focus:outline-none resize-none prose prose-sm max-w-none text-gray-900",
              isExpanded ? "min-h-[200px]" : "min-h-[100px]",
              "overflow-y-auto max-h-[500px]"
            )}
            autoFocus
            onMouseEnter={(e) => {
              e.currentTarget.style.overflowY = 'auto';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.overflowY = 'hidden';
            }}
          />
        </div>
      ) : (
        <div className="relative">
          <div 
            ref={contentRef}
            className={cn(
              "prose prose-sm max-w-none text-gray-900",
              !isExpanded && "line-clamp-3"
            )}
          >
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
          {!isEditing && shouldShowExpand && (
            <button
              onClick={toggleExpand}
              className="absolute bottom-0 right-0 text-xs text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      )}
      {data.referencedProjectId && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Link
            href={`/admin/mindmap/${data.referencedProjectId}`}
            className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
          >
            Open Project
          </Link>
          {data.referencedProjectName && (
            <span className="text-gray-500 truncate max-w-[100px]">
              {data.referencedProjectName}
            </span>
          )}
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
