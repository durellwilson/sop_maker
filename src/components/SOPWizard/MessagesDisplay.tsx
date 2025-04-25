import React from 'react';
import { Message, MessageDisplayProps } from './types';
import { BinaryChoiceButtons } from './BinaryChoiceButtons';

export function MessagesDisplay({ 
  messages, 
  messagesEndRef, 
  stage, 
  onChoiceSelected, 
  isProcessing,
  theme = 'light'
}: MessageDisplayProps) {
  // Function to determine if we should display choice buttons
  const shouldShowChoiceButtons = () => {
    if (messages.length === 0 || isProcessing) return false;
    
    const lastMessage = messages[messages.length - 1];
    
    // Only show buttons for AI messages in specific stages
    if (lastMessage.sender !== 'ai') return false;
    
    // Check the stage and message content to determine if buttons are needed
    if (stage === 'media-prompt' && lastMessage.text.includes('photos or videos')) {
      return {
        show: true,
        yesLabel: 'Yes, suggest images',
        noLabel: 'No, continue'
      };
    } else if (stage === 'step-details' && 
              (lastMessage.text.includes('Does this look good') || 
               lastMessage.text.includes('revise it'))) {
      return {
        show: true,
        yesLabel: 'Looks good',
        noLabel: 'Revise it'
      };
    } else if (stage === 'finalize' && 
              (lastMessage.text.includes('finalize') || 
               lastMessage.text.includes('save it'))) {
      return {
        show: true,
        yesLabel: 'Save & Finalize',
        noLabel: 'Not yet'
      };
    } else if (stage === '5s-prompt' && lastMessage.text.includes('5S principles')) {
      return {
        show: true,
        yesLabel: 'Yes, include 5S',
        noLabel: 'No, skip 5S'
      };
    }
    
    return false;
  };
  
  // Get the theme-specific styles
  const getContainerStyle = () => theme === 'dark' 
    ? 'bg-gray-900 scrollbar-dark' 
    : 'bg-white scrollbar-light';
    
  const getUserMessageStyle = () => theme === 'dark'
    ? 'bg-blue-800 text-white'
    : 'bg-blue-100 text-blue-900';
    
  const getAIMessageStyle = () => theme === 'dark'
    ? 'bg-gray-800 text-gray-100 border-gray-700'
    : 'bg-gray-50 text-gray-900 border-gray-200';
    
  const getButtonStyle = (isYes: boolean) => {
    if (theme === 'dark') {
      return isYes 
        ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500' 
        : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600';
    } else {
      return isYes
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-800';
    }
  };
  
  const buttons = shouldShowChoiceButtons();
  
  return (
    <div 
      className={`flex-1 overflow-y-auto p-4 space-y-4 ${getContainerStyle()}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {messages.map((message, idx) => (
        <div
          key={idx}
          className={`max-w-[95%] ${message.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
        >
          <div 
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              message.sender === 'user' 
                ? getUserMessageStyle()
                : getAIMessageStyle()
            }`}
          >
            <div className="flex items-center mb-1">
              <span className={`font-semibold text-sm ${
                message.sender === 'user'
                  ? theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                  : theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {message.sender === 'user' ? 'You' : 'AI Assistant'}
              </span>
            </div>
            <div className="whitespace-pre-wrap">
              {message.text}
            </div>
          </div>
        </div>
      ))}
      
      {/* Show binary choice buttons if appropriate */}
      {buttons && buttons.show && (
        <div className="flex justify-center space-x-4 py-2">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyle(true)}`}
            onClick={() => onChoiceSelected && onChoiceSelected('__button_yes')}
            disabled={isProcessing}
          >
            {buttons.yesLabel}
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyle(false)}`}
            onClick={() => onChoiceSelected && onChoiceSelected('__button_no')}
            disabled={isProcessing}
          >
            {buttons.noLabel}
          </button>
        </div>
      )}
      
      {/* Element for scrolling to the end of messages */}
      <div ref={messagesEndRef} />
      
      {/* Processing/typing indicator */}
      {isProcessing && (
        <div className={`${getAIMessageStyle()} rounded-2xl px-4 py-3 shadow-sm max-w-[95%] mr-auto`}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
