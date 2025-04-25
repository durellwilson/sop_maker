import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from './route';
import { auth } from '@/utils/firebase';
import supabase from '@/utils/supabase';
import { jest } from '@jest/globals';

// Mock Firebase auth and Supabase
jest.mock('@/utils/firebase', () => ({
  auth: {
    verifyIdToken: jest.fn(),
  },
}));

jest.mock('@/utils/supabase', () => {
  const mockSupabase = {
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    insert: jest.fn(() => mockSupabase),
    update: jest.fn(() => mockSupabase),
    delete: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    single: jest.fn(),
  };
  return mockSupabase;
});

describe('Steps API Routes', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/steps', () => {
    it('should return steps for a specific SOP', async () => {
      // Arrange
      const url = new URL('http://localhost/api/steps?sopId=sop123');
      const req = new NextRequest(url, {
        headers: new Headers({
          'Authorization': 'Bearer validtoken123'
        })
      });
      
      const mockSOP = { id: 'sop123', title: 'Test SOP', created_by: 'dbuser123' };
      const mockSteps = [
        { id: 'step1', sop_id: 'sop123', order_index: 1, title: 'Step 1', instructions: 'Step 1 text' },
        { id: 'step2', sop_id: 'sop123', order_index: 2, title: 'Step 2', instructions: 'Step 2 text' },
      ];
      
      // Mock auth verification
      (auth.verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: 'user123' });

      // Mock user fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'dbuser123' }, error: null })
          })
        })
      });
      
      // Mock SOP fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockSOP, error: null })
            })
          })
        })
      });
      
      // Mock steps fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockSteps, error: null })
          })
        })
      });
      
      // Act
      const response = await GET(req);
      const responseData = await response.json();
      
      // Assert
      expect(auth.verifyIdToken).toHaveBeenCalledWith('validtoken123');
      expect(supabase.from).toHaveBeenCalledWith('steps');
      expect(response.status).toBe(200);
      expect(responseData.steps).toEqual(mockSteps);
    });
  });

  describe('POST /api/steps', () => {
    it('should create a new step', async () => {
      // Arrange
      const stepData = {
        sop_id: 'sop123',
        order_index: 3,
        title: 'Step 3',
        instructions: 'Step 3 instructions',
      };
      
      const req = new NextRequest('http://localhost/api/steps', {
        method: 'POST',
        headers: new Headers({
          'Authorization': 'Bearer validtoken123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(stepData),
      });
      
      const mockCreatedStep = {
        id: 'step3',
        ...stepData,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };
      
      // Mock auth verification
      (auth.verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: 'user123' });

      // Mock user fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'dbuser123' }, error: null })
          })
        })
      });
      
      // Mock SOP fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'sop123' }, error: null })
            })
          })
        })
      });
      
      // Mock step insert
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockCreatedStep, error: null })
          })
        })
      });
      
      // Mock SOP update (for updated_at timestamp)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        })
      });
      
      // Act
      const response = await POST(req);
      const responseData = await response.json();
      
      // Assert
      expect(auth.verifyIdToken).toHaveBeenCalledWith('validtoken123');
      expect(supabase.from).toHaveBeenCalledWith('steps');
      expect(response.status).toBe(201);
      expect(responseData.step).toEqual(mockCreatedStep);
    });
  });
}); 