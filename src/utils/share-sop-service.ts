import { SOP, Step, Media } from '../types/database.types';
import { SharedSOP, SharedStep, SharedMedia } from '../types/shared-sop.types';

/**
 * Generate a unique shareable ID for an SOP
 */
export function generateShareableId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Convert an SOP to a shareable format
 */
export function prepareSOPForSharing(sop: SOP, steps: Step[], media: Media[]): SharedSOP {
  // Create the shared steps with their associated media
  const sharedSteps: SharedStep[] = steps.map(step => {
    const stepMedia = media.filter(m => m.step_id === step.id);
    
    return {
      ...step,
      media: stepMedia.map(m => ({
        ...m,
        file_type: getFileTypeFromURL(m.url || ''),
        file_path: m.url
      }))
    };
  });

  return {
    ...sop,
    steps: sharedSteps
  };
}

/**
 * Determine file type from URL
 */
function getFileTypeFromURL(url: string): string {
  if (!url) return 'unknown';
  
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return 'image';
  } else if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video';
  } else if (['pdf'].includes(extension)) {
    return 'document';
  } else {
    return 'unknown';
  }
}

/**
 * Store an SOP for sharing (placeholder for database integration)
 */
export async function storeSharedSOP(sharedSOP: SharedSOP, shareId: string): Promise<string> {
  // In a real implementation, this would store the SOP in a database with the shareId
  
  // For now, we'll simulate successful storage
  return `${window.location.origin}/shared-sop/${shareId}`;
}

/**
 * Get a shared SOP by ID (placeholder for database integration)
 */
export async function getSharedSOPById(shareId: string): Promise<SharedSOP | null> {
  // In a real implementation, this would retrieve the SOP from a database
  
  // For now, return null to indicate not found
  return null;
} 