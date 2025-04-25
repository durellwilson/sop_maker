import { Step, Media } from './database.types';

/**
 * Interface for a shared SOP that can be accessed via URL
 */
export interface SharedSOP {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  stakeholders?: string;
  definitions?: string;
  steps: SharedStep[];
}

/**
 * Interface for a step in a shared SOP
 */
export interface SharedStep {
  id: string;
  title: string;
  description: string;
  order: number;
  role?: string;
  safety_notes?: string;
  verification?: string;
  media: SharedMedia[];
}

/**
 * Interface for media in a shared SOP
 */
export interface SharedMedia {
  id: string;
  file_path: string;
  file_type: string;
  alt_text?: string;
  caption?: string;
}

/**
 * Interface for the response when sharing an SOP
 */
export interface ShareSOPResponse {
  id: string;
  link: string;
} 