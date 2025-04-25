// This file is processed and loaded automatically 
// before your test files.

// Custom commands should go here
import './commands';

// Disable uncaught exception handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  console.error('Uncaught exception:', err.message);
  return false;
});

// Add retry logic for common network errors
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const attempts = 3;
  let attempt = 0;
  
  const tryVisit = () => {
    return originalFn(url, { ...options, timeout: 30000 })
      .catch((err) => {
        attempt++;
        if (attempt >= attempts) {
          cy.task('log', `Failed to load page after ${attempts} attempts`);
          cy.task('log', `Last error: ${err.message}`);
          throw err;
        }
        cy.task('log', `Retrying visit to ${url} (attempt ${attempt} of ${attempts})`);
        cy.wait(1000); // Wait 1 second before retrying
        return tryVisit();
      });
  };
  
  return tryVisit();
});

// Enhance request logging for debugging
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
  return originalFn(...args).catch(error => {
    cy.task('log', `Request failed: ${JSON.stringify(args)}`);
    cy.task('log', `Error: ${error.message}`);
    throw error;
  });
});

// Log failed requests for better debugging
Cypress.on('fail', (error, runnable) => {
  // If the error is from a failed network request, add more debugging info
  if (error.name === 'CypressError' && error.message.includes('request')) {
    console.error('Network request error:', error);
    
    // Log current network conditions
    cy.task('log', 'Network conditions during failure:');
    
    // You could add custom logging logic here
    cy.window().then((win) => {
      cy.task('log', `Navigator online: ${win.navigator.onLine}`);
    });
  }
  
  throw error; // Still fail the test
});

// Add better screenshot naming for debugging
Cypress.Screenshot.defaults({
  capture: 'viewport', // or 'fullPage' or 'runner'
  overwrite: true
});

// Enhanced logging for debugging
beforeEach(() => {
  const test = Cypress.currentTest;
  cy.task('log', `Running: ${test.title}`);
  
  // Check server availability before test - fixed promise chain
  cy.request({
    url: '/',
    failOnStatusCode: false,
    timeout: 10000
  }).then(response => {
    cy.task('log', `Server response status: ${response.status}`);
  });
});

afterEach(() => {
  const test = Cypress.currentTest;
  cy.task('log', `Finished: ${test.title} (${test.state})`);
  
  // Take a screenshot on test failure
  if (test.state === 'failed') {
    const specName = Cypress.spec.name;
    const testName = test.title.replace(/\s+/g, '-').toLowerCase();
    cy.screenshot(`${specName}--${testName}--failure`);
  }
}); 