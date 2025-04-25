import React from 'react';
import { Step, Media } from '@/types/database.types';
import { formatDistanceToNow } from 'date-fns';
import MediaPreview from '@/components/MediaPreview';

interface StepPreviewProps {
  step: Partial<Step>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showControls?: boolean;
  isActive?: boolean;
  onEdit?: (stepId: string) => void;
  onDelete?: (stepId: string) => void;
  onMoveUp?: (stepId: string) => void;
  onMoveDown?: (stepId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function StepPreview({
  step,
  isExpanded = true,
  onToggleExpand,
  showControls = false,
  isActive = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false
}: StepPreviewProps) {
  const hasTitle = !!step.title;
  const hasInstructions = !!(step.instructions);
  const hasRole = !!step.role;
  const hasSafetyNotes = !!step.safety_notes;
  const hasVerification = !!step.verification;
  const hasMedia = !!(step.media && step.media.length > 0);
  
  const hasDetails = hasInstructions || hasRole || hasSafetyNotes || hasVerification || hasMedia;
  
  const handleEdit = () => {
    if (onEdit && step.id) {
      onEdit(step.id);
    }
  };
  
  const handleDelete = () => {
    if (onDelete && step.id) {
      // Show confirmation dialog here if needed
      if (window.confirm('Are you sure you want to delete this step?')) {
        onDelete(step.id);
      }
    }
  };
  
  const handleMoveUp = () => {
    if (onMoveUp && step.id) {
      onMoveUp(step.id);
    }
  };
  
  const handleMoveDown = () => {
    if (onMoveDown && step.id) {
      onMoveDown(step.id);
    }
  };
  
  return (
    <div 
      className={`rounded-lg overflow-hidden transition-all duration-300 
                ${isActive ? 'border-2 border-indigo-500 dark:border-indigo-400' : 'border border-slate-200 dark:border-slate-700'} 
                ${showControls ? 'hover:shadow-md' : ''}`}
    >
      {/* Step Header */}
      <div 
        className={`px-4 py-3 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-white dark:bg-slate-800'}
                  flex items-center justify-between`}
      >
        <div className="flex items-center">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="mr-3 text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer"
              aria-expanded={isExpanded}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          
          <div className="flex items-center">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 
                          text-indigo-700 dark:text-indigo-400 flex items-center justify-center
                          text-sm font-medium mr-3">
              {step.order_index !== undefined ? step.order_index + 1 : '?'}
            </span>
            
            <h3 className="text-base font-medium text-slate-900 dark:text-white">
              {hasTitle ? step.title : `Step ${step.order_index !== undefined ? step.order_index + 1 : ''}`}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center">
          {step.updated_at && (
            <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 mr-4">
              {`Updated ${formatDistanceToNow(new Date(step.updated_at), { addSuffix: true })}`}
            </span>
          )}
          
          {/* Step Controls */}
          {showControls && step.id && (
            <div className="flex items-center space-x-1">
              {/* Move Up/Down Controls */}
              {onMoveUp && !isFirst && (
                <button
                  type="button"
                  onClick={handleMoveUp}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                  aria-label="Move step up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
              
              {onMoveDown && !isLast && (
                <button
                  type="button"
                  onClick={handleMoveDown}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                  aria-label="Move step down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              
              {/* Edit Button */}
              {onEdit && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                  aria-label="Edit step"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 focus:outline-none"
                  aria-label="Delete step"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Step Content */}
      {isExpanded && hasDetails && (
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
          {/* Instructions */}
          {hasInstructions && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Instructions
              </h4>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {step.instructions}
                </p>
              </div>
            </div>
          )}
          
          {/* Role */}
          {hasRole && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role
              </h4>
              <div className="flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-700 dark:text-blue-300">{step.role}</span>
              </div>
            </div>
          )}
          
          {/* Safety Notes */}
          {hasSafetyNotes && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Safety Notes
              </h4>
              <div className="px-4 py-3 border-l-4 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-r-md">
                <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                  {step.safety_notes}
                </p>
              </div>
            </div>
          )}
          
          {/* Verification */}
          {hasVerification && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Verification
              </h4>
              <div className="px-4 py-3 border-l-4 border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20 rounded-r-md">
                <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                  {step.verification}
                </p>
              </div>
            </div>
          )}
          
          {/* Media */}
          {hasMedia && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Media
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {step.media?.map((item, index) => (
                  <div key={item.id || index} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg overflow-hidden shadow-sm">
                    <MediaPreview media={item} />
                    {item.caption && (
                      <div className="p-2 text-xs text-slate-600 dark:text-slate-300">
                        {item.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 