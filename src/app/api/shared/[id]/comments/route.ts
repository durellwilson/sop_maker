import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/utils/server/supabase-server';

/**
 * POST /api/shared/[id]/comments - Add a comment to a published SOP
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`Comment API called for SOP ID: ${params.id}`);
  
  try {
    const supabase = createServerSupabaseClient();
    const sopId = params.id;
    
    // Check if the SOP exists and is published
    const { data: sopData, error: sopError } = await supabase
      .from('sops')
      .select('*, publish_settings')
      .eq('id', sopId)
      .eq('is_published', true)
      .single();
    
    if (sopError) {
      console.error('Error fetching SOP:', sopError);
      return Response.json({ error: 'SOP not found or not published' }, { status: 404 });
    }
    
    // Check if comments are allowed
    if (!sopData.publish_settings || !sopData.publish_settings.allowComments) {
      return Response.json({ error: 'Comments are not allowed for this SOP' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    
    if (!body.comment || typeof body.comment !== 'string' || body.comment.trim() === '') {
      return Response.json({ error: 'Comment text is required' }, { status: 400 });
    }
    
    // Simple profanity check (can be expanded)
    const profanityList = ['badword1', 'badword2'];
    const hasProfanity = profanityList.some(word => 
      body.comment.toLowerCase().includes(word.toLowerCase())
    );
    
    if (hasProfanity) {
      return Response.json({ error: 'Comment contains inappropriate language' }, { status: 400 });
    }
    
    // Add the comment to the database
    const { data: comment, error: commentError } = await supabase
      .from('sop_comments')
      .insert({
        sop_id: sopId,
        content: body.comment.trim(),
        author_name: body.author || 'Anonymous',
        created_at: new Date().toISOString(),
        status: 'pending' // Comments are pending approval by default
      })
      .select()
      .single();
    
    if (commentError) {
      console.error('Error saving comment:', commentError);
      return Response.json({ error: 'Failed to save comment' }, { status: 500 });
    }
    
    // Notify the SOP owner about the new comment (implementation would depend on your notification system)
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: sopData.created_by,
          type: 'new_comment',
          content: `New comment on your SOP: "${sopData.title}"`,
          resource_id: sopId,
          resource_type: 'sop',
          data: { comment_id: comment.id },
          created_at: new Date().toISOString(),
          is_read: false
        });
    } catch (notificationError) {
      // Don't fail if notification creation fails
      console.warn('Failed to create notification:', notificationError);
    }
    
    return Response.json({ 
      success: true,
      message: 'Comment submitted successfully and is pending approval',
      comment: {
        id: comment.id,
        content: comment.content,
        author_name: comment.author_name,
        created_at: comment.created_at,
        status: comment.status
      }
    });
  } catch (error) {
    console.error('Unhandled error in comments API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
}

/**
 * GET /api/shared/[id]/comments - Get all approved comments for a published SOP
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`Get comments API called for SOP ID: ${params.id}`);
  
  try {
    const supabase = createServerSupabaseClient();
    const sopId = params.id;
    
    // Check if the SOP exists and is published
    const { data: sopData, error: sopError } = await supabase
      .from('sops')
      .select('*, publish_settings')
      .eq('id', sopId)
      .eq('is_published', true)
      .single();
    
    if (sopError) {
      console.error('Error fetching SOP:', sopError);
      return Response.json({ error: 'SOP not found or not published' }, { status: 404 });
    }
    
    // Check if comments are allowed
    if (!sopData.publish_settings || !sopData.publish_settings.allowComments) {
      return Response.json({ error: 'Comments are not allowed for this SOP' }, { status: 403 });
    }
    
    // Get all approved comments
    const { data: comments, error: commentsError } = await supabase
      .from('sop_comments')
      .select('*')
      .eq('sop_id', sopId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    
    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return Response.json({ error: 'Failed to load comments' }, { status: 500 });
    }
    
    return Response.json({ 
      comments: comments || []
    });
  } catch (error) {
    console.error('Unhandled error in comments API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: `Server error: ${errorMessage}`
    }, { status: 500 });
  }
} 