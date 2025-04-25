import React, { useState } from 'react';
import { HelperComponentsProps, InterviewStage } from './types';

export function HelpTip({ children, tipId }: { children: React.ReactNode; tipId: string }) {
  const [showTip, setShowTip] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTip(!showTip)}
        className="text-blue-600 hover:text-blue-800 focus:outline-none"
        aria-label="Help"
        id={tipId}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </button>
      {showTip && (
        <div className="absolute z-50 w-64 bg-white rounded-md shadow-lg p-3 text-sm border border-gray-300 text-left">
          {children}
          <button
            type="button"
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            onClick={() => setShowTip(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export function ContextualHelp({ stage }: { stage: InterviewStage }) {
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

export function ProgressIndicator({ 
  stage, 
  currentStep, 
  steps, 
  completedStages,
  calculateProgress
}: {
  stage: InterviewStage;
  currentStep: number;
  steps: any[];
  completedStages: InterviewStage[];
  calculateProgress: () => number;
}) {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Progress</span>
        <span className="font-medium">{Math.round(calculateProgress())}%</span>
      </div>
      
      <div className="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ 
            width: `${calculateProgress()}%` 
          }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between">
        {/* Progress step indicators */}
        <div className="flex items-center justify-between w-full">
          {['title', 'description', 'category', 'stakeholders', 'definitions', 'step-details', 'media-prompt', 'finalize'].map((s, index) => {
            const isCompleted = completedStages.includes(s as InterviewStage);
            const isCurrent = stage === s;
            
            return (
              <div key={s} className="flex flex-col items-center">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1
                    ${isCompleted 
                      ? 'bg-blue-600 text-white' 
                      : isCurrent
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-600'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs text-gray-500 hidden sm:inline-block">
                  {s === 'step-details' ? 'Steps' : 
                    s === 'stakeholders' ? 'Roles' :
                    s === 'definitions' ? 'Terms' :
                    s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
