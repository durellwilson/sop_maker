"use client";

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HelpTip } from './sop-wizard/HelpTip';
import { ContextualHelp } from './sop-wizard/ContextualHelp';
import { 
  SOPWizardProps, 
  InterviewStage, 
  Message,
  ExtendedSOP,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent
} from './sop-wizard/types';
import { Step } from '@/types/database.types';

export default function SOPWizard({ onComplete, onCancel, isOpen }: SOPWizardProps) {
  const [stage, setStage] = useState<InterviewStage>('intro');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add missing refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // SOP data being collected
  const [sopData, setSopData] = useState<ExtendedSOP>({
    title: '',
    description: '',
    category: '',
    version: 1.0,
    revision_date: new Date().toISOString().split('T')[0],
    stakeholders: '',
    definitions: ''
  });
  
  const [steps, setSteps] = useState<Partial<Step>[]>([]);
  
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // Near the top of the component
  const [visualizeAudio, setVisualizeAudio] = useState<number[]>([]);
  const [showRetry, setShowRetry] = useState(false);
  const [lastError, setLastError] = useState('');
  const audioVisualizerInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Add these state variables for tracking progress
  const [completedStages, setCompletedStages] = useState<InterviewStage[]>(['intro']);
  const [showSummary, setShowSummary] = useState(false);
  
  // Functions for toast notifications
  const showError = (message: string) => toast.error(message);
  const showSuccess = (message: string) => toast.success(message);
  const showInfo = (message: string) => toast.info(message);
  
  // Initial AI greeting when component mounts
  useEffect(() => {
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
  }, [isOpen]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when stage changes
  useEffect(() => {
    if (inputRef.current && !isProcessing && !isPending) {
      inputRef.current.focus();
    }
  }, [stage, isProcessing, isPending]);
  
  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }
    
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);
  
  // Update the startRecording function to include audio visualization
  const startRecording = async () => {
    try {
      setShowRetry(false);
      setLastError('');
      setVisualizeAudio([]);
      
      // First check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support media recording');
      }
      
      // Request audio permission with explicit constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000 
        } 
      });
      
      // Store the media stream in ref
      mediaStreamRef.current = stream;
      
      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser');
      }
      
      // Use highest quality audio for better speech recognition
      const options = { mimeType: 'audio/webm;codecs=opus' };
      
      // Try the preferred format, but fall back if not supported
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Preferred audio format not supported, using default format', e);
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up audio visualization
      let audioContext: AudioContext;
      try {
        // Safari sometimes requires a prefix
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('AudioContext not supported, visualization will be disabled', e);
        // Mock the visualization with random data if not supported
        audioVisualizerInterval.current = setInterval(() => {
          const mockData = Array(10).fill(0).map(() => Math.random() * 0.7);
          setVisualizeAudio(mockData);
        }, 100);
        
        // Skip the rest of the audio setup but continue with recording
        setupMediaRecorder(stream, mediaRecorder);
        return;
      }
      
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Higher value for better frequency resolution
      audioSource.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      audioVisualizerInterval.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        // Create a simplified array for visualization (just 10 values)
        const reduced = [];
        const step = Math.floor(dataArray.length / 10);
        for (let i = 0; i < 10; i++) {
          // Take average of segment for smoother visualization
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j];
          }
          reduced.push((sum / step) / 255); // Normalize to 0-1
        }
        setVisualizeAudio(reduced);
      }, 100);
      
      setupMediaRecorder(stream, mediaRecorder);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      showError('Could not access microphone');
      setLastError('Could not access your microphone. Make sure it is connected and you have granted permissions.');
      setShowRetry(true);
      
      // Clear visualization if there was an error
      if (audioVisualizerInterval.current) {
        clearInterval(audioVisualizerInterval.current);
        audioVisualizerInterval.current = null;
      }
      setVisualizeAudio([]);
    }
  };
  
  // Extract media recorder setup to a separate function for cleaner code
  const setupMediaRecorder = (stream: MediaStream, mediaRecorder: MediaRecorder) => {
    // Make sure the stream is stored in the ref
    if (!mediaStreamRef.current) {
      mediaStreamRef.current = stream;
    }
    
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      // Clear visualization
      if (audioVisualizerInterval.current) {
        clearInterval(audioVisualizerInterval.current);
        audioVisualizerInterval.current = null;
      }
      setVisualizeAudio([]);
      
      if (audioChunksRef.current.length === 0) {
        setLastError('No audio was recorded. Please try again and speak clearly.');
        setShowRetry(true);
        setIsPending(false);
        return;
      }
      
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorder.mimeType || 'audio/webm' 
      });
      
      if (audioBlob.size < 1000) {
        setLastError('The recording was too short. Please try again and speak for a longer duration.');
        setShowRetry(true);
        setIsPending(false);
        return;
      }
      
      try {
        setIsPending(true);
        addMessage('ai', "I'm processing your audio recording...");
        
        // Process the audio for speech recognition
        await processAudioRecording(audioBlob, stream);
      } catch (error) {
        console.error('Error processing audio recording:', error);
        addMessage('ai', "I had trouble understanding your recording. Could you please type your response instead?");
        setIsPending(false);
        setLastError('Error processing audio recording.');
        setShowRetry(true);
      } finally {
        // Clean up media stream
        stream.getTracks().forEach(track => track.stop());
      }
    };
    
    // Start recording with timeslices of 1 second for better handling of long recordings
    mediaRecorder.start(1000);
    setIsRecording(true);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim()) return;
    
    // Add user message to chat
    addMessage('user', userInput);
    
    // Generate AI response
    generateAIResponse(userInput);
    
    // Clear input field
    setUserInput('');
  };
  
  const stopRecording = () => {
    try {
      // Stop the audio visualizer interval
      if (audioVisualizerInterval.current) {
        clearInterval(audioVisualizerInterval.current);
        audioVisualizerInterval.current = null;
      }

      // Stop the media recorder if it exists and is recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      // Stop all tracks in the media stream if it exists
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
        });
        mediaStreamRef.current = null;
      }

      // Reset visualizer canvas
      const canvas = visualizerCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      setIsRecording(false);
      setIsPending(true);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setIsPending(false);
      setLastError('Failed to stop recording. Please try again.');
    }
  };
  
  const handleRetryRecording = () => {
    setShowRetry(false);
    setLastError('');
    startRecording();
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const renderSOPSummary = () => {
    return <div>SOP Summary</div>;
  };
  
  const calculateProgress = () => {
    return 0;
  };

  // These are placeholder functions that need to be implemented
  const processAudioRecording = async (audioBlob: Blob, stream: MediaStream) => {
    try {
      // First try to use the Web Speech API for speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const text = await transcribeWithSpeechRecognition(audioBlob);
        if (text && text.trim()) {
          addMessage('user', text);
          setUserInput('');
          await generateAIResponse(text);
          return;
        }
      }
      
      // Fall back to server-side transcription if client-side fails
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Server transcription failed');
      }
      
      const result = await response.json();
      
      if (result.text && result.text.trim()) {
        addMessage('user', result.text);
        setUserInput('');
        await generateAIResponse(result.text);
      } else {
        throw new Error('No text was transcribed');
      }
    } catch (error) {
      console.error('Speech recognition failed:', error);
      addMessage('ai', "I couldn't understand what you said. Could you please type your response instead?");
      setLastError('Speech recognition failed. Please try again or type your response.');
      setShowRetry(true);
    } finally {
      setIsPending(false);
    }
  };

  // Client-side speech recognition using Web Speech API
  const transcribeWithSpeechRecognition = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Create an audio element and set the blob as source
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      // Initialize speech recognition
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        return reject('Speech recognition not supported in this browser');
      }
      
      const recognition = new SpeechRecognitionClass() as SpeechRecognition;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      
      let finalTranscript = '';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        reject(event.error);
      };
      
      recognition.onend = () => {
        resolve(finalTranscript);
      };
      
      // Play the audio and start recognition
      audio.onplay = () => {
        recognition.start();
      };
      
      audio.onended = () => {
        recognition.stop();
      };
      
      // Start playing the audio
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        reject(error);
      });
    });
  };

  const addMessage = (sender: 'ai' | 'user', text: string) => {
    setMessages(prev => [...prev, {
      sender,
      text,
      timestamp: new Date()
    }]);
  };

  const generateAIResponse = async (input: string) => {
    try {
      setIsProcessing(true);
      
      // Handle different stages of the SOP creation process
      let response = '';
      
      // If this is the first user input, move to title stage
      if (stage === 'intro') {
        response = "Great! Let's get started. What would you like to title this SOP? Pick something clear and descriptive that people can easily search for.";
        setStage('title');
        setCompletedStages(prev => [...prev, 'title']);
      } 
      // Process the title input
      else if (stage === 'title') {
        setSopData(prev => ({ ...prev, title: input }));
        response = `"${input}" is a good title. Now, please provide a brief description of what this SOP covers. What's the purpose of this procedure?`;
        setStage('description');
        setCompletedStages(prev => [...prev, 'description']);
      }
      // Process the description input
      else if (stage === 'description') {
        setSopData(prev => ({ ...prev, description: input }));
        response = `Thanks for that description. What category would you place this SOP in? For example: HR, IT, Finance, Operations, Customer Service, etc.`;
        setStage('category');
        setCompletedStages(prev => [...prev, 'category']);
      }
      // Process the category input
      else if (stage === 'category') {
        setSopData(prev => ({ ...prev, category: input }));
        response = `Great! Now, who are the key stakeholders or teams that should follow this procedure?`;
        setStage('stakeholders');
        setCompletedStages(prev => [...prev, 'stakeholders']);
      }
      // Process the stakeholders input
      else if (stage === 'stakeholders') {
        setSopData(prev => ({ ...prev, stakeholders: input }));
        response = `Perfect. Let's start breaking down the steps of this procedure. What's the first step someone should take?`;
        setStage('steps');
        setCurrentStep(1);
        setCompletedStages(prev => [...prev, 'steps']);
      }
      // Process the steps input - continue adding steps
      else if (stage === 'steps') {
        // Add current step to the steps array
        setSteps(prev => [
          ...prev, 
          { 
            order: currentStep,
            title: `Step ${currentStep}`,
            description: input,
            warnings: '',
            tips: '',
            requirements: ''
          }
        ]);
        
        // Ask if there are more steps or if we're done
        response = `I've recorded step ${currentStep}. Is there another step? If so, tell me about it. If you're done adding steps, just say "Done with steps" or something similar.`;
        
        // Check if the user wants to finish adding steps
        if (input.toLowerCase().includes('done') || 
            input.toLowerCase().includes('finish') || 
            input.toLowerCase().includes('complete') || 
            input.toLowerCase().includes('no more') ||
            input.toLowerCase().includes('that\'s all')) {
          response = `Great! Let's finalize your SOP. I'll summarize what we've created so far.`;
          setStage('finalize');
          setCompletedStages(prev => [...prev, 'finalize']);
        } else {
          // Increment the step counter for the next step
          setCurrentStep(prev => prev + 1);
        }
      }
      // Process the finalize input - complete the SOP
      else if (stage === 'finalize') {
        // Handle finalization
        response = `Your SOP has been created successfully! You can now edit it further or share it with your team.`;
        setStage('complete');
        setCompletedStages(prev => [...prev, 'complete']);
        
        // Convert the data to the format expected by the parent component
        onComplete(
          sopData,
          steps as Step[]
        );
      }
      
      // Simulate network delay for more natural conversation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add AI response to chat
      addMessage('ai', response);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      addMessage('ai', "I'm sorry, I encountered an error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // If not open, don't render
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-gray-800">SOP Creation Wizard</h2>
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
          <div className="flex items-center space-x-2">
            {isProcessing && (
              <div className="text-sm text-blue-600 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Thinking...
              </div>
            )}
            <button 
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Chat container */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* SOP Summary in finalize step */}
        {stage === 'finalize' && renderSOPSummary()}
        
        {/* Input area */}
        <div className="border-t border-gray-200 p-4">
          {/* Retry prompt if speech recognition failed */}
          {showRetry && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-yellow-700">{lastError || 'Audio recording failed.'}</p>
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={handleRetryRecording}
                      className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium rounded"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setShowRetry(false);
                        inputRef.current?.focus();
                      }}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded"
                    >
                      Type Instead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isPending ? (
            <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing your input...
              </div>
            </div>
          ) : isRecording ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse mr-3"></div>
                  <span className="text-red-600 font-medium">Recording... {formatTime(recordingTime)}</span>
                </div>
                <button 
                  onClick={stopRecording}
                  className="bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              </div>
              {visualizeAudio.length > 0 && (
                <div className="flex items-end justify-between h-10 mt-2 space-x-0.5">
                  <canvas
                    ref={visualizerCanvasRef}
                    className="hidden"
                    width="300"
                    height="50"
                  />
                  {visualizeAudio.map((level, idx) => (
                    <div 
                      key={idx}
                      className="w-full bg-red-400"
                      style={{ 
                        height: `${Math.max(2, level * 100)}%`,
                        opacity: level * 0.8 + 0.2
                      }}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your response..."
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={startRecording}
                  className="bg-blue-100 text-blue-600 p-2 rounded-full hover:bg-blue-200 transition-colors"
                  title="Record audio"
                  disabled={isProcessing}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                  disabled={isProcessing || !userInput.trim()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {/* Contextual help based on current stage */}
              <ContextualHelp stage={stage} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}