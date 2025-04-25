import { render as rtlRender } from '@testing-library/react';
import { ReactElement } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
};

// Mock Firebase client
const mockFirebaseAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
};

// Custom render function that includes providers
function render(ui: ReactElement, { ...options } = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Helper to mock authenticated user
const mockAuthenticatedUser = (userData = {}) => {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    ...userData,
  };

  mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: defaultUser }, error: null });
  mockFirebaseAuth.currentUser = defaultUser;
};

// Helper to mock API responses
const mockApiResponse = (path: string, response: any, status = 200) => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes(path)) {
      return Promise.resolve({
        ok: status < 400,
        status,
        json: () => Promise.resolve(response),
      });
    }
    return Promise.reject(new Error(`No mock found for ${url}`));
  });
};

// Clean up function to reset all mocks
const cleanupMocks = () => {
  jest.clearAllMocks();
  global.fetch.mockClear();
  delete global.fetch;
};

export {
  render,
  mockSupabaseClient,
  mockFirebaseAuth,
  mockAuthenticatedUser,
  mockApiResponse,
  cleanupMocks,
}; 