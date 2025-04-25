import { render, screen, fireEvent } from '@/utils/test-utils';
import { SOPEditor } from '@/components/SOPEditor';
import { mockAuthenticatedUser, mockApiResponse, cleanupMocks } from '@/utils/test-utils';

describe('SOPEditor', () => {
  beforeEach(() => {
    mockAuthenticatedUser();
  });

  afterEach(() => {
    cleanupMocks();
  });

  it('renders the editor with initial content', () => {
    const initialContent = {
      title: 'Test SOP',
      description: 'Test Description',
      steps: [],
    };

    render(<SOPEditor initialContent={initialContent} />);

    expect(screen.getByDisplayValue('Test SOP')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('handles step addition', async () => {
    render(<SOPEditor initialContent={{ title: '', description: '', steps: [] }} />);

    const addStepButton = screen.getByRole('button', { name: /add step/i });
    fireEvent.click(addStepButton);

    const stepInput = await screen.findByPlaceholderText(/enter step description/i);
    expect(stepInput).toBeInTheDocument();
  });

  it('saves content successfully', async () => {
    const mockSave = jest.fn();
    mockApiResponse('/api/sops', { id: 'test-sop-id' });

    render(
      <SOPEditor
        initialContent={{ title: 'Test', description: 'Test', steps: [] }}
        onSave={mockSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await screen.findByText(/saved successfully/i);
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles validation errors', async () => {
    render(<SOPEditor initialContent={{ title: '', description: '', steps: [] }} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await screen.findByText(/title is required/i);
  });

  it('supports markdown preview', () => {
    render(
      <SOPEditor
        initialContent={{
          title: 'Test',
          description: '**Bold** text',
          steps: [],
        }}
      />
    );

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    const boldText = screen.getByText('Bold');
    expect(boldText.tagName).toBe('STRONG');
  });
}); 