"use client";

import { useState, useEffect } from "react";
import { getAllNotes } from "@/lib/mindmap";
import { NoteWithProject } from "@/types/mindmap";
import { NotesSearch } from "./NotesSearch";
import { EditableNoteCard } from "./EditableNoteCard";
import { cn } from "@/lib/utils";

interface NotesViewProps {
  className?: string;
}

export function NotesView({ className = "" }: NotesViewProps) {
  const [notes, setNotes] = useState<NoteWithProject[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotes = async () => {
    try {
      setLoading(true);
      const allNotes = await getAllNotes();
      setNotes(allNotes);
      setFilteredNotes(allNotes);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredNotes(notes);
      return;
    }

    try {
      const searchResults = await getAllNotes(query);
      setFilteredNotes(searchResults);
    } catch (error) {
      console.error("Error searching notes:", error);
    }
  };

  const handleNoteUpdate = (updatedNote: NoteWithProject) => {
    setFilteredNotes(prev => prev.map(note => 
      note.id === updatedNote.id && note.project_id === updatedNote.project_id 
        ? updatedNote 
        : note
    ));
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id && note.project_id === updatedNote.project_id 
        ? updatedNote 
        : note
    ));
  };

  const handleNoteRemove = (noteId: string, projectId: string) => {
    setFilteredNotes(prev => prev.filter(note => 
      !(note.id === noteId && note.project_id === projectId)
    ));
    setNotes(prev => prev.filter(note => 
      !(note.id === noteId && note.project_id === projectId)
    ));
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold">Todas as Notas</h2>
          <div className="w-full sm:w-80">
            <NotesSearch onSearch={handleSearch} />
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {searchQuery ? (
            <>Encontradas {filteredNotes.length} nota(s) para &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>Mostrando {filteredNotes.length} nota(s) de todos os projetos</>
          )}
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Nenhuma nota encontrada para esta pesquisa." : "Nenhuma nota encontrada."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <EditableNoteCard
              key={`${note.id}-${note.project_id}`}
              note={note}
              onUpdate={handleNoteUpdate}
              onRemove={handleNoteRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
} 