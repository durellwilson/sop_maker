"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass,
  onConfirm,
  onCancel,
  type = 'warning',
  isLoading = false
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onCancel]);
  
  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Set focus to dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);
  
  // Determine the icon and colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          confirmBtnClass: confirmButtonClass || 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'info':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          confirmBtnClass: confirmButtonClass || 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      case 'warning':
      default:
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.344-2.198c-.376-.79-1.013-1.178-1.743-1.178-.77 0-1.415.387-1.743 1.178-.33.792-.247 1.791.262 2.494.576.904 1.614 1.26 2.512 1.081.246-.045.479-.139.684-.27.204-.132.375-.307.475-.528.096-.178.155-.37.155-.563 0-.193-.059-.385-.155-.563-.1-.221-.271-.396-.475-.528-.195-.141-.439-.234-.684-.27-.9-.165-1.937.184-2.512 1.081-.51.703-.592 1.702-.262 2.494.329.792.973 1.178 1.743 1.178.73 0 1.367-.389 1.743-1.178.33-.792.247-1.791-.262-2.494-.576-.904-1.614-1.26-2.512-1.081z" />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          confirmBtnClass: confirmButtonClass || 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
    }
  };
  
  const typeStyles = getTypeStyles();
  
  if (!isOpen) return null;
  
  // Use portal to render the dialog at the end of the document body
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" 
          onClick={onCancel}
          aria-hidden="true"
        />
        
        {/* Dialog */}
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`relative transform overflow-hidden rounded-lg ${typeStyles.bgColor} border ${typeStyles.borderColor} p-8 text-left shadow-xl transition-all animate-dialog-slide-in w-full max-w-md`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {typeStyles.icon}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${typeStyles.confirmBtnClass} disabled:opacity-50`}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 