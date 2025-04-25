import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { authAdmin } from '@/utils/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
      console.log('Missing Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let userId;
    try {
      // Verify Firebase token
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { sopId } = body;

    if (!sopId) {
      return NextResponse.json(
        { error: 'SOP ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if SOP exists and belongs to the user
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id, created_by')
      .eq('id', sopId)
      .single();

    if (sopError || !sop) {
      return NextResponse.json(
        { error: 'SOP not found' },
        { status: 404 }
      );
    }

    if (sop.created_by !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to share this SOP' },
        { status: 403 }
      );
    }

    // Generate a unique ID for the shared SOP
    const shareId = uuidv4();

    // Create shared SOP record
    const { data: sharedSOP, error: createError } = await supabase
      .from('shared_sops')
      .insert({
        id: shareId,
        sop_id: sopId,
        created_at: new Date().toISOString(),
        created_by: userId
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating shared SOP:', createError);
      return NextResponse.json(
        { error: 'Failed to create shared SOP' },
        { status: 500 }
      );
    }

    // Generate share link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareLink = `${baseUrl}/shared/${shareId}`;

    return NextResponse.json({
      id: shareId,
      link: shareLink
    });
  } catch (error) {
    console.error('Error creating shared SOP:', error);
    return NextResponse.json(
      { error: 'Failed to create shared SOP' },
      { status: 500 }
    );
  }
} 