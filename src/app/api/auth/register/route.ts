import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserRole } from '@/utils/auth-server';
import { z } from 'zod';

// Define validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'editor', 'viewer']).optional().default('viewer'),
});

type RegisterInput = z.infer<typeof registerSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password, name, role } = result.data;
    
    // Initialize Supabase client
    const supabase = createServerSupabaseClient();
    
    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    
    if (error) {
      return NextResponse.json(
        { error: 'Registration failed', message: error.message },
        { status: 400 }
      );
    }
    
    // Get user role
    const userRole = getUserRole(data.user);
    
    // Registration successful
    return NextResponse.json(
      { 
        message: 'Registration successful',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          role: userRole,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Server error during registration' },
      { status: 500 }
    );
  }
} 