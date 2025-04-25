import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';
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
    single: jest.fn(),
  };
  return mockSupabase;
});

describe('SOP Detail API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/sops/:id', () => {
    it('should update an existing SOP', async () => {
      // Arrange
      const sopId = 'sop123';
      const updates = {
        title: 'Updated SOP Title',
        description: 'Updated Description',
        category: 'Updated Category',
      };
      
      const req = new NextRequest(`http://localhost/api/sops/${sopId}`, {
        method: 'PUT',
        headers: new Headers({
          'Authorization': 'Bearer validtoken123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(updates),
      });
      
      const mockUpdatedSOP = {
        id: sopId,
        ...updates,
        created_by: 'dbuser123',
        is_published: false,
        version: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };
      
      // Mock auth verification
      (auth.verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: 'user123' });
      
      // Mock SOP fetch to check ownership
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUpdatedSOP, error: null })
            })
          })
        })
      });
      
      // Mock SOP update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockUpdatedSOP, error: null })
            })
          })
        })
      });
      
      // Act
      const response = await PUT(req, { params: { id: sopId } });
      const responseData = await response.json();
      
      // Assert
      expect(auth.verifyIdToken).toHaveBeenCalledWith('validtoken123');
      expect(supabase.from).toHaveBeenCalledWith('sops');
      expect(response.status).toBe(200);
      expect(responseData.sop).toEqual(mockUpdatedSOP);
    });

    it('should return 404 if SOP does not exist', async () => {
      // Arrange
      const sopId = 'nonexistent';
      const updates = { title: 'Updated Title' };
      
      const req = new NextRequest(`http://localhost/api/sops/${sopId}`, {
        method: 'PUT',
        headers: new Headers({
          'Authorization': 'Bearer validtoken123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(updates),
      });
      
      // Mock auth verification
      (auth.verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: 'user123' });
      
      // Mock SOP fetch to return not found
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Not found' } })
            })
          })
        })
      });
      
      // Act
      const response = await PUT(req, { params: { id: sopId } });
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('SOP not found or unauthorized');
    });

    it('should return 401 if no token is provided', async () => {
      // Arrange
      const sopId = 'sop123';
      const req = new NextRequest(`http://localhost/api/sops/${sopId}`, {
        method: 'PUT',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      
      // Act
      const response = await PUT(req, { params: { id: sopId } });
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });
  });
}); 