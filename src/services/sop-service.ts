import { useApiClient } from '@/utils/api-client';
import { useCallback } from 'react';

export interface SOP {
  id: string;
  title: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface SOPStep {
  id: string;
  sop_id: string;
  title: string;
  content: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface SOPWithSteps extends SOP {
  steps: SOPStep[];
}

export interface CreateSOPInput {
  title: string;
  description?: string;
  category?: string;
  content?: string;
}

export interface UpdateSOPInput {
  title?: string;
  description?: string;
  category?: string;
}

export interface CreateStepInput {
  title: string;
  content: string;
  order?: number;
}

export interface UpdateStepInput {
  title?: string;
  content?: string;
  order?: number;
}

export interface MediaReference {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export function useSOPService() {
  const api = useApiClient();

  const createSOP = useCallback(
    async (data: CreateSOPInput): Promise<SOP> => {
      return api.post<SOP>('/api/sops', data);
    },
    [api]
  );

  const updateSOP = useCallback(
    async (id: string, data: UpdateSOPInput): Promise<SOP> => {
      return api.put<SOP>(`/api/sops/${id}`, data);
    },
    [api]
  );

  const deleteSOP = useCallback(
    async (id: string): Promise<{ success: boolean }> => {
      return api.delete<{ success: boolean }>(`/api/sops/${id}`);
    },
    [api]
  );

  const fetchSOPs = useCallback(
    async (category?: string): Promise<SOP[]> => {
      const url = category 
        ? `/api/sops?category=${encodeURIComponent(category)}` 
        : '/api/sops';
      return api.get<SOP[]>(url);
    },
    [api]
  );

  const fetchSOPDetails = useCallback(
    async (id: string): Promise<SOPWithSteps> => {
      return api.get<SOPWithSteps>(`/api/sops/${id}`);
    },
    [api]
  );

  const addStep = useCallback(
    async (sopId: string, data: CreateStepInput): Promise<SOPStep> => {
      return api.post<SOPStep>(`/api/sops/${sopId}/steps`, data);
    },
    [api]
  );

  const updateStep = useCallback(
    async (sopId: string, stepId: string, data: UpdateStepInput): Promise<SOPStep> => {
      return api.put<SOPStep>(`/api/sops/${sopId}/steps/${stepId}`, data);
    },
    [api]
  );

  const deleteStep = useCallback(
    async (sopId: string, stepId: string): Promise<{ success: boolean }> => {
      return api.delete<{ success: boolean }>(`/api/sops/${sopId}/steps/${stepId}`);
    },
    [api]
  );

  const uploadMedia = useCallback(
    async (file: File): Promise<MediaReference> => {
      return api.uploadFile<MediaReference>('/api/media/upload', file);
    },
    [api]
  );

  return {
    createSOP,
    updateSOP,
    deleteSOP,
    fetchSOPs,
    fetchSOPDetails,
    addStep,
    updateStep,
    deleteStep,
    uploadMedia,
  };
} 