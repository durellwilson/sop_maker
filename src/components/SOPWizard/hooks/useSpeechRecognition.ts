import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { UseSpeechRecognitionReturn } from '../types';

export function useSpeechRecognition(onTranscriptReady: (transcript: string) => void): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [lastError, setLastError] = useState('');
  const [visualizeAudio, setVisualizeAudio] = useState<number[]>([]);
  
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const audioVisualizerInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const { showToast } = useToast();
  
  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Recording timer effect
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
  
  // Cleanup effect for visualizer
  useEffect(() => {
    return () => {
      if (audioVisualizerInterval.current) {
        clearInterval(audioVisualizerInterval.current);
      }
    };
  }, []);
  
  // Speech recognition effect - runs when isRecording changes
  useEffect(() => {
    if (!isRecording) return;
    
    const processSpeechRecognition = async () => {
      try {
        setIsPending(true);
        
        // Use the Web Speech API for recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          // Type assertion with direct access to avoid TS errors
          const SpeechRecognitionApi = (
            (window as any).SpeechRecognition || 
            (window as any).webkitSpeechRecognition
          );
          
          if (SpeechRecognitionApi) {
            const recognition = new SpeechRecognitionApi();
            
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            recognition.onstart = () => {
              console.log("Speech recognition started");
            };
            
            recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setIsPending(false);
              setIsRecording(false);
              
              // Pass the transcript to the callback
              onTranscriptReady(transcript);
            };
            
            recognition.onerror = (event: any) => {
              console.error("Speech recognition error", event.error);
              setLastError(`Speech recognition error: ${event.error}`);
              setIsRecording(false);
              setShowRetry(true);
              setIsPending(false);
            };
            
            recognition.onend = () => {
              console.log("Speech recognition ended");
              setIsRecording(false);
            };
            
            recognition.start();
          } else {
            throw new Error("Speech recognition not available");
          }
        } else {
          throw new Error("Speech recognition not supported in this browser");
        }
      } catch (error) {
        console.error("Error in audio recording:", error);
        setLastError(error instanceof Error ? error.message : "Unknown error occurred");
        setIsRecording(false);
        setShowRetry(true);
        setIsPending(false);
        showToast(`Error in audio recording: ${error instanceof Error ? error.message : "Unknown error"}`, 'error');
      }
    };
    
    processSpeechRecognition();
  }, [isRecording, onTranscriptReady, showToast]);
  
  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      if (isRecording) {
        // Stop recording if already in progress
        setIsRecording(false);
        return;
      }
      
      setIsRecording(true);
      // The useEffect above will handle the processing
    } catch (err) {
      setIsRecording(false);
      console.error('Error toggling recording:', err);
      showToast(`Error toggling recording: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [isRecording, showToast]);
  
  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);
  
  // Handler for retrying audio recording
  const handleRetryRecording = useCallback(() => {
    setShowRetry(false);
    setLastError('');
    setIsRecording(true);
  }, []);
  
  return {
    isRecording,
    setIsRecording,
    isPending, 
    setIsPending,
    recordingTime,
    showRetry,
    setShowRetry,
    lastError,
    setLastError,
    visualizeAudio,
    startRecording,
    stopRecording,
    handleRetryRecording,
    formatTime
  };
}
