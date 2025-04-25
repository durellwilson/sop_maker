"use client";

import { useState } from 'react';
import SOPWizard from './SOPWizard';

export default function SOPWizardTest() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleComplete = (sopData: any, steps: any[]) => {
    console.log('SOP data:', sopData);
    console.log('Steps:', steps);
    setIsOpen(false);
  };
  
  const handleCancel = () => {
    setIsOpen(false);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SOP Wizard Test</h1>
      
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Open SOP Wizard
      </button>
      
      {isOpen && (
        <SOPWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          isOpen={isOpen}
        />
      )}
    </div>
  );
} 