"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function NotesSearch({ 
  onSearch, 
  placeholder = "Search notes and projects...",
  className = ""
}: NotesSearchProps) {
  const [query, setQuery] = useState("");

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
    // Real-time search with debouncing would be better, but for now we'll search on submit
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
      
      {/* Submit button - could be hidden and just submit on Enter */}
      <Button
        type="submit"
        className="mt-2 w-full sm:w-auto"
        size="sm"
      >
        Search
      </Button>
    </form>
  );
} 