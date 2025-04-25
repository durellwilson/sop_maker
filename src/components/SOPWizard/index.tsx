"use client";

import React, { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SOPWizardProps, Message } from './types';
import { useSOPStages } from './hooks/useSOPStages';
import { useSOPData } from './hooks/useSOPData';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { MessagesDisplay } from './MessagesDisplay';
import { InputArea } from './InputArea';
import { SOPSummary } from './SOPSummary';
import { HelpTip, ProgressIndicator } from './HelperComponents';
import { getIdToken, delay } from './helpers';
import { BinaryChoiceButtons } from './BinaryChoiceButtons';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useTheme } from '@/contexts/ThemeContext';

// Update ErrorFallback component with proper typing
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mt-2">
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="mb-4">{error.message || "An unexpected error occurred"}</p>
    <button
      onClick={resetErrorBoundary}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Try again
    </button>
  </div>
);

// Add a custom API fetcher with better error handling
const fetchSafely = async (url: string, options: RequestInit = {}): Promise<any> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    
    if (!response.ok) {
      // Try to get more error details if available
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Text isn't JSON, use as is
      }
      
      const error = new Error(
        errorJson?.message || 
        errorJson?.error || 
        `API responded with status: ${response.status}`
      );
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).details = errorJson || errorText;
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export default function SOPWizard({ onComplete, onCancel, isOpen }: SOPWizardProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedSopId, setSavedSopId] = useState<string | null>(null);
  
  // Custom hooks
  const { currentUser } = useAuth();
  const { 
    sopData, 
    setSopData, 
    steps, 
    setSteps,
    saveStep,
    equipment,
    setEquipment,
    addEquipment,
    removeEquipment
  } = useSOPData();
  
  const {
    stage,
    setStage,
    currentStep,
    setCurrentStep,
    completedStages,
    setCompletedStages,
    handleStageChange,
    calculateProgress,
    getProgressStepNumber
  } = useSOPStages();
  
  // Add theme hook near the top state hooks
  const { theme, toggleTheme } = useTheme();
  
  // Add a new state for 5S implementation
  const [fiveS, setFiveS] = useState({
    sort: '',
    setInOrder: '',
    shine: '',
    standardize: '',
    sustain: ''
  });
  
  // Add a previousStage state variable to support the cancel flow
  const [previousStage, setPreviousStage] = useState<InterviewStage>('intro');
  
  // Handle speech recognition transcript
  const handleTranscriptReady = (transcript: string) => {
    setUserInput(transcript);
    
    // Automatically submit after a short delay
    setTimeout(() => {
      addMessage('user', transcript);
      processUserInput(transcript);
    }, 500);
  };
  
  const {
    isRecording,
    isPending,
    recordingTime,
    showRetry,
    lastError,
    visualizeAudio,
    startRecording,
    stopRecording,
    handleRetryRecording,
    formatTime
  } = useSpeechRecognition(handleTranscriptReady);
  
  // Add message to chat
  const addMessage = (sender: 'ai' | 'user', text: string) => {
    setMessages(prev => [...prev, {
      sender,
      text,
      timestamp: new Date()
    }]);
  };
  
  // Process AI response based on current stage
  const generateAIResponse = async (input: string) => {
    setIsProcessing(true);
    
    try {
      // Get the user's token for authentication
      const token = await getIdToken(currentUser);
      if (!token) {
        addMessage('ai', "I'm having trouble authenticating your session. Please try refreshing the page.");
        setIsProcessing(false);
        return;
      }
      
      let aiResponse = '';
      let nextStage = stage;
      
      // Improve response contextual awareness
      const lowerInput = input.toLowerCase();
      
      // Handle common disruptive inputs gracefully
      if (lowerInput.includes('start over') || lowerInput.includes('restart')) {
        aiResponse = "I'll start over with a fresh SOP. What process or procedure would you like to document?";
        setSopData({
          title: '',
          description: '',
          category: '',
          stakeholders: '',
          definitions: '',
          status: 'draft'
        });
        setSteps([]);
        setEquipment([]);
        setFiveS({
          sort: '',
          setInOrder: '',
          shine: '',
          standardize: '',
          sustain: ''
        });
        nextStage = 'title';
        setMessages([]);
        addMessage('ai', aiResponse);
        setIsProcessing(false);
        return;
      }
      
      if (lowerInput.includes('help') || lowerInput === '?') {
        // Provide contextual help based on current stage
        switch (stage) {
          case 'intro':
            aiResponse = "I'm here to help you create a Standard Operating Procedure (SOP). I'll guide you through this step-by-step, asking for a title, description, steps, and more. Ready to get started?";
            break;
          case 'title':
            aiResponse = "I need a clear title for your SOP. This should briefly describe the process or procedure you're documenting. For example: 'Customer Complaint Handling Process' or 'Server Backup Procedure'.";
            break;
          case 'description':
            aiResponse = "Please provide a brief description of this procedure. Explain its purpose, when it should be used, and why it's important. This helps users understand the context of the SOP.";
            break;
          default:
            aiResponse = "I'm here to help you create your SOP. You can say 'start over' to begin again, or continue providing information for the current step.";
        }
        addMessage('ai', aiResponse);
        setIsProcessing(false);
        return;
      }
      
      // Stage-specific processing with improved conversation
      switch (stage) {
        case 'intro':
          aiResponse = "Great! Let's create your SOP. What process or procedure would you like to document today? Please provide a title.";
          nextStage = 'title';
          break;
          
        case 'title':
          // Intelligently clean up and format the title
          let formattedTitle = input.trim();
          if (formattedTitle.toLowerCase().startsWith('how to')) {
            formattedTitle = formattedTitle;
          } else if (!formattedTitle.toLowerCase().startsWith('sop') && !formattedTitle.toLowerCase().includes('procedure')) {
            if (!/[.!?]$/.test(formattedTitle)) {
              formattedTitle += formattedTitle.toLowerCase().startsWith('how') ? '' : ' Procedure';
            }
          }
          
          // Save the formatted title
          setSopData(prev => ({ ...prev, title: formattedTitle }));
          
          aiResponse = `"${formattedTitle}" - that's a clear title. Now, please provide a brief description of this procedure. What is its purpose and when should it be used?`;
          nextStage = 'description';
          break;
          
        case 'description':
          // Enhanced description handling
          const description = input.trim();
          
          // Suggest improvements if description is too short
          if (description.split(' ').length < 5) {
            aiResponse = "That description seems a bit short. A good description helps users understand when and why to use this procedure. Could you provide a little more detail?";
            addMessage('ai', aiResponse);
            setIsProcessing(false);
            return;
          }
          
          // Save the description
          setSopData(prev => ({ ...prev, description }));
          
          aiResponse = "Thanks for the description. What category would you place this SOP in? For example: Operations, Human Resources, IT, Finance, Safety, Quality Control, etc.";
          nextStage = 'category';
          break;
          
        case 'category':
          // Save the category
          setSopData(prev => ({ ...prev, category: input }));
          aiResponse = "Who are the stakeholders for this procedure? Please list the roles or individuals who perform, supervise, or approve this process.";
          nextStage = 'stakeholders';
          break;
          
        case 'stakeholders':
          // Save stakeholders
          setSopData(prev => ({ ...prev, stakeholders: input }));
          aiResponse = "Are there any specific equipment or tools required for this procedure? Please list them, or say 'none' if not applicable.";
          nextStage = 'equipment';
          break;
          
        case 'equipment':
          // Save equipment information
          if (input.toLowerCase() !== 'none') {
            // Try to parse equipment items from the text
            const equipmentItems = input.split(',').map(item => item.trim())
              .filter(item => item.length > 0)
              .map(name => ({ 
                name, 
                description: '', 
                safety: '', 
                maintenance: '' 
              }));
            
            // Add equipment items
            equipmentItems.forEach(item => addEquipment(item));
            
            aiResponse = `I've recorded these equipment items: ${equipmentItems.map(e => e.name).join(', ')}. 
            For each piece of equipment, we'll add safety and maintenance guidelines later.
            
            Now, do you follow 5S principles (Sort, Set in Order, Shine, Standardize, Sustain) in your workplace? Reply 'yes' if you want to include 5S methodology in this SOP, or 'no' to skip.`;
          } else {
            aiResponse = "No equipment needed. Do you follow 5S principles (Sort, Set in Order, Shine, Standardize, Sustain) in your workplace? Reply 'yes' if you want to include 5S methodology in this SOP, or 'no' to skip.";
          }
          nextStage = '5s-prompt';
          break;
          
        case '5s-prompt':
          if (input.toLowerCase().includes('yes')) {
            aiResponse = "Great! Let's include 5S methodology. For Sort (Seiri), please describe how unnecessary items are identified and removed in this process.";
            nextStage = '5s-sort';
          } else {
            aiResponse = "Are there any specialized terms, acronyms, or definitions that should be included in this SOP? If not, just say 'none'.";
            nextStage = 'definitions';
          }
          break;
          
        case '5s-sort':
          // Save Sort (Seiri) information
          setFiveS(prev => ({ ...prev, sort: input }));
          aiResponse = "For Set in Order (Seiton), please describe how tools, parts, and materials should be arranged for this procedure.";
          nextStage = '5s-set-in-order';
          break;
          
        case '5s-set-in-order':
          // Save Set in Order (Seiton) information
          setFiveS(prev => ({ ...prev, setInOrder: input }));
          aiResponse = "For Shine (Seiso), please describe the cleaning and inspection requirements for this procedure and its work area.";
          nextStage = '5s-shine';
          break;
          
        case '5s-shine':
          // Save Shine (Seiso) information
          setFiveS(prev => ({ ...prev, shine: input }));
          aiResponse = "For Standardize (Seiketsu), please describe how these practices will be made consistent across all instances of this procedure.";
          nextStage = '5s-standardize';
          break;
          
        case '5s-standardize':
          // Save Standardize (Seiketsu) information
          setFiveS(prev => ({ ...prev, standardize: input }));
          aiResponse = "For Sustain (Shitsuke), please describe how adherence to this procedure will be maintained over time (e.g., audits, training).";
          nextStage = '5s-sustain';
          break;
          
        case '5s-sustain':
          // Save Sustain (Shitsuke) information
          setFiveS(prev => ({ ...prev, sustain: input }));
          aiResponse = "Great! I've recorded the 5S methodology for this procedure. Are there any specialized terms, acronyms, or definitions that should be included in this SOP? If not, just say 'none'.";
          nextStage = 'definitions';
          break;
          
        case 'definitions':
          // Save definitions
          setSopData(prev => ({ ...prev, definitions: input.toLowerCase() === 'none' ? '' : input }));
          
          try {
            // Use AI to suggest steps based on the info we have
            addMessage('ai', "Now I'll generate steps for your SOP based on the information you've provided. This might take a moment...");
            
            const data = await fetchSafely('/api/sop-wizard', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                operation: 'generate-sop',
                title: sopData.title,
                description: sopData.description,
                category: sopData.category,
                stakeholders: sopData.stakeholders,
                definitions: sopData.definitions
              })
            });
            
            if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
              // Ensure proper structure for each step
              const formattedSteps = data.steps.map((step, index) => ({
                order_index: index + 1,
                instructions: step.instructions || step.description || '',
                name: step.name || `Step ${index + 1}`,
                description: step.description || step.instructions || '',
                safety_notes: step.safety_notes || ''
              }));
              
              setSteps(formattedSteps);
              
              aiResponse = `I've created ${formattedSteps.length} steps for your SOP. Let's review them one by one. You can edit any step if needed.
              \nStep 1: ${formattedSteps[0].instructions}
              \nDoes this look good for Step 1, or would you like to revise it?`;
              setCurrentStep(1);
              nextStage = 'step-details';
            } else {
              // Fall back to manual step creation with a better prompt
              aiResponse = "I wasn't able to generate specific steps for this SOP automatically. Let's create them together. How many steps do you think this procedure will have? (You can specify a number or just describe the first step directly)";
              nextStage = 'steps';
            }
          } catch (error) {
            console.error('Error generating steps:', error);
            aiResponse = "I encountered an issue while generating steps. Let's create them manually. How many steps do you think this procedure will have? Or you can start describing the first step right away.";
            nextStage = 'steps';
          }
          break;
          
        case 'steps':
          // Check if we need to add more steps
          if (lowerInput.includes('no') || lowerInput.includes('done') || lowerInput.includes('complete') || lowerInput.includes('finished')) {
            if (steps.length === 0) {
              aiResponse = "We need at least one step for your SOP. Please describe the first step in this procedure.";
              addMessage('ai', aiResponse);
              setIsProcessing(false);
              return;
            }
            
            // Move to finalization if we have steps
            aiResponse = `Great! I've recorded ${steps.length} step${steps.length > 1 ? 's' : ''} for your SOP. Let's review what we have so far before finalizing.`;
            nextStage = 'finalize';
          } else {
            // Add a new step
            const newStep = {
              order_index: steps.length,
              instructions: input,
              description: ''
            };
            
            setSteps(prev => [...prev, newStep]);
            
            // Create a more varied and engaging response based on step count
            if (steps.length === 0) {
              aiResponse = "I've added that as your first step. What's the next step in this procedure? Or say 'done' if that's the only step needed.";
            } else if (steps.length < 3) {
              aiResponse = `Step ${steps.length + 1} added. What comes next? Or say 'done' if you've completed all the steps.`;
            } else {
              aiResponse = [
                `Got it, I've added step ${steps.length + 1}. What's the next step?`,
                `Added as step ${steps.length + 1}. Please continue with the next step, or say 'done' if finished.`,
                `I've recorded that as step ${steps.length + 1}. What follows this step? Say 'done' if that's all.`
              ][Math.floor(Math.random() * 3)];
            }
            
            // Offer relevant suggestions based on the steps so far
            if (steps.length === 2 && !lowerInput.includes('verify') && !lowerInput.includes('check')) {
              aiResponse += " Consider adding verification steps to ensure quality control.";
            } else if (steps.length === 3 && !lowerInput.includes('safety') && !sopData.title.toLowerCase().includes('safety')) {
              aiResponse += " Don't forget to include any relevant safety precautions if applicable.";
            }
          }
          break;
          
        case 'step-details':
          if (!input.startsWith('__button_')) {
            // Process normal text input
            if (input.toLowerCase().includes('revise') || input.toLowerCase().includes('change') || input.toLowerCase().includes('edit')) {
              aiResponse = "How would you like to revise this step? Please describe the step again with your changes.";
              // Stay on the same stage to get their revision
              break;
            } else if (input.toLowerCase().includes('looks good') || input.toLowerCase().includes('good')) {
              // User confirms step is good, move to next
              const nextStepNum = currentStep + 1;
              
              if (nextStepNum <= steps.length) {
                // Move to next step that's already defined
                setCurrentStep(nextStepNum);
                const nextStep = steps.find(s => s.order_index === nextStepNum);
                
                aiResponse = `Great! Let's review Step ${nextStepNum}${nextStep && nextStep.instructions ? ':' : '.'}
                ${nextStep && nextStep.instructions ? `\n${nextStep.instructions}` : `\nWhat should be done next?`}
                ${nextStep && nextStep.instructions ? `\nDoes this look good, or would you like to revise it?` : ''}`;
              } else {
                // Finished with all steps
                aiResponse = "Excellent! We've documented all the steps. Would you like me to suggest what photos or videos might be helpful for each step?";
                nextStage = 'media-prompt';
              }
              break;
            } else if (currentStep > steps.length) {
              // This is adding a new step
              const newStep = {
                order_index: currentStep,
                instructions: input,
                name: `Step ${currentStep}`
              };
              
              setSteps(prev => [...prev, newStep]);
              
              aiResponse = `I've added Step ${currentStep}. Does this look good, or would you like to revise it? Type "add another step" to continue adding steps or "done" when you're finished.`;
            } else {
              // This is saving/updating the current step
              // Update or create the current step
              const updatedSteps = [...steps];
              const stepIndex = updatedSteps.findIndex(s => s.order_index === currentStep);
              
              if (stepIndex >= 0) {
                // Update existing step
                updatedSteps[stepIndex] = {
                  ...updatedSteps[stepIndex],
                  instructions: input,
                  name: `Step ${currentStep}`
                };
              } else {
                // Create new step
                updatedSteps.push({
                  order_index: currentStep,
                  instructions: input,
                  name: `Step ${currentStep}`
                });
              }
              
              setSteps(updatedSteps);
              
              // Ask if they want to add another step
              if (input.toLowerCase().includes('add another') || input.toLowerCase().includes('next step')) {
                const nextStepNum = currentStep + 1;
                setCurrentStep(nextStepNum);
                aiResponse = `Let's move to Step ${nextStepNum}. What happens next?`;
              } else if (input.toLowerCase().includes('done')) {
                aiResponse = "Great! We've documented all the steps. Would you like me to suggest what photos or videos might be helpful for each step?";
                nextStage = 'media-prompt';
              } else {
                aiResponse = `I've updated Step ${currentStep}. Does this look good? Type "add another step" to continue, or "done" when you're finished with all steps.`;
              }
            }
          } else {
            // Handle button clicks
            const choice = input.replace('__button_', '');
            
            if (choice === 'yes') {
              // "Looks good" button was clicked
              const nextStepNum = currentStep + 1;
              
              if (nextStepNum <= steps.length) {
                // Move to next step that's already defined
                setCurrentStep(nextStepNum);
                const nextStep = steps.find(s => s.order_index === nextStepNum);
                
                aiResponse = `Great! Let's review Step ${nextStepNum}${nextStep && nextStep.instructions ? ':' : '.'}
                ${nextStep && nextStep.instructions ? `\n${nextStep.instructions}` : `\nWhat should be done next?`}
                ${nextStep && nextStep.instructions ? `\nDoes this look good, or would you like to revise it?` : ''}`;
              } else {
                // Ask if they want to add another step
                aiResponse = `Would you like to add another step? Type "add another step" to continue or "done" to move forward.`;
              }
            } else {
              // "Revise it" button was clicked
              aiResponse = "How would you like to revise this step? Please describe the step again with your changes.";
            }
          }
          break;
          
        case 'media-prompt':
          // Don't process input if it came from a button click
          if (!input.startsWith('__button_')) {
            if (input.toLowerCase().includes('yes')) {
              await generateMediaSuggestions();
            } else {
              aiResponse = "No problem! Is there anything else you'd like to add to this SOP before we finalize it?";
              nextStage = 'finalize';
            }
          } else {
            // Handle button clicks
            const choice = input.replace('__button_', '');
            if (choice === 'yes') {
              await generateMediaSuggestions();
            } else {
              aiResponse = "No problem! Is there anything else you'd like to add to this SOP before we finalize it?";
              nextStage = 'finalize';
            }
          }
          break;
          
        case 'finalize':
          if (lowerInput.includes('yes') || lowerInput.includes('save') || lowerInput.includes('complete') || lowerInput.includes('done')) {
            aiResponse = "Perfect! I'm saving your SOP now...";
            
            // Save the SOP to the server
            const sopId = await saveSopToServer();
            
            if (sopId) {
              nextStage = 'completed';
            } else {
              // Handle save error
              aiResponse = "I had trouble saving your SOP. Would you like to try again?";
            }
          } else if (lowerInput.includes('no') || lowerInput.includes('edit') || lowerInput.includes('change')) {
            aiResponse = "What would you like to modify? You can say 'title', 'description', 'steps', or specify exactly what you want to change.";
            nextStage = 'edit';
          } else {
            // Unclear response
            aiResponse = "I'm not sure what you'd like to do. Should I save this SOP as is, or would you like to make changes?";
          }
          break;
          
        case 'edit':
          // Handle different types of edits
          if (lowerInput.includes('title')) {
            aiResponse = `The current title is "${sopData.title}". What would you like to change it to?`;
            nextStage = 'edit-title';
          } else if (lowerInput.includes('description')) {
            aiResponse = `The current description is: "${sopData.description}". What would you like to change it to?`;
            nextStage = 'edit-description';
          } else if (lowerInput.includes('step')) {
            // Check if a specific step is mentioned
            const stepMatch = input.match(/step\s*(\d+)/i);
            if (stepMatch && stepMatch[1]) {
              const stepNum = parseInt(stepMatch[1], 10);
              if (stepNum > 0 && stepNum <= steps.length) {
                setCurrentStep(stepNum - 1);
                aiResponse = `Current step ${stepNum}: "${steps[stepNum-1].instructions}". What would you like to change it to?`;
                nextStage = 'edit-step';
              } else {
                aiResponse = `There's no step ${stepNum}. This SOP has ${steps.length} steps. Which one would you like to edit?`;
              }
            } else {
              aiResponse = `This SOP has ${steps.length} steps. Which one would you like to edit? Please specify the step number.`;
            }
          } else if (lowerInput.includes('add step') || lowerInput.includes('new step')) {
            aiResponse = "What step would you like to add to the SOP?";
            nextStage = 'steps';
          } else {
            aiResponse = "I'm not sure what you'd like to edit. You can edit the title, description, or specific steps. Please specify, or say 'done' to finalize the SOP.";
          }
          break;
          
        // Handle edit-specific stages
        case 'edit-title':
          setSopData(prev => ({ ...prev, title: input }));
          aiResponse = `Title updated to "${input}". Would you like to make any other changes, or should I save the SOP?`;
          nextStage = 'finalize';
          break;
        
        case 'edit-description':
          setSopData(prev => ({ ...prev, description: input }));
          aiResponse = "Description updated. Would you like to make any other changes, or should I save the SOP?";
          nextStage = 'finalize';
          break;
        
        case 'edit-step':
          const updatedSteps = [...steps];
          updatedSteps[currentStep] = {
            ...updatedSteps[currentStep],
            instructions: input
          };
          setSteps(updatedSteps);
          aiResponse = `Step ${currentStep + 1} updated. Would you like to make any other changes, or should I save the SOP?`;
          nextStage = 'finalize';
          break;
        
        default:
          aiResponse = "I'm not sure what to do next. Let's start over.";
          nextStage = 'intro';
      }
      
      // Add AI response after a short delay for realism
      await delay(1000);
      
      // Add AI response
      addMessage('ai', aiResponse);
      
      // Update the stage
      handleStageChange(nextStage);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      addMessage('ai', 'Sorry, I encountered an error. Please try again or refresh the page.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle user input submission
  const processUserInput = (input: string) => {
    // Empty input handling
    if (!input.trim()) {
      addMessage('ai', "I didn't catch that. Could you please provide more information?");
      return;
    }
    
    // Add user message to the chat
    addMessage('user', input);
    
    // Clear input field
    setUserInput('');
    
    // Process special commands first
    const lowercaseInput = input.toLowerCase().trim();
    
    if (lowercaseInput === 'preview') {
      // Toggle preview mode
      setIsPreviewExpanded(!isPreviewExpanded);
      return;
    } else if (lowercaseInput === 'summary') {
      // Show summary
      setShowSummary(true);
      return;
    } else if (lowercaseInput === 'export') {
      // Handle export command
      addMessage('ai', "To export your SOP, first save it and then use the export options on the SOP detail page.");
      return;
    } else if (lowercaseInput === 'cancel' || lowercaseInput === 'exit') {
      // Handle cancellation
      if (steps.length > 0 || sopData.title) {
        addMessage('ai', "You have unsaved work. Are you sure you want to cancel? Type 'yes' to confirm or 'no' to continue working on this SOP.");
        setStage('confirm-cancel');
        return;
      } else {
        onCancel();
        return;
      }
    } else if (stage === 'confirm-cancel') {
      if (lowercaseInput === 'yes' || lowercaseInput === 'y') {
        onCancel();
        return;
      } else {
        addMessage('ai', "Let's continue where we left off.");
        setStage(previousStage);
        return;
      }
    }
    
    // Process normal input through the AI response generator
    generateAIResponse(input);
    
    // Scroll to bottom after new messages
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Initial AI greeting when component mounts
  React.useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          sender: 'ai',
          text: "👋 Hi there! I'm your SOP Assistant. I'll help you create a detailed Standard Operating Procedure through a simple conversation. Let's make this easy! Ready to start?",
          timestamp: new Date()
        }
      ]);
      setStage('intro');
    }
  }, [isOpen, setStage]);
  
  // Scroll to bottom of messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when stage changes
  React.useEffect(() => {
    if (inputRef.current && !isProcessing && !isPending) {
      inputRef.current.focus();
    }
  }, [stage, isProcessing, isPending]);
  
  // Add this helper function before the return statement
  const generateMediaSuggestions = async () => {
    let mediaResponse = "Here are my suggestions for visual documentation:\n\n";
    
    try {
      const token = await getIdToken(currentUser);
      if (!token) {
        throw new Error("Authentication failed");
      }
      
      for (let i = 0; i < Math.min(steps.length, 3); i++) {
        const step = steps[i];
        try {
          const data = await fetchSafely('/api/sop-wizard', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              operation: 'suggest-media',
              instruction: step.instructions,
              stepNumber: step.order_index,
              sopTitle: sopData.title
            })
          });
          
          if (data.suggestion) {
            // Limit suggestion length for conciseness
            let suggestion = data.suggestion;
            if (suggestion.length > 150) {
              suggestion = suggestion.substring(0, 150) + "...";
            }
            mediaResponse += `Step ${step.order_index}: ${suggestion}\n\n`;
          }
        } catch (stepError) {
          console.error(`Error generating media for step ${step.order_index}:`, stepError);
          mediaResponse += `Step ${step.order_index}: Unable to generate suggestion.\n\n`;
        }
        
        // If we have many steps, don't try to do them all at once
        if (steps.length > 3 && i === 2) {
          mediaResponse += `(I've shown suggestions for the first 3 steps. You'll be able to get more specific recommendations for each step in the editor.)\n\n`;
          break;
        }
      }
      
      addMessage('ai', `${mediaResponse}You'll be able to add these photos or videos in the SOP editor. Is there anything else you'd like to add to this SOP before we finalize it?`);
      handleStageChange('finalize');
    } catch (error) {
      console.error('Error generating media suggestions:', error);
      addMessage('ai', "I couldn't generate specific media suggestions right now, but you'll be able to add photos or videos to each step in the SOP editor. Is there anything else you'd like to add to this SOP before we finalize it?");
      handleStageChange('finalize');
    }
  };
  
  // At the component level, add a new function to handle choice buttons
  const handleChoiceSelected = (choice: string) => {
    if (!choice.startsWith('__button_')) return;
    
    addMessage('user', choice === '__button_yes' ? 'Yes' : 'No');
    processUserInput(choice);
  };
  
  // Add a function to save the SOP to the server
  const saveSopToServer = async () => {
    setIsProcessing(true);
    
    try {
      // Get the user's token for authentication
      const token = await getIdToken(currentUser);
      if (!token) {
        addMessage('ai', "I'm having trouble authenticating your session. Please try refreshing the page.");
        setIsProcessing(false);
        return null;
      }
      
      // Prepare SOP data with additional fields
      const completeSOPData = {
        ...sopData,
        status: 'draft',
        equipment: equipment,
        five_s: fiveS,
        created_at: new Date().toISOString()
      };
      
      // Log the data being sent
      console.log('Saving SOP to server:', completeSOPData);
      
      // First create the SOP
      const response = await fetch('/api/sops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(completeSOPData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating SOP:', errorText);
        
        // Try to parse error as JSON
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to create SOP');
        } catch (e) {
          throw new Error('Failed to create SOP: ' + (response.status === 401 ? 'Authentication error' : errorText));
        }
      }
      
      const sopResponse = await response.json();
      const createdSopId = sopResponse.sop?.id || sopResponse.id;
      
      if (!createdSopId) {
        throw new Error('Server returned success but no SOP ID was provided');
      }
      
      // Now create all the steps for this SOP
      const stepsPromises = steps.map(async (step: Partial<Step>, index: number) => {
        const stepData = {
          ...step,
          sop_id: createdSopId,
          order_index: index
        };
        
        const stepResponse = await fetch('/api/steps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(stepData)
        });
        
        if (!stepResponse.ok) {
          throw new Error(`Failed to create step ${index + 1}`);
        }
        
        return await stepResponse.json();
      });
      
      // Wait for all steps to be created
      await Promise.all(stepsPromises);
      
      // Store the SOP ID for later use
      setSavedSopId(createdSopId);
      setShowSuccess(true);
      
      // Add a success message
      addMessage('ai', `Great! I've saved your SOP "${sopData.title}". You can now view and edit it at any time from your dashboard.`);
      
      return createdSopId;
    } catch (error) {
      console.error('Error saving SOP:', error);
      addMessage('ai', `I'm sorry, there was a problem saving your SOP: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Retry logic for database issues
      if (error instanceof Error && 
          (error.message.includes('database') || 
           error.message.includes('table') || 
           error.message.includes('relation'))) {
        
        addMessage('ai', "I'm trying to fix the database issue and retry...");
        
        try {
          // Import and use the fix-database utility
          const { fixDatabase } = await import('@/utils/fix-database');
          const fixResult = await fixDatabase();
          
          if (fixResult.success) {
            addMessage('ai', "Database fixed! Let me try saving your SOP again.");
            // Retry the save operation after a brief delay
            setTimeout(saveSopToServer, 1000);
          } else {
            addMessage('ai', "I couldn't fix the database issue automatically. Please try again later or contact support.");
          }
        } catch (fixError) {
          addMessage('ai', "I couldn't fix the database issue. Please try again later.");
        }
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // If not open, don't render
  if (!isOpen) return null;
  
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset any state that could have caused the error
        setIsProcessing(false);
        setIsPending(false);
      }}
    >
      <div className={`fixed inset-0 bg-black ${theme === 'dark' ? 'bg-opacity-80' : 'bg-opacity-60'} backdrop-blur-lg flex justify-center items-center z-50 p-4`}>
        <div className={`${theme === 'dark' ? 'glass-card-dark' : 'glass-card'} rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
            <div className="flex items-center">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>SOP Creation Wizard</h2>
              <HelpTip tipId="wizard-help">
                <strong>About the SOP Creation Wizard</strong>
                <p className="mt-1">
                  This wizard helps you create detailed Standard Operating Procedures through a 
                  conversation. You can type responses or use voice recording.
                </p>
                <p className="mt-1">
                  The AI will guide you through defining your SOP title, description, and steps.
                </p>
              </HelpTip>
            </div>
            <div className="flex items-center space-x-4">
              {isProcessing && (
                <div className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} flex items-center`}>
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Thinking...
                </div>
              )}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button 
                onClick={onCancel}
                className={`text-gray-500 hover:text-gray-700 focus:outline-none ${theme === 'dark' ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Pass theme to child components */}
          <MessagesDisplay 
            messages={messages} 
            messagesEndRef={messagesEndRef} 
            stage={stage}
            onChoiceSelected={handleChoiceSelected}
            isProcessing={isProcessing}
            theme={theme}
          />
          
          {/* SOP Summary in finalize stage */}
          {stage === 'finalize' && (
            <div className="relative">
              <button 
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className={`absolute top-2 right-2 ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'} p-1.5 rounded-full hover:opacity-80 z-10`}
                title={isPreviewExpanded ? "Collapse preview" : "Expand preview"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isPreviewExpanded ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </button>
              <div className={`transition-all duration-300 ${isPreviewExpanded ? `fixed inset-0 z-50 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-8 overflow-auto` : ''}`}>
                <SOPSummary 
                  sopData={sopData} 
                  steps={steps} 
                  equipment={equipment} 
                  fiveS={fiveS}
                  theme={theme}
                />
              </div>
              {isPreviewExpanded && (
                <button 
                  onClick={() => setIsPreviewExpanded(false)}
                  className={`fixed bottom-4 right-4 ${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg z-50 transition-colors shadow-md`}
                >
                  Close Preview
                </button>
              )}
            </div>
          )}
          
          {/* Input area */}
          <InputArea
            userInput={userInput}
            setUserInput={setUserInput}
            handleSubmit={processUserInput}
            isProcessing={isProcessing}
            isPending={isPending}
            isRecording={isRecording}
            startRecording={startRecording}
            showRetry={showRetry}
            lastError={lastError}
            handleRetryRecording={handleRetryRecording}
            inputRef={inputRef}
            stage={stage}
            recordingTime={recordingTime}
            formatTime={formatTime}
            visualizeAudio={visualizeAudio}
            stopRecording={stopRecording}
            theme={theme}
          />
          
          {/* Progress indicator */}
          <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4`}>
            <ProgressIndicator
              stage={stage}
              currentStep={currentStep}
              steps={steps}
              completedStages={completedStages}
              calculateProgress={() => calculateProgress(steps)}
              theme={theme}
            />
          </div>
          
          {/* Success message */}
          {showSuccess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-md text-center`}>
                <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-green-100 mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  SOP Created Successfully!
                </h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Your SOP has been saved and is now available in your SOP collection.
                </p>
                <button 
                  onClick={() => {
                    if (onComplete) {
                      onComplete(sopData, steps);
                    }
                  }}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                >
                  View My SOPs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
