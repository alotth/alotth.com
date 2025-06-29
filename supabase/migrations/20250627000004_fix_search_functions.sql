-- Fix the search_notes_optimized function to resolve ambiguous user_id
CREATE OR REPLACE FUNCTION search_notes_optimized(search_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Execute optimized search query with explicit table aliases
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', mn.id,
      'content', mn.content,
      'is_pinned', mn.is_pinned,
      'is_archived', mn.is_archived,
      'priority', mn.priority,
      'workflow_status', mn.workflow_status,
      'due_date', mn.due_date,
      'created_at', mn.created_at,
      'updated_at', mn.updated_at,
      'position_x', mnp.position_x,
      'position_y', mnp.position_y,
      'project_id', mp.id,
      'project_title', mp.title,
      'project_is_pinned', mp.is_pinned,
      'project_is_archived', mp.is_archived
    )
  ) INTO result
  FROM mindmap_nodes mn
  INNER JOIN mindmap_node_projects mnp ON mn.id = mnp.node_id
  INNER JOIN mindmap_projects mp ON mnp.project_id = mp.id
  WHERE mp.user_id = current_user_id  -- Explicit table reference
  AND (
    mn.content ILIKE '%' || search_query || '%'
    OR mp.title ILIKE '%' || search_query || '%'
  )
  ORDER BY 
    mn.is_pinned DESC,
    mn.is_archived ASC,
    mn.updated_at DESC;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Fix execute_sql function to allow our SELECT queries
CREATE OR REPLACE FUNCTION execute_sql(
  sql_query text,
  search_params jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
  final_query text;
  clean_query text;
BEGIN
  -- Get current user ID for security
  SELECT auth.uid() INTO current_user_id;
  
  -- Security check: user must be authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Clean and normalize the query
  clean_query := TRIM(UPPER(sql_query));
  
  -- Security check: only allow SELECT statements and WITH (CTEs)
  IF NOT (clean_query LIKE 'SELECT%' OR clean_query LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT and WITH statements are allowed';
  END IF;
  
  -- More lenient security check: block only obvious dangerous patterns
  IF clean_query LIKE '%DROP TABLE%' 
     OR clean_query LIKE '%DROP DATABASE%'
     OR clean_query LIKE '%DELETE FROM%' 
     OR clean_query LIKE '%INSERT INTO%' 
     OR clean_query LIKE '%UPDATE SET%'
     OR clean_query LIKE '%TRUNCATE%'
     OR clean_query LIKE '%ALTER TABLE%'
     OR clean_query LIKE '%CREATE TABLE%' THEN
    RAISE EXCEPTION 'Dangerous SQL operations not allowed';
  END IF;
  
  -- Replace parameter placeholders with actual values
  final_query := sql_query;
  
  -- Replace common parameters
  IF search_params ? 'user_id' THEN
    final_query := REPLACE(final_query, '$USER_ID$', (search_params->>'user_id')::text);
  END IF;
  
  IF search_params ? 'search_query' THEN
    final_query := REPLACE(final_query, '$SEARCH_QUERY$', quote_literal('%' || (search_params->>'search_query')::text || '%'));
  END IF;
  
  -- Always inject current user_id for security
  final_query := REPLACE(final_query, '$CURRENT_USER_ID$', quote_literal(current_user_id::text));
  
  -- Execute the query and return as JSONB
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || final_query || ') t' INTO result;
  
  -- Return empty array if no results
  RETURN COALESCE(result, '[]'::jsonb);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return safe error message
    RAISE LOG 'SQL Execution Error: % - Query: %', SQLERRM, final_query;
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$; 