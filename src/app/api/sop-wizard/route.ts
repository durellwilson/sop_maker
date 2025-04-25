import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';
import { 
  generateSOPFromDescription, 
  enhanceStepInstructions, 
  suggestMediaForStep,
  processAudioTranscript
} from '@/utils/sop-ai-service';

/**
 * POST /api/sop-wizard - Generate a complete SOP from a description
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.log('Missing Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { operation } = body;
    
    switch (operation) {
      case 'generate-sop': {
        const { title, description, category, stakeholders, definitions } = body;
        
        if (!title || !description || !category) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        try {
          const result = await generateSOPFromDescription(
            title, 
            description, 
            category,
            stakeholders || '',
            definitions || ''
          );
          
          return NextResponse.json(result);
        } catch (error) {
          console.error('Error generating SOP:', error);
          return NextResponse.json({ error: 'Failed to generate SOP steps' }, { status: 500 });
        }
      }
      
      case 'enhance-step': {
        const { instruction, stepNumber, sopTitle } = body;
        
        if (!instruction || !stepNumber || !sopTitle) {
          return NextResponse.json({ 
            error: 'Instruction, step number, and SOP title are required' 
          }, { status: 400 });
        }
        
        const enhancedInstruction = await enhanceStepInstructions(
          instruction, 
          stepNumber, 
          sopTitle
        );
        
        return NextResponse.json({ instruction: enhancedInstruction });
      }
      
      case 'suggest-media': {
        const { instruction, stepNumber, sopTitle } = body;
        
        if (!instruction || !stepNumber || !sopTitle) {
          return NextResponse.json({ 
            error: 'Instruction, step number, and SOP title are required' 
          }, { status: 400 });
        }
        
        const mediaSuggestion = await suggestMediaForStep(
          instruction, 
          stepNumber, 
          sopTitle
        );
        
        return NextResponse.json({ suggestion: mediaSuggestion });
      }
      
      case 'process-transcript': {
        const { transcript } = body;
        
        if (!transcript) {
          return NextResponse.json({ 
            error: 'Transcript is required' 
          }, { status: 400 });
        }
        
        const processedData = await processAudioTranscript(transcript);
        return NextResponse.json(processedData);
      }
      
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in SOP wizard API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 