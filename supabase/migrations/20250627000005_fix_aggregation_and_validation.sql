-- Fix search_notes_optimized to not use jsonb_agg incorrectly
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
  
  -- Execute optimized search query - return array of objects directly
  WITH search_results AS (
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
    WHERE mp.user_id = current_user_id
    AND (
      mn.content ILIKE '%' || search_query || '%'
      OR mp.title ILIKE '%' || search_query || '%'
    )
    ORDER BY 
      mn.is_pinned DESC,
      mn.is_archived ASC,
      mn.updated_at DESC
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sr.id,
      'content', sr.content,
      'is_pinned', sr.is_pinned,
      'is_archived', sr.is_archived,
      'priority', sr.priority,
      'workflow_status', sr.workflow_status,
      'due_date', sr.due_date,
      'created_at', sr.created_at,
      'updated_at', sr.updated_at,
      'position_x', sr.position_x,
      'position_y', sr.position_y,
      'project_id', sr.project_id,
      'project_title', sr.project_title,
      'project_is_pinned', sr.project_is_pinned,
      'project_is_archived', sr.project_is_archived
    )
  ) INTO result
  FROM search_results sr;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Fix execute_sql function validation to be less strict
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
  normalized_query text;
BEGIN
  -- Get current user ID for security
  SELECT auth.uid() INTO current_user_id;
  
  -- Security check: user must be authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Clean and normalize the query - be more flexible
  clean_query := TRIM(sql_query);
  normalized_query := UPPER(LTRIM(clean_query));
  
  -- Security check: allow SELECT and WITH statements
  IF NOT (normalized_query LIKE 'SELECT%' OR normalized_query LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT and WITH statements are allowed. Got: %', SUBSTRING(normalized_query FROM 1 FOR 50);
  END IF;
  
  -- Security check: block dangerous operations (be more specific)
  IF normalized_query ~ '(DROP\s+(TABLE|DATABASE|INDEX|VIEW))|(DELETE\s+FROM)|(INSERT\s+INTO)|(UPDATE\s+.+\s+SET)|(TRUNCATE\s+TABLE)|(ALTER\s+TABLE)|(CREATE\s+TABLE)' THEN
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
    RAISE LOG 'SQL Execution Error: % - Query: % - Final Query: %', SQLERRM, sql_query, final_query;
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_notes_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated; 