import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    // Get Supabase credentials directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Supabase credentials" 
      }, { status: 500 });
    }
    
    // Create a direct Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logs.push("Created Supabase admin client");
    
    // Create a system user
    const systemUserId = 'system-user';
    
    try {
      logs.push("Creating system user");
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: systemUserId,
          email: 'system@example.com',
          name: 'System User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        logs.push(`Error creating system user: ${error.message}`);
      } else {
        logs.push(`Created system user: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logs.push(`Exception creating system user: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Create sample SOPs directly
    const sopIds = [];
    const sops = [
      {
        id: randomUUID(),
        title: "Sales Process SOP",
        description: "Standard operating procedure for the sales team"
      },
      {
        id: randomUUID(),
        title: "Customer Onboarding SOP",
        description: "Process for onboarding new customers"
      },
      {
        id: randomUUID(),
        title: "Product Deployment SOP",
        description: "Steps to deploy a new product version"
      }
    ];
    
    for (const sop of sops) {
      try {
        logs.push(`Creating SOP: ${sop.title}`);
        const { data, error } = await supabase
          .from('sops')
          .upsert({
            id: sop.id,
            title: sop.title,
            description: sop.description,
            created_by: systemUserId,
            is_published: true,
            version: "1.0",
            status: "published",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (error) {
          logs.push(`Error creating SOP: ${error.message}`);
        } else {
          logs.push(`Created SOP: ${JSON.stringify(data)}`);
          sopIds.push(sop.id);
          
          // Create steps for this SOP
          for (let i = 0; i < 3; i++) {
            const stepId = randomUUID();
            const { error: stepError } = await supabase
              .from('steps')
              .upsert({
                id: stepId,
                sop_id: sop.id,
                order_index: i,
                title: `Step ${i+1}`,
                instructions: `Instructions for step ${i+1} in ${sop.title}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (stepError) {
              logs.push(`Error creating step: ${stepError.message}`);
            } else {
              logs.push(`Created step ${i+1} for SOP: ${sop.title}`);
            }
          }
        }
      } catch (error) {
        logs.push(`Exception creating SOP: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Try to fetch one SOP to confirm it worked
    try {
      if (sopIds.length > 0) {
        const { data, error } = await supabase
          .from('sops')
          .select('*, steps(*)')
          .eq('id', sopIds[0])
          .single();
          
        if (error) {
          logs.push(`Error fetching created SOP: ${error.message}`);
        } else {
          logs.push(`Successfully fetched created SOP with steps: ${JSON.stringify(data)}`);
        }
      }
    } catch (error) {
      logs.push(`Exception fetching SOP: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return NextResponse.json({
      success: true,
      message: "Database seeded with sample data",
      logs,
      sopIds,
      errors: errors.length > 0 ? errors : null
    });
    
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
      errors
    }, { status: 500 });
  }
} 