export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'editor' | 'viewer';
  profile_image?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface SOP {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  created_by: string;
  updated_by?: string;
  is_published: boolean;
  version: number;
  status?: 'draft' | 'review' | 'published' | 'archived';
  approvals?: Approval[];
  collaborators?: string[];
  visibility?: 'private' | 'team' | 'organization' | 'public';
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  sop_id: string;
  name: string;
  description?: string;
  instructions: string;
  order_index: number;
  safety_notes?: string;
  verification?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface StepMedia {
  id: string;
  step_id: string;
  file_path: string;
  file_type: string;
  display_name?: string | null;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Media {
  id: string;
  step_id: string;
  type: MediaType;
  url: string;
  filename: string;
  size_bytes?: number;
  caption?: string;
  display_mode?: 'contain' | 'cover';
  created_by?: string;
  created_at: string;
  updated_at?: string;
  file_type?: string;
  file_path?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface Approval {
  id: string;
  sop_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: 'sop' | 'step' | 'media' | 'user';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'review' | 'approve';
  user_id: string;
  changes?: Record<string, any>;
  previous_state?: Record<string, any>;
  current_state?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export type MediaType = 'image' | 'video' | 'document';

export interface Database {
  users: User[];
  sops: SOP[];
  steps: Step[];
  media: Media[];
  tags: Tag[];
  approvals: Approval[];
  audit_logs: AuditLog[];
} 