/// <reference types="cypress" />

import '@testing-library/cypress/add-commands';
import 'cypress-file-upload';

// Custom commands for debugging and testing
Cypress.Commands.add('logState', (message) => {
  cy.task('log', message);
});

// Debug command to log element details
Cypress.Commands.add('debugElement', { prevSubject: 'element' }, (subject, options = {}) => {
  const defaultOptions = {
    logProps: true,
    logStyles: true,
    logState: true,
    logEvents: false,
  };
  
  const opts = { ...defaultOptions, ...options };
  const $el = Cypress.$(subject);
  const tag = $el.prop('tagName');
  const id = $el.attr('id') ? `#${$el.attr('id')}` : '';
  const classes = $el.attr('class') ? `.${$el.attr('class').replace(/\s+/g, '.')}` : '';
  
  // Log basic element info
  cy.task('log', `Element: ${tag}${id}${classes}`);
  
  // Log element properties
  if (opts.logProps) {
    const props = {};
    ['value', 'disabled', 'checked', 'selected', 'href', 'type'].forEach(prop => {
      if ($el.prop(prop) !== undefined) props[prop] = $el.prop(prop);
    });
    
    cy.task('log', 'Properties:');
    cy.task('table', props);
  }
  
  // Log computed styles
  if (opts.logStyles && $el.length) {
    const elem = $el[0];
    const computedStyle = window.getComputedStyle(elem);
    const styles = {};
    ['display', 'visibility', 'opacity', 'position', 'z-index'].forEach(style => {
      styles[style] = computedStyle.getPropertyValue(style);
    });
    
    cy.task('log', 'Styles:');
    cy.task('table', styles);
  }
  
  // Return the element to allow chaining
  return cy.wrap(subject);
});

// Auth helper to simplify login for testing
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password') => {
  // Intercept auth requests
  cy.intercept('POST', '/api/auth/signin').as('signIn');
  cy.intercept('GET', '/api/auth/session').as('session');

  // Visit login page
  cy.visit('/login');

  // Fill in credentials
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole('button', { name: /sign in/i }).click();

  // Wait for auth
  cy.wait('@signIn');
  cy.wait('@session');

  // Verify redirect to dashboard
  cy.url().should('include', '/dashboard');
});

// Helper to wait for both API and animation completion
Cypress.Commands.add('waitForApp', () => {
  cy.get('[data-cy-loading]', { timeout: 30000, log: false }).should('not.exist');
  // Wait additional time for animations
  cy.wait(300); 
});

// Create test SOP command
Cypress.Commands.add('createTestSOP', (data) => {
  // Intercept API calls
  cy.intercept('POST', '/api/sops').as('createSOP');
  cy.intercept('POST', '/api/upload').as('uploadMedia');

  // Visit create page
  cy.visit('/dashboard/create');

  // Fill in basic details
  cy.findByLabelText(/title/i).type(data.title);
  cy.findByLabelText(/description/i).type(data.description);

  if (data.category) {
    cy.findByLabelText(/category/i).select(data.category);
  }

  // Add steps if provided
  if (data.steps) {
    data.steps.forEach((step, index) => {
      if (index > 0) {
        cy.findByRole('button', { name: /add step/i }).click();
      }
      cy.findByPlaceholderText(/enter step description/i)
        .last()
        .type(step.description);

      // Handle media uploads
      if (step.media) {
        step.media.forEach((mediaPath) => {
          cy.findByTestId(`step-${index}-upload`).attachFile(mediaPath);
          cy.wait('@uploadMedia');
        });
      }
    });
  }

  // Save SOP
  cy.findByRole('button', { name: /save/i }).click();
  cy.wait('@createSOP');

  // Verify success
  cy.findByText(/sop created successfully/i).should('be.visible');
});

// Add data-testid to elements in development
if (Cypress.env('NODE_ENV') === 'development') {
  Cypress.Commands.add('addTestIds', () => {
    cy.window().then((win) => {
      win.document.querySelectorAll('[role]').forEach((el) => {
        if (!el.getAttribute('data-testid')) {
          el.setAttribute('data-testid', `${el.getAttribute('role')}-${Math.random().toString(36).substr(2, 9)}`);
        }
      });
    });
  });
}

// Performance monitoring commands
Cypress.Commands.add('measurePageLoad', (pageName: string) => {
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const pageLoad = navigation.loadEventEnd - navigation.startTime;
    
    cy.task('logPerformance', {
      page: pageName,
      metric: 'pageLoad',
      value: pageLoad,
      timestamp: new Date().toISOString(),
    });
    
    // Fail test if page load is too slow
    expect(pageLoad).to.be.lessThan(5000); // 5 seconds max
  });
});

// Export type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Log a message to the Cypress console for debugging
       * @param message - The message to log
       */
      logState(message: string): Chainable<void>;
      
      /**
       * Debug an element by logging its properties, styles, and state
       * @param options - Options for debugging
       */
      debugElement(options?: {
        logProps?: boolean;
        logStyles?: boolean;
        logState?: boolean;
        logEvents?: boolean;
      }): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Login as a user
       * @param email - User email
       * @param password - User password
       */
      login(email?: string, password?: string): Chainable<void>;
      
      /**
       * Wait for the application to be ready (no loading states and animations complete)
       */
      waitForApp(): Chainable<void>;
      
      /**
       * Create a test SOP
       * @param data - SOP data
       */
      createTestSOP(data: {
        title: string;
        description: string;
        category?: string;
        steps?: Array<{ description: string; media?: string[] }>;
      }): Chainable<void>;
    }
  }
} 