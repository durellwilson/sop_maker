import { InterviewStage } from './types';

/**
 * Get a simulated transcript based on the current stage
 * This helps users understand what kind of input is expected
 */
export function getSimulatedTranscript(stage: InterviewStage): string {
  switch (stage) {
    case 'step-details':
      return `The next step is to verify all the components are properly assembled and tested before packaging.`;
    case 'title':
      return `The title of this SOP is Equipment Shutdown Procedure`;
    case 'description':
      return `This procedure outlines the proper steps to safely shut down laboratory equipment at the end of each work day to prevent damage and ensure safety.`;
    case 'category':
      return `This would fall under the Laboratory Safety category`;
    case 'stakeholders':
      return `The Lab Technician is responsible for performing the shutdown, and the Lab Manager should approve the procedure.`;
    case 'definitions':
      return `Key terms include: Power down sequence - the specific order in which equipment must be shut down. Cooldown period - time required before disconnecting certain equipment from power.`;
    default:
      return `I'd like to create a standard operating procedure for equipment shutdown.`;
  }
}

/**
 * Helper function to get a user ID token for authentication
 */
export async function getIdToken(currentUser: any): Promise<string | null> {
  try {
    if (currentUser) {
      return await currentUser.getIdToken();
    }
    
    // For development without authentication
    if (process.env.NODE_ENV === 'development') {
      return 'dev-token';
    }
    
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Format a time duration in seconds to a readable format (MM:SS)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper function to delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
