describe('SOP Creation', () => {
  beforeEach(() => {
    // Mock successful login
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
    
    // Mock user profile fetch
    cy.intercept('GET', '**/rest/v1/users*', {
      statusCode: 200,
      body: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    }).as('getUserProfile');
    
    // Mock empty SOPs list
    cy.intercept('GET', '**/rest/v1/sops*', {
      statusCode: 200,
      body: []
    }).as('getSOPs');
    
    // Login and navigate to dashboard
    cy.visit('/');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Sign In').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });

  it('navigates to SOP creation page', () => {
    cy.contains('Create New SOP').click();
    cy.url().should('include', '/sop/create');
    cy.contains('Create New Standard Operating Procedure');
  });

  it('creates a new SOP and redirects to editor', () => {
    // Mock SOP creation response
    const mockSopId = 'new-sop-123';
    cy.intercept('POST', '**/api/sops', {
      statusCode: 201,
      body: {
        sop: {
          id: mockSopId,
          title: 'Coffee Brewing',
          description: 'How to brew the perfect cup of coffee',
          category: 'Kitchen Procedures',
          created_by: 'user123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    }).as('createSOP');
    
    // Mock SOP details and empty steps for editor page
    cy.intercept('GET', `**/api/sops/${mockSopId}`, {
      statusCode: 200,
      body: {
        sop: {
          id: mockSopId,
          title: 'Coffee Brewing',
          description: 'How to brew the perfect cup of coffee',
          category: 'Kitchen Procedures',
          created_by: 'user123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    }).as('getSOP');
    
    cy.intercept('GET', `**/api/steps*`, {
      statusCode: 200,
      body: {
        steps: []
      }
    }).as('getSteps');
    
    // Navigate to create page
    cy.contains('Create New SOP').click();
    
    // Fill out the form
    cy.get('input[id="title"]').type('Coffee Brewing');
    cy.get('textarea[id="description"]').type('How to brew the perfect cup of coffee');
    cy.get('input[id="category"]').type('Kitchen Procedures');
    
    // Submit form
    cy.contains('button', 'Create SOP and Add Steps').click();
    
    // Wait for SOP creation API call
    cy.wait('@createSOP');
    
    // Assert redirect to edit page and check content
    cy.url().should('include', `/sop/${mockSopId}/edit`);
    cy.contains('Edit SOP: Coffee Brewing').should('be.visible');
  });
  
  it('shows validation errors when required fields are missing', () => {
    // Navigate to create page
    cy.contains('Create New SOP').click();
    
    // Submit form without filling required fields
    cy.contains('button', 'Create SOP and Add Steps').click();
    
    // Check browser validation errors by confirming the form wasn't submitted
    cy.url().should('include', '/sop/create');
    cy.contains('Create New Standard Operating Procedure').should('be.visible');
  });
}); 