describe('Critical User Paths', () => {
  beforeEach(() => {
    // Reset any test data and authenticate
    cy.task('db:seed');
    cy.login(); // Custom command defined in support/commands.ts
  });

  describe('SOP Creation Flow', () => {
    it('successfully creates a new SOP', () => {
      cy.visit('/dashboard');
      cy.findByRole('button', { name: /create sop/i }).click();
      
      // Fill in SOP details
      cy.findByLabelText(/title/i).type('Test SOP');
      cy.findByLabelText(/description/i).type('This is a test SOP');
      
      // Add steps
      cy.findByRole('button', { name: /add step/i }).click();
      cy.findByPlaceholderText(/enter step description/i).type('Step 1: Do this first');
      cy.findByRole('button', { name: /add step/i }).click();
      cy.findByPlaceholderText(/enter step description/i).last().type('Step 2: Then do this');
      
      // Add media to step
      cy.findByTestId('step-1-upload').attachFile('test-image.jpg');
      
      // Save SOP
      cy.findByRole('button', { name: /save/i }).click();
      
      // Verify success
      cy.findByText(/sop created successfully/i).should('be.visible');
      cy.url().should('include', '/dashboard');
    });

    it('validates required fields', () => {
      cy.visit('/dashboard');
      cy.findByRole('button', { name: /create sop/i }).click();
      
      // Try to save without required fields
      cy.findByRole('button', { name: /save/i }).click();
      
      // Verify validation messages
      cy.findByText(/title is required/i).should('be.visible');
      cy.findByText(/description is required/i).should('be.visible');
    });
  });

  describe('SOP Management', () => {
    it('successfully edits an existing SOP', () => {
      // Create a test SOP first
      cy.createTestSOP({
        title: 'Edit Test',
        description: 'To be edited'
      });
      
      cy.visit('/dashboard');
      cy.findByText('Edit Test').click();
      cy.findByLabelText(/title/i).clear().type('Updated Title');
      cy.findByRole('button', { name: /save/i }).click();
      
      cy.findByText(/saved successfully/i).should('be.visible');
      cy.findByText('Updated Title').should('be.visible');
    });

    it('successfully deletes an SOP', () => {
      cy.createTestSOP({
        title: 'Delete Test',
        description: 'To be deleted'
      });
      
      cy.visit('/dashboard');
      cy.findByText('Delete Test').parent().within(() => {
        cy.findByRole('button', { name: /delete/i }).click();
      });
      
      // Confirm deletion
      cy.findByRole('button', { name: /confirm/i }).click();
      
      // Verify deletion
      cy.findByText('Delete Test').should('not.exist');
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      // Create multiple test SOPs
      cy.createTestSOP({ title: 'Marketing SOP 1', category: 'Marketing' });
      cy.createTestSOP({ title: 'HR SOP 1', category: 'HR' });
      cy.createTestSOP({ title: 'Marketing SOP 2', category: 'Marketing' });
    });

    it('successfully filters SOPs by category', () => {
      cy.visit('/dashboard');
      cy.findByLabelText(/category/i).select('Marketing');
      
      cy.findByText('Marketing SOP 1').should('be.visible');
      cy.findByText('Marketing SOP 2').should('be.visible');
      cy.findByText('HR SOP 1').should('not.exist');
    });

    it('successfully searches SOPs', () => {
      cy.visit('/dashboard');
      cy.findByRole('searchbox').type('Marketing');
      
      cy.findByText('Marketing SOP 1').should('be.visible');
      cy.findByText('Marketing SOP 2').should('be.visible');
      cy.findByText('HR SOP 1').should('not.exist');
    });
  });

  describe('Performance Checks', () => {
    it('loads the dashboard within acceptable time', () => {
      cy.visit('/dashboard', {
        onBeforeLoad: (win) => {
          win.performance.mark('start-loading');
        },
      });

      cy.window().then((win) => {
        win.performance.mark('end-loading');
        const measure = win.performance.measure('page-load', 'start-loading', 'end-loading');
        expect(measure.duration).to.be.lessThan(3000); // 3 seconds max
      });
    });

    it('handles large lists efficiently', () => {
      // Create 50 test SOPs
      Array.from({ length: 50 }).forEach((_, i) => {
        cy.createTestSOP({ title: `Test SOP ${i}`, description: `Description ${i}` });
      });

      cy.visit('/dashboard', {
        onBeforeLoad: (win) => {
          win.performance.mark('start-loading');
        },
      });

      // Wait for all SOPs to load
      cy.findAllByTestId('sop-card').should('have.length', 50);

      cy.window().then((win) => {
        win.performance.mark('end-loading');
        const measure = win.performance.measure('list-load', 'start-loading', 'end-loading');
        expect(measure.duration).to.be.lessThan(5000); // 5 seconds max for large list
      });
    });
  });
}); 