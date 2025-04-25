import { NextRequest, NextResponse } from 'next/server';
// import { authAdmin } from '@/utils/firebase-admin'; // Middleware handles auth
import { generateInstructions } from '@/utils/openai'; // Assuming this path
import { serverLogger as logger } from '@/lib/logger/server-logger';
import { handleApiError, UnauthorizedError, BadRequestError, ApiError } from '@/utils/api-error-handler';

// Assume generateInstructions function exists elsewhere and handles OpenAI call
// async function generateInstructions(prompt: string): Promise<string> { ... }

/**
 * POST /api/generate-instructions - Generate SOP instructions using OpenAI
 */
export async function POST(req: NextRequest) {
    logger.info('POST /api/generate-instructions - Request received');
    try {
        // --- Get User Info from Middleware --- 
        const userId = req.headers.get('x-user-id');
        const authStatus = req.headers.get('x-auth-status');

        if (authStatus !== 'authenticated' || !userId) {
            logger.warn('POST /api/generate-instructions: Unauthorized access attempt.');
            return handleApiError(new UnauthorizedError('User not authenticated'), req);
        }

        // --- TODO: Implement Rate Limiting & Access Control --- 
        // Ref: custom_instructions -> ai.features.step_suggestions
        // Check rate limit (e.g., 200/day for userId)
        // Access is 'authenticated' (already checked).
        logger.debug(`POST /api/generate-instructions: User ${userId} requesting instruction generation.`);

        // --- Parse Request Body --- 
        let prompt: string;
        try {
            const body = await req.json();
            prompt = body.prompt;
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new BadRequestError('A non-empty prompt is required');
            }
        } catch (error) {
            logger.error('POST /api/generate-instructions: Invalid request body', error instanceof Error ? error : undefined);
            return handleApiError(error instanceof ApiError ? error : new BadRequestError('Invalid request body'), req);
        }

        // --- TODO: Contextual Authorization? --- 
        // Consider if prompt generation should be tied to a specific SOP/Step ID
        // If so, accept sopId/stepId in request, fetch via createClient(), and verify ownership/RLS.
        // For now, assuming it's a general authenticated feature.

        // Check if OpenAI API key is configured (should ideally be checked at startup, but good failsafe)
        if (!process.env.OPENAI_API_KEY) {
            logger.error('POST /api/generate-instructions: OPENAI_API_KEY is not configured.');
            // Don't expose details about missing key to client
            throw new ApiError('AI service is not configured correctly', 503); // 503 Service Unavailable
        }

        // --- Generate Instructions --- 
        try {
            logger.info(`Generating instructions for user ${userId} with prompt length: ${prompt.length}`);
            // TODO: Ensure generateInstructions respects max_tokens limit from config (1000)
            const instructions = await generateInstructions(prompt);
            logger.info(`Successfully generated instructions for user ${userId}`);
            
            return NextResponse.json({ instructions });
        } catch (openaiError) {
            logger.error('Error generating instructions with OpenAI:', openaiError);
             // Check for specific OpenAI errors if needed (e.g., rate limits, content policy)
            throw new ApiError('Failed to generate instructions via AI service', 502, openaiError instanceof Error ? openaiError.message : 'AI service error'); // 502 Bad Gateway
        }

    } catch (error) {
        logger.error('POST /api/generate-instructions: Unhandled error', error instanceof Error ? error : undefined);
        return handleApiError(error, req);
    }
} 