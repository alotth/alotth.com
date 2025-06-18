import { useState } from "react";
import { Connection } from "reactflow";

interface ImportNodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    nodes: { content: string; position: { x: number; y: number }; style?: any }[];
    edges: { source: string; target: string }[];
  }) => void;
}

export function ImportNodesModal({ isOpen, onClose, onImport }: ImportNodesModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setJsonText(text);
        setError(null);
      } catch (err) {
        console.error("Error reading file:", err);
        setError("Error reading file");
      }
      // Reset input value to allow uploading the same file again
      event.target.value = '';
    }
  };

  const validateNode = (node: any, index: number) => {
    if (!node.content || typeof node.content !== 'string') {
      throw new Error(`Node ${index + 1}: Missing or invalid 'content' property (must be a string)`);
    }
    if (!node.position) {
      throw new Error(`Node ${index + 1}: Missing 'position' property`);
    }
    if (typeof node.position.x !== 'number') {
      throw new Error(`Node ${index + 1}: Invalid or missing 'position.x' (must be a number)`);
    }
    if (typeof node.position.y !== 'number') {
      throw new Error(`Node ${index + 1}: Invalid or missing 'position.y' (must be a number)`);
    }
    if (node.style) {
      // Optional style validation
      if (node.style.backgroundColor && typeof node.style.backgroundColor !== 'string') {
        throw new Error(`Node ${index + 1}: Invalid 'style.backgroundColor' (must be a string)`);
      }
      if (node.style.borderColor && typeof node.style.borderColor !== 'string') {
        throw new Error(`Node ${index + 1}: Invalid 'style.borderColor' (must be a string)`);
      }
      if (node.style.borderWidth && typeof node.style.borderWidth !== 'number') {
        throw new Error(`Node ${index + 1}: Invalid 'style.borderWidth' (must be a number)`);
      }
      if (node.style.fontSize && typeof node.style.fontSize !== 'number') {
        throw new Error(`Node ${index + 1}: Invalid 'style.fontSize' (must be a number)`);
      }
    }
  };

  const validateEdge = (edge: any, index: number, nodes: any[]) => {
    if (!edge.source || typeof edge.source !== 'string') {
      throw new Error(`Edge ${index + 1}: Missing or invalid 'source' property (must be a string)`);
    }
    if (!edge.target || typeof edge.target !== 'string') {
      throw new Error(`Edge ${index + 1}: Missing or invalid 'target' property (must be a string)`);
    }
  };

  const handleImport = () => {
    try {
      console.log("Attempting to parse JSON:", jsonText);
      const data = JSON.parse(jsonText);
      
      // Validate imported data structure
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('JSON must contain a "nodes" array');
      }
      if (!data.edges || !Array.isArray(data.edges)) {
        throw new Error('JSON must contain an "edges" array');
      }

      // Validate each node has required properties
      data.nodes.forEach((node: any, index: number) => validateNode(node, index));

      // Validate each edge has required properties
      data.edges.forEach((edge: any, index: number) => validateEdge(edge, index, data.nodes));

      console.log("JSON validation successful. Importing data:", data);
      onImport(data);
      setJsonText("");
      setError(null);
      onClose();
    } catch (err) {
      console.error("Error importing data:", err);
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Import Mindmap</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import from file
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="- my-2 text-gray-500 dark:text-gray-400 text-center">or</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={`{
  "nodes": [
    {
      "content": "Node 1",
      "position": { "x": 100, "y": 100 },
      "style": {
        "backgroundColor": "#ffffff",
        "borderColor": "#000000",
        "borderWidth": 2,
        "fontSize": 14
      }
    }
  ],
  "edges": [
    {
      "source": "node1",
      "target": "node2"
    }
  ]
}`}
              className="w-full h-64 px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 