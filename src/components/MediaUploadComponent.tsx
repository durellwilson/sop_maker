import React, { useState, useCallback } from 'react';
import { MediaType } from '@/types/database.types';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiImage, FiFilm, FiFile, FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';

export type MediaUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface MediaUploadComponentProps {
  stepId: string;
  sopId: string;
  onUploadMedia: (stepId: string, file: File) => Promise<any>;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
  className?: string;
  uploadLabel?: string;
}

export default function MediaUploadComponent({
  stepId,
  sopId,
  onUploadMedia,
  maxSizeMB = 10,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
  className = '',
  uploadLabel = 'Upload Image/Video'
}: MediaUploadComponentProps) {
  const [uploadStatus, setUploadStatus] = useState<MediaUploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Maximum file size in bytes
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Reset previous state
    setUploadStatus('idle');
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadProgress(0);
    
    if (!acceptedFiles.length) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file size
    if (file.size > maxSizeBytes) {
      setUploadError(`File is too large (max ${maxSizeMB}MB)`);
      setUploadStatus('error');
      return;
    }
    
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type}`);
      setUploadStatus('error');
      return;
    }
    
    // Set file for UI
    setUploadedFile(file);
    
    // Create preview if it's an image or video
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
    
    // Start upload
    setUploadStatus('uploading');
    
    try {
      // Simulated progress updates (real progress would come from upload API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + (100 - prev) * 0.2;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 300);
      
      // Call the provided upload function
      await onUploadMedia(stepId, file);
      
      // Clear interval and set final progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Clean up preview after 3 seconds of success state
      setTimeout(() => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setUploadStatus('idle');
        setUploadedFile(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
      setUploadStatus('error');
    }
  }, [maxSizeBytes, acceptedFileTypes, onUploadMedia, stepId, previewUrl, maxSizeMB]);
  
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSizeBytes,
    multiple: false,
    noClick: uploadStatus === 'uploading',
    noKeyboard: uploadStatus === 'uploading'
  });
  
  const renderFileTypeIcon = (file: File | null) => {
    if (!file) return <FiUpload className="text-gray-400" size={24} />;
    
    if (file.type.startsWith('image/')) {
      return <FiImage className="text-blue-500" size={24} />;
    } else if (file.type.startsWith('video/')) {
      return <FiFilm className="text-purple-500" size={24} />;
    } else {
      return <FiFile className="text-gray-500" size={24} />;
    }
  };
  
  const renderStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <FiLoader className="text-blue-500 animate-spin" size={20} />;
      case 'success':
        return <FiCheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <FiAlertCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
        } ${uploadStatus === 'error' ? 'border-red-300 bg-red-50' : ''} ${
          uploadStatus === 'success' ? 'border-green-300 bg-green-50' : ''
        } ${uploadStatus === 'uploading' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} disabled={uploadStatus === 'uploading'} />
        
        {/* Upload progress bar */}
        {uploadStatus === 'uploading' && (
          <div className="absolute top-0 left-0 h-1 bg-blue-100 w-full">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center py-2">
          {/* Preview Section */}
          {previewUrl && (
            <div className="mb-3 relative">
              {uploadedFile?.type.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-32 max-w-full rounded object-contain"
                />
              ) : uploadedFile?.type.startsWith('video/') ? (
                <video 
                  src={previewUrl} 
                  className="max-h-32 max-w-full rounded"
                  controls={false}
                />
              ) : null}
              
              {/* Preview cancel button */}
              {uploadStatus !== 'uploading' && (
                <button 
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-sm hover:bg-red-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setUploadedFile(null);
                  }}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          )}
          
          {/* Default upload UI */}
          {!previewUrl && (
            <>
              <div className="mb-2">
                {renderFileTypeIcon(uploadedFile)}
              </div>
              
              <p className="text-sm font-medium text-gray-700">{uploadLabel}</p>
              
              <p className="mt-1 text-xs text-gray-500">
                {isDragActive ? (
                  "Drop the file here..."
                ) : (
                  <>
                    Drag & drop or <span className="text-blue-500">browse</span>
                  </>
                )}
              </p>
              
              <p className="mt-1 text-xs text-gray-400">
                Max {maxSizeMB}MB • {acceptedFileTypes.map(type => type.split('/')[1]).join(', ')}
              </p>
            </>
          )}
          
          {/* Status message */}
          {uploadStatus !== 'idle' && (
            <div className={`flex items-center mt-2 text-sm ${
              uploadStatus === 'error' ? 'text-red-500' : 
              uploadStatus === 'success' ? 'text-green-500' : 
              'text-blue-500'
            }`}>
              {renderStatusIcon()}
              <span className="ml-2">
                {uploadStatus === 'uploading' && 'Uploading...'}
                {uploadStatus === 'success' && 'Upload successful!'}
                {uploadStatus === 'error' && (uploadError || 'Upload failed')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 