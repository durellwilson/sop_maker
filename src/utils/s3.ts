import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { MediaType } from '../types/database.types';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload media file to S3 bucket
 * @param file - File to upload
 * @param type - Media type (photo/video)
 * @param sopId - SOP ID
 * @param stepId - Step ID
 * @returns URL of the uploaded file
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

  if (!process.env.AWS_S3_BUCKET) {
    throw new Error('S3 bucket not configured');
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `${sopId}/${stepId}/${type}_${Date.now()}.${fileExtension}`;
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file,
      ContentType: file.type,
    },
  });

  try {
    const result = await upload.done();
    return result.Location;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

export default s3Client; 