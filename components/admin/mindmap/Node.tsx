import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import Link from "next/link";

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

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(text);
    }
  };

  return (
    <div
      className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 w-[200px]"
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          className="w-full font-medium bg-transparent border-none focus:outline-none resize-none"
          autoFocus
        />
      ) : (
        <div className="font-medium">{text}</div>
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
