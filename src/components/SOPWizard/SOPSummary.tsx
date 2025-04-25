import React, { useState } from 'react';
import { SOPSummaryProps } from './types';

export function SOPSummary({ 
  sopData, 
  steps, 
  equipment = [], 
  fiveS = { sort: '', setInOrder: '', shine: '', standardize: '', sustain: '' },
  theme = 'light'
}: SOPSummaryProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['sop-info', 'steps']);
  
  const toggleStepExpansion = (stepIndex: number) => {
    setExpandedSteps(prev => 
      prev.includes(stepIndex) 
        ? prev.filter(idx => idx !== stepIndex) 
        : [...prev, stepIndex]
    );
  };
  
  const toggleSectionExpansion = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };
  
  const isStepExpanded = (index: number) => expandedSteps.includes(index);
  const isSectionExpanded = (section: string) => expandedSections.includes(section);
  
  // Determine whether to show 5S section
  const hasFiveS = Object.values(fiveS).some(value => value && value.trim() !== '');
  
  // Update theme-based style functions for better contrast
  const getCardStyle = () => theme === 'dark' 
    ? 'bg-gray-800 border-gray-700 text-gray-100' 
    : 'bg-white border-gray-200 text-gray-900';
  
  const getHeaderStyle = () => theme === 'dark'
    ? 'text-white bg-gray-800'
    : 'text-gray-900 bg-white';
    
  const getTextStyle = () => theme === 'dark'
    ? 'text-gray-200'
    : 'text-gray-700';
    
  const getAccentStyle = () => theme === 'dark'
    ? 'text-primary-300'
    : 'text-primary-600';
    
  const getStepHeaderStyle = () => theme === 'dark'
    ? 'bg-gray-750 hover:bg-gray-700'
    : 'bg-gray-50 hover:bg-gray-100';
    
  const getSafetyStyle = () => theme === 'dark'
    ? 'bg-yellow-900/30 border-yellow-600 text-yellow-200'
    : 'bg-yellow-50 border-yellow-400 text-yellow-800';
  
  return (
    <div className="flex-grow overflow-y-auto max-h-[calc(100vh-250px)] px-2 py-4 custom-scrollbar w-full">
      {/* Add a header section to clarify this is a summary/draft preview */}
      <div className={`${theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50/80 border-blue-200'} rounded-lg p-3 mb-4 border text-sm flex items-start`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mt-0.5 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className={`font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
            SOP Draft Preview
          </p>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            This is a preview of your SOP as you're creating it. After finalizing, you'll be able to see the full SOP in the preview mode.
          </p>
        </div>
      </div>
      
      {/* SOP Info Section */}
      <div className={`rounded-xl border shadow-sm p-6 mb-6 ${getCardStyle()}`}>
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSectionExpansion('sop-info')}
        >
          <h3 className={`text-xl font-semibold ${getHeaderStyle()} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-2 ${getAccentStyle()}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            SOP Summary
          </h3>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform ${isSectionExpanded('sop-info') ? '' : 'transform rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
        
        {isSectionExpanded('sop-info') && (
          <div className="space-y-6 mt-4">
            <div>
              <h4 className={`text-sm font-medium ${getTextStyle()}`}>Title</h4>
              <p className={`text-xl font-semibold mt-1 ${getHeaderStyle()}`}>{sopData.title || 'Untitled SOP'}</p>
            </div>
            
            <div>
              <h4 className={`text-sm font-medium ${getTextStyle()}`}>Description</h4>
              <p className={`mt-1 ${getHeaderStyle()}`}>{sopData.description || 'No description provided'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className={`text-sm font-medium ${getTextStyle()}`}>Category</h4>
                <p className={`mt-1 ${getHeaderStyle()}`}>{sopData.category || 'Uncategorized'}</p>
              </div>
              
              <div>
                <h4 className={`text-sm font-medium ${getTextStyle()}`}>Version</h4>
                <p className={`mt-1 ${getHeaderStyle()}`}>{sopData.version || '1.0'}</p>
              </div>
            </div>
            
            {sopData.stakeholders && (
              <div>
                <h4 className={`text-sm font-medium ${getTextStyle()}`}>Stakeholders</h4>
                <p className={`mt-1 ${getHeaderStyle()}`}>{sopData.stakeholders}</p>
              </div>
            )}
            
            {sopData.definitions && (
              <div>
                <h4 className={`text-sm font-medium ${getTextStyle()}`}>Definitions</h4>
                <p className={`mt-1 ${getHeaderStyle()}`}>{sopData.definitions}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Equipment Section */}
      {equipment && equipment.length > 0 && (
        <div className={`rounded-xl border shadow-sm p-6 mb-6 ${getCardStyle()}`}>
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSectionExpansion('equipment')}
          >
            <h3 className={`text-xl font-semibold ${getHeaderStyle()} flex items-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-2 ${getAccentStyle()}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Equipment & Tools ({equipment.length})
            </h3>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 transition-transform ${isSectionExpanded('equipment') ? '' : 'transform rotate-180'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          
          {isSectionExpanded('equipment') && (
            <div className="mt-4 space-y-4">
              {equipment.map((item, index) => (
                <div key={index} className={`p-4 border rounded-lg ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h4 className={`font-medium text-lg ${getHeaderStyle()}`}>{item.name}</h4>
                  {item.description && (
                    <p className={`mt-2 ${getTextStyle()}`}>{item.description}</p>
                  )}
                  {item.safety && (
                    <div className={`mt-3 p-3 rounded border-l-4 ${getSafetyStyle()}`}>
                      <h5 className="font-medium text-sm flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Safety Guidelines
                      </h5>
                      <p className="text-sm mt-1">{item.safety}</p>
                    </div>
                  )}
                  {item.maintenance && (
                    <div className={`mt-3 ${getTextStyle()}`}>
                      <h5 className="font-medium text-sm">Maintenance:</h5>
                      <p className="text-sm mt-1">{item.maintenance}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 5S Section */}
      {hasFiveS && (
        <div className={`rounded-xl border shadow-sm p-6 mb-6 ${getCardStyle()}`}>
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSectionExpansion('5s')}
          >
            <h3 className={`text-xl font-semibold ${getHeaderStyle()} flex items-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-2 ${getAccentStyle()}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              5S Methodology
            </h3>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 transition-transform ${isSectionExpanded('5s') ? '' : 'transform rotate-180'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          
          {isSectionExpanded('5s') && (
            <div className="mt-4 space-y-4">
              {fiveS.sort && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium ${getHeaderStyle()}`}>1. Sort (Seiri)</h4>
                  <p className={`mt-2 ${getTextStyle()}`}>{fiveS.sort}</p>
                </div>
              )}
              
              {fiveS.setInOrder && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium ${getHeaderStyle()}`}>2. Set in Order (Seiton)</h4>
                  <p className={`mt-2 ${getTextStyle()}`}>{fiveS.setInOrder}</p>
                </div>
              )}
              
              {fiveS.shine && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium ${getHeaderStyle()}`}>3. Shine (Seiso)</h4>
                  <p className={`mt-2 ${getTextStyle()}`}>{fiveS.shine}</p>
                </div>
              )}
              
              {fiveS.standardize && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium ${getHeaderStyle()}`}>4. Standardize (Seiketsu)</h4>
                  <p className={`mt-2 ${getTextStyle()}`}>{fiveS.standardize}</p>
                </div>
              )}
              
              {fiveS.sustain && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h4 className={`font-medium ${getHeaderStyle()}`}>5. Sustain (Shitsuke)</h4>
                  <p className={`mt-2 ${getTextStyle()}`}>{fiveS.sustain}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Steps Section */}
      <div className={`rounded-xl border shadow-sm p-6 ${getCardStyle()}`}>
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSectionExpansion('steps')}
        >
          <h3 className={`text-xl font-semibold ${getHeaderStyle()} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-2 ${getAccentStyle()}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Steps ({steps.length})
          </h3>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform ${isSectionExpanded('steps') ? '' : 'transform rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
        
        {isSectionExpanded('steps') && (
          <div className="space-y-4 mt-4">
            {steps.map((step, index) => (
              <div key={index} className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div 
                  className={`p-3 ${getStepHeaderStyle()} flex items-center justify-between cursor-pointer`}
                  onClick={() => toggleStepExpansion(index)}
                >
                  <h4 className={`text-lg font-medium ${getHeaderStyle()} flex items-center`}>
                    <span className={`flex items-center justify-center ${theme === 'dark' ? 'bg-primary-900 text-primary-300' : 'bg-primary-100 text-primary-700'} rounded-full w-6 h-6 text-sm font-bold mr-2`}>
                      {index + 1}
                    </span>
                    {step.name || `Step ${index + 1}`}
                  </h4>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform ${isStepExpanded(index) ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {isStepExpanded(index) && (
                  <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`whitespace-pre-wrap text-sm ${getTextStyle()}`}>
                      {step.description || step.instructions || 'No details provided'}
                    </p>
                    
                    {step.safety_notes && (
                      <div className={`mt-4 border-l-4 p-3 rounded ${getSafetyStyle()}`}>
                        <h5 className="text-sm font-medium flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Safety Note
                        </h5>
                        <p className="text-sm mt-1">{step.safety_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {steps.length === 0 && (
              <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                No steps have been added to this SOP yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
