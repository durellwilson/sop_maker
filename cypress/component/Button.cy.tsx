import React from 'react';
import { mount } from 'cypress/react18';

// This is a basic test component - we'll test against this
const Button = ({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode; 
  onClick?: () => void 
}) => {
  return (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      onClick={onClick}
    >
      {children}
    </button>
  );
};

describe('Button Component', () => {
  it('renders with text', () => {
    mount(<Button>Click Me</Button>);
    cy.get('button').should('be.visible');
    cy.get('button').should('have.text', 'Click Me');
  });

  it('calls onClick handler when clicked', () => {
    const onClick = cy.stub().as('onClick');
    mount(<Button onClick={onClick}>Click Me</Button>);
    cy.get('button').click();
    cy.get('@onClick').should('have.been.calledOnce');
  });
}); 