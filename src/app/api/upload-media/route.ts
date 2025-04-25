import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/utils/firebase-admin';
import { createClient } from '@/utils/supabase/server'; // To verify SOP ownership
import { serverLogger as logger } from '@/lib/logger/server-logger';
import { handleApiError, UnauthorizedError, ForbiddenError, BadRequestError, ApiError } from '@/utils/api-error-handler';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

const SOP_MEDIA_BUCKET = 'sop-media'; // Defined in custom_instructions (implicitly)
const SIGNED_URL_EXPIRATION = 60 * 15; // 15 minutes in seconds
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB from custom_instructions
const ALLOWED_CONTENT_TYPES = [ // From custom_instructions
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'video/mp4', 
    'application/pdf'
];

/**
 * POST /api/upload-media - Generate a signed URL for uploading media to Firebase Storage.
 */
export async function POST(request: NextRequest) {
    logger.info('POST /api/upload-media - Generating signed URL');
    try {
        // --- Get User Info from Middleware --- 
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');
        const authStatus = request.headers.get('x-auth-status');

        if (authStatus !== 'authenticated' || !userId) {
            logger.warn('POST /api/upload-media: Unauthorized access attempt.');
            return handleApiError(new UnauthorizedError('User not authenticated'), request);
        }

        // --- Authorization Check (Editors/Admins can upload) --- 
        if (!['admin', 'editor'].includes(userRole || '')) {
            logger.warn(`POST /api/upload-media: Forbidden. User ${userId} (Role: ${userRole}) cannot upload media.`);
            return handleApiError(new ForbiddenError('User does not have permission to upload media'), request);
        }

        // --- Parse Request Body --- 
        let uploadRequest: { filename: string; contentType: string; sopId: string; stepId: string; };
        try {
            uploadRequest = await request.json();
            const { filename, contentType, sopId, stepId } = uploadRequest;
            if (!filename) throw new BadRequestError('Filename is required');
            if (!contentType) throw new BadRequestError('Content type is required');
            if (!sopId) throw new BadRequestError('SOP ID (sopId) is required');
            if (!stepId) throw new BadRequestError('Step ID (stepId) is required');

            // Validate content type
            if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
                throw new BadRequestError(`Invalid content type: ${contentType}. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`);
            }

        } catch (error) {
            logger.error('POST /api/upload-media: Invalid request body', error instanceof Error ? error : undefined);
            return handleApiError(error instanceof ApiError ? error : new BadRequestError('Invalid request body'), request);
        }
        
        const { filename, contentType, sopId, stepId } = uploadRequest;
        logger.debug(`POST /api/upload-media: User ${userId} requesting signed URL for ${filename} (${contentType}) for SOP ${sopId}/Step ${stepId}.`);

        // --- Verify Step/SOP Ownership via Supabase --- 
        // Ensure the user owns the SOP associated with the step they're uploading to.
        try {
            const supabase = createClient(); // JWT-authenticated client
            // Fetch the step and its parent SOP, relying on RLS
            const { data: stepData, error: stepError } = await supabase
                .from('steps')
                .select(`
                    id,
                    sop_id,
                    sops ( id, created_by )
                `)
                .eq('id', stepId)
                .eq('sop_id', sopId) // Ensure step belongs to the specified SOP
                .maybeSingle(); // Use maybeSingle as RLS might return null

            if (stepError) {
                 logger.error(`POST /api/upload-media: Supabase error verifying step ${stepId} ownership for user ${userId}`, stepError);
                 throw new ApiError('Database error verifying permissions', 500, stepError.message);
            }
            
            // If RLS prevents access, stepData will be null
            if (!stepData) { 
                logger.warn(`POST /api/upload-media: Forbidden or Not Found. User ${userId} cannot access Step ${stepId} / SOP ${sopId}.`);
                throw new ForbiddenError('Cannot upload media: Step or SOP not found or access denied.');
            }
            
             // Optional: Explicit check if needed, though RLS is primary
             /* if (stepData.sops?.created_by !== userId && userRole !== 'admin') {
                logger.warn(`POST /api/upload-media: Ownership mismatch. User ${userId} does not own SOP ${sopId}.`);
                throw new ForbiddenError('You do not own the SOP associated with this step.');
            }*/

        } catch(error) {
             if (error instanceof ApiError) throw error; // Re-throw known API errors
             logger.error(`POST /api/upload-media: Error verifying step/SOP ownership`, error);
             throw new ApiError('Failed to verify upload permissions', 500);
        }

        // --- Generate Firebase Storage Path --- 
        const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        // Example path structure: users/<user-id>/sops/<sop-id>/steps/<step-id>/<unique-filename>
        const filePath = `users/${userId}/sops/${sopId}/steps/${stepId}/${uniqueFilename}`;

        // --- Generate Firebase Storage Signed URL --- 
        const options = {
            version: 'v4' as const,
            action: 'write' as const,
            expires: Date.now() + SIGNED_URL_EXPIRATION * 1000, // Convert seconds to ms
            contentType: contentType,
            // Add size limit condition if Firebase Admin SDK supports it directly
            // extensions: { 
            //     conditions: [['content-length-range', 0, MAX_FILE_SIZE_BYTES]] 
            // } // Note: Check Firebase documentation for exact syntax
        };
        
        try {
            const storage = authAdmin.storage(); // Get default storage instance
            const bucket = storage.bucket(SOP_MEDIA_BUCKET); // Use the correct bucket name
            const file = bucket.file(filePath);

            // Generate the signed URL
            const [signedUrl] = await file.getSignedUrl(options);
            
            logger.info(`POST /api/upload-media: Generated signed URL for path: ${filePath}`);

            // Return the signed URL and the final file path to the client
            return NextResponse.json({
                signedUrl,
                filePath, // Client might need this to save the reference later
                method: 'PUT', // Standard method for signed URLs
            });

        } catch (error) {
            logger.error('POST /api/upload-media: Error generating Firebase signed URL', error);
            throw new ApiError('Failed to generate upload URL', 500);
        }

  } catch (error) {
        // Use the centralized error handler
        logger.error('POST /api/upload-media: Unhandled error', error instanceof Error ? error : undefined);
        return handleApiError(error, request);
    }
}

// Remove old implementation details
/*
// ... ensureServerBucketExists function ...
// ... serverUploadFile function ...
// ... old POST handler logic using Supabase Storage ...
*/ 