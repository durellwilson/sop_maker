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
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sops: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          created_by: string
          is_published: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string | null
          created_by: string
          is_published?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string | null
          created_by?: string
          is_published?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sops_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      steps: {
        Row: {
          id: string
          sop_id: string
          order_index: number
          title: string
          instructions: string | null
          video_script: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sop_id: string
          order_index: number
          title: string
          instructions?: string | null
          video_script?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sop_id?: string
          order_index?: number
          title?: string
          instructions?: string | null
          video_script?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_sop_id_fkey"
            columns: ["sop_id"]
            referencedRelation: "sops"
            referencedColumns: ["id"]
          }
        ]
      }
      media: {
        Row: {
          id: string
          step_id: string
          type: string
          url: string
          filename: string
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          step_id: string
          type: string
          url: string
          filename: string
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          step_id?: string
          type?: string
          url?: string
          filename?: string
          size_bytes?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_step_id_fkey"
            columns: ["step_id"]
            referencedRelation: "steps"
            referencedColumns: ["id"]
          }
        ]
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