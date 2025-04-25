'use client';

import { useState, useEffect } from 'react';
import { useApiClient } from '@/utils/api-client';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setError(null);
        const response = await api.get<{ categories: string[] }>('/api/categories');
        
        if (response && response.categories) {
          setCategories(response.categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Don't show auth errors to user, just handle gracefully
        if (error instanceof Error && 
            (error.message === 'No active session' || 
             error.message.includes('Unauthorized') || 
             error.message.includes('Authentication required'))) {
          // Just show empty state for auth errors
          setCategories([]);
        } else {
          setError('Failed to load categories');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [api]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Filter by Category</h2>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          All Categories
        </button>
        
        {loading ? (
          <div className="px-3 py-1.5 text-sm text-gray-500">Loading categories...</div>
        ) : error ? (
          <div className="px-3 py-1.5 text-sm text-gray-500">{error}</div>
        ) : (
          categories.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))
        )}
        
        {!loading && !error && categories.length === 0 && (
          <div className="px-3 py-1.5 text-sm text-gray-500">No categories found</div>
        )}
      </div>
    </div>
  );
} 