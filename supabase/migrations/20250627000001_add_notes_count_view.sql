-- Create optimized view for counting notes by user
CREATE OR REPLACE VIEW user_notes_count AS
SELECT 
  mp.user_id,
  COUNT(DISTINCT mn.id) as total_notes
FROM mindmap_projects mp
INNER JOIN mindmap_node_projects mnp ON mp.id = mnp.project_id
INNER JOIN mindmap_nodes mn ON mnp.node_id = mn.id
GROUP BY mp.user_id;

-- Grant access to authenticated users
GRANT SELECT ON user_notes_count TO authenticated;

-- Create function to count notes with optional search
CREATE OR REPLACE FUNCTION count_user_notes(
  user_id_param UUID,
  search_query TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  note_count INTEGER;
BEGIN
  IF search_query IS NULL OR search_query = '' THEN
    -- Count all notes for user
    SELECT total_notes INTO note_count
    FROM user_notes_count
    WHERE user_id = user_id_param;
    
    RETURN COALESCE(note_count, 0);
  ELSE
    -- Count notes matching search query
    SELECT COUNT(DISTINCT mn.id) INTO note_count
    FROM mindmap_projects mp
    INNER JOIN mindmap_node_projects mnp ON mp.id = mnp.project_id
    INNER JOIN mindmap_nodes mn ON mnp.node_id = mn.id
    WHERE mp.user_id = user_id_param
    AND (
      mn.content ILIKE '%' || search_query || '%' 
      OR mp.title ILIKE '%' || search_query || '%'
    );
    
    RETURN COALESCE(note_count, 0);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_user_notes(UUID, TEXT) TO authenticated; 