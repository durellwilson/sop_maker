import { useState } from 'react';
import { InterviewStage, UseSOPStagesReturn, ExtendedStep } from '../types';

export function useSOPStages(): UseSOPStagesReturn {
  const [stage, setStage] = useState<InterviewStage>('intro');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedStages, setCompletedStages] = useState<InterviewStage[]>(['intro']);
  
  // Handle stage change with proper completion tracking
  const handleStageChange = (nextStage: InterviewStage) => {
    if (!completedStages.includes(nextStage)) {
      setCompletedStages(prev => [...prev, nextStage]);
    }
    setStage(nextStage);
  };
  
  // Helper functions for progress calculation
  const calculateProgress = (steps: ExtendedStep[] = []) => {
    const stages: InterviewStage[] = [
      'intro', 'title', 'description', 'category', 'stakeholders', 'definitions', 'steps', 'step-details', 'media-prompt', 'finalize'
    ];
    
    const currentIndex = stages.indexOf(stage);
    const totalStages = stages.length;
    
    // Special case for step-details since it can span multiple steps
    if (stage === 'step-details' && steps.length > 0) {
      const stepProgress = (currentStep - 1) / steps.length;
      const baseIndex = stages.indexOf('step-details');
      return ((baseIndex + stepProgress) / totalStages) * 100;
    }
    
    return (currentIndex / totalStages) * 100;
  };
  
  const getProgressStepNumber = (steps: ExtendedStep[] = []) => {
    const stages: InterviewStage[] = [
      'intro', 'title', 'description', 'category', 'stakeholders', 'definitions', 'steps', 'step-details', 'media-prompt', 'finalize'
    ];
    
    const currentIndex = stages.indexOf(stage);
    
    if (stage === 'step-details' && steps.length > 0) {
      return Math.min(currentStep + 7, 9);
    }
    
    return Math.min(currentIndex + 1, 9);
  };
  
  return {
    stage,
    setStage,
    currentStep,
    setCurrentStep,
    completedStages,
    setCompletedStages,
    handleStageChange,
    calculateProgress,
    getProgressStepNumber
  };
}
