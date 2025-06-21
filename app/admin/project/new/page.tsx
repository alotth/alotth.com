import { createProject } from "./actions";
import { FormButtons } from "./form-buttons";

export default function NewMindmapPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Create New Mindmap</h2>

      <form action={createProject} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 text-base"
            placeholder="Enter mindmap title"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 text-base resize-none"
            placeholder="Enter mindmap description"
          />
        </div>

        <FormButtons />
      </form>
    </div>
  );
}
