import OpenAI from 'openai';

// Initialize OpenAI client with error handling
const createOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    throw new Error('OpenAI API key is not configured. Please add it to your .env.local file.');
  }
  
  try {
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: false,
    });
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    throw new Error('Failed to initialize OpenAI client');
  }
};

// Create the client lazily only when needed
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    openaiClient = createOpenAIClient();
  }
  return openaiClient;
};

// Export the client for reuse
export const openai = getOpenAIClient();

/**
 * Generate SOP instructions using OpenAI's GPT-4
 * @param prompt - User input about the SOP
 * @returns Generated instructions 
 */
export const generateInstructions = async (prompt: string): Promise<string> => {
  if (!prompt) {
    throw new Error('No prompt provided');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SOP writer. Create clear, concise step-by-step instructions for the given task or procedure. Focus on precision, safety, and efficiency. Break down complex tasks into simple steps. Use active voice and imperative verbs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || 'Unable to generate instructions';
  } catch (error) {
    console.error('Error generating instructions with OpenAI:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      }
    }
    throw new Error('Failed to generate instructions with AI');
  }
};

/**
 * Generate video script using OpenAI's GPT-4
 * @param description - Description of the task
 * @param steps - Existing steps to include in the script
 * @returns Generated video script
 */
export const generateVideoScript = async (
  description: string,
  steps: { step_number: number; instruction_text: string }[]
): Promise<string> => {
  if (!description) {
    throw new Error('No description provided');
  }

  const stepsText = steps.map(step => 
    `Step ${step.step_number}: ${step.instruction_text}`
  ).join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional video script writer specializing in instructional content. Create a clear, engaging script that will guide viewers through a process. Include an introduction, body with clear steps, and conclusion. Use conversational language that works well for spoken narration.'
        },
        {
          role: 'user',
          content: `I need a script for a video explaining the following SOP: "${description}".\n\nHere are the steps:\n${stepsText}\n\nPlease write a complete video script including introduction, steps with timing indicators, and conclusion.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content || 'Unable to generate video script';
  } catch (error) {
    console.error('Error generating video script with OpenAI:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      }
    }
    throw new Error('Failed to generate video script with AI');
  }
};

export default {
  generateInstructions,
  generateVideoScript
}; 