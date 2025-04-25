import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SOPWizard from '../index';
import { SOPWizardProps } from '../types';

// Mock the context providers
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: null
  })
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}));

// Mock the fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ steps: [] })
  })
) as jest.Mock;

describe('SOPWizard', () => {
  const mockProps: SOPWizardProps = {
    onComplete: jest.fn(),
    onCancel: jest.fn(),
    isOpen: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component and displays the welcome message', () => {
    render(<SOPWizard {...mockProps} />);
    
    expect(screen.getByText(/I'm your SOP Assistant/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<SOPWizard {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText(/I'm your SOP Assistant/)).not.toBeInTheDocument();
  });

  it('calls onCancel when close button is clicked', () => {
    render(<SOPWizard {...mockProps} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('submits user input and advances to the next stage', async () => {
    render(<SOPWizard {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type your response...');
    fireEvent.change(input, { target: { value: 'Test SOP Title' } });
    
    const submitButton = screen.getByRole('button', { name: '' }); // Submit button has no text, only an icon
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Test SOP Title/)).toBeInTheDocument();
    });
  });
}); 