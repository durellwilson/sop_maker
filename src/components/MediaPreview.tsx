import React from 'react';
import Image from 'next/image';

interface Media {
  id: string;
  step_id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  caption?: string;
  created_at?: string;
  updated_at?: string;
  display_mode?: 'contain' | 'cover';
}

interface MediaPreviewProps {
  media: Media;
  className?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ media, className = '' }) => {
  // Handle different media types
  if (media.type === 'image') {
    return (
      <div className={`relative w-full h-48 overflow-hidden ${className}`}>
        <Image
          src={media.url}
          alt={media.caption || 'Step image'}
          fill={true}
          style={{ objectFit: media.display_mode === 'cover' ? 'cover' : 'contain' }}
          className="rounded-t-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder-image.jpg';
            console.error('Error loading image:', media.url);
          }}
        />
      </div>
    );
  }
  
  if (media.type === 'video') {
    return (
      <div className={`w-full ${className}`}>
        <video 
          src={media.url} 
          controls 
          className="w-full h-auto max-h-48 rounded-t-lg"
          onError={(e) => {
            console.error('Error loading video:', media.url);
            const target = e.target as HTMLVideoElement;
            target.outerHTML = `<div class="flex items-center justify-center h-40 bg-rose-50 dark:bg-rose-900/30 rounded-t-lg text-rose-500">
              <span>Error loading video</span>
            </div>`;
          }}
        />
      </div>
    );
  }
  
  if (media.type === 'document') {
    return (
      <div className={`flex items-center justify-center h-32 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-t-lg ${className}`}>
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-blue-500 dark:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-blue-600 dark:text-blue-300 font-medium">
            Document
          </span>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            {media.caption || 'Click to view document'}
          </p>
        </div>
      </div>
    );
  }
  
  // Fallback for unknown media types
  return (
    <div className={`flex items-center justify-center h-40 bg-slate-100 dark:bg-slate-800 rounded-t-lg ${className}`}>
      <div className="text-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Unknown media type
        </span>
      </div>
    </div>
  );
};

export default MediaPreview; 