import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getNodeProjects } from "@/lib/mindmap";
import { MarkdownEditor } from "@/components/ui/markdown-editor";

interface NoteCardProps {
  id: string;
  content: string;
  onContentChange: (id: string, newContent: string) => void;
}

const NoteCard = ({ id, content, onContentChange }: NoteCardProps) => {
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

  return (
    <div
      className={cn(
        "p-3 sm:p-4 shadow-md rounded-md bg-white border-2 border-stone-400 transition-all duration-200",
        isExpanded ? "w-full" : "w-full",
        !isExpanded && !isEditing && "max-h-[250px] sm:max-h-[300px] overflow-hidden"
      )}
      onClick={!isEditing ? handleOnClick : undefined}
    >
      {isEditing ? (
        <div className="space-y-3">
          <MarkdownEditor
            value={text}
            onChange={setText}
            rows={6}
            preview={false}
          />
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
        <div className="prose prose-sm max-w-none text-gray-900">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg sm:text-2xl font-bold mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base sm:text-xl font-bold mb-2">{children}</h2>
              ),
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
      {!isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
};

export default NoteCard;
