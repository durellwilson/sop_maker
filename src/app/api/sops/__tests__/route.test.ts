import { createMocks } from 'node-mocks-http';
import { POST, GET } from '../route';
import { mockAuthenticatedUser, cleanupMocks } from '@/utils/test-utils';

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: () => ({
      insert: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      select: jest.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
    }),
  }),
}));

describe('SOP API Routes', () => {
  beforeEach(() => {
    mockAuthenticatedUser();
  });

  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('POST /api/sops', () => {
    it('creates a new SOP successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test SOP',
          description: 'Test Description',
          steps: [],
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', 'test-id');
    });

    it('validates required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          description: 'Test Description',
          steps: [],
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it('handles unauthorized requests', async () => {
      mockAuthenticatedUser(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test SOP',
          description: 'Test Description',
          steps: [],
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/sops', () => {
    it('retrieves SOPs successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('id', 'test-id');
    });

    it('handles database errors gracefully', async () => {
      jest.mock('@/lib/supabase', () => ({
        createClient: () => ({
          from: () => ({
            select: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
          }),
        }),
      }));

      const { req, res } = createMocks({
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });
}); 