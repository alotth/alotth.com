import { useCallback, useRef, useEffect, useState } from "react";
import { Node, Edge } from "reactflow";

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
  action: string; // Description of the action
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  storageKey?: string;
  onStateRestore?: (nodes: Node[], edges: Edge[]) => void;
}

export function useUndoRedo({
  maxHistorySize = 20,
  storageKey = "mindmap-history",
  onStateRestore,
}: UseUndoRedoOptions) {
  const historyRef = useRef<HistoryState[]>([]);
  const currentIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update undo/redo availability
  const updateAvailability = useCallback(() => {
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Save state to history with debouncing
  const saveState = useCallback((nodes: Node[], edges: Edge[], action: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      const newState: HistoryState = {
        nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
        edges: JSON.parse(JSON.stringify(edges)), // Deep clone
        timestamp: Date.now(),
        action,
      };

      // Remove any future history if we're not at the end
      if (currentIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
      }

      // Don't save if it's the same as the last state
      const lastState = historyRef.current[historyRef.current.length - 1];
      if (lastState && 
          JSON.stringify(lastState.nodes) === JSON.stringify(newState.nodes) &&
          JSON.stringify(lastState.edges) === JSON.stringify(newState.edges)) {
        console.log(`[UNDO] Skipping duplicate state: ${action}`);
        return;
      }

      // Add new state
      historyRef.current.push(newState);
      currentIndexRef.current = historyRef.current.length - 1;

      // Limit history size
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current = historyRef.current.slice(-maxHistorySize);
        currentIndexRef.current = historyRef.current.length - 1;
      }

      // Save to localStorage every 5 operations
      if (historyRef.current.length % 5 === 0) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            history: historyRef.current.slice(-10), // Keep last 10 in storage
            currentIndex: Math.min(currentIndexRef.current, 9),
          }));
        } catch (error) {
          console.warn("Failed to save history to localStorage:", error);
        }
      }

      updateAvailability();
      console.log(`[UNDO] Saved state: ${action} (${historyRef.current.length} total)`);
    }, 300); // Reduced debounce for faster response
  }, [maxHistorySize, storageKey, updateAvailability]);

  // Undo last action
  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current--;
      const state = historyRef.current[currentIndexRef.current];
      
      console.log(`[UNDO] Restoring state: ${state.action}`);
      onStateRestore?.(state.nodes, state.edges);
      updateAvailability();
      
      return state;
    }
    return null;
  }, [onStateRestore, updateAvailability]);

  // Redo next action
  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current++;
      const state = historyRef.current[currentIndexRef.current];
      
      console.log(`[REDO] Restoring state: ${state.action}`);
      onStateRestore?.(state.nodes, state.edges);
      updateAvailability();
      
      return state;
    }
    return null;
  }, [onStateRestore, updateAvailability]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.history && Array.isArray(data.history)) {
          historyRef.current = data.history;
          currentIndexRef.current = data.currentIndex || data.history.length - 1;
          updateAvailability();
          console.log(`[UNDO] Loaded ${data.history.length} states from localStorage`);
        }
      }
    } catch (error) {
      console.warn("Failed to load history from localStorage:", error);
    }
  }, [storageKey, updateAvailability]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        undo();
      } else if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Clean up any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [undo, redo]);

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    updateAvailability();
    
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("Failed to clear history from localStorage:", error);
    }
    
    console.log("[UNDO] History cleared");
  }, [storageKey, updateAvailability]);

  // Get current history info
  const getHistoryInfo = useCallback(() => ({
    total: historyRef.current.length,
    current: currentIndexRef.current,
    canUndo,
    canRedo,
    lastAction: currentIndexRef.current >= 0 ? historyRef.current[currentIndexRef.current]?.action : null,
  }), [canUndo, canRedo]);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistoryInfo,
  };
} 