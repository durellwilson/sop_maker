/**
 * Authentication E2E tests
 * Tests the authentication flows in the application
 */
describe('Authentication Flows', () => {
  beforeEach(() => {
    // Reset cookies before each test
    cy.clearCookies();
  });
  
  it('should redirect from protected routes to signin when unauthenticated', () => {
    // Visit a protected route without authentication
    cy.visit('/dashboard');
    
    // Should be redirected to signin page
    cy.url().should('include', '/auth/signin');
    cy.url().should('include', 'redirect=%2Fdashboard');
    
    // Signin form should be visible
    cy.get('form').should('be.visible');
  });
  
  it('should redirect from login route to dashboard when authenticated', () => {
    // Mock authentication
    cy.setCookie('sb-auth-token', 'test-token');
    
    // Set x-auth-status header using intercept
    cy.intercept('/*', (req) => {
      req.headers['x-auth-status'] = 'authenticated';
    });
    
    // Visit login route when authenticated
    cy.visit('/auth/signin');
    
    // Should be redirected to dashboard
    cy.url().should('include', '/dashboard');
  });
  
  it('should show error message when login fails', () => {
    // Visit signin page
    cy.visit('/auth/signin');
    
    // Intercept the login request and force it to fail
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 400,
      body: {
        error: 'Invalid login credentials',
        error_description: 'Invalid login credentials',
      },
    });
    
    // Fill in the login form with test credentials
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    
    // Submit the form
    cy.get('form').submit();
    
    // Should show error message
    cy.get('[class*="bg-red-"]').should('be.visible');
  });
  
  it('should handle auth callback correctly', () => {
    // Mock the auth code
    const mockCode = 'test-auth-code';
    
    // Intercept the code exchange request
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
    });
    
    // Visit the callback URL with the mock code
    cy.visit(`/auth/callback?code=${mockCode}`);
    
    // Should be redirected to the handle-callback page
    cy.url().should('include', '/auth/handle-callback');
    cy.url().should('include', `code=${mockCode}`);
    
    // Should see the loading indicator
    cy.get('p').contains('Completing authentication').should('be.visible');
    
    // Should eventually redirect to dashboard
    cy.url().should('include', '/dashboard');
  });
}); 