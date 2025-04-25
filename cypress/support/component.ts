// ***********************************************************
// This is a support file for component testing
// ***********************************************************

// Import commands.ts using ES2015 syntax:
import './commands';

// Import global styles
import '../../src/app/globals.css';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import { mount } from 'cypress/react18';

// Augment the Cypress namespace to include custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      // Define any custom commands here
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// You can set up component testing specific behaviors here
Cypress.on('uncaught:exception', (err) => {
  // Returning false here prevents Cypress from failing the test
  // This can be helpful when third-party libraries throw uncaught exceptions
  console.error('Uncaught exception:', err);
  return false;
}); 