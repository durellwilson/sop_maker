describe('Static HTML Test', () => {
  it('can access static HTML file', () => {
    // Visit the static test HTML page
    cy.visit('/test.html', { timeout: 30000 });
    
    // Basic assertions that should pass
    cy.contains('h1', 'Cypress Test Page').should('be.visible');
    cy.get('.success').should('be.visible');
    cy.get('#testButton').should('be.visible');
    
    // Test interaction
    cy.get('#testButton').click();
    cy.get('#output').should('contain', 'Button clicked');
  });
}); 