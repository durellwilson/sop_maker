'use client';

import React from 'react';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>This is a simple test page to verify that basic routing works.</p>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>The application is running in: <strong>{process.env.NODE_ENV}</strong> mode</p>
      </div>
      
      <button 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => console.log('Button clicked')}
      >
        Test Button
      </button>
    </div>
  );
} 