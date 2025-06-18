import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getNodeProjects } from "@/lib/mindmap";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onContentChange(id, text);
  };

  return (
    <div
      className={cn(
        "p-4 shadow-md rounded-md bg-white border-2 border-stone-400 transition-all duration-200",
        isExpanded ? "w-full" : "w-full",
        !isExpanded && !isEditing && "max-h-[300px] overflow-hidden"
      )}
      onClick={handleOnClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          className="w-full min-h-[200px] font-medium bg-transparent border-none focus:outline-none resize-none prose prose-sm max-w-none text-gray-900"
          autoFocus
        />
      ) : (
        <div className="prose prose-sm max-w-none text-gray-900">
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
              p: ({ children }) => <p className="mb-2">{children}</p>,
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
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
              >
                {project.project_title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
      >
        {isExpanded ? "Collapse" : "Expand"}
      </button>
    </div>
  );
};

export default NoteCard;
