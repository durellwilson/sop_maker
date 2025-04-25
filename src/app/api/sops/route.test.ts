import { NextRequest } from 'next/server';
import { GET, POST } from './route';
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

describe('SOPs API Routes', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sops', () => {
    it('should return unauthorized if no token is provided', async () => {
      // Arrange
      const req = new NextRequest('http://localhost/api/sops', {
        headers: new Headers({})
      });
      
      // Act
      const response = await GET(req);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return SOPs for authenticated user', async () => {
      // Arrange
      const req = new NextRequest('http://localhost/api/sops', {
        headers: new Headers({
          'Authorization': 'Bearer validtoken123'
        })
      });
      
      const mockSOPs = [
        { id: '1', title: 'SOP 1', description: 'Desc 1', category: 'Cat 1' },
        { id: '2', title: 'SOP 2', description: 'Desc 2', category: 'Cat 2' },
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
      
      // Mock SOPs fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockSOPs, error: null })
          })
        })
      });
      
      // Act
      const response = await GET(req);
      const responseData = await response.json();
      
      // Assert
      expect(auth.verifyIdToken).toHaveBeenCalledWith('validtoken123');
      expect(supabase.from).toHaveBeenCalledWith('sops');
      expect(response.status).toBe(200);
      expect(responseData.sops).toEqual(mockSOPs);
    });
  });

  describe('POST /api/sops', () => {
    it('should create a new SOP for authenticated user', async () => {
      // Arrange
      const sopData = {
        title: 'New SOP',
        description: 'New Description',
        category: 'New Category',
      };
      
      const req = new NextRequest('http://localhost/api/sops', {
        method: 'POST',
        headers: new Headers({
          'Authorization': 'Bearer validtoken123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(sopData),
      });
      
      const mockCreatedSOP = {
        id: 'new-sop-id',
        ...sopData,
        created_by: 'dbuser123',
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
      
      // Mock Supabase response for insert
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockCreatedSOP, error: null })
          })
        })
      });
      
      // Act
      const response = await POST(req);
      const responseData = await response.json();
      
      // Assert
      expect(auth.verifyIdToken).toHaveBeenCalledWith('validtoken123');
      expect(supabase.from).toHaveBeenCalledWith('sops');
      expect(response.status).toBe(201);
      expect(responseData.sop).toEqual(mockCreatedSOP);
    });
  });
}); 