import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';
import { verifyCurrentUser } from '@/utils/server/auth-server';

/**
 * PUT /api/steps/batch - Batch update steps for a SOP
 */
export async function PUT(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const sopId = req.nextUrl.searchParams.get('sop_id');
  
  if (!sopId) {
    return NextResponse.json({ error: 'Missing SOP ID' }, { status: 400 });
  }
  
  try {
    // Verify current user
    const user = await verifyCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // First check if the SOP exists and belongs to the user
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('*')
      .eq('id', sopId)
      .or(`created_by.eq.${userId}`)
      .single();
    
    if (sopError || !sop) {
      console.log(`SOP ${sopId} not found for user ${userId}`);
      return NextResponse.json({ error: 'SOP not found or unauthorized' }, { status: 404 });
    }
    
    const { steps } = await req.json();
    
    if (!Array.isArray(steps)) {
      return NextResponse.json({ error: 'Invalid steps data' }, { status: 400 });
    }
    
    // Get existing steps
    const { data: existingSteps } = await supabase
      .from('steps')
      .select('id')
      .eq('sop_id', sopId);
    
    const existingIds = existingSteps?.map(step => step.id) || [];
    const newStepIds = steps.map(step => step.id);
    
    // Delete steps that are no longer present
    const stepsToDelete = existingIds.filter(id => !newStepIds.includes(id));
    if (stepsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('steps')
        .delete()
        .in('id', stepsToDelete);
      
      if (deleteError) {
        console.error('Error deleting steps:', deleteError);
      }
    }
    
    // Update or insert steps
    const stepsToUpsert = steps.map(step => ({
      id: step.id,
      sop_id: sopId,
      order_index: step.order_index,
      title: step.title || '',
      instructions: step.instruction || step.instructions || '',
      updated_at: new Date().toISOString(),
      // Handle created_at only for new steps
      created_at: step.created_at || new Date().toISOString(),
    }));
    
    const { error: upsertError } = await supabase
      .from('steps')
      .upsert(stepsToUpsert);
    
    if (upsertError) {
      console.error('Error upserting steps:', upsertError);
      return NextResponse.json({ error: 'Failed to update steps', details: upsertError.message }, { status: 500 });
    }
    
    // Update SOP updated_at timestamp
    await supabase
      .from('sops')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sopId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in batch update steps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 