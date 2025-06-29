import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NoteWithProject } from '@/types/mindmap';
import { Database } from '@/types/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Option 1: Try optimized search function first
    const { data: optimizedData, error: optimizedError } = await supabase
      // @ts-ignore - Function will be available after running the migration
      .rpc('search_notes_optimized', {
        search_query: query
      });

    if (!optimizedError && optimizedData) {
      const notes: NoteWithProject[] = optimizedData.map((row: any) => ({
        id: row.id,
        content: row.content,
        position: { 
          x: row.position_x, 
          y: row.position_y 
        },
        style: {},
        project_id: row.project_id,
        project_title: row.project_title,
        project_is_archived: row.project_is_archived,
        project_is_pinned: row.project_is_pinned,
        is_pinned: row.is_pinned || false,
        is_archived: row.is_archived || false,
        priority: row.priority || null,
        workflow_status: row.workflow_status || null,
        due_date: row.due_date || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return NextResponse.json(notes);
    }

    // Option 2: Try generic SQL execution function
    const customSQL = `
      SELECT DISTINCT
        mn.id,
        mn.content,
        mn.is_pinned,
        mn.is_archived,
        mn.priority,
        mn.workflow_status,
        mn.due_date,
        mn.created_at,
        mn.updated_at,
        mnp.position_x,
        mnp.position_y,
        mp.id as project_id,
        mp.title as project_title,
        mp.is_pinned as project_is_pinned,
        mp.is_archived as project_is_archived
      FROM mindmap_nodes mn
      INNER JOIN mindmap_node_projects mnp ON mn.id = mnp.node_id
      INNER JOIN mindmap_projects mp ON mnp.project_id = mp.id
      WHERE mp.user_id = $CURRENT_USER_ID$::uuid
      AND (
        mn.content ILIKE $SEARCH_QUERY$
        OR mp.title ILIKE $SEARCH_QUERY$
      )
      ORDER BY 
        mn.is_pinned DESC,
        mn.is_archived ASC,
        mn.updated_at DESC
    `;

    const { data: sqlData, error: sqlError } = await supabase
      // @ts-ignore - Function will be available after running the migration
      .rpc('execute_sql', {
        sql_query: customSQL,
        search_params: {
          search_query: query
        }
      });

    if (!sqlError && sqlData) {
      const notes: NoteWithProject[] = sqlData.map((row: any) => ({
        id: row.id,
        content: row.content,
        position: { 
          x: row.position_x, 
          y: row.position_y 
        },
        style: {},
        project_id: row.project_id,
        project_title: row.project_title,
        project_is_archived: row.project_is_archived,
        project_is_pinned: row.project_is_pinned,
        is_pinned: row.is_pinned || false,
        is_archived: row.is_archived || false,
        priority: row.priority || null,
        workflow_status: row.workflow_status || null,
        due_date: row.due_date || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return NextResponse.json(notes);
    }

    // Option 3: Fallback to PostgREST if RPC functions don't exist yet
    console.log('RPC functions not found, using PostgREST fallback');
    console.log('Optimized error:', optimizedError?.message);
    console.log('SQL error:', sqlError?.message);
    
    // Use two separate queries and merge results for PostgREST fallback
    const [contentResults, titleResults] = await Promise.all([
      // Search in note content
      supabase
        .from("mindmap_nodes")
        .select(`
          id,
          content,
          is_pinned,
          is_archived,
          priority,
          workflow_status,
          due_date,
          created_at,
          updated_at,
          mindmap_node_projects!inner (
            project_id,
            position_x,
            position_y,
            mindmap_projects!inner (
              id,
              title,
              is_pinned,
              is_archived,
              user_id
            )
          )
        `)
        .eq("mindmap_node_projects.mindmap_projects.user_id", session.user.id)
        .ilike('content', `%${query}%`)
        .order('updated_at', { ascending: false }),
      
      // Search in project titles
      supabase
        .from("mindmap_nodes")
        .select(`
          id,
          content,
          is_pinned,
          is_archived,
          priority,
          workflow_status,
          due_date,
          created_at,
          updated_at,
          mindmap_node_projects!inner (
            project_id,
            position_x,
            position_y,
            mindmap_projects!inner (
              id,
              title,
              is_pinned,
              is_archived,
              user_id
            )
          )
        `)
        .eq("mindmap_node_projects.mindmap_projects.user_id", session.user.id)
        .ilike('mindmap_node_projects.mindmap_projects.title', `%${query}%`)
        .order('updated_at', { ascending: false })
    ]);

    // Check for errors
    if (contentResults.error && titleResults.error) {
      console.error('Search errors:', { content: contentResults.error, title: titleResults.error });
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Merge and deduplicate results
    const allData = [
      ...(contentResults.data || []),
      ...(titleResults.data || [])
    ];

    // Transform the data to match the expected format and deduplicate
    const notes: NoteWithProject[] = [];
    const seenNotes = new Set<string>();
    
    if (allData.length > 0) {
      for (const node of allData as any[]) {
        for (const nodeProject of node.mindmap_node_projects) {
          const project = nodeProject.mindmap_projects;
          const noteKey = `${node.id}-${project.id}`;
          
          // Skip duplicates
          if (seenNotes.has(noteKey)) continue;
          seenNotes.add(noteKey);
          
          const note: NoteWithProject = {
            id: node.id,
            content: node.content,
            position: { 
              x: nodeProject.position_x, 
              y: nodeProject.position_y 
            },
            style: {},
            project_id: project.id,
            project_title: project.title,
            project_is_archived: project.is_archived,
            project_is_pinned: project.is_pinned,
            is_pinned: node.is_pinned || false,
            is_archived: node.is_archived || false,
            priority: node.priority || null,
            workflow_status: node.workflow_status || null,
            due_date: node.due_date || null,
            created_at: node.created_at,
            updated_at: node.updated_at,
          };
          
          notes.push(note);
        }
      }
    }

    // Sort results by relevance (pinned first, then by date)
    notes.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
      return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 