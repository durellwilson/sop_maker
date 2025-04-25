import { NextRequest, NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';
import { createClient } from '@/utils/supabase/server';
import { serverLogger as logger } from '@/lib/logger/server-logger';
import { handleApiError, UnauthorizedError, BadRequestError, NotFoundError, ApiError } from '@/utils/api-error-handler';

/**
 * POST /api/generate-video-script - Generate video script using OpenAI, respecting RLS and auth.
 */
export async function POST(req: NextRequest) {
  logger.info('POST /api/generate-video-script - Request received');
  try {
    // --- Get User Info from Middleware --- 
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role'); 
    const authStatus = req.headers.get('x-auth-status');

    if (authStatus !== 'authenticated' || !userId) {
      logger.warn('POST /api/generate-video-script: Unauthorized access attempt.');
      return handleApiError(new UnauthorizedError('User not authenticated'), req);
    }

    // --- TODO: Implement Rate Limiting & Access Control --- 
    // Ref: custom_instructions -> ai.features.sop_generation
    // Check if user (userId) has exceeded rate limit (e.g., 50/day)
    // Store usage counts (e.g., in Supabase table or Redis)
    // If rate limited, return appropriate error (e.g., 429 Too Many Requests)
    // Access is 'authenticated', which is already checked above.
    logger.debug(`POST /api/generate-video-script: User ${userId} requesting script generation.`);

    // --- Parse Request Body --- 
    let sopId: string;
    try {
        const body = await req.json();
        sopId = body.sopId;
        if (!sopId) {
            throw new BadRequestError('SOP ID (sopId) is required');
        }
    } catch (error) {
        logger.error('POST /api/generate-video-script: Invalid request body', error instanceof Error ? error : undefined);
        return handleApiError(error instanceof ApiError ? error : new BadRequestError('Invalid request body'), req);
    }
    
    // --- Create JWT-Authenticated Supabase Client --- 
    const supabase = createClient();

    // --- Fetch SOP and Steps (RLS Applied) --- 
    // Fetch SOP first to ensure access before fetching potentially many steps
    const { data: sop, error: sopError } = await supabase
        .from('sops')
        .select('id, title, description') // Select only needed fields
        .eq('id', sopId)
        // RLS ensures user can access this SOP
        .single(); // Expect exactly one SOP

    if (sopError || !sop) {
        logger.warn(`POST /api/generate-video-script: SOP ${sopId} not found or access denied for user ${userId}.`, sopError);
        // If RLS caused this, it's NotFound/Forbidden from user perspective
        throw new NotFoundError('SOP not found or access denied.');
    }

    const { data: steps, error: stepsError } = await supabase
        .from('steps')
        .select('title, instructions') // Select fields relevant for script generation
        .eq('sop_id', sopId)
        // RLS ensures user can access these steps
        .order('order_index', { ascending: true }); // Use correct column name

    if (stepsError) {
        logger.error(`POST /api/generate-video-script: Supabase error fetching steps for SOP ${sopId}`, stepsError);
        throw new ApiError('Failed to fetch steps for script generation', 500, stepsError.message);
    }

    // --- Generate Video Script --- 
    // Ensure steps is not null before passing
    const scriptSteps = steps || []; 
    const videoScript = await generateVideoScript(sop.description || sop.title, scriptSteps);
    
    // TODO: Consider max_tokens limit from config when calling OpenAI
    
    logger.info(`POST /api/generate-video-script: Script generated successfully for SOP ${sopId}`);
    return NextResponse.json({ videoScript });

  } catch (error) {
    logger.error('POST /api/generate-video-script: Unhandled error', error instanceof Error ? error : undefined);
    return handleApiError(error, req);
  }
}

async function generateVideoScript(title: string, steps: any[]): Promise<string> {
    // Placeholder implementation - Replace with actual OpenAI call
    logger.info(`Generating video script for title: ${title} with ${steps.length} steps...`);
    // const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    // const openai = new OpenAIApi(configuration);
    // ... construct prompt from title and steps ...
    // ... make OpenAI API call, respecting token limits ...
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    return `Generated script based on: ${title}\n${steps.map((s, i) => `${i+1}. ${s.title}`).join('\n')}`;
} 