"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  enableDebounce?: boolean; // Allow debounce as an option
}

export function NotesSearch({ 
  onSearch, 
  placeholder = "Search notes and projects... (Press Enter to search)",
  className = "",
  enableDebounce = false
}: NotesSearchProps) {
  const [query, setQuery] = useState("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce effect (only if enabled)
  useEffect(() => {
    if (!enableDebounce) return;
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(query);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, onSearch, enableDebounce]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  const handleChange = (value: string) => {
    setQuery(value);
    // Remove real-time search - only search on Enter or if debounce is enabled
    // Real-time search removed to prevent too many API calls
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
} 