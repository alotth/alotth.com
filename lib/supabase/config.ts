import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Este cliente é usado apenas para componentes que não podem usar os helpers do Next.js
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      proposals: {
        Row: {
          id: string;
          title: string;
          content: string;
          theme_id: string;
          created_at: string;
          updated_at: string;
          share_key: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          theme_id: string;
          created_at?: string;
          updated_at?: string;
          share_key: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          theme_id?: string;
          created_at?: string;
          updated_at?: string;
          share_key?: string;
          is_active?: boolean;
        };
      };
      themes: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      mindmap_projects: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
    };
  };
};
