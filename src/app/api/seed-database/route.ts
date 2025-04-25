import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Sample data for database seeding
const SAMPLE_SOPS = [
  {
    id: randomUUID(),
    title: "Employee Onboarding Process",
    description: "Standard operating procedure for onboarding new employees",
    category: "HR",
    created_by: "system",
    is_published: true,
    version: "1.0",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    title: "Customer Support Protocol",
    description: "Guidelines for handling customer inquiries and support tickets",
    category: "Customer Service",
    created_by: "system",
    is_published: true,
    version: "1.0",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    title: "Product Release Checklist",
    description: "Steps to follow when releasing a new product version",
    category: "Development",
    created_by: "system",
    is_published: true,
    version: "1.0",
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Sample steps for the SOPs
const generateSteps = (sopId: string) => {
  const steps = [];
  const stepsCount = Math.floor(Math.random() * 5) + 3; // 3-7 steps
  
  for (let i = 0; i < stepsCount; i++) {
    steps.push({
      id: randomUUID(),
      sop_id: sopId,
      order_index: i,
      title: `Step ${i+1}`,
      instructions: `Instructions for step ${i+1}. This is a detailed description of what to do in this step.`,
      video_script: `Script for video explaining step ${i+1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return steps;
};

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    // Direct connection to Supabase with admin privileges
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    logs.push("Connected to Supabase");
    
    // Create system user first
    try {
      logs.push("Creating system user");
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: 'system',
          email: 'system@example.com',
          name: 'System User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (userError) {
        errors.push(`Error creating system user: ${userError.message}`);
      } else {
        logs.push("System user created successfully");
      }
    } catch (userError) {
      errors.push(`Exception creating system user: ${userError instanceof Error ? userError.message : String(userError)}`);
    }
    
    // Insert SOPs
    let createdSops = 0;
    for (const sop of SAMPLE_SOPS) {
      try {
        logs.push(`Creating SOP: ${sop.title}`);
        const { error: sopError } = await supabase
          .from('sops')
          .upsert(sop);
          
        if (sopError) {
          errors.push(`Error creating SOP ${sop.title}: ${sopError.message}`);
        } else {
          createdSops++;
          logs.push(`SOP created successfully: ${sop.title}`);
          
          // Generate and insert steps for this SOP
          const steps = generateSteps(sop.id);
          for (const step of steps) {
            try {
              const { error: stepError } = await supabase
                .from('steps')
                .upsert(step);
                
              if (stepError) {
                errors.push(`Error creating step for SOP ${sop.title}: ${stepError.message}`);
              } else {
                logs.push(`Step created for SOP ${sop.title}`);
              }
            } catch (stepError) {
              errors.push(`Exception creating step: ${stepError instanceof Error ? stepError.message : String(stepError)}`);
            }
          }
        }
      } catch (sopError) {
        errors.push(`Exception creating SOP: ${sopError instanceof Error ? sopError.message : String(sopError)}`);
      }
    }
    
    // Try a direct SQL approach if the above failed
    if (createdSops === 0) {
      try {
        logs.push("Attempting direct SQL approach for seeding");
        
        // Create tables if they don't exist
        await supabase.rpc('exec_sql', {
          query: `
            CREATE TABLE IF NOT EXISTS public.users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL,
              name TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS public.sops (
              id UUID PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT,
              category TEXT,
              created_by TEXT NOT NULL,
              is_published BOOLEAN DEFAULT FALSE,
              version TEXT DEFAULT '1.0',
              status TEXT DEFAULT 'draft',
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              FOREIGN KEY (created_by) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS public.steps (
              id UUID PRIMARY KEY,
              sop_id UUID NOT NULL,
              order_index INTEGER NOT NULL,
              title TEXT NOT NULL,
              instructions TEXT,
              video_script TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE
            );
            
            -- Insert system user
            INSERT INTO public.users (id, email, name, created_at, updated_at)
            VALUES ('system', 'system@example.com', 'System User', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
          `
        });
        
        // Insert sample SOPs using SQL
        for (const sop of SAMPLE_SOPS) {
          await supabase.rpc('exec_sql', {
            query: `
              INSERT INTO public.sops (id, title, description, category, created_by, is_published, version, status, created_at, updated_at)
              VALUES ('${sop.id}', '${sop.title}', '${sop.description}', '${sop.category}', 'system', ${sop.is_published}, '${sop.version}', '${sop.status}', '${sop.created_at}', '${sop.updated_at}')
              ON CONFLICT (id) DO NOTHING;
            `
          });
          
          // Insert steps for this SOP
          const steps = generateSteps(sop.id);
          for (const step of steps) {
            await supabase.rpc('exec_sql', {
              query: `
                INSERT INTO public.steps (id, sop_id, order_index, title, instructions, video_script, created_at, updated_at)
                VALUES ('${step.id}', '${step.sop_id}', ${step.order_index}, '${step.title}', '${step.instructions}', '${step.video_script}', '${step.created_at}', '${step.updated_at}')
                ON CONFLICT (id) DO NOTHING;
              `
            });
          }
        }
        
        logs.push("Direct SQL seeding completed");
      } catch (sqlError) {
        errors.push(`Error with direct SQL seeding: ${sqlError instanceof Error ? sqlError.message : String(sqlError)}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Database seeded with ${SAMPLE_SOPS.length} SOPs and their steps`,
      logs,
      errors: errors.length > 0 ? errors : null
    });
    
  } catch (error) {
    console.error("Error in seed-database endpoint:", error);
    return NextResponse.json({
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      logs,
      errors
    }, { status: 500 });
  }
} 