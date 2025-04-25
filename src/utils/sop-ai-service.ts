import { openai } from './openai';
import { Step } from '@/types/database.types';

// Define message structures
export type SOPMessageRole = 'system' | 'user' | 'assistant';

export interface SOPMessage {
  role: SOPMessageRole;
  content: string;
}

export interface SOPAIRequest {
  messages: SOPMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate improved SOP instructions from a basic description
 */
export async function generateSOPFromDescription(
  title: string,
  description: string,
  category: string,
  stakeholders: string = '',
  definitions: string = ''
): Promise<{ steps: Partial<Step>[] }> {
  try {
    const prompt = `
      Create a detailed Standard Operating Procedure (SOP) for: "${title}"
      
      Description: ${description}
      Category: ${category}
      ${stakeholders ? `Stakeholders: ${stakeholders}` : ''}
      ${definitions ? `Definitions/Terminology: ${definitions}` : ''}
      
      Follow these industry best practices:
      1. Create clear, sequential steps that are specific and actionable
      2. Use active voice and straightforward language
      3. Include safety precautions and compliance notes where appropriate
      4. Add quality control checkpoints where relevant
      5. Consider both setup/preparation and cleanup/finalization steps
      6. Identify roles and responsibilities for critical steps
      7. Include any required tools, materials, or prerequisites
      8. Highlight potential issues and troubleshooting guidance
      
      Each step should be:
      - Clear and actionable
      - Safety-focused where appropriate
      - Specific enough to be useful
      - Logically sequenced with dependencies clearly noted
      - Written for the appropriate audience expertise level
      
      Please respond with a JSON object containing an array of steps. Each step should include:
      1. order_index - The step number (starting from 1)
      2. instructions - Detailed instructions for this step
      3. role - The role responsible for this step (if applicable)
      4. safety_notes - Any safety considerations (if applicable)
      5. verification - How to verify this step was completed correctly (if applicable)
      
      Format your response as valid JSON that can be parsed with JSON.parse().
      Example:
      {
        "steps": [
          { 
            "order_index": 1, 
            "instructions": "Gather required safety equipment: gloves, safety glasses, and lab coat.",
            "role": "Operator",
            "safety_notes": "Never proceed without proper PPE.",
            "verification": "Visual inspection of all required PPE items."
          },
          { 
            "order_index": 2, 
            "instructions": "Ensure the work area is clean and free of obstructions.",
            "role": "Operator",
            "safety_notes": "Remove any trip hazards or flammable materials.",
            "verification": "Supervisor sign-off on workspace preparation."
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SOP writer specializing in creating clear, actionable step-by-step procedures. You have extensive knowledge of industry best practices across multiple sectors including Manufacturing, Healthcare, IT, Food Service, Laboratory, Finance, and Safety. Your SOPs follow all regulatory requirements and incorporate verification steps. Always format your response as parseable JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      if (!parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Invalid response format: missing steps array');
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Error in generateSOPFromDescription:', error);
    throw error;
  }
}

/**
 * Enhance a specific step's instructions with more detail
 */
export async function enhanceStepInstructions(
  stepInstruction: string,
  stepNumber: number,
  sopTitle: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at enhancing SOP instructions. Make instructions clearer, more detailed, and more actionable without changing their core meaning.'
        },
        {
          role: 'user',
          content: `Enhance the following Step ${stepNumber} for the SOP titled "${sopTitle}": "${stepInstruction}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || stepInstruction;
  } catch (error) {
    console.error('Error enhancing step instructions:', error);
    return stepInstruction; // Fall back to original if enhancement fails
  }
}

/**
 * Generate a suggested photo/video for a specific step
 */
export async function suggestMediaForStep(
  stepInstruction: string,
  stepNumber: number,
  sopTitle: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in visual documentation for training materials and standard operating procedures. You provide detailed, specific advice for capturing helpful photos or videos that clearly illustrate procedural steps. Consider lighting, angles, framing, and key elements that should be visible in the shot. Your suggestions should be practical and easy to follow for someone without photography expertise.'
        },
        {
          role: 'user',
          content: `Suggest what photo or video would be most helpful for documenting Step ${stepNumber} of this SOP titled "${sopTitle}": 
          
          Step instructions: "${stepInstruction}"
          
          Provide specific details about:
          1. What exactly should be in the frame
          2. What angle would be best
          3. Any specific details to focus on
          4. Whether a photo or video would be more appropriate
          5. If video, what actions should be demonstrated`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content || 'Take a photo showing this step being performed.';
  } catch (error) {
    console.error('Error suggesting media for step:', error);
    return 'Take a photo showing this step being performed.';
  }
}

/**
 * Process an audio transcript to extract SOP information
 */
export async function processAudioTranscript(
  transcript: string
): Promise<{
  title?: string;
  description?: string;
  category?: string;
  steps?: { order_index: number; instructions: string }[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You analyze transcripts of people describing procedures and extract structured SOP information.
          Format your response as parseable JSON with title, description, category, and steps fields.`
        },
        {
          role: 'user',
          content: `Extract SOP information from this transcript: "${transcript}"
          
          Return a JSON object with these fields:
          - title: The procedure title
          - description: A description of the procedure's purpose
          - category: The category this procedure belongs to
          - steps: An array of steps, each with order_index and instructions
          
          If any information is missing, include the field with null or an empty array.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse audio transcript response:', content);
      throw new Error('Failed to process audio transcript');
    }
  } catch (error) {
    console.error('Error processing audio transcript:', error);
    throw error;
  }
} 