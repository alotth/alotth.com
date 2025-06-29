-- Create a generic SQL execution function (with security controls)
CREATE OR REPLACE FUNCTION execute_sql(
  sql_query text,
  search_params jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
  result jsonb;
  user_id uuid;
  final_query text;
BEGIN
  -- Get current user ID for security
  SELECT auth.uid() INTO user_id;
  
  -- Security check: user must be authenticated
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Security check: only allow SELECT statements
  IF NOT (UPPER(TRIM(sql_query)) LIKE 'SELECT%' OR UPPER(TRIM(sql_query)) LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT and WITH statements are allowed';
  END IF;
  
  -- Security check: prevent dangerous operations
  IF UPPER(sql_query) LIKE '%DROP%' 
     OR UPPER(sql_query) LIKE '%DELETE%' 
     OR UPPER(sql_query) LIKE '%INSERT%' 
     OR UPPER(sql_query) LIKE '%UPDATE%' 
     OR UPPER(sql_query) LIKE '%TRUNCATE%'
     OR UPPER(sql_query) LIKE '%ALTER%' THEN
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
  final_query := REPLACE(final_query, '$CURRENT_USER_ID$', quote_literal(user_id::text));
  
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;

-- Also create specific search function for better performance
CREATE OR REPLACE FUNCTION search_notes_optimized(search_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO user_id;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Execute optimized search query
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
  WHERE mp.user_id = user_id
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_notes_optimized TO authenticated; 