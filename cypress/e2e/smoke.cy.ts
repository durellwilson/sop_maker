describe('Smoke Test', () => {
  it('can visit the homepage', () => {
    // Increase timeout for this test
    Cypress.config('defaultCommandTimeout', 30000);
    
    cy.log('Starting smoke test - testing server availability');
    
    // First try a basic request to check server
    cy.request({
      url: '/',
      failOnStatusCode: false,
      timeout: 10000,
    }).then((response) => {
      cy.log(`Server response code: ${response.status}`);
      
      if (response.status >= 200 && response.status < 500) {
        cy.log('Server is responding, proceeding with page visit');
      } else {
        cy.log(`Warning: Server responded with status ${response.status}`);
      }
    }).catch(err => {
      cy.log(`Warning: Error making request to server: ${err.message}`);
    });
    
    // Try to visit the homepage with retries
    cy.visit('/', { 
      retryOnNetworkFailure: true,
      timeout: 30000
    });
    
    // Check if basic elements are visible
    cy.get('body').should('be.visible');
    cy.log('Successfully loaded the homepage body element');
    
    // Check if the page has any content
    cy.get('body').invoke('text').then((text) => {
      expect(text.length).to.be.greaterThan(0);
      cy.log(`Page loaded with ${text.length} characters of text`);
    });
  });
  
  it('has a working document body', () => {
    cy.visit('/');
    
    // More detailed checks for debugging
    cy.window().then((win) => {
      expect(win.document.body).to.exist;
      cy.log(`Document ready state: ${win.document.readyState}`);
      cy.log(`Window location: ${win.location.href}`);
    });
    
    // Report network errors if any
    cy.window().then((win) => {
      const errors = win.performance
        .getEntries()
        .filter(entry => entry.entryType === 'resource')
        .filter(entry => entry.name.includes('localhost:3000'))
        .map(entry => `Resource: ${entry.name}, Duration: ${entry.duration}ms`);
      
      if (errors.length > 0) {
        cy.log('Network resources loaded:');
        errors.forEach(err => cy.log(err));
      }
    });
  });
}); 