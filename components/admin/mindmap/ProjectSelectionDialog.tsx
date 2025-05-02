import { useEffect, useState } from "react";
import { MindmapProject } from "@/types/mindmap";
import { getAvailableProjects } from "@/lib/mindmap";

interface ProjectSelectionDialogProps {
  currentProjectId: string;
  onSelect: (project: MindmapProject) => void;
  onClose: () => void;
}

export function ProjectSelectionDialog({
  currentProjectId,
  onSelect,
  onClose,
}: ProjectSelectionDialogProps) {
  const [projects, setProjects] = useState<MindmapProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const availableProjects = await getAvailableProjects(currentProjectId);
        setProjects(availableProjects);
      } catch (err) {
        setError("Failed to load available projects");
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [currentProjectId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-gray-600 mb-4">No other projects available to link.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-4">Select Project to Link</h3>
        <div className="max-h-96 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-full text-left p-3 hover:bg-gray-100 rounded mb-2 transition-colors"
            >
              <div className="font-medium">{project.title}</div>
              {project.description && (
                <div className="text-sm text-gray-600">{project.description}</div>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 