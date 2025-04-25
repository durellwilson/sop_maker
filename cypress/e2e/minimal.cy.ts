// Most basic test possible
describe('Minimal Test', () => {
  it('passes', () => {
    // This test should always pass
    expect(true).to.equal(true);
  });

  it('can access a static URL', () => {
    // Visit a reliable external URL
    cy.visit('https://example.com', { timeout: 30000 });
    cy.get('body').should('be.visible');
  });

  it('can access localhost with retries', function() {
    // Set very long timeout for this test
    this.retries(5);
    
    // Try to visit the home page
    cy.visit('/', { 
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true
    });
  });
}); 