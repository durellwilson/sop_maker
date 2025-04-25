/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthToken } from '../hooks/useAuthToken';
import { useAuth } from '../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('Authentication Hooks', () => {
  describe('useAuthToken', () => {
    beforeEach(() => {
      // Reset mocks between tests
      jest.clearAllMocks();
    });

    it('should return token from session when available', async () => {
      // Mock the useAuth hook to return a session with a token
      (useAuth as jest.Mock).mockReturnValue({
        session: { access_token: 'mock-session-token' },
        getToken: jest.fn(),
        initialized: true,
      });

      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useAuthToken());
      
      // Wait for the effect to run
      await waitForNextUpdate();

      // Check the result
      expect(result.current.token).toBe('mock-session-token');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call getToken when session token is not available', async () => {
      // Create a mock function for getToken
      const mockGetToken = jest.fn().mockResolvedValue('mock-fallback-token');
      
      // Mock the useAuth hook to return no session but a getToken function
      (useAuth as jest.Mock).mockReturnValue({
        session: null,
        getToken: mockGetToken,
        initialized: true,
      });

      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useAuthToken());
      
      // Wait for the effect to run
      await waitForNextUpdate();

      // Check that getToken was called
      expect(mockGetToken).toHaveBeenCalled();
      
      // Check the result
      expect(result.current.token).toBe('mock-fallback-token');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when getToken fails', async () => {
      // Create a mock function for getToken that throws an error
      const mockGetToken = jest.fn().mockRejectedValue(new Error('Auth error'));
      
      // Mock the useAuth hook to return a getToken function that fails
      (useAuth as jest.Mock).mockReturnValue({
        session: null,
        getToken: mockGetToken,
        initialized: true,
      });

      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useAuthToken());
      
      // Wait for the effect to run
      await waitForNextUpdate();

      // Check that getToken was called
      expect(mockGetToken).toHaveBeenCalled();
      
      // Check the result
      expect(result.current.token).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(new Error('Auth error'));
    });

    it('should refresh token when refreshToken is called', async () => {
      // Create a mock function for getToken
      const mockGetToken = jest.fn()
        .mockResolvedValueOnce('initial-token')
        .mockResolvedValueOnce('refreshed-token');
      
      // Mock the useAuth hook
      (useAuth as jest.Mock).mockReturnValue({
        session: null,
        getToken: mockGetToken,
        initialized: true,
      });

      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useAuthToken());
      
      // Wait for the initial effect to run
      await waitForNextUpdate();
      
      // Initial state
      expect(result.current.token).toBe('initial-token');
      
      // Act: Call refreshToken
      let refreshedToken: string | null = null;
      await act(async () => {
        refreshedToken = await result.current.refreshToken();
      });
      
      // Check results
      expect(mockGetToken).toHaveBeenCalledTimes(2);
      expect(refreshedToken).toBe('refreshed-token');
      expect(result.current.token).toBe('refreshed-token');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors during token refresh', async () => {
      // Create a mock function for getToken
      const mockGetToken = jest.fn()
        .mockResolvedValueOnce('initial-token')
        .mockRejectedValueOnce(new Error('Refresh error'));
      
      // Mock the useAuth hook
      (useAuth as jest.Mock).mockReturnValue({
        session: null,
        getToken: mockGetToken,
        initialized: true,
      });

      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useAuthToken());
      
      // Wait for the initial effect to run
      await waitForNextUpdate();
      
      // Initial state
      expect(result.current.token).toBe('initial-token');
      
      // Act: Call refreshToken and expect it to throw
      let refreshError: Error | null = null;
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (err) {
          refreshError = err as Error;
        }
      });
      
      // Check results
      expect(mockGetToken).toHaveBeenCalledTimes(2);
      expect(refreshError).toEqual(new Error('Refresh error'));
      expect(result.current.token).toBe('initial-token'); // Token should not change
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(new Error('Refresh error'));
    });
  });
}); 