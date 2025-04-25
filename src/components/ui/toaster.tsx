'use client';

import React from 'react';
import { useState, useEffect } from 'react';

type ToastProps = {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
};

type ToasterContextType = {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  removeToast: (id: string) => void;
};

const ToasterContext = React.createContext<ToasterContextType | undefined>(undefined);

export function useToaster() {
  const context = React.useContext(ToasterContext);
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider');
  }
  return context;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
    
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToasterContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToasterContext.Provider>
  );
}

function Toast({ toast }: { toast: ToastProps }) {
  const { removeToast } = useToaster();
  
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
        toast.onClose?.();
      }, toast.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast, removeToast]);
  
  const typeClasses = {
    success: 'bg-green-100 border-green-500 text-green-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
  };
  
  const classes = `${typeClasses[toast.type || 'info']} border-l-4 p-4 rounded shadow-md`;

  return (
    <div className={classes} role="alert">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{toast.title}</p>
          {toast.description && <p className="text-sm">{toast.description}</p>}
        </div>
        <button
          onClick={() => {
            removeToast(toast.id);
            toast.onClose?.();
          }}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToaster();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed right-0 bottom-0 p-4 w-full max-w-sm z-50 space-y-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
} 