import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // For development mode, bypass authentication
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - bypassing authentication for transcription');
    } else {
      // Verify authentication with Supabase
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.error('Authentication error:', error);
        return NextResponse.json(
          { error: 'Unauthorized - Invalid session' },
          { status: 401 }
        );
      }
    }
    
    // Handle file upload
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Log audio file details for debugging
    console.log('Received audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });
    
    // In a production environment, you would send this to a transcription service
    // For now, we'll just simulate transcription with a placeholder
    // This would be where you'd integrate with a service like Whisper API
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response - in production replace with actual transcription
    const mockResponses = [
      "I need to document our employee onboarding process.",
      "Let's create a safety procedure for handling hazardous materials.",
      "We should document the customer support escalation process.",
      "I want to create an SOP for our quality control process.",
      "This will be a standard operating procedure for our IT systems.",
    ];
    
    // Return a random mock response
    return NextResponse.json({
      text: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      confidence: 0.95
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Error processing transcription request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 