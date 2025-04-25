import { SOP, Step as DbStep, Media } from './database.types';

/**
 * Extends the base SOP type with an id field and makes some fields optional
 * to handle differences between Firebase and Supabase implementations
 */
export interface SopWithId extends Omit<SOP, 'id'> {
  id: string;
  title: string;
  description: string;
  updated_at: string;
  created_at: string;
  created_by: string;
  user_id?: string; // For Supabase compatibility
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  version?: string | number;
  content?: string;
  stakeholders?: string;
  definitions?: string;
  revision_date?: string;
  is_published?: boolean;
}

/**
 * Step type with a flexible structure to handle both Firebase and Supabase implementations
 */
export interface Step {
  id: string;
  sop_id?: string;
  order_index: number;
  title?: string;
  instruction?: string;
  instructions?: string; // For Supabase compatibility
  instruction_text?: string; // For Supabase compatibility
  notes?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'deleted';
  media?: Media[];
}

// Re-export Media type from database.types
export { Media } from './database.types'; 