import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Cleans up orphaned nodes (nodes not associated with any project)
 * @returns Array of deleted node information
 */
export async function cleanupOrphanedNodes() {
  const { data, error } = await supabase
    .rpc('cleanup_orphaned_nodes');
  
  if (error) {
    console.error('Error cleaning up orphaned nodes:', error);
    throw error;
  }

  return data;
}
