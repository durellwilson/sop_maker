describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear session storage and cookies before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/');
  });

  it('should redirect to login when accessing protected page', () => {
    // Try to visit a protected page directly
    cy.visit('/sop/create');
    
    // Should be redirected to login page
    cy.url().should('include', '/auth/signin');
    cy.contains('Sign in to your account').should('be.visible');
  });

  it('should allow login and create SOP', () => {
    // Go to the login page
    cy.visit('/auth/signin');
    
    // Fill in the login form
    cy.get('input[name="email"]').type(Cypress.env('CYPRESS_TEST_USER_EMAIL'));
    cy.get('input[name="password"]').type(Cypress.env('CYPRESS_TEST_USER_PASSWORD'));
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for login to complete and redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Navigate to create SOP page
    cy.contains('Create SOP').click();
    cy.url().should('include', '/sop/create');
    
    // Fill in the SOP creation form
    cy.get('input#title').type('Test SOP Created by Cypress');
    cy.get('textarea#description').type('This is a test SOP created by Cypress automation.');
    cy.get('select#category').select('Administrative');
    
    // Submit the form
    cy.contains('Continue to Add Steps').click();
    
    // Should be redirected to the edit page
    cy.url().should('include', '/edit');
    cy.contains('Test SOP Created by Cypress').should('be.visible');
    
    // Cleanup - delete the test SOP
    cy.contains('Delete').click();
    cy.contains('Delete SOP').click();
    
    // Should return to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should handle session expiration gracefully', () => {
    // Log in
    cy.visit('/auth/signin');
    cy.get('input[name="email"]').type(Cypress.env('CYPRESS_TEST_USER_EMAIL'));
    cy.get('input[name="password"]').type(Cypress.env('CYPRESS_TEST_USER_PASSWORD'));
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    
    // Simulate session expiration by clearing the Supabase auth data
    cy.window().then((win) => {
      win.localStorage.removeItem('supabase.auth.token');
    });
    
    // Try to access a protected page
    cy.visit('/sop/create');
    
    // It should either redirect to login or show auth error
    cy.url().should('satisfy', (url) => {
      return url.includes('/auth/signin') || url.includes('/sop/create');
    });
    
    // If we stayed on the create page, it should show an auth error
    cy.url().then((url) => {
      if (url.includes('/sop/create')) {
        cy.contains('Authentication error').should('be.visible');
      }
    });
  });

  it('should sign out properly', () => {
    // Log in
    cy.visit('/auth/signin');
    cy.get('input[name="email"]').type(Cypress.env('CYPRESS_TEST_USER_EMAIL'));
    cy.get('input[name="password"]').type(Cypress.env('CYPRESS_TEST_USER_PASSWORD'));
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    
    // Sign out
    cy.contains('Sign Out').click();
    
    // Should be redirected to home page or login page
    cy.url().should('satisfy', (url) => {
      return url === Cypress.config().baseUrl + '/' || url.includes('/auth/signin');
    });
    
    // Try to access a protected page
    cy.visit('/sop/create');
    
    // Should be redirected to login
    cy.url().should('include', '/auth/signin');
  });
}); 