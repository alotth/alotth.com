"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getAllNotes, toggleNodePinned, toggleNodeArchived, deleteMindmapNode, updateNoteMetadata } from "@/lib/mindmap";
import { NoteWithProject, Priority, WorkflowStatus } from "@/types/mindmap";
import { NotesSearch } from "./NotesSearch";
import { EditableNoteCard } from "./EditableNoteCard";
import { BulkOperationsToolbar } from "./BulkOperationsToolbar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface NotesViewProps {
  className?: string;
  stickySearch?: boolean;
  searchOnly?: boolean;
  notesOnly?: boolean;
  onSearchChange?: (query: string) => void;
  onFilteredNotesChange?: (notes: NoteWithProject[]) => void;
  searchQuery?: string;
  filteredNotes?: NoteWithProject[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function NotesView({ 
  className = "", 
  stickySearch = false, 
  searchOnly = false, 
  notesOnly = false,
  onSearchChange,
  onFilteredNotesChange,
  searchQuery: externalSearchQuery,
  filteredNotes: externalFilteredNotes,
  onLoadMore,
  hasMore: externalHasMore,
  loadingMore: externalLoadingMore
}: NotesViewProps) {
  const [allNotes, setAllNotes] = useState<NoteWithProject[]>([]);
  const [notes, setNotes] = useState<NoteWithProject[]>([]);
  const [internalFilteredNotes, setInternalFilteredNotes] = useState<NoteWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  
  // Use external state if provided, otherwise use internal state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const filteredNotes = externalFilteredNotes !== undefined ? externalFilteredNotes : internalFilteredNotes;
  
  // Calculate hasMore based on whether we're using external or internal notes
  const hasMore = useMemo(() => {
    if (externalFilteredNotes !== undefined) {
      return externalHasMore ?? false;
    }
    // For internal notes, check if we have more to load
    return allNotes.length > (page + 1) * NOTES_PER_PAGE;
  }, [externalFilteredNotes, externalHasMore, allNotes.length, page]);

  // Use external or internal loadingMore state
  const isLoadingMore = externalFilteredNotes !== undefined ? (externalLoadingMore ?? false) : loadingMore;

  // Debug: Infinite scroll state (throttled to prevent spam)
  const debugStateRef = useRef<string>("");
  const debugState = {
    searchOnly, 
    notesOnly, 
    filteredNotes: filteredNotes.length,
    allNotes: allNotes.length,
    page,
    hasMore,
    loadingMore: isLoadingMore,
    externalFilteredNotes: !!externalFilteredNotes
  };
  const debugStateString = JSON.stringify(debugState);
  
  if (debugStateRef.current !== debugStateString) {
    console.log('InfiniteScroll Debug:', debugState);
    debugStateRef.current = debugStateString;
  }
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // Infinite scroll
  const observerRef = useRef<IntersectionObserver>();
  const lastNoteElementRef = useRef<HTMLDivElement>();
  const NOTES_PER_PAGE = 20;
  
  const { toast } = useToast();

  const loadNotes = async (pageNum = 0, reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }
      
      // For now, load all notes and handle pagination in frontend
      // In a real app, you'd modify getAllNotes to accept offset/limit
      const allNotesFromDB = await getAllNotes();
      
      if (reset) {
        setAllNotes(allNotesFromDB);
        const initialNotes = allNotesFromDB.slice(0, NOTES_PER_PAGE);
        setNotes(initialNotes);
        setInternalFilteredNotes(initialNotes);
        if (onFilteredNotesChange) {
          onFilteredNotesChange(initialNotes);
        }
      } else {
        // Load more notes - use current page instead of pageNum + 1
        const startIndex = page * NOTES_PER_PAGE + NOTES_PER_PAGE; // Skip already loaded notes
        const endIndex = startIndex + NOTES_PER_PAGE;
        const moreNotes = allNotesFromDB.slice(startIndex, endIndex);
        
        if (moreNotes.length > 0) {
          const updatedNotes = [...notes, ...moreNotes];
          setNotes(updatedNotes);
          setInternalFilteredNotes(updatedNotes);
          if (onFilteredNotesChange) {
            onFilteredNotesChange(updatedNotes);
          }
          setPage(page + 1);
        }
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreNotes = useCallback(() => {
    // Load more if conditions are met and we're either standalone OR the data owner
    const isDataOwner = !externalFilteredNotes; // Changed: only load more if we own the data
    const isStandalone = !externalFilteredNotes; // standalone mode
    
    console.log('loadMoreNotes called:', { 
      loadingMore, 
      hasMore, 
      isStandalone, 
      isDataOwner,
      canLoad: !loadingMore && hasMore && (isStandalone || isDataOwner)
    });
    
    if (!loadingMore && hasMore && (isStandalone || isDataOwner)) {
      console.log('Loading more notes...');
      loadNotes(page, false);
    }
  }, [loadingMore, hasMore, page, externalFilteredNotes]);

  useEffect(() => {
    // Only load notes if we're not using external state (standalone mode)
    // Don't load notes in searchOnly mode - it should only show what's passed externally
    if (!externalFilteredNotes && !searchOnly) {
      loadNotes();
    } else {
      // If using external state, set loading to false so observer can be attached
      setLoading(false);
    }
  }, []);

  // Intersection Observer for infinite scroll
  const lastNoteElementRefCallback = useCallback((node: HTMLDivElement) => {
    console.log('🎯 lastNoteElementRefCallback called:', { 
      node: !!node, 
      loading, 
      hasObserver: !!observerRef.current,
      hasMore,
      isLoadingMore,
      externalFilteredNotes: !!externalFilteredNotes,
      hasOnLoadMore: !!onLoadMore
    });
    
    if (loading) {
      console.log('❌ Observer not attached - still loading');
      return;
    }
    if (observerRef.current) observerRef.current.disconnect();
    
    // Throttled logging for observer attachment
    if (node) {
      console.log('👁️ Observer attached to last note');
    } else {
      console.log('❌ No node provided to observer');
      return;
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      const isIntersecting = entries[0].isIntersecting;
      
      console.log('🔍 Observer triggered:', { isIntersecting, hasMore, isLoadingMore });
      
      // Only log when intersection state changes significantly
      if (isIntersecting && hasMore && !isLoadingMore) {
        console.log('🚀 Observer triggered - loading more notes');
        
        if (externalFilteredNotes !== undefined && onLoadMore) {
          console.log('📞 Calling external onLoadMore');
          onLoadMore();
        } else {
          console.log('📞 Calling internal loadMoreNotes');
          loadMoreNotes();
        }
      } else if (isIntersecting) {
        console.log('❌ Observer intersecting but conditions not met:', { hasMore, isLoadingMore });
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, isLoadingMore, externalFilteredNotes, onLoadMore, loadMoreNotes]);

  const handleSearch = async (query: string) => {
    setInternalSearchQuery(query);
    if (onSearchChange) {
      onSearchChange(query);
    }
    
    if (!query.trim()) {
      setInternalFilteredNotes(notes);
      if (onFilteredNotesChange) {
        onFilteredNotesChange(notes);
      }
      return;
    }

    // First: Search in already loaded notes (front-end)
    const queryLower = query.toLowerCase();
    const frontendResults = allNotes.filter(note => 
      note.content.toLowerCase().includes(queryLower) ||
      note.project_title?.toLowerCase().includes(queryLower)
    );
    
    // Update with frontend results immediately
    setInternalFilteredNotes(frontendResults);
    if (onFilteredNotesChange) {
      onFilteredNotesChange(frontendResults);
    }

    // Then: Search in database for more comprehensive results
    try {
      const dbResults = await getAllNotes(query);
      // Merge and deduplicate results
      const mergedResults = [
        ...frontendResults,
        ...dbResults.filter(dbNote => 
          !frontendResults.some(frontNote => 
            frontNote.id === dbNote.id && frontNote.project_id === dbNote.project_id
          )
        )
      ];
      
      setInternalFilteredNotes(mergedResults);
      if (onFilteredNotesChange) {
        onFilteredNotesChange(mergedResults);
      }
    } catch (error) {
      console.error("Error searching notes in database:", error);
      // Keep frontend results if DB search fails
    }
  };

  const handleNoteUpdate = (updatedNote: NoteWithProject) => {
    setInternalFilteredNotes((prev: NoteWithProject[]) => prev.map((note: NoteWithProject) => 
      note.id === updatedNote.id && note.project_id === updatedNote.project_id 
        ? updatedNote 
        : note
    ));
    setNotes((prev: NoteWithProject[]) => prev.map((note: NoteWithProject) => 
      note.id === updatedNote.id && note.project_id === updatedNote.project_id 
        ? updatedNote 
        : note
    ));
  };

  const handleNoteRemove = (noteId: string, projectId: string) => {
    setInternalFilteredNotes((prev: NoteWithProject[]) => prev.filter((note: NoteWithProject) => 
      !(note.id === noteId && note.project_id === projectId)
    ));
    setNotes((prev: NoteWithProject[]) => prev.filter((note: NoteWithProject) => 
      !(note.id === noteId && note.project_id === projectId)
    ));
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(`${noteId}-${projectId}`);
      return newSet;
    });
  };

  // Range selection logic (shift+click to select range)
  const handleNoteSelection = useCallback((note: NoteWithProject, index: number, event: React.MouseEvent) => {
    const noteKey = `${note.id}-${note.project_id}`;
    
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + click: select range from last selected to current
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangesToSelect = filteredNotes.slice(start, end + 1);
      
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        rangesToSelect.forEach(rangeNote => {
          newSet.add(`${rangeNote.id}-${rangeNote.project_id}`);
        });
        return newSet;
      });
    } else {
      // Regular click: clear selection and select only this note
      setSelectedNotes(new Set([noteKey]));
      setLastSelectedIndex(index);
    }
  }, [filteredNotes, lastSelectedIndex]);

  const clearSelection = () => {
    setSelectedNotes(new Set());
    setLastSelectedIndex(null);
  };

  // Bulk operations
  const getSelectedNoteObjects = (): NoteWithProject[] => {
    return filteredNotes.filter(note => 
      selectedNotes.has(`${note.id}-${note.project_id}`)
    );
  };

  const handleBulkPin = async () => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await toggleNodePinned(note.id);
      handleNoteUpdate({ ...note, is_pinned: true });
    }
  };

  const handleBulkUnpin = async () => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await toggleNodePinned(note.id);
      handleNoteUpdate({ ...note, is_pinned: false });
    }
  };

  const handleBulkArchive = async () => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await toggleNodeArchived(note.id);
      handleNoteUpdate({ ...note, is_archived: true });
    }
  };

  const handleBulkUnarchive = async () => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await toggleNodeArchived(note.id);
      handleNoteUpdate({ ...note, is_archived: false });
    }
  };

  const handleBulkDelete = async () => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await deleteMindmapNode(note.id, note.project_id);
      handleNoteRemove(note.id, note.project_id);
    }
    clearSelection();
  };

  const handleBulkPriorityChange = async (priority: Priority) => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await updateNoteMetadata(note.id, { priority });
      handleNoteUpdate({ ...note, priority });
    }
  };

  const handleBulkWorkflowChange = async (workflowStatus: WorkflowStatus) => {
    const selectedNoteObjects = getSelectedNoteObjects();
    for (const note of selectedNoteObjects) {
      await updateNoteMetadata(note.id, { workflow_status: workflowStatus });
      handleNoteUpdate({ ...note, workflow_status: workflowStatus });
    }
  };

  if (loading && !searchOnly && !externalFilteredNotes) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Search only mode - return search component with stats below
  if (searchOnly) {
    return (
      <div className={cn("space-y-2", className)}>
        <NotesSearch onSearch={handleSearch} />
        <div className="text-xs text-muted-foreground text-right">
          {searchQuery ? (
            <>Encontradas {filteredNotes.length} nota(s) para &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>Digite para buscar entre todas as notas</>
          )}
          {selectedNotes.size > 0 && (
            <span className="ml-2 text-primary">
              • {selectedNotes.size} selecionada(s)
            </span>
          )}
        </div>
      </div>
    );
  }

  if (stickySearch) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        {/* Sticky search header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b flex-shrink-0">
          <div className="p-3 sm:p-6">
            <BulkOperationsToolbar
              selectedCount={selectedNotes.size}
              onClearSelection={clearSelection}
              onBulkPin={handleBulkPin}
              onBulkUnpin={handleBulkUnpin}
              onBulkArchive={handleBulkArchive}
              onBulkUnarchive={handleBulkUnarchive}
              onBulkDelete={handleBulkDelete}
              onBulkPriorityChange={handleBulkPriorityChange}
              onBulkWorkflowChange={handleBulkWorkflowChange}
            />
            
            <div className="mt-4 space-y-4">
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
                {selectedNotes.size > 0 && (
                  <span className="ml-2 text-primary">
                    • {selectedNotes.size} selecionada(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable notes area */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="p-3 sm:p-6">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "Nenhuma nota encontrada para esta pesquisa." : "Nenhuma nota encontrada."}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note, index) => {
                    const isSelected = selectedNotes.has(`${note.id}-${note.project_id}`);
                    const isLastNote = index === filteredNotes.length - 1;
                    
                    return (
                      <div
                        key={`${note.id}-${note.project_id}`}
                        ref={isLastNote && !searchQuery ? lastNoteElementRefCallback : undefined}
                        className={cn(
                          "relative cursor-pointer transition-all duration-150",
                          isSelected && "ring-2 ring-white ring-offset-2 rounded-lg shadow-lg"
                        )}
                        onClick={(e) => {
                          // Handle selection for all clicks
                          const target = e.target as HTMLElement;
                          const isInteractiveElement = target.closest('button, input, select, textarea, a, [role="button"], .markdown-editor, [contenteditable]');
                          
                          // Only handle selection if not clicking on interactive elements
                          if (!isInteractiveElement) {
                            handleNoteSelection(note, index, e);
                          }
                        }}
                      >
                        <EditableNoteCard
                          note={note}
                          onUpdate={handleNoteUpdate}
                          onRemove={handleNoteRemove}
                          onSelect={(event) => handleNoteSelection(note, index, event)}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Loading more indicator */}
                {notesOnly && isLoadingMore && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Carregando mais notas...</span>
                  </div>
                )}
                
                {/* End of results indicator */}
                {notesOnly && !hasMore && filteredNotes.length > 0 && !searchQuery && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Todas as notas foram carregadas
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Notes only mode - just return the notes grid with bulk operations
  if (notesOnly) {
    return (
      <div className={cn("space-y-6", className)}>
        <BulkOperationsToolbar
          selectedCount={selectedNotes.size}
          onClearSelection={clearSelection}
          onBulkPin={handleBulkPin}
          onBulkUnpin={handleBulkUnpin}
          onBulkArchive={handleBulkArchive}
          onBulkUnarchive={handleBulkUnarchive}
          onBulkDelete={handleBulkDelete}
          onBulkPriorityChange={handleBulkPriorityChange}
          onBulkWorkflowChange={handleBulkWorkflowChange}
        />

        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "Nenhuma nota encontrada para esta pesquisa." : "Nenhuma nota encontrada."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note, index) => {
                const isSelected = selectedNotes.has(`${note.id}-${note.project_id}`);
                const isLastNote = index === filteredNotes.length - 1;
                
                return (
                  <div
                    key={`${note.id}-${note.project_id}`}
                    ref={isLastNote && !searchQuery ? lastNoteElementRefCallback : undefined}
                    className={cn(
                      "relative cursor-pointer transition-all duration-150",
                      isSelected && "ring-2 ring-white ring-offset-2 rounded-lg shadow-lg"
                    )}
                    onClick={(e) => {
                      // Handle selection for all clicks
                      const target = e.target as HTMLElement;
                      const isInteractiveElement = target.closest('button, input, select, textarea, a, [role="button"], .markdown-editor, [contenteditable]');
                      
                      // Only handle selection if not clicking on interactive elements
                      if (!isInteractiveElement) {
                        handleNoteSelection(note, index, e);
                      }
                    }}
                  >
                    <EditableNoteCard
                      note={note}
                      onUpdate={handleNoteUpdate}
                      onRemove={handleNoteRemove}
                      onSelect={(event) => handleNoteSelection(note, index, event)}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Loading more indicator */}
            {isLoadingMore && !searchQuery && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Carregando mais notas...</span>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasMore && !searchQuery && filteredNotes.length > 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Todas as notas foram carregadas
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <BulkOperationsToolbar
        selectedCount={selectedNotes.size}
        onClearSelection={clearSelection}
        onBulkPin={handleBulkPin}
        onBulkUnpin={handleBulkUnpin}
        onBulkArchive={handleBulkArchive}
        onBulkUnarchive={handleBulkUnarchive}
        onBulkDelete={handleBulkDelete}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkWorkflowChange={handleBulkWorkflowChange}
      />

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
          {selectedNotes.size > 0 && (
            <span className="ml-2 text-primary">
              • {selectedNotes.size} selecionada(s)
            </span>
          )}
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Nenhuma nota encontrada para esta pesquisa." : "Nenhuma nota encontrada."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, index) => {
            const isSelected = selectedNotes.has(`${note.id}-${note.project_id}`);
            return (
              <div
                key={`${note.id}-${note.project_id}`}
                className={cn(
                  "relative cursor-pointer transition-all duration-150",
                  isSelected && "ring-2 ring-white ring-offset-2 rounded-lg shadow-lg"
                )}
                onClick={(e) => {
                  // Handle selection for all clicks
                  const target = e.target as HTMLElement;
                  const isInteractiveElement = target.closest('button, input, select, textarea, a, [role="button"], .markdown-editor, [contenteditable]');
                  
                  // Only handle selection if not clicking on interactive elements
                  if (!isInteractiveElement) {
                    handleNoteSelection(note, index, e);
                  }
                }}
              >
                <EditableNoteCard
                  note={note}
                  onUpdate={handleNoteUpdate}
                  onRemove={handleNoteRemove}
                  onSelect={(event) => handleNoteSelection(note, index, event)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 