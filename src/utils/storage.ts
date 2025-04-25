import { MediaType } from '../types/database.types';
import supabase from './supabase';

/**
 * Helper function to convert a file to a buffer
 * This works with both client and server-side file objects
 */
export const fileToBuffer = async (file: Blob | File): Promise<ArrayBuffer> => {
  // Try the arrayBuffer method first (modern browsers)
  if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
    try {
      return await file.arrayBuffer();
    } catch (error) {
      console.error('Error converting file with arrayBuffer method:', error);
    }
  }
  
  // Fallback to FileReader (older browsers)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return an ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Check if a bucket exists and create it if it doesn't
 */
const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    // Check if the bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking buckets:', error);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} created successfully`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    return false;
  }
};

/**
 * Upload media file to Supabase Storage
 * Note: This function is no longer used directly for uploads 
 * as all file uploads are now handled server-side.
 * It's kept for reference and potential local development use.
 */
export const uploadMedia = async (
  file: File,
  type: MediaType,
  sopId: string,
  stepId: string
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  console.log('Client-side upload not recommended; use server-side upload route instead');
  throw new Error('Direct client uploads disabled - please use the API endpoint');
};

// Export storage utilities for reference
const storageUtils = {
  uploadMedia,
  fileToBuffer
};

export default storageUtils; 