"use client";

import { InterviewStage } from './types';

interface ContextualHelpProps {
  stage: InterviewStage;
}

export function ContextualHelp({ stage }: ContextualHelpProps) {
  return (
    <div className="text-xs text-gray-500 flex items-center mt-1">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
      <span>
        {stage === 'intro' && "I'm here to help you create a complete SOP. Just tell me what procedure you'd like to document."}
        {stage === 'title' && "A good SOP title should be clear and specific, like 'How to Process Customer Refunds'."}
        {stage === 'description' && "Describe when this procedure should be used and its purpose. This helps users understand why they're following these steps."}
        {stage === 'category' && "Choose a category to help organize this SOP in your collection."}
        {stage === 'stakeholders' && "List all roles involved in this process. Example: 'HR Manager, Department Head, IT Support'."}
        {stage === 'definitions' && "Include any specialized terms, acronyms or definitions needed to understand this SOP. If none, just type 'none'."}
        {stage === 'steps' && "Estimate how many steps this procedure requires. You can always add more later."}
        {stage === 'step-details' && "Describe exactly what should be done in this step. Be specific, clear, and include any safety considerations."}
        {stage === 'media-prompt' && "Photos and videos make SOPs much more effective. I can suggest what to capture."}
        {stage === 'finalize' && "Almost done! Review the SOP summary and add any final details before we create your SOP."}
      </span>
    </div>
  );
} 