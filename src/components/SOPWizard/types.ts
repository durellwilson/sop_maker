import { SOP, Step } from '@/types/database.types';

// Extend the SOP and Step interfaces to include the additional fields used in the component
export interface ExtendedSOP extends Partial<SOP> {
  stakeholders?: string;
  definitions?: string;
  revision_date?: string;
}

export interface ExtendedStep extends Partial<Step> {
  name?: string;
  description?: string;
  safety_notes?: string;
  role?: string;
  verification?: string;
}

export interface SOPWizardProps {
  onComplete: (sopData: SOPData, steps: Partial<Step>[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

// Stage types
export type InterviewStage = 
  | 'intro' 
  | 'title' 
  | 'description' 
  | 'category' 
  | 'stakeholders'
  | 'equipment'
  | '5s-prompt'
  | '5s-sort'
  | '5s-set-in-order'
  | '5s-shine'
  | '5s-standardize'
  | '5s-sustain'
  | 'definitions'
  | 'steps' 
  | 'step-details' 
  | 'media-prompt'
  | 'finalize'
  | 'completed'
  | 'edit'
  | 'edit-title'
  | 'edit-description'
  | 'edit-step'
  | 'confirm-cancel';

// Message type for chat
export interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

// Speech Recognition API types
export interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

export interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
  item(index: number): SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  item(index: number): SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

// Props for subcomponents
export interface HelperComponentsProps {
  tipId: string;
  children: React.ReactNode;
}

export interface MessagesDisplayProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  stage: InterviewStage;
  onChoiceSelected: (choice: string) => void;
  isProcessing: boolean;
}

export interface InputAreaProps {
  userInput: string;
  setUserInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  isPending: boolean;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  showRetry: boolean;
  lastError: string | null;
  handleRetryRecording: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  stage: InterviewStage;
  recordingTime: number;
  formatTime: (ms: number) => string;
  visualizeAudio: number[];
  theme?: 'light' | 'dark';
}

export interface SOPSummaryProps {
  sopData: SOPData;
  steps: Partial<Step>[];
  equipment?: Equipment[];
  fiveS?: FiveSData;
  theme?: 'light' | 'dark';
}

export interface ProgressIndicatorProps {
  stage: InterviewStage;
  currentStep: number;
  steps: Partial<Step>[];
  completedStages: InterviewStage[];
  calculateProgress: () => number;
  theme?: 'light' | 'dark';
}

// Hook return types
export interface UseSOPStagesReturn {
  stage: InterviewStage;
  setStage: React.Dispatch<React.SetStateAction<InterviewStage>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  completedStages: InterviewStage[];
  setCompletedStages: React.Dispatch<React.SetStateAction<InterviewStage[]>>;
  handleStageChange: (nextStage: InterviewStage) => void;
  calculateProgress: () => number;
  getProgressStepNumber: () => number;
}

export interface UseSOPDataReturn {
  sopData: ExtendedSOP;
  setSopData: React.Dispatch<React.SetStateAction<ExtendedSOP>>;
  steps: ExtendedStep[];
  setSteps: React.Dispatch<React.SetStateAction<ExtendedStep[]>>;
  saveStep: (step: Partial<ExtendedStep>, stepIndex: number) => void;
  saveSOPData: (data: Partial<ExtendedSOP>) => void;
}

export interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
  recordingTime: number;
  showRetry: boolean;
  setShowRetry: React.Dispatch<React.SetStateAction<boolean>>;
  lastError: string;
  setLastError: React.Dispatch<React.SetStateAction<string>>;
  visualizeAudio: number[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  handleRetryRecording: () => void;
  formatTime: (seconds: number) => string;
}

export interface SOPData {
  id?: string;
  title: string;
  description: string;
  category: string;
  stakeholders: string;
  definitions: string;
  version?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Step {
  id?: string;
  sop_id?: string;
  order_index: number;
  name?: string;
  instructions: string;
  description?: string;
  safety_notes?: string;
  verification?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Equipment {
  id?: string;
  name: string;
  description: string;
  safety: string;
  maintenance: string;
  sop_id?: string;
}

export interface FiveSData {
  sort: string;
  setInOrder: string;
  shine: string;
  standardize: string;
  sustain: string;
}

export interface MessageDisplayProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  stage: InterviewStage;
  onChoiceSelected: (choice: string) => void;
  isProcessing: boolean;
  theme?: 'light' | 'dark';
}

export interface BinaryChoiceButtonsProps {
  yesLabel: string;
  noLabel: string;
  onChoiceSelected: (choice: string) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}
