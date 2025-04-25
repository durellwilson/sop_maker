import React, { useCallback, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface DropZoneProps {
  onUpload: (file: File) => void;
  accept?: string;
  label?: string;
  sublabel?: string;
  className?: string;
  maxSizeMB?: number;
}

const DropZone: React.FC<DropZoneProps> = ({
  onUpload,
  accept = 'image/*',
  label = 'Drop files here',
  sublabel = 'or click to browse',
  className = '',
  maxSizeMB = 10
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert maxSizeMB to bytes
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);
  
  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }
    
    // Check file type (if accept is provided)
    if (accept && accept !== '*') {
      const fileType = file.type;
      const acceptTypes = accept.split(',').map(type => type.trim());
      
      // Check if file type matches any accepted type
      const isAccepted = acceptTypes.some(type => {
        if (type === '*') return true;
        if (type.endsWith('/*')) {
          // Handle wildcard types like image/*
          const category = type.split('/')[0];
          return fileType.startsWith(`${category}/`);
        }
        return fileType === type;
      });
      
      if (!isAccepted) {
        setError(`File type not accepted. Please upload ${accept.replace(/,/g, ' or ')}`);
        return false;
      }
    }
    
    setError(null);
    return true;
  };
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onUpload(file);
      }
    }
  }, [onUpload]);
  
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onUpload(file);
      }
    }
  }, [onUpload]);
  
  return (
    <div className="relative">
      <input
        type="file"
        id="dropzone-file"
        className="hidden"
        accept={accept}
        onChange={handleFileInputChange}
      />
      
      <label
        htmlFor="dropzone-file"
        className={twMerge(
          "flex flex-col items-center justify-center w-full cursor-pointer transition-colors duration-200 ease-in-out",
          isDragging ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700" : "",
          error ? "bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700" : "",
          className
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg 
            className={`w-8 h-8 mb-3 ${error ? 'text-rose-500 dark:text-rose-400' : 'text-indigo-500 dark:text-indigo-400'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {error ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            )}
          </svg>
          
          <p className={`mb-1 text-sm font-medium ${error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {error || label}
          </p>
          
          {!error && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sublabel}
            </p>
          )}
          
          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">
              Please try again with a valid file
            </p>
          )}
        </div>
      </label>
    </div>
  );
};

export default DropZone; 