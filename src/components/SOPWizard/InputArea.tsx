import React, { useState } from 'react';
import { InputAreaProps } from './types';
import { ContextualHelp } from './HelperComponents';

export function InputArea({
  userInput,
  setUserInput,
  handleSubmit,
  isProcessing,
  isPending,
  isRecording,
  startRecording,
  stopRecording,
  showRetry,
  lastError,
  handleRetryRecording,
  inputRef,
  stage,
  recordingTime,
  formatTime,
  visualizeAudio,
  theme = 'light'
}: InputAreaProps) {
  const isDisabled = isProcessing || isPending || isRecording;
  
  const getInputStyle = () => {
    return theme === 'dark' 
      ? 'bg-gray-800 text-gray-100 border-gray-600 focus:border-blue-400 placeholder-gray-400' 
      : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600 placeholder-gray-400';
  };
  
  const getButtonStyle = () => {
    if (isDisabled) {
      return theme === 'dark' 
        ? 'bg-gray-700 text-gray-300 cursor-not-allowed border border-gray-600' 
        : 'bg-gray-200 text-gray-500 cursor-not-allowed';
    }
    return theme === 'dark' 
      ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500' 
      : 'bg-blue-600 hover:bg-blue-700 text-white';
  };
  
  const getMicButtonStyle = () => {
    if (isRecording) {
      return theme === 'dark' 
        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500' 
        : 'bg-red-600 hover:bg-red-700 text-white';
    }
    return theme === 'dark' 
      ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500' 
      : 'bg-blue-600 hover:bg-blue-700 text-white';
  };
  
  const getErrorStyle = () => theme === 'dark' 
    ? 'text-red-300' 
    : 'text-red-600';
  
  return (
    <div className={`p-4 ${theme === 'dark' ? 'border-t border-gray-700' : 'border-t border-gray-200'}`}>
      {/* Error message */}
      {lastError && (
        <div className={`mb-2 text-sm ${getErrorStyle()}`}>
          {lastError}
          {showRetry && (
            <button 
              onClick={handleRetryRecording}
              className={`ml-2 underline ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
            >
              Try again
            </button>
          )}
        </div>
      )}
      
      {/* Audio visualization */}
      {isRecording && (
        <div className="flex items-center mb-2">
          <div className="w-full h-6 flex items-center justify-center space-x-1">
            {visualizeAudio.map((value, index) => (
              <div 
                key={index}
                className={`w-1 rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}
                style={{ height: `${Math.max(2, value * 20)}px` }}
              ></div>
            ))}
            <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {formatTime(recordingTime)}
            </span>
          </div>
        </div>
      )}
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-grow relative">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isDisabled}
            placeholder={isRecording ? "Recording..." : isPending ? "Processing speech..." : "Type your message here..."}
            className={`w-full p-3 rounded-lg border ${getInputStyle()} transition-colors focus:outline-none`}
            ref={inputRef}
          />
        </div>
        
        {/* Voice recording button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isPending}
          className={`p-3 rounded-lg ${getMicButtonStyle()} transition-colors flex items-center justify-center`}
          aria-label={isRecording ? "Stop recording" : "Start voice recording"}
          title={isRecording ? "Stop recording" : "Start voice recording"}
        >
          {isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        
        {/* Send button */}
        <button
          type="submit"
          disabled={isDisabled || !userInput.trim()}
          className={`px-4 py-2 rounded-lg ${getButtonStyle()} transition-colors flex items-center justify-center`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </form>
      
      {/* Contextual help based on current stage */}
      <ContextualHelp stage={stage} />
    </div>
  );
}
