import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/middleware/auth-middleware';
import { logger } from '@/utils/logger';
import { ApiError, BadRequestError, ForbiddenError, NotFoundError } from '@/utils/api-errors';
import { revalidatePath } from 'next/cache';

// Define a schema for the expected step structure returned by AI
type AIGeneratedStep = {
  title: string;
  instructions: string;
  role?: string;
  safety_notes?: string;
  verification?: string;
};

async function generateSteps(sopId: string, prompt: string): Promise<AIGeneratedStep[]> {
  try {
    logger.debug(`Generating steps for SOP ${sopId} with prompt length: ${prompt.length} chars`);

    // Example AI integration with OpenAI or similar service
    // Here we're using a simple approach that could be enhanced with actual AI service integration
    
    // Replace this implementation with your actual AI service call
    const response = await fetch(process.env.AI_SERVICE_ENDPOINT || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert in creating detailed Standard Operating Procedures (SOPs).
Your task is to generate structured steps for an SOP based on the given prompt.
Each step should include a clear title, detailed instructions, role assignments when relevant,
safety notes when applicable, and verification methods.
Return your response as a JSON array of steps with the following structure:
[{
  "title": "Step Title",
  "instructions": "Detailed instructions for this step",
  "role": "The role responsible for this step (optional)",
  "safety_notes": "Safety considerations for this step (optional)",
  "verification": "How to verify this step was completed correctly (optional)"
}]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('AI generation service error:', errorData);
      throw new Error(`AI service error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Extract the content from the AI response
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI service');
    }

    // Parse the JSON content
    try {
      const parsedContent = JSON.parse(content);
      const steps = parsedContent.steps || [];
      
      // Validate the expected structure
      if (!Array.isArray(steps)) {
        throw new Error('AI did not return an array of steps');
      }
      
      // Validate and normalize each step
      return steps.map((step: any, index: number) => ({
        title: step.title || `Step ${index + 1}`,
        instructions: step.instructions || step.content || '',
        role: step.role || undefined,
        safety_notes: step.safety_notes || undefined,
        verification: step.verification || undefined
      }));
    } catch (parseError) {
      logger.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse steps from AI response');
    }
  } catch (error) {
    logger.error('Error generating steps with AI:', error);
    throw error;
  }
}

/**
 * POST /api/ai/generate-steps - Generate SOP steps using AI
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      logger.info(`POST /api/ai/generate-steps - User ${user.id} generating steps`);
      
      // Parse request body
      let requestData: { sop_id: string; prompt: string };
      try {
        requestData = await req.json();
        
        // Validate required fields
        if (!requestData.sop_id) {
          throw new BadRequestError('SOP ID is required');
        }
        
        if (!requestData.prompt || requestData.prompt.trim().length < 10) {
          throw new BadRequestError('A detailed prompt is required (minimum 10 characters)');
        }
      } catch (error) {
        logger.error('Invalid request body:', error);
        throw new BadRequestError('Invalid request body');
      }
      
      const { sop_id, prompt } = requestData;
      
      // Create Supabase client
      const supabase = createClient();
      
      // Verify SOP exists and user has access to it
      const { data: sop, error: sopError } = await supabase
        .from('sops')
        .select('id, title, description')
        .eq('id', sop_id)
        .single();
        
      if (sopError || !sop) {
        logger.warn(`SOP ${sop_id} not found or user ${user.id} doesn't have access`);
        throw new NotFoundError('SOP not found or you do not have access to it');
      }
      
      // Check rate limits (optional: implement rate limiting)
      // For example, using the user's tier/role to determine rate limits
      
      // Generate steps using AI
      const steps = await generateSteps(sop_id, prompt);
      
      // Log success
      logger.info(`Successfully generated ${steps.length} steps for SOP ${sop_id}`);
      
      // Optionally revalidate paths to update UI
      revalidatePath(`/sop/${sop_id}`);
      revalidatePath(`/sop/${sop_id}/edit`);
      
      // Return the generated steps
      return NextResponse.json({ 
        steps,
        message: `Successfully generated ${steps.length} steps` 
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      
      logger.error('Unexpected error in generate-steps API:', error);
      return NextResponse.json(
        { error: 'Failed to generate steps' },
        { status: 500 }
      );
    }
  }, { requireAuth: true });
} 