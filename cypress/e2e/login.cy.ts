describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('displays the login form', () => {
    cy.contains('Welcome to SOP Maker');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.contains('button', 'Sign In').should('exist');
  });

  it('toggles between login and signup modes', () => {
    // Check initial state is login
    cy.contains('Welcome to SOP Maker');
    cy.contains('button', 'Sign In').should('exist');
    cy.contains('button', 'Sign Up').should('not.contain', 'Sign Up');

    // Click to switch to signup mode
    cy.contains('Sign Up').click();
    
    // Check now in signup mode
    cy.contains('Create Account');
    cy.get('input[id="name"]').should('exist');
    cy.contains('button', 'Sign Up').should('exist');
    cy.contains('Sign In').click();

    // Check back to login mode
    cy.contains('Welcome to SOP Maker');
    cy.get('input[id="name"]').should('not.exist');
  });

  it('shows error message on failed login', () => {
    // Simulate a failed login
    // We'll use cy.intercept to mock Firebase auth call failure
    cy.intercept('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', {
      statusCode: 400,
      body: {
        error: {
          message: 'INVALID_PASSWORD'
        }
      }
    }).as('loginRequest');
    
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.contains('button', 'Sign In').click();
    
    cy.wait('@loginRequest');
    cy.contains('INVALID_PASSWORD').should('be.visible');
  });

  // Mock a successful login and redirect
  it('redirects to dashboard on successful login', () => {
    // Mock Firebase Auth
    cy.intercept('POST', 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', {
      statusCode: 200,
      body: {
        idToken: 'fake-token',
        email: 'test@example.com',
        refreshToken: 'fake-refresh-token',
        localId: 'user123',
        registered: true
      }
    }).as('loginRequest');
    
    // Mock user profile fetch from Supabase
    cy.intercept('GET', '**/rest/v1/users*', {
      statusCode: 200,
      body: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    }).as('getUserProfile');
    
    // Mock SOPs fetch
    cy.intercept('GET', '**/rest/v1/sops*', {
      statusCode: 200,
      body: []
    }).as('getSOPs');
    
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('validpassword');
    cy.contains('button', 'Sign In').click();
    
    cy.wait('@loginRequest');
    
    // Check redirect to dashboard (url includes /dashboard)
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Test User!').should('be.visible');
  });
}); 