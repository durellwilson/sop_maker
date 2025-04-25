"use client";

import { useState, useEffect, useRef } from 'react';
import { Tag } from '@/types/database.types';

interface TagInputProps {
  selectedTags: string[];
  availableTags?: Tag[];
  onChange: (tags: string[]) => void;
  onCreateTag?: (tagName: string) => Promise<Tag>;
  className?: string;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

const colors = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
];

const getTagColor = (tagName: string): string => {
  // Generate a consistent color based on the tag name
  const index = Array.from(tagName).reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

export default function TagInput({
  selectedTags = [],
  availableTags = [],
  onChange,
  onCreateTag,
  className = '',
  placeholder = 'Add a tag...',
  maxTags = 10,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredTags(availableTags.filter(tag => !selectedTags.includes(tag.name)));
    } else {
      setFilteredTags(
        availableTags
          .filter(tag => 
            tag.name.toLowerCase().includes(inputValue.toLowerCase()) && 
            !selectedTags.includes(tag.name)
          )
      );
    }
  }, [inputValue, availableTags, selectedTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addTag = (tagName: string) => {
    if (disabled) return;
    
    const trimmedTag = tagName.trim();
    
    if (!trimmedTag) return;
    if (selectedTags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }
    if (selectedTags.includes(trimmedTag)) {
      setError('This tag is already added');
      return;
    }

    // Check if tag exists in available tags
    const existingTag = availableTags.find(t => t.name.toLowerCase() === trimmedTag.toLowerCase());

    if (existingTag) {
      onChange([...selectedTags, existingTag.name]);
      setInputValue('');
      setError(null);
    } else if (onCreateTag) {
      // Create new tag
      setIsCreatingTag(true);
      onCreateTag(trimmedTag)
        .then((newTag) => {
          onChange([...selectedTags, newTag.name]);
          setInputValue('');
          setError(null);
        })
        .catch((err) => {
          setError(`Failed to create tag: ${err.message}`);
        })
        .finally(() => {
          setIsCreatingTag(false);
        });
    } else {
      // If we don't have onCreateTag, simply add the string
      onChange([...selectedTags, trimmedTag]);
      setInputValue('');
      setError(null);
    }
    
    setIsDropdownOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (e.key === 'ArrowDown' && isDropdownOpen && filteredTags.length > 0) {
      // Focus the first item in the dropdown
      const dropdown = dropdownRef.current;
      const firstItem = dropdown?.querySelector('button') as HTMLButtonElement;
      firstItem?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex flex-wrap items-center gap-2 p-2 border ${error ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'} 
          rounded-md bg-white dark:bg-gray-800 min-h-[42px] focus-within:ring-2 
          focus-within:ring-primary-500 focus-within:border-primary-500 transition-colors
          ${disabled ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <div 
            key={tag} 
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border ${getTagColor(tag)}`}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={`Remove tag ${tag}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          className={`flex-grow border-none outline-none bg-transparent min-w-[120px] text-gray-700 dark:text-gray-200 ${disabled ? 'cursor-not-allowed' : ''}`}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsDropdownOpen(true);
            setError(null);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled || selectedTags.length >= maxTags || isCreatingTag}
          aria-label="Tag input"
          aria-autocomplete="list"
          aria-controls="tag-dropdown"
          role="combobox"
          aria-expanded={isDropdownOpen}
        />
        
        {isCreatingTag && (
          <div className="flex-shrink-0">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}
      
      {isDropdownOpen && !disabled && (
        <div 
          ref={dropdownRef}
          id="tag-dropdown"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg border border-gray-300 dark:border-gray-600 focus:outline-none sm:text-sm"
        >
          {filteredTags.length > 0 ? (
            <div className="py-1">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  className={`flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none`}
                  onClick={() => addTag(tag.name)}
                >
                  <span className={`w-3 h-3 rounded-full mr-2 ${tag.color || getTagColor(tag.name)}`}></span>
                  {tag.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-1">
              {inputValue.trim() !== '' && onCreateTag && (
                <button
                  className="flex w-full items-center px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  onClick={() => addTag(inputValue)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create "{inputValue}"
                </button>
              )}
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                {inputValue.trim() === '' ? 'Type to search tags' : 'No matching tags found'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 