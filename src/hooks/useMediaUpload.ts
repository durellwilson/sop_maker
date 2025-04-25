import { useState } from 'react';
import { toast } from 'react-hot-toast';

// Types for media items
export interface MediaItem {
  id: string;
  step_id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  caption?: string;
  display_mode?: 'contain' | 'cover';
  created_at: string;
  created_by: string;
}

interface UseMediaUploadProps {
  stepId: string;
  sopId: string;
  onSuccess?: (media: MediaItem) => void;
}

interface UseMediaUploadReturn {
  uploadMedia: (file: File) => Promise<MediaItem | null>;
  updateMedia: (mediaId: string, updates: { caption?: string; display_mode?: 'contain' | 'cover' }) => Promise<MediaItem | null>;
  deleteMedia: (mediaId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing media uploads, updates, and deletions
 */
export default function useMediaUpload({
  stepId,
  sopId,
  onSuccess
}: UseMediaUploadProps): UseMediaUploadReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a media file to the server
   */
  const uploadMedia = async (file: File): Promise<MediaItem | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('step_id', stepId);
      formData.append('sop_id', sopId);
      
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload media');
      }
      
      if (onSuccess && data.media) {
        onSuccess(data.media);
      }
      
      toast.success('Media uploaded successfully');
      return data.media;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Upload failed: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update media metadata (caption or display mode)
   */
  const updateMedia = async (
    mediaId: string, 
    updates: { caption?: string; display_mode?: 'contain' | 'cover' }
  ): Promise<MediaItem | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/media?id=${mediaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update media');
      }
      
      toast.success('Media updated successfully');
      return data.media;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Update failed: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete media from the server
   */
  const deleteMedia = async (mediaId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/media?id=${mediaId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete media');
      }
      
      toast.success('Media deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Delete failed: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadMedia,
    updateMedia,
    deleteMedia,
    loading,
    error,
  };
} 