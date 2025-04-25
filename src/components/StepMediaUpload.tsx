import React, { useState } from 'react';
import MediaUploadComponent from './MediaUploadComponent';
import { toast } from 'sonner';
import { Media } from '@/types/database.types';

interface StepMediaUploadProps {
  stepId: string;
  sopId: string;
  onMediaUploaded: (newMedia: Media) => void;
  onUploadMedia: (stepId: string, file: File) => Promise<Media>;
  className?: string;
}

export default function StepMediaUpload({
  stepId,
  sopId,
  onMediaUploaded,
  onUploadMedia,
  className = ''
}: StepMediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadMedia = async (stepId: string, file: File) => {
    if (isUploading) {
      return null;
    }

    setIsUploading(true);
    toast.info(`Uploading ${file.name}...`);

    try {
      const newMedia = await onUploadMedia(stepId, file);
      
      if (newMedia) {
        toast.success('Media uploaded successfully');
        onMediaUploaded(newMedia);
        return newMedia;
      } else {
        throw new Error('No media returned from upload');
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload media');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={className}>
      <MediaUploadComponent
        stepId={stepId}
        sopId={sopId}
        onUploadMedia={handleUploadMedia}
        maxSizeMB={10}
        acceptedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf']}
        uploadLabel="Add Media to Step"
        className="w-full"
      />
      <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        Add photos or videos to clarify this step
      </p>
    </div>
  );
} 