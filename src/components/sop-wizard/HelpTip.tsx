"use client";

import { useState } from 'react';

interface HelpTipProps {
  children: React.ReactNode;
  tipId: string;
}

export function HelpTip({ children, tipId }: HelpTipProps) {
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