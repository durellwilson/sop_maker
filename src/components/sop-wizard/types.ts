import { SOP, Step } from '@/types/database.types';

// Add missing interface properties
export interface ExtendedSOP extends Partial<SOP> {
  stakeholders?: string;
  definitions?: string;
  revision_date?: string;
}

export interface SOPWizardProps {
  onComplete: (sopData: ExtendedSOP, steps: Partial<Step>[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

// Add speech recognition interface
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      length: number;
    };
    length: number;
  };
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Augment the Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type InterviewStage = 
  | 'intro' 
  | 'title' 
  | 'description' 
  | 'category' 
  | 'stakeholders'
  | 'definitions'
  | 'steps' 
  | 'step-details' 
  | 'media-prompt'
  | 'finalize'
  | 'complete';

export type Message = {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}; 