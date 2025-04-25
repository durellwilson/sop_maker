/**
 * Type definitions for Supabase database schema
 * Used for type-safe database operations with the Supabase client
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_sops: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          tags: string[] | null
          created_by: string
          updated_by: string | null
          is_published: boolean
          version: number | null
          status: 'draft' | 'review' | 'published' | 'archived' | null
          collaborators: string[] | null
          visibility: 'private' | 'team' | 'organization' | 'public' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          created_by: string
          updated_by?: string | null
          is_published?: boolean
          version?: number | null
          status?: 'draft' | 'review' | 'published' | 'archived' | null
          collaborators?: string[] | null
          visibility?: 'private' | 'team' | 'organization' | 'public' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          created_by?: string
          updated_by?: string | null
          is_published?: boolean
          version?: number | null
          status?: 'draft' | 'review' | 'published' | 'archived' | null
          collaborators?: string[] | null
          visibility?: 'private' | 'team' | 'organization' | 'public' | null
          created_at?: string
          updated_at?: string
        }
      }
      sop_steps: {
        Row: {
          id: string
          sop_id: string
          order_index: number
          title: string
          instructions: string | null
          video_script: string | null
          created_by: string
          updated_by: string | null
          last_edited_at: string | null
          created_at: string
          updated_at: string
          role: string | null
          safety_notes: string | null
          verification: string | null
        }
        Insert: {
          id?: string
          sop_id: string
          order_index: number
          title: string
          instructions?: string | null
          video_script?: string | null
          created_by: string
          updated_by?: string | null
          last_edited_at?: string | null
          created_at?: string
          updated_at?: string
          role?: string | null
          safety_notes?: string | null
          verification?: string | null
        }
        Update: {
          id?: string
          sop_id?: string
          order_index?: number
          title?: string
          instructions?: string | null
          video_script?: string | null
          created_by?: string
          updated_by?: string | null
          last_edited_at?: string | null
          created_at?: string
          updated_at?: string
          role?: string | null
          safety_notes?: string | null
          verification?: string | null
        }
      }
      sop_media: {
        Row: {
          id: string
          step_id: string
          type: string
          url: string
          filename: string
          size_bytes: number | null
          caption: string | null
          display_mode: 'contain' | 'cover' | null
          created_by: string | null
          created_at: string
          updated_at: string | null
          file_type: string | null
          file_path: string | null
        }
        Insert: {
          id?: string
          step_id: string
          type: string
          url: string
          filename: string
          size_bytes?: number | null
          caption?: string | null
          display_mode?: 'contain' | 'cover' | null
          created_by?: string | null
          created_at?: string
          updated_at?: string | null
          file_type?: string | null
          file_path?: string | null
        }
        Update: {
          id?: string
          step_id?: string
          type?: string
          url?: string
          filename?: string
          size_bytes?: number | null
          caption?: string | null
          display_mode?: 'contain' | 'cover' | null
          created_by?: string | null
          created_at?: string
          updated_at?: string | null
          file_type?: string | null
          file_path?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 