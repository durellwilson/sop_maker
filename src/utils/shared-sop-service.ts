import { SharedSOP, ShareSOPResponse } from "@/types/shared-sop.types";
import { SOP, Step, Media } from "@/types/database.types";

/**
 * Fetches a shared SOP by its ID
 * 
 * @param id The unique identifier for the shared SOP
 * @returns The shared SOP data
 */
export async function getSharedSOPById(id: string): Promise<{ 
  sop: SOP, 
  steps: Step[], 
  media: Record<string, Media[]> 
}> {
  const response = await fetch(`/api/shared-sop/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch shared SOP: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Shares an SOP by creating a public link
 * 
 * @param sopId The ID of the SOP to share
 * @returns Response containing success status and share URL
 */
export async function shareSOP(sopId: string): Promise<ShareSOPResponse> {
  const response = await fetch('/api/shared-sop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ sopId }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to share SOP');
  }
  
  return await response.json();
} 