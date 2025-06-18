-- Function to cleanup orphaned nodes
create or replace function cleanup_orphaned_nodes()
returns table (
  deleted_node_id uuid,
  deleted_node_content text
) as $$
begin
  return query
  with deleted_nodes as (
    delete from mindmap_nodes mn
    where not exists (
      select 1 
      from mindmap_node_projects mnp 
      where mnp.node_id = mn.id
    )
    returning id, content
  )
  select 
    deleted_nodes.id as deleted_node_id,
    deleted_nodes.content as deleted_node_content
  from deleted_nodes;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function cleanup_orphaned_nodes() to authenticated;

-- Add a comment explaining the function
comment on function cleanup_orphaned_nodes() is 'Removes nodes that are not associated with any project and returns their IDs and content'; 