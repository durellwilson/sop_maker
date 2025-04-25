import React from 'react';

interface BinaryChoiceButtonsProps {
  onChoiceSelected: (choice: string) => void;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function BinaryChoiceButtons({
  onChoiceSelected,
  yesLabel = 'Yes',
  noLabel = 'No',
  className = '',
  disabled = false
}: BinaryChoiceButtonsProps) {
  return (
    <div className={`flex space-x-2 mt-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChoiceSelected('__button_yes')}
        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChoiceSelected('__button_no')}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {noLabel}
      </button>
    </div>
  );
} 