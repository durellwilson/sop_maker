import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserRole } from '@/utils/auth-server';
import { z } from 'zod';

// Define validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof loginSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;
    
    // Initialize Supabase client
    const supabase = createServerSupabaseClient();
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return NextResponse.json(
        { error: 'Login failed', message: error.message },
        { status: 400 }
      );
    }
    
    // Get user role
    const role = getUserRole(data.user);
    
    // Login successful
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          role: role,
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error during login' },
      { status: 500 }
    );
  }
} 